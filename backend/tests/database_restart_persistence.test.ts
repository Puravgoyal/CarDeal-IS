import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import path from "node:path";
import fs from "node:fs";
import { createApp } from "../src/app.js";
import { DatabaseManager } from "../src/database/connection.js";
import { provisionAdminUser } from "../src/cli/provisionAdmin.js";

describe("TDD Verification: Restart Persistence on File-Backed SQLite", () => {
  const testDbPath = path.resolve("./data/test_restart_persistence.db");
  const testJwtSecret = "a_very_secure_test_jwt_secret_key_at_least_32_characters";

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it("proves file-backed SQLite persists data across complete database and app restarts", async () => {
    // 1. Session 1: Open database, provision admin, register buyer, add vehicle
    let dbManager: DatabaseManager | null = new DatabaseManager(testDbPath);
    await provisionAdminUser(dbManager, "admin@persistent.com", "AdminMasterPass123!");

    let app = createApp({ dbManager, jwtSecret: testJwtSecret });

    const adminLoginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@persistent.com", password: "AdminMasterPass123!" })
      .expect(200);
    const adminToken = adminLoginRes.body.token;

    await request(app)
      .post("/api/auth/register")
      .send({ email: "buyer@persistent.com", password: "BuyerPassword123!" })
      .expect(201);

    const vehicleRes = await request(app)
      .post("/api/vehicles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        make: "Toyota",
        model: "Land Cruiser",
        category: "SUV",
        price: 2100000000,
        quantity: 2
      })
      .expect(201);
    const vehicleId = vehicleRes.body.vehicle.id;

    // Verify file exists on disk
    expect(fs.existsSync(testDbPath)).toBe(true);

    // 2. Complete shutdown: Close database connection and nullify references
    dbManager.close();
    dbManager = null;

    // 3. Session 2: Reopen the database from the same file on disk
    const reopenedDbManager = new DatabaseManager(testDbPath);
    const reopenedApp = createApp({ dbManager: reopenedDbManager, jwtSecret: testJwtSecret });

    // Login with the previously registered buyer using existing hash on disk
    const buyerLoginRes = await request(reopenedApp)
      .post("/api/auth/login")
      .send({ email: "buyer@persistent.com", password: "BuyerPassword123!" });

    expect(buyerLoginRes.status).toBe(200);
    const buyerToken = buyerLoginRes.body.token;

    // Verify the previously inserted vehicle still exists
    const listRes = await request(reopenedApp)
      .get("/api/vehicles")
      .set("Authorization", `Bearer ${buyerToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.vehicles.length).toBe(1);
    expect(listRes.body.vehicles[0].id).toBe(vehicleId);
    expect(listRes.body.vehicles[0].model).toBe("Land Cruiser");
    expect(listRes.body.vehicles[0].quantity).toBe(2);

    // Purchase a unit on the reopened database
    const purchaseRes = await request(reopenedApp)
      .post(`/api/vehicles/${vehicleId}/purchase`)
      .set("Authorization", `Bearer ${buyerToken}`);

    expect(purchaseRes.status).toBe(200);
    expect(purchaseRes.body.vehicle.quantity).toBe(1);

    reopenedDbManager.close();
  });
});
