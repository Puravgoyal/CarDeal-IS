import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import path from "node:path";
import fs from "node:fs";
import { createApp } from "../src/app.js";
import { DatabaseManager } from "../src/database/connection.js";
import { provisionAdminUser } from "../src/cli/provisionAdmin.js";

describe("TDD Slice 5: Vehicle Inventory CRUD Endpoints", () => {
  const testDbPath = path.resolve("./data/test_vehicles_crud.db");
  const testJwtSecret = "a_very_secure_test_jwt_secret_key_at_least_32_characters";
  let dbManager: DatabaseManager;
  let adminToken: string;
  let buyerToken: string;

  beforeEach(async () => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    dbManager = new DatabaseManager(testDbPath);
    dbManager.getDatabase();

    const app = createApp({ dbManager, jwtSecret: testJwtSecret });

    // Provision Admin and get token
    await provisionAdminUser(dbManager, "admin@cardeal.com", "AdminMasterPass123!");
    const adminLoginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@cardeal.com", password: "AdminMasterPass123!" });
    adminToken = adminLoginRes.body.token;

    // Register Buyer and get token
    await request(app)
      .post("/api/auth/register")
      .send({ email: "buyer@cardeal.com", password: "BuyerPassword123!" });
    const buyerLoginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "buyer@cardeal.com", password: "BuyerPassword123!" });
    buyerToken = buyerLoginRes.body.token;
  });

  afterEach(() => {
    dbManager.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it("allows admin to create a vehicle with integer paise price and valid fields", async () => {
    const app = createApp({ dbManager, jwtSecret: testJwtSecret });

    const newVehicle = {
      make: "Honda",
      model: "Civic",
      category: "Sedan",
      price: 250000000, // INR 2,500,000 in paise
      quantity: 3
    };

    const res = await request(app)
      .post("/api/vehicles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(newVehicle);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("vehicle");
    expect(res.body.vehicle).toMatchObject({
      id: expect.any(String),
      make: "Honda",
      model: "Civic",
      category: "Sedan",
      price: 250000000,
      quantity: 3
    });
  });

  it("rejects vehicle creation with invalid or missing fields, negative price, or fractional price", async () => {
    const app = createApp({ dbManager, jwtSecret: testJwtSecret });

    // Negative price
    const negPriceRes = await request(app)
      .post("/api/vehicles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ make: "Honda", model: "Civic", category: "Sedan", price: -500, quantity: 2 });
    expect(negPriceRes.status).toBe(400);
    expect(negPriceRes.body.error.code).toBe("VALIDATION_ERROR");

    // Fractional price (floats are forbidden)
    const floatPriceRes = await request(app)
      .post("/api/vehicles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ make: "Honda", model: "Civic", category: "Sedan", price: 2500.5, quantity: 2 });
    expect(floatPriceRes.status).toBe(400);

    // Negative quantity
    const negQtyRes = await request(app)
      .post("/api/vehicles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ make: "Honda", model: "Civic", category: "Sedan", price: 250000, quantity: -1 });
    expect(negQtyRes.status).toBe(400);

    // Empty make
    const emptyMakeRes = await request(app)
      .post("/api/vehicles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ make: "   ", model: "Civic", category: "Sedan", price: 250000, quantity: 1 });
    expect(emptyMakeRes.status).toBe(400);
  });

  it("lists all vehicles including zero-stock vehicles for authenticated buyers", async () => {
    const app = createApp({ dbManager, jwtSecret: testJwtSecret });

    // Add in-stock vehicle
    await request(app)
      .post("/api/vehicles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ make: "Toyota", model: "Camry", category: "Sedan", price: 300000000, quantity: 2 });

    // Add zero-stock vehicle
    await request(app)
      .post("/api/vehicles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ make: "Tesla", model: "Model 3", category: "Electric", price: 450000000, quantity: 0 });

    const listRes = await request(app)
      .get("/api/vehicles")
      .set("Authorization", `Bearer ${buyerToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveProperty("vehicles");
    expect(listRes.body.vehicles.length).toBe(2);
    expect(listRes.body.vehicles.some((v: any) => v.quantity === 0)).toBe(true);
  });

  it("updates vehicle details via PUT and explicitly rejects quantity in payload", async () => {
    const app = createApp({ dbManager, jwtSecret: testJwtSecret });

    const createRes = await request(app)
      .post("/api/vehicles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ make: "Ford", model: "Mustang", category: "Coupe", price: 600000000, quantity: 1 });

    const vehicleId = createRes.body.vehicle.id;

    // Reject PUT with quantity field
    const invalidPutRes = await request(app)
      .put(`/api/vehicles/${vehicleId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ make: "Ford", model: "Mustang GT", category: "Coupe", price: 650000000, quantity: 2 });

    expect(invalidPutRes.status).toBe(400);
    expect(invalidPutRes.body.error.code).toBe("VALIDATION_ERROR");

    // Valid PUT without quantity
    const validPutRes = await request(app)
      .put(`/api/vehicles/${vehicleId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ make: "Ford", model: "Mustang GT", category: "Coupe", price: 650000000 });

    expect(validPutRes.status).toBe(200);
    expect(validPutRes.body.vehicle.model).toBe("Mustang GT");
    expect(validPutRes.body.vehicle.price).toBe(650000000);
    expect(validPutRes.body.vehicle.quantity).toBe(1); // Unchanged!
  });

  it("deletes a vehicle as admin with 204 No Content and handles 404 for nonexistent ID", async () => {
    const app = createApp({ dbManager, jwtSecret: testJwtSecret });

    const createRes = await request(app)
      .post("/api/vehicles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ make: "Hyundai", model: "Elantra", category: "Sedan", price: 200000000, quantity: 4 });

    const vehicleId = createRes.body.vehicle.id;

    const delRes = await request(app)
      .delete(`/api/vehicles/${vehicleId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(delRes.status).toBe(204);

    // Verify deleted
    const notFoundRes = await request(app)
      .delete(`/api/vehicles/${vehicleId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(notFoundRes.status).toBe(404);
    expect(notFoundRes.body.error.code).toBe("VEHICLE_NOT_FOUND");
  });
});
