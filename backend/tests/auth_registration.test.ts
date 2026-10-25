import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import path from "node:path";
import fs from "node:fs";
import { createApp } from "../src/app.js";
import { DatabaseManager } from "../src/database/connection.js";
import { PasswordService } from "../src/services/passwordService.js";

describe("TDD Slice 1: User Registration Persistence", () => {
  const testDbPath = path.resolve("./data/test_auth_registration.db");
  let dbManager: DatabaseManager;

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    dbManager = new DatabaseManager(testDbPath);
    // Prepare real schema and migrations prior to asserting missing endpoint behavior
    dbManager.getDatabase();
  });

  afterEach(() => {
    dbManager.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it("persists a newly registered regular user in SQLite with a secure password hash", async () => {
    const app = createApp({ dbManager, jwtSecret: "test_only_secret_key_at_least_32_chars_long!" });

    const payload = {
      email: "candidate@example.com",
      password: "SuperSecretPassword123!"
    };

    const res = await request(app)
      .post("/api/auth/register")
      .send(payload);

    // 1. Verify HTTP status and response envelope
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("user");
    expect(res.body.user).toEqual({
      id: expect.any(String),
      email: "candidate@example.com",
      role: "user"
    });
    expect(res.body.user).not.toHaveProperty("password");
    expect(res.body.user).not.toHaveProperty("password_hash");

    // 2. Direct inspection of the real SQLite database file
    const db = dbManager.getDatabase();
    const stmt = db.prepare("SELECT id, email, password_hash, role, created_at FROM users WHERE email = ?");
    const row = stmt.get("candidate@example.com") as {
      id: string;
      email: string;
      password_hash: string;
      role: string;
      created_at: string;
    } | undefined;

    expect(row).toBeDefined();
    expect(row!.email).toBe("candidate@example.com");
    expect(row!.role).toBe("user");
    expect(row!.password_hash).not.toBe("SuperSecretPassword123!");
    expect(row!.password_hash.startsWith("scrypt:")).toBe(true);

    // 3. Verify password hash matches correct password and rejects incorrect password
    const validMatch = await PasswordService.verify("SuperSecretPassword123!", row!.password_hash);
    expect(validMatch).toBe(true);

    const invalidMatch = await PasswordService.verify("IncorrectPassword123!", row!.password_hash);
    expect(invalidMatch).toBe(false);
  });
});
