import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import path from "node:path";
import fs from "node:fs";
import { createApp } from "../src/app.js";
import { DatabaseManager } from "../src/database/connection.js";

describe("TDD Slice 2: Registration Validation, Duplicates & Privilege Escalation", () => {
  const testDbPath = path.resolve("./data/test_auth_validation.db");
  let dbManager: DatabaseManager;

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    dbManager = new DatabaseManager(testDbPath);
    dbManager.getDatabase();
  });

  afterEach(() => {
    dbManager.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it("rejects duplicate email with HTTP 409 Conflict", async () => {
    const app = createApp({ dbManager });

    await request(app)
      .post("/api/auth/register")
      .send({ email: "alice@example.com", password: "ValidPassword123!" })
      .expect(201);

    const duplicateRes = await request(app)
      .post("/api/auth/register")
      .send({ email: "alice@example.com", password: "AnotherPassword123!" });

    expect(duplicateRes.status).toBe(409);
    expect(duplicateRes.body.error.code).toBe("DUPLICATE_EMAIL");
  });

  it("rejects malformed email addresses with HTTP 400", async () => {
    const app = createApp({ dbManager });

    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "not-an-email", password: "ValidPassword123!" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects passwords shorter than 12 characters with HTTP 400", async () => {
    const app = createApp({ dbManager });

    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "bob@example.com", password: "short" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects passwords longer than 128 characters with HTTP 400", async () => {
    const app = createApp({ dbManager });

    const longPassword = "A".repeat(129);
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "carol@example.com", password: longPassword });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("prevents privilege escalation when role is injected in registration body", async () => {
    const app = createApp({ dbManager });

    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email: "hacker@example.com",
        password: "ValidPassword123!",
        role: "admin"
      });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("user");

    const db = dbManager.getDatabase();
    const row = db.prepare("SELECT role FROM users WHERE email = ?").get("hacker@example.com") as { role: string };
    expect(row.role).toBe("user");
  });
});
