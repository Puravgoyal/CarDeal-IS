import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import path from "node:path";
import fs from "node:fs";
import jwt from "jsonwebtoken";
import { execSync } from "node:child_process";
import { createApp } from "../src/app.js";
import { DatabaseManager } from "../src/database/connection.js";

describe("Backend Regression Fixes", () => {
  const testDbPath = path.resolve("./data/test_regressions.db");
  const testJwtSecret = "explicit_test_secret_key_at_least_32_characters_long!";
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

  it("1. requires explicit JWT_SECRET configuration and throws if omitted", () => {
    const originalSecret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    try {
      expect(() => createApp({ dbManager })).toThrow(/JWT secret must be explicitly configured/);
    } finally {
      process.env.JWT_SECRET = originalSecret;
    }
  });

  it("2. rejects expired JWT tokens with 401 INVALID_TOKEN", async () => {
    const app = createApp({ dbManager, jwtSecret: testJwtSecret });
    const expiredToken = jwt.sign(
      { sub: "user-123", email: "user@example.com", role: "user" },
      testJwtSecret,
      { expiresIn: -10 } // Expired 10 seconds ago
    );

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_TOKEN");
  });

  it("3. throttles repeated failed login attempts with 429 TOO_MANY_REQUESTS", async () => {
    const app = createApp({ dbManager, jwtSecret: testJwtSecret });

    // Register user
    await request(app)
      .post("/api/auth/register")
      .send({ email: "victim@example.com", password: "Password12345!" })
      .expect(201);

    // 5 consecutive failed attempts
    for (let i = 0; i < 5; i++) {
      const failRes = await request(app)
        .post("/api/auth/login")
        .send({ email: "victim@example.com", password: "WrongPassword999!" });
      expect(failRes.status).toBe(401);
    }

    // 6th attempt should be blocked
    const blockedRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "victim@example.com", password: "Password12345!" });

    expect(blockedRes.status).toBe(429);
    expect(blockedRes.body.error.code).toBe("TOO_MANY_REQUESTS");
  });

  it("4. rejects non-safe integers and restock overflow atomically", async () => {
    const app = createApp({ dbManager, jwtSecret: testJwtSecret });
    const adminToken = jwt.sign({ sub: "admin-1", email: "admin@test.com", role: "admin" }, testJwtSecret);

    // Reject unsafe integer price
    const unsafePriceRes = await request(app)
      .post("/api/vehicles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        make: "Toyota",
        model: "Supra",
        category: "Sports",
        price: Number.MAX_SAFE_INTEGER + 1000,
        quantity: 1
      });
    expect(unsafePriceRes.status).toBe(400);
    expect(unsafePriceRes.body.error.code).toBe("VALIDATION_ERROR");

    // Create valid vehicle
    const validVehicleRes = await request(app)
      .post("/api/vehicles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        make: "Toyota",
        model: "Supra",
        category: "Sports",
        price: 500000000,
        quantity: 10
      })
      .expect(201);
    const vehicleId = validVehicleRes.body.vehicle.id;

    // Restock overflow attempt
    const overflowRes = await request(app)
      .post(`/api/vehicles/${vehicleId}/restock`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ quantity: Number.MAX_SAFE_INTEGER });

    expect(overflowRes.status).toBe(400);
    expect(overflowRes.body.error.code).toBe("VALIDATION_ERROR");

    // Verify stored stock was NOT modified
    const db = dbManager.getDatabase();
    const row = db.prepare("SELECT quantity FROM vehicles WHERE id = ?").get(vehicleId) as { quantity: number };
    expect(row.quantity).toBe(10);
  });

  it("5. handles concurrent duplicate registrations with exactly one 201 and one 409", async () => {
    const app = createApp({ dbManager, jwtSecret: testJwtSecret });

    const [res1, res2] = await Promise.all([
      request(app).post("/api/auth/register").send({ email: "twin@example.com", password: "Password12345!" }),
      request(app).post("/api/auth/register").send({ email: "twin@example.com", password: "Password12345!" })
    ]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([201, 409]);

    const conflictRes = res1.status === 409 ? res1 : res2;
    expect(conflictRes.body.error.code).toBe("DUPLICATE_EMAIL");

    // Exactly one row in database
    const db = dbManager.getDatabase();
    const rows = db.prepare("SELECT id FROM users WHERE email = ?").all("twin@example.com");
    expect(rows.length).toBe(1);
  });

  it("6. rejects unknown mutation fields and unexpected purchase body", async () => {
    const app = createApp({ dbManager, jwtSecret: testJwtSecret });
    const adminToken = jwt.sign({ sub: "admin-1", email: "admin@test.com", role: "admin" }, testJwtSecret);
    const buyerToken = jwt.sign({ sub: "buyer-1", email: "buyer@test.com", role: "user" }, testJwtSecret);

    // Unknown field on vehicle create
    const badCreateRes = await request(app)
      .post("/api/vehicles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        make: "Toyota",
        model: "Camry",
        category: "Sedan",
        price: 300000000,
        quantity: 5,
        unknownField: "malicious"
      });
    expect(badCreateRes.status).toBe(400);
    expect(badCreateRes.body.error.code).toBe("VALIDATION_ERROR");

    // Create valid vehicle
    const createRes = await request(app)
      .post("/api/vehicles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        make: "Toyota",
        model: "Camry",
        category: "Sedan",
        price: 300000000,
        quantity: 5
      })
      .expect(201);
    const vehicleId = createRes.body.vehicle.id;

    // Unknown field on PUT
    const badPutRes = await request(app)
      .put(`/api/vehicles/${vehicleId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        make: "Toyota",
        model: "Camry Hybrid",
        category: "Sedan",
        price: 320000000,
        extraInjection: 123
      });
    expect(badPutRes.status).toBe(400);
    expect(badPutRes.body.error.code).toBe("VALIDATION_ERROR");

    // Purchase with unexpected body (contract specifies No body)
    const badPurchaseRes = await request(app)
      .post(`/api/vehicles/${vehicleId}/purchase`)
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ quantity: 2 }); // Purchase body forbidden!
    expect(badPurchaseRes.status).toBe(400);
    expect(badPurchaseRes.body.error.code).toBe("VALIDATION_ERROR");

    // Search with repeated query parameter
    const badSearchRes = await request(app)
      .get("/api/vehicles/search?make=Toyota&make=Honda")
      .set("Authorization", `Bearer ${buyerToken}`);
    expect(badSearchRes.status).toBe(400);
    expect(badSearchRes.body.error.code).toBe("VALIDATION_ERROR");

    // Search with unknown query parameter
    const badSearchParamRes = await request(app)
      .get("/api/vehicles/search?unknownFilter=123")
      .set("Authorization", `Bearer ${buyerToken}`);
    expect(badSearchParamRes.status).toBe(400);
    expect(badSearchParamRes.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("7. verifies admin provisioning CLI honors custom DATABASE_PATH", () => {
    const customDbPath = path.resolve("./data/test_custom_admin_cli.db");
    if (fs.existsSync(customDbPath)) {
      fs.unlinkSync(customDbPath);
    }

    try {
      execSync(`npx tsx src/cli/provisionAdmin.ts customadmin@test.com AdminPass12345!`, {
        cwd: path.resolve("./backend"),
        env: {
          ...process.env,
          DATABASE_PATH: customDbPath
        }
      });

      expect(fs.existsSync(customDbPath)).toBe(true);

      const customDbManager = new DatabaseManager(customDbPath);
      const db = customDbManager.getDatabase();
      const admin = db.prepare("SELECT email, role FROM users WHERE email = ?").get("customadmin@test.com") as any;
      expect(admin).toBeDefined();
      expect(admin.role).toBe("admin");
      customDbManager.close();
    } finally {
      if (fs.existsSync(customDbPath)) {
        fs.unlinkSync(customDbPath);
      }
    }
  });
});
