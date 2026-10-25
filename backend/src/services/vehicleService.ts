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

    // Check existence
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
}
