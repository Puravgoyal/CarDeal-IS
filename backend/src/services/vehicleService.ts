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

export interface CreateVehicleInput {
  make: unknown;
  model: unknown;
  category: unknown;
  price: unknown;
  quantity: unknown;
}

export interface UpdateVehicleInput {
  make: unknown;
  model: unknown;
  category: unknown;
  price: unknown;
  quantity?: unknown;
}

export interface SearchVehicleQuery {
  make?: unknown;
  model?: unknown;
  category?: unknown;
  minPrice?: unknown;
  maxPrice?: unknown;
}

export class VehicleService {
  private dbManager: DatabaseManager;

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

  private validateNonNegativeInteger(val: unknown, fieldName: string): number {
    if (typeof val !== "number" || !Number.isInteger(val) || val < 0) {
      const err = new Error(`${fieldName} must be a non-negative integer.`);
      (err as any).statusCode = 400;
      (err as any).code = "VALIDATION_ERROR";
      throw err;
    }
    return val;
  }

  private escapeLike(str: string): string {
    return str.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
  }

  public async create(input: CreateVehicleInput): Promise<Vehicle> {
    const make = this.validateTextField(input.make, "make");
    const model = this.validateTextField(input.model, "model");
    const category = this.validateTextField(input.category, "category");
    const price = this.validateNonNegativeInteger(input.price, "price");
    const quantity = this.validateNonNegativeInteger(input.quantity, "quantity");

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

  public async update(id: string, input: UpdateVehicleInput): Promise<Vehicle> {
    if (input.quantity !== undefined) {
      const err = new Error("Vehicle quantity cannot be modified via PUT. Use restock or purchase endpoints.");
      (err as any).statusCode = 400;
      (err as any).code = "VALIDATION_ERROR";
      throw err;
    }

    const make = this.validateTextField(input.make, "make");
    const model = this.validateTextField(input.model, "model");
    const category = this.validateTextField(input.category, "category");
    const price = this.validateNonNegativeInteger(input.price, "price");

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

  public async search(query: SearchVehicleQuery): Promise<Vehicle[]> {
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
      if (!Number.isInteger(num) || num < 0) {
        const err = new Error("minPrice must be a non-negative integer paise value.");
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
      if (!Number.isInteger(num) || num < 0) {
        const err = new Error("maxPrice must be a non-negative integer paise value.");
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

  public async purchase(id: string): Promise<Vehicle> {
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
    await this.getById(id);

    if (typeof increment !== "number" || !Number.isInteger(increment) || increment <= 0 || increment > 1_000_000) {
      const err = new Error("Restock increment must be a positive integer.");
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
