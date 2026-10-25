import crypto from "node:crypto";
import { DatabaseManager } from "../database/connection.js";
import { PasswordService } from "./passwordService.js";

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  role: "user" | "admin";
  created_at: string;
}

export interface SanitizedUser {
  id: string;
  email: string;
  role: "user" | "admin";
}

export class AuthService {
  private dbManager: DatabaseManager;
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
  }

  public async register(email: unknown, password: unknown): Promise<SanitizedUser> {
    if (typeof email !== "string" || !AuthService.EMAIL_REGEX.test(email.trim())) {
      const err = new Error("A valid email address is required.");
      (err as any).statusCode = 400;
      (err as any).code = "VALIDATION_ERROR";
      throw err;
    }

    if (typeof password !== "string" || password.length < 12 || password.length > 128) {
      const err = new Error("Password must be between 12 and 128 characters.");
      (err as any).statusCode = 400;
      (err as any).code = "VALIDATION_ERROR";
      throw err;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = this.dbManager.getDatabase();

    // Check duplicate
    const checkStmt = db.prepare("SELECT id FROM users WHERE email = ?");
    const existing = checkStmt.get(normalizedEmail);
    if (existing) {
      const err = new Error("Email already registered");
      (err as any).statusCode = 409;
      (err as any).code = "DUPLICATE_EMAIL";
      throw err;
    }

    const id = crypto.randomUUID();
    const passwordHash = await PasswordService.hash(password);
    const role = "user";
    const createdAt = new Date().toISOString();

    const insertStmt = db.prepare(
      "INSERT INTO users (id, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)"
    );
    insertStmt.run(id, normalizedEmail, passwordHash, role, createdAt);

    return {
      id,
      email: normalizedEmail,
      role
    };
  }
}
