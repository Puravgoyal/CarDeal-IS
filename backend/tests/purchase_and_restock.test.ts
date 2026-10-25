import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import path from "node:path";
import fs from "node:fs";
import { createApp } from "../src/app.js";
import { DatabaseManager } from "../src/database/connection.js";
import { provisionAdminUser } from "../src/cli/provisionAdmin.js";

describe("TDD Slice 7: Atomic Purchase, Restock and Concurrency", () => {
  const testDbPath = path.resolve("./data/test_purchase_restock.db");
  const testJwtSecret = "a_very_secure_test_jwt_secret_key_at_least_32_characters";
  let dbManager: DatabaseManager;
  let adminToken: string;
  let buyerToken1: string;
  let buyerToken2: string;

  beforeEach(async () => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    dbManager = new DatabaseManager(testDbPath);
    dbManager.getDatabase();

    const app = createApp({ dbManager, jwtSecret: testJwtSecret });

    // Provision admin
    await provisionAdminUser(dbManager, "admin@cardeal.com", "AdminMasterPass123!");
    const adminLoginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@cardeal.com", password: "AdminMasterPass123!" });
    adminToken = adminLoginRes.body.token;

    // Register Buyer 1
    await request(app)
      .post("/api/auth/register")
      .send({ email: "buyer1@cardeal.com", password: "BuyerOnePassword123!" });
    const buyer1LoginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "buyer1@cardeal.com", password: "BuyerOnePassword123!" });
    buyerToken1 = buyer1LoginRes.body.token;

    // Register Buyer 2
    await request(app)
      .post("/api/auth/register")
      .send({ email: "buyer2@cardeal.com", password: "BuyerTwoPassword123!" });
    const buyer2LoginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "buyer2@cardeal.com", password: "BuyerTwoPassword123!" });
    buyerToken2 = buyer2LoginRes.body.token;
  });

  afterEach(() => {
    dbManager.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it("decrements quantity by 1 upon valid purchase", async () => {
    const app = createApp({ dbManager, jwtSecret: testJwtSecret });

    const createRes = await request(app)
      .post("/api/vehicles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ make: "Mazda", model: "CX-5", category: "SUV", price: 280000000, quantity: 2 });

    const vehicleId = createRes.body.vehicle.id;

    const purchaseRes = await request(app)
      .post(`/api/vehicles/${vehicleId}/purchase`)
      .set("Authorization", `Bearer ${buyerToken1}`)
      .send();

    expect(purchaseRes.status).toBe(200);
    expect(purchaseRes.body.vehicle.quantity).toBe(1);

    // Purchase second unit
    const purchase2Res = await request(app)
      .post(`/api/vehicles/${vehicleId}/purchase`)
      .set("Authorization", `Bearer ${buyerToken1}`)
      .send();

    expect(purchase2Res.status).toBe(200);
    expect(purchase2Res.body.vehicle.quantity).toBe(0);

    // Attempt purchase on 0 stock -> 409 OUT_OF_STOCK
    const purchaseEmptyRes = await request(app)
      .post(`/api/vehicles/${vehicleId}/purchase`)
      .set("Authorization", `Bearer ${buyerToken1}`)
      .send();

    expect(purchaseEmptyRes.status).toBe(409);
    expect(purchaseEmptyRes.body.error.code).toBe("OUT_OF_STOCK");
  });

  it("handles competing requests for the last remaining unit: exactly 1 succeeds, 1 gets 409 conflict", async () => {
    const app = createApp({ dbManager, jwtSecret: testJwtSecret });

    // Vehicle with strictly 1 unit in stock
    const createRes = await request(app)
      .post("/api/vehicles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ make: "Porsche", model: "911 GT3", category: "Sports", price: 1500000000, quantity: 1 });

    const vehicleId = createRes.body.vehicle.id;

    // Fire two purchase requests concurrently for the single unit
    const [res1, res2] = await Promise.all([
      request(app)
        .post(`/api/vehicles/${vehicleId}/purchase`)
        .set("Authorization", `Bearer ${buyerToken1}`)
        .send(),
      request(app)
        .post(`/api/vehicles/${vehicleId}/purchase`)
        .set("Authorization", `Bearer ${buyerToken2}`)
        .send()
    ]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([200, 409]);

    const conflictRes = res1.status === 409 ? res1 : res2;
    expect(conflictRes.body.error.code).toBe("OUT_OF_STOCK");

    // Check final stock in SQLite is 0
    const db = dbManager.getDatabase();
    const finalRow = db.prepare("SELECT quantity FROM vehicles WHERE id = ?").get(vehicleId) as { quantity: number };
    expect(finalRow.quantity).toBe(0);
  });

  it("allows admin to restock with a positive integer increment", async () => {
    const app = createApp({ dbManager, jwtSecret: testJwtSecret });

    const createRes = await request(app)
      .post("/api/vehicles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ make: "Hyundai", model: "Creta", category: "SUV", price: 180000000, quantity: 1 });

    const vehicleId = createRes.body.vehicle.id;

    // Restock with +5 units
    const restockRes = await request(app)
      .post(`/api/vehicles/${vehicleId}/restock`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ quantity: 5 });

    expect(restockRes.status).toBe(200);
    expect(restockRes.body.vehicle.quantity).toBe(6);

    // Reject non-positive increments
    const negRestockRes = await request(app)
      .post(`/api/vehicles/${vehicleId}/restock`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ quantity: -2 });
    expect(negRestockRes.status).toBe(400);
    expect(negRestockRes.body.error.code).toBe("VALIDATION_ERROR");

    // Reject 0 increment
    const zeroRestockRes = await request(app)
      .post(`/api/vehicles/${vehicleId}/restock`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ quantity: 0 });
    expect(zeroRestockRes.status).toBe(400);

    // Reject non-admin restock
    const buyerRestockRes = await request(app)
      .post(`/api/vehicles/${vehicleId}/restock`)
      .set("Authorization", `Bearer ${buyerToken1}`)
      .send({ quantity: 3 });
    expect(buyerRestockRes.status).toBe(403);
  });
});
