import crypto from "node:crypto";
import jwt from "jsonwebtoken";
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

export interface LoginResult {
  token: string;
  user: SanitizedUser;
}

export class AuthService {
  private dbManager: DatabaseManager;
  private jwtSecret: string;
  private jwtExpiresIn: string;
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  constructor(dbManager: DatabaseManager, jwtSecret: string, jwtExpiresIn: string = "24h") {
    if (!jwtSecret || jwtSecret.trim().length < 32) {
      throw new Error("JWT secret must be explicitly configured with at least 32 characters.");
    }
    this.dbManager = dbManager;
    this.jwtSecret = jwtSecret;
    this.jwtExpiresIn = jwtExpiresIn;
  }

  public async register(payload: Record<string, unknown>): Promise<SanitizedUser> {
    if (!payload || typeof payload !== "object") {
      const err = new Error("Invalid registration payload.");
      (err as any).statusCode = 400;
      (err as any).code = "VALIDATION_ERROR";
      throw err;
    }

    // Reject unknown mutation fields
    const allowedKeys = new Set(["email", "password", "role"]);
    for (const key of Object.keys(payload)) {
      if (!allowedKeys.has(key)) {
        const err = new Error(`Unknown registration field: ${key}`);
        (err as any).statusCode = 400;
        (err as any).code = "VALIDATION_ERROR";
        throw err;
      }
    }

    const { email, password } = payload;

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

    // Check duplicate ahead of insert
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
    const role = "user"; // Never accept body-supplied role
    const createdAt = new Date().toISOString();

    const insertStmt = db.prepare(
      "INSERT INTO users (id, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)"
    );

    try {
      insertStmt.run(id, normalizedEmail, passwordHash, role, createdAt);
    } catch (dbErr: any) {
      if (dbErr.message && (dbErr.message.includes("UNIQUE constraint failed") || dbErr.message.includes("users.email"))) {
        const err = new Error("Email already registered");
        (err as any).statusCode = 409;
        (err as any).code = "DUPLICATE_EMAIL";
        throw err;
      }
      throw dbErr;
    }

    return {
      id,
      email: normalizedEmail,
      role
    };
  }

  public async login(email: unknown, password: unknown): Promise<LoginResult> {
    if (typeof email !== "string" || typeof password !== "string") {
      const err = new Error("Invalid email or password.");
      (err as any).statusCode = 401;
      (err as any).code = "INVALID_CREDENTIALS";
      throw err;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = this.dbManager.getDatabase();

    const stmt = db.prepare("SELECT id, email, password_hash, role FROM users WHERE email = ?");
    const user = stmt.get(normalizedEmail) as {
      id: string;
      email: string;
      password_hash: string;
      role: "user" | "admin";
    } | undefined;

    if (!user) {
      const err = new Error("Invalid email or password.");
      (err as any).statusCode = 401;
      (err as any).code = "INVALID_CREDENTIALS";
      throw err;
    }

    const isValidPassword = await PasswordService.verify(password, user.password_hash);
    if (!isValidPassword) {
      const err = new Error("Invalid email or password.");
      (err as any).statusCode = 401;
      (err as any).code = "INVALID_CREDENTIALS";
      throw err;
    }

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role
      },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn as any }
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    };
  }
}
