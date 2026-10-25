import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import path from "node:path";
import fs from "node:fs";
import { createApp } from "../src/app.js";
import { DatabaseManager } from "../src/database/connection.js";
import { provisionAdminUser } from "../src/cli/provisionAdmin.js";

describe("End-to-End Integration Flow (Verification Requirements 1-7)", () => {
  const testDbPath = path.resolve("./data/test_e2e_full_flow.db");
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

  it("successfully executes all seven required business and security flows in sequence", async () => {
    const app = createApp({ dbManager, jwtSecret: testJwtSecret });

    // --- Flow 1: Register and log in as a regular user ---
    const regRes = await request(app)
      .post("/api/auth/register")
      .send({ email: "buyer_e2e@cardeal.com", password: "BuyerPassword123!" });
    expect(regRes.status).toBe(201);
    expect(regRes.body.user.role).toBe("user");

    const buyerLoginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "buyer_e2e@cardeal.com", password: "BuyerPassword123!" });
    expect(buyerLoginRes.status).toBe(200);
    const buyerToken = buyerLoginRes.body.token;

    // --- Flow 2: Log in as an administrator and create a vehicle ---
    await provisionAdminUser(dbManager, "admin_e2e@cardeal.com", "AdminMasterPass123!");
    const adminLoginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin_e2e@cardeal.com", password: "AdminMasterPass123!" });
    expect(adminLoginRes.status).toBe(200);
    const adminToken = adminLoginRes.body.token;

    const createRes = await request(app)
      .post("/api/vehicles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        make: "Hyundai",
        model: "Ioniq 5",
        category: "Electric",
        price: 450000000, // INR 45,00,000 in paise
        quantity: 2
      });
    expect(createRes.status).toBe(201);
    const vehicleId = createRes.body.vehicle.id;

    // --- Flow 3: Find it using filters ---
    const searchRes = await request(app)
      .get("/api/vehicles/search?make=hyundai&category=electric&minPrice=400000000&maxPrice=500000000")
      .set("Authorization", `Bearer ${buyerToken}`);
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.vehicles.length).toBe(1);
    expect(searchRes.body.vehicles[0].id).toBe(vehicleId);

    // --- Flow 4: Purchase as the regular user and observe updated stock ---
    const purchase1Res = await request(app)
      .post(`/api/vehicles/${vehicleId}/purchase`)
      .set("Authorization", `Bearer ${buyerToken}`);
    expect(purchase1Res.status).toBe(200);
    expect(purchase1Res.body.vehicle.quantity).toBe(1);

    // --- Flow 5: Reach zero stock and verify purchase is disabled ---
    const purchase2Res = await request(app)
      .post(`/api/vehicles/${vehicleId}/purchase`)
      .set("Authorization", `Bearer ${buyerToken}`);
    expect(purchase2Res.status).toBe(200);
    expect(purchase2Res.body.vehicle.quantity).toBe(0);

    // Attempting purchase at zero stock fails with 409
    const purchaseDepletedRes = await request(app)
      .post(`/api/vehicles/${vehicleId}/purchase`)
      .set("Authorization", `Bearer ${buyerToken}`);
    expect(purchaseDepletedRes.status).toBe(409);
    expect(purchaseDepletedRes.body.error.code).toBe("OUT_OF_STOCK");

    // --- Flow 6: Restock, edit and delete as administrator ---
    // Restock +3
    const restockRes = await request(app)
      .post(`/api/vehicles/${vehicleId}/restock`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ quantity: 3 });
    expect(restockRes.status).toBe(200);
    expect(restockRes.body.vehicle.quantity).toBe(3);

    // Edit price and model
    const editRes = await request(app)
      .put(`/api/vehicles/${vehicleId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        make: "Hyundai",
        model: "Ioniq 5 AWD",
        category: "Electric",
        price: 480000000
      });
    expect(editRes.status).toBe(200);
    expect(editRes.body.vehicle.model).toBe("Ioniq 5 AWD");
    expect(editRes.body.vehicle.quantity).toBe(3); // Quantity untouched by PUT

    // Delete
    const deleteRes = await request(app)
      .delete(`/api/vehicles/${vehicleId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(deleteRes.status).toBe(204);

    // Verify gone
    const verifyDel = await request(app)
      .get("/api/vehicles")
      .set("Authorization", `Bearer ${buyerToken}`);
    expect(verifyDel.body.vehicles.some((v: any) => v.id === vehicleId)).toBe(false);

    // --- Flow 7: Verify regular users cannot perform admin operations ---
    // Regular user attempting POST /api/vehicles
    const forbiddenCreate = await request(app)
      .post("/api/vehicles")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ make: "BMW", model: "M3", category: "Sedan", price: 900000000, quantity: 1 });
    expect(forbiddenCreate.status).toBe(403);
    expect(forbiddenCreate.body.error.code).toBe("FORBIDDEN");

    // Regular user attempting DELETE
    const forbiddenDelete = await request(app)
      .delete("/api/vehicles/some-id")
      .set("Authorization", `Bearer ${buyerToken}`);
    expect(forbiddenDelete.status).toBe(403);
    expect(forbiddenDelete.body.error.code).toBe("FORBIDDEN");

    // Regular user attempting RESTOCK
    const forbiddenRestock = await request(app)
      .post("/api/vehicles/some-id/restock")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ quantity: 5 });
    expect(forbiddenRestock.status).toBe(403);
    expect(forbiddenRestock.body.error.code).toBe("FORBIDDEN");
  });
});
