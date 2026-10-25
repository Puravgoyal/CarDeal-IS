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

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
  }

  public async register(email: string, password: string): Promise<SanitizedUser> {
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
