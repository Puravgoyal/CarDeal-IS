import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import path from "node:path";
import fs from "node:fs";
import { createApp } from "../src/app.js";
import { DatabaseManager } from "../src/database/connection.js";
import { provisionAdminUser } from "../src/cli/provisionAdmin.js";

describe("TDD Slice 6: Vehicle Search and Filtering", () => {
  const testDbPath = path.resolve("./data/test_vehicles_search.db");
  const testJwtSecret = "a_very_secure_test_jwt_secret_key_at_least_32_characters";
  let dbManager: DatabaseManager;
  let buyerToken: string;

  beforeEach(async () => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    dbManager = new DatabaseManager(testDbPath);
    dbManager.getDatabase();

    const app = createApp({ dbManager, jwtSecret: testJwtSecret });

    // Provision admin to seed vehicles
    await provisionAdminUser(dbManager, "admin@dealership.com", "AdminMasterPass123!");
    const adminLoginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@dealership.com", password: "AdminMasterPass123!" });
    const adminToken = adminLoginRes.body.token;

    // Seed test catalog
    const testVehicles = [
      { make: "Toyota", model: "Corolla Altis", category: "Sedan", price: 180000000, quantity: 4 },
      { make: "Toyota", model: "Fortuner", category: "SUV", price: 380000000, quantity: 2 },
      { make: "Honda", model: "City", category: "Sedan", price: 150000000, quantity: 5 },
      { make: "Tata", model: "Nexon EV", category: "Electric", price: 160000000, quantity: 3 },
      { make: "Special_Make", model: "100%_Model", category: "Custom", price: 200000000, quantity: 1 }
    ];

    for (const v of testVehicles) {
      await request(app)
        .post("/api/vehicles")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(v);
    }

    // Register Buyer
    await request(app)
      .post("/api/auth/register")
      .send({ email: "shopper@dealership.com", password: "ShopperPassword123!" });
    const buyerLoginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "shopper@dealership.com", password: "ShopperPassword123!" });
    buyerToken = buyerLoginRes.body.token;
  });

  afterEach(() => {
    dbManager.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it("filters vehicles by case-insensitive substring on make and model", async () => {
    const app = createApp({ dbManager, jwtSecret: testJwtSecret });

    // Search for 'toy' (should match 2 Toyota cars)
    const resMake = await request(app)
      .get("/api/vehicles/search?make=toy")
      .set("Authorization", `Bearer ${buyerToken}`);

    expect(resMake.status).toBe(200);
    expect(resMake.body.vehicles.length).toBe(2);
    expect(resMake.body.vehicles.every((v: any) => v.make === "Toyota")).toBe(true);

    // Search for 'altis'
    const resModel = await request(app)
      .get("/api/vehicles/search?model=altis")
      .set("Authorization", `Bearer ${buyerToken}`);

    expect(resModel.status).toBe(200);
    expect(resModel.body.vehicles.length).toBe(1);
    expect(resModel.body.vehicles[0].model).toBe("Corolla Altis");
  });

  it("filters vehicles by case-insensitive exact match on category", async () => {
    const app = createApp({ dbManager, jwtSecret: testJwtSecret });

    const resCategory = await request(app)
      .get("/api/vehicles/search?category=sedan")
      .set("Authorization", `Bearer ${buyerToken}`);

    expect(resCategory.status).toBe(200);
    expect(resCategory.body.vehicles.length).toBe(2);
    expect(resCategory.body.vehicles.every((v: any) => v.category === "Sedan")).toBe(true);
  });

  it("filters vehicles within inclusive integer paise price bounds", async () => {
    const app = createApp({ dbManager, jwtSecret: testJwtSecret });

    // minPrice: 160000000, maxPrice: 200000000
    // Expected: Tata Nexon EV (160000000), Toyota Corolla Altis (180000000), Special_Make (200000000)
    const resPrice = await request(app)
      .get("/api/vehicles/search?minPrice=160000000&maxPrice=200000000")
      .set("Authorization", `Bearer ${buyerToken}`);

    expect(resPrice.status).toBe(200);
    expect(resPrice.body.vehicles.length).toBe(3);
  });

  it("rejects reversed price bounds (minPrice > maxPrice) with HTTP 400", async () => {
    const app = createApp({ dbManager, jwtSecret: testJwtSecret });

    const resReversed = await request(app)
      .get("/api/vehicles/search?minPrice=300000000&maxPrice=100000000")
      .set("Authorization", `Bearer ${buyerToken}`);

    expect(resReversed.status).toBe(400);
    expect(resReversed.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("escapes SQL LIKE wildcards % and _ for literal substring searching", async () => {
    const app = createApp({ dbManager, jwtSecret: testJwtSecret });

    // Search model with literal '%'
    const resPercent = await request(app)
      .get("/api/vehicles/search?model=100%")
      .set("Authorization", `Bearer ${buyerToken}`);

    expect(resPercent.status).toBe(200);
    expect(resPercent.body.vehicles.length).toBe(1);
    expect(resPercent.body.vehicles[0].model).toBe("100%_Model");

    // Search make with literal '_'
    const resUnderscore = await request(app)
      .get("/api/vehicles/search?make=Special_")
      .set("Authorization", `Bearer ${buyerToken}`);

    expect(resUnderscore.status).toBe(200);
    expect(resUnderscore.body.vehicles.length).toBe(1);
    expect(resUnderscore.body.vehicles[0].make).toBe("Special_Make");
  });

  it("combines multiple filters with AND semantics", async () => {
    const app = createApp({ dbManager, jwtSecret: testJwtSecret });

    // make=Toyota AND category=SUV
    const resCombined = await request(app)
      .get("/api/vehicles/search?make=Toyota&category=SUV")
      .set("Authorization", `Bearer ${buyerToken}`);

    expect(resCombined.status).toBe(200);
    expect(resCombined.body.vehicles.length).toBe(1);
    expect(resCombined.body.vehicles[0].model).toBe("Fortuner");
  });
});
