import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import path from "node:path";
import fs from "node:fs";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";
import { DatabaseManager } from "../src/database/connection.js";

describe("TDD Slice 3: User Login and Token Generation", () => {
  const testDbPath = path.resolve("./data/test_auth_login.db");
  const testJwtSecret = "a_very_secure_test_jwt_secret_key_at_least_32_characters";
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

  it("authenticates valid credentials and returns a signed JWT token and user envelope", async () => {
    const app = createApp({ dbManager, jwtSecret: testJwtSecret });

    // Register user first
    await request(app)
      .post("/api/auth/register")
      .send({ email: "driver@cardeal.com", password: "Password12345!" })
      .expect(201);

    // Login
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "driver@cardeal.com", password: "Password12345!" });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toHaveProperty("token");
    expect(loginRes.body).toHaveProperty("user");
    expect(loginRes.body.user).toEqual({
      id: expect.any(String),
      email: "driver@cardeal.com",
      role: "user"
    });

    // Verify JWT payload and signature
    const decoded = jwt.verify(loginRes.body.token, testJwtSecret) as any;
    expect(decoded.sub).toBe(loginRes.body.user.id);
    expect(decoded.email).toBe("driver@cardeal.com");
    expect(decoded.role).toBe("user");
    expect(decoded.exp).toBeDefined();
  });

  it("rejects invalid password with generic 401 INVALID_CREDENTIALS", async () => {
    const app = createApp({ dbManager, jwtSecret: testJwtSecret });

    await request(app)
      .post("/api/auth/register")
      .send({ email: "driver@cardeal.com", password: "Password12345!" })
      .expect(201);

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "driver@cardeal.com", password: "WrongPassword999!" });

    expect(loginRes.status).toBe(401);
    expect(loginRes.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("rejects unregistered email with generic 401 INVALID_CREDENTIALS", async () => {
    const app = createApp({ dbManager, jwtSecret: testJwtSecret });

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "nonexistent@cardeal.com", password: "Password12345!" });

    expect(loginRes.status).toBe(401);
    expect(loginRes.body.error.code).toBe("INVALID_CREDENTIALS");
  });
});
