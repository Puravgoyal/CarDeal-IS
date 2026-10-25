import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import path from "node:path";
import fs from "node:fs";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";
import { DatabaseManager } from "../src/database/connection.js";
import { provisionAdminUser } from "../src/cli/provisionAdmin.js";

describe("TDD Slice 4: Auth Middleware and Admin Provisioning", () => {
  const testDbPath = path.resolve("./data/test_auth_middleware.db");
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

  it("provisions an admin user locally and permits access to admin-guarded route", async () => {
    const adminUser = await provisionAdminUser(dbManager, "admin@dealership.com", "AdminMasterPass123!");
    expect(adminUser.role).toBe("admin");
    expect(adminUser.email).toBe("admin@dealership.com");

    const app = createApp({ dbManager, jwtSecret: testJwtSecret });

    // Login with provisioned admin credentials
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@dealership.com", password: "AdminMasterPass123!" })
      .expect(200);

    const adminToken = loginRes.body.token;

    // Test a protected route requiring authentication
    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.role).toBe("admin");
  });

  it("rejects unauthenticated requests to protected endpoints with 401 UNAUTHORIZED", async () => {
    const app = createApp({ dbManager, jwtSecret: testJwtSecret });

    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects invalid or tampered tokens with 401 INVALID_TOKEN", async () => {
    const app = createApp({ dbManager, jwtSecret: testJwtSecret });

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalid.tampered.token");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_TOKEN");
  });

  it("rejects regular users attempting to access admin-only protected endpoint with 403 FORBIDDEN", async () => {
    const app = createApp({ dbManager, jwtSecret: testJwtSecret });

    // Register a normal user
    await request(app)
      .post("/api/auth/register")
      .send({ email: "buyer@dealership.com", password: "BuyerPassword123!" })
      .expect(201);

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "buyer@dealership.com", password: "BuyerPassword123!" })
      .expect(200);

    const buyerToken = loginRes.body.token;

    // Access an admin-only endpoint: POST /api/vehicles
    const addVehicleRes = await request(app)
      .post("/api/vehicles")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({
        make: "Toyota",
        model: "Camry",
        category: "Sedan",
        price: 320000000,
        quantity: 5
      });

    expect(addVehicleRes.status).toBe(403);
    expect(addVehicleRes.body.error.code).toBe("FORBIDDEN");
  });
});
