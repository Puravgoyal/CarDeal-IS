import crypto from "node:crypto";
import { DatabaseManager } from "../database/connection.js";

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  category: string;
  price: number;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export class VehicleService {
  private dbManager: DatabaseManager;
  private static readonly ALLOWED_CREATE_FIELDS = new Set(["make", "model", "category", "price", "quantity"]);
  private static readonly ALLOWED_UPDATE_FIELDS = new Set(["make", "model", "category", "price"]);
  private static readonly ALLOWED_SEARCH_PARAMS = new Set(["make", "model", "category", "minPrice", "maxPrice"]);

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
  }

  private validateTextField(val: unknown, fieldName: string): string {
    if (typeof val !== "string" || val.trim().length === 0 || val.trim().length > 100) {
      const err = new Error(`${fieldName} must be a non-empty string between 1 and 100 characters.`);
      (err as any).statusCode = 400;
      (err as any).code = "VALIDATION_ERROR";
      throw err;
    }
    return val.trim();
  }

  private validateNonNegativeSafeInteger(val: unknown, fieldName: string): number {
    if (typeof val !== "number" || !Number.isSafeInteger(val) || val < 0) {
      const err = new Error(`${fieldName} must be a non-negative safe integer.`);
      (err as any).statusCode = 400;
      (err as any).code = "VALIDATION_ERROR";
      throw err;
    }
    return val;
  }

  private escapeLike(str: string): string {
    return str.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
  }

  public async create(payload: Record<string, unknown>): Promise<Vehicle> {
    if (!payload || typeof payload !== "object") {
      const err = new Error("Invalid vehicle payload.");
      (err as any).statusCode = 400;
      (err as any).code = "VALIDATION_ERROR";
      throw err;
    }

    // Reject unknown mutation fields
    for (const key of Object.keys(payload)) {
      if (!VehicleService.ALLOWED_CREATE_FIELDS.has(key)) {
        const err = new Error(`Unknown mutation field: ${key}`);
        (err as any).statusCode = 400;
        (err as any).code = "VALIDATION_ERROR";
        throw err;
      }
    }

    const make = this.validateTextField(payload.make, "make");
    const model = this.validateTextField(payload.model, "model");
    const category = this.validateTextField(payload.category, "category");
    const price = this.validateNonNegativeSafeInteger(payload.price, "price");
    const quantity = this.validateNonNegativeSafeInteger(payload.quantity, "quantity");

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const db = this.dbManager.getDatabase();
    const stmt = db.prepare(
      "INSERT INTO vehicles (id, make, model, category, price, quantity, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    stmt.run(id, make, model, category, price, quantity, now, now);

    return {
      id,
      make,
      model,
      category,
      price,
      quantity,
      created_at: now,
      updated_at: now
    };
  }

  public async list(): Promise<Vehicle[]> {
    const db = this.dbManager.getDatabase();
    const stmt = db.prepare("SELECT * FROM vehicles ORDER BY created_at DESC, id ASC");
    return stmt.all() as Vehicle[];
  }

  public async getById(id: string): Promise<Vehicle> {
    const db = this.dbManager.getDatabase();
    const stmt = db.prepare("SELECT * FROM vehicles WHERE id = ?");
    const vehicle = stmt.get(id) as Vehicle | undefined;
    if (!vehicle) {
      const err = new Error("Vehicle not found.");
      (err as any).statusCode = 404;
      (err as any).code = "VEHICLE_NOT_FOUND";
      throw err;
    }
    return vehicle;
  }

  public async update(id: string, payload: Record<string, unknown>): Promise<Vehicle> {
    if (!payload || typeof payload !== "object") {
      const err = new Error("Invalid vehicle update payload.");
      (err as any).statusCode = 400;
      (err as any).code = "VALIDATION_ERROR";
      throw err;
    }

    if (payload.quantity !== undefined) {
      const err = new Error("Vehicle quantity cannot be modified via PUT. Use restock or purchase endpoints.");
      (err as any).statusCode = 400;
      (err as any).code = "VALIDATION_ERROR";
      throw err;
    }

    // Reject unknown mutation fields
    for (const key of Object.keys(payload)) {
      if (!VehicleService.ALLOWED_UPDATE_FIELDS.has(key)) {
        const err = new Error(`Unknown mutation field on vehicle update: ${key}`);
        (err as any).statusCode = 400;
        (err as any).code = "VALIDATION_ERROR";
        throw err;
      }
    }

    const make = this.validateTextField(payload.make, "make");
    const model = this.validateTextField(payload.model, "model");
    const category = this.validateTextField(payload.category, "category");
    const price = this.validateNonNegativeSafeInteger(payload.price, "price");

    await this.getById(id);

    const now = new Date().toISOString();
    const db = this.dbManager.getDatabase();
    const stmt = db.prepare(
      "UPDATE vehicles SET make = ?, model = ?, category = ?, price = ?, updated_at = ? WHERE id = ?"
    );
    stmt.run(make, model, category, price, now, id);

    return this.getById(id);
  }

  public async delete(id: string): Promise<void> {
    await this.getById(id);
    const db = this.dbManager.getDatabase();
    const stmt = db.prepare("DELETE FROM vehicles WHERE id = ?");
    stmt.run(id);
  }

  public async search(query: Record<string, unknown>): Promise<Vehicle[]> {
    // Reject unknown query parameters
    for (const key of Object.keys(query)) {
      if (!VehicleService.ALLOWED_SEARCH_PARAMS.has(key)) {
        const err = new Error(`Unknown search parameter: ${key}`);
        (err as any).statusCode = 400;
        (err as any).code = "VALIDATION_ERROR";
        throw err;
      }
      // Reject repeated/array query parameters
      if (Array.isArray(query[key])) {
        const err = new Error(`Repeated query parameter '${key}' is not permitted.`);
        (err as any).statusCode = 400;
        (err as any).code = "VALIDATION_ERROR";
        throw err;
      }
    }

    let sql = "SELECT * FROM vehicles WHERE 1=1";
    const params: unknown[] = [];

    if (typeof query.make === "string" && query.make.trim().length > 0) {
      sql += " AND make LIKE ? ESCAPE '\\'";
      params.push(`%${this.escapeLike(query.make.trim())}%`);
    }

    if (typeof query.model === "string" && query.model.trim().length > 0) {
      sql += " AND model LIKE ? ESCAPE '\\'";
      params.push(`%${this.escapeLike(query.model.trim())}%`);
    }

    if (typeof query.category === "string" && query.category.trim().length > 0) {
      sql += " AND LOWER(category) = LOWER(?)";
      params.push(query.category.trim());
    }

    let minPriceNum: number | undefined;
    if (query.minPrice !== undefined && query.minPrice !== "") {
      const num = Number(query.minPrice);
      if (!Number.isSafeInteger(num) || num < 0) {
        const err = new Error("minPrice must be a non-negative safe integer paise value.");
        (err as any).statusCode = 400;
        (err as any).code = "VALIDATION_ERROR";
        throw err;
      }
      minPriceNum = num;
      sql += " AND price >= ?";
      params.push(minPriceNum);
    }

    let maxPriceNum: number | undefined;
    if (query.maxPrice !== undefined && query.maxPrice !== "") {
      const num = Number(query.maxPrice);
      if (!Number.isSafeInteger(num) || num < 0) {
        const err = new Error("maxPrice must be a non-negative safe integer paise value.");
        (err as any).statusCode = 400;
        (err as any).code = "VALIDATION_ERROR";
        throw err;
      }
      maxPriceNum = num;
      sql += " AND price <= ?";
      params.push(maxPriceNum);
    }

    if (minPriceNum !== undefined && maxPriceNum !== undefined && minPriceNum > maxPriceNum) {
      const err = new Error("minPrice cannot be greater than maxPrice.");
      (err as any).statusCode = 400;
      (err as any).code = "VALIDATION_ERROR";
      throw err;
    }

    sql += " ORDER BY created_at DESC, id ASC";

    const db = this.dbManager.getDatabase();
    const stmt = db.prepare(sql);
    return stmt.all(...params) as Vehicle[];
  }

  public async purchase(id: string, body?: unknown): Promise<Vehicle> {
    if (body && typeof body === "object" && Object.keys(body).length > 0) {
      const err = new Error("Purchase endpoint does not accept a request body.");
      (err as any).statusCode = 400;
      (err as any).code = "VALIDATION_ERROR";
      throw err;
    }

    await this.getById(id);

    const now = new Date().toISOString();
    const db = this.dbManager.getDatabase();
    const stmt = db.prepare(
      "UPDATE vehicles SET quantity = quantity - 1, updated_at = ? WHERE id = ? AND quantity > 0"
    );
    const result = stmt.run(now, id);

    if (Number(result.changes) === 0) {
      const err = new Error("This vehicle is out of stock.");
      (err as any).statusCode = 409;
      (err as any).code = "OUT_OF_STOCK";
      throw err;
    }

    return this.getById(id);
  }

  public async restock(id: string, increment: unknown): Promise<Vehicle> {
    const current = await this.getById(id);

    if (typeof increment !== "number" || !Number.isSafeInteger(increment) || increment <= 0) {
      const err = new Error("Restock increment must be a positive safe integer.");
      (err as any).statusCode = 400;
      (err as any).code = "VALIDATION_ERROR";
      throw err;
    }

    if (current.quantity + increment > Number.MAX_SAFE_INTEGER) {
      const err = new Error("Restock increment would exceed maximum safe integer stock.");
      (err as any).statusCode = 400;
      (err as any).code = "VALIDATION_ERROR";
      throw err;
    }

    const now = new Date().toISOString();
    const db = this.dbManager.getDatabase();
    const stmt = db.prepare(
      "UPDATE vehicles SET quantity = quantity + ?, updated_at = ? WHERE id = ?"
    );
    stmt.run(increment, now, id);

    return this.getById(id);
  }
}
