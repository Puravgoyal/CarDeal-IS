import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import path from "node:path";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";
import { DatabaseManager } from "../src/database/connection.js";

describe("Phase 3 Focused Backend Regressions", () => {
  const testDbPath = path.resolve("./data/test_phase3_regressions.db");
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

  it("atomically rejects restock overflow in SQL without mutating valid stock under concurrent requests", async () => {
    const app = createApp({ dbManager, jwtSecret: testJwtSecret });
    const adminToken = jwt.sign({ sub: "admin-1", email: "admin@test.com", role: "admin" }, testJwtSecret);

    // Seed vehicle near MAX_SAFE_INTEGER
    const db = dbManager.getDatabase();
    const id = "v-near-max";
    const now = new Date().toISOString();
    const nearMaxQty = Number.MAX_SAFE_INTEGER - 3;
    db.prepare(
      "INSERT INTO vehicles (id, make, model, category, price, quantity, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(id, "Bugatti", "Chiron", "Hypercar", 1000000000, nearMaxQty, now, now);

    // Fire two competing restock requests each attempting to add +3
    // One must succeed (reaching MAX_SAFE_INTEGER) and the other must be atomically rejected with 400
    const [res1, res2] = await Promise.all([
      request(app)
        .post(`/api/vehicles/${id}/restock`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ quantity: 3 }),
      request(app)
        .post(`/api/vehicles/${id}/restock`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ quantity: 3 })
    ]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([200, 400]);

    const failRes = res1.status === 400 ? res1 : res2;
    expect(failRes.body.error.code).toBe("VALIDATION_ERROR");

    // Stock in database must be exactly MAX_SAFE_INTEGER, never beyond
    const finalRow = db.prepare("SELECT quantity FROM vehicles WHERE id = ?").get(id) as { quantity: number };
    expect(finalRow.quantity).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("verifies admin provisioning CLI executes as a real subprocess with custom DATABASE_PATH", () => {
    const customDbPath = path.resolve("./data/test_real_subprocess_cli.db");
    if (fs.existsSync(customDbPath)) {
      fs.unlinkSync(customDbPath);
    }

    try {
      const backendDir = process.cwd().endsWith("backend") ? process.cwd() : path.resolve(process.cwd(), "backend");
      const tsxCli = path.join(backendDir, "node_modules", "tsx", "dist", "cli.mjs");
      const script = path.join(backendDir, "src", "cli", "provisionAdmin.ts");

      const result = spawnSync(
        process.execPath,
        [tsxCli, script, "subadmin@test.com", "AdminPassword123!"],
        {
          cwd: backendDir,
          env: {
            ...process.env,
            DATABASE_PATH: customDbPath
          },
          encoding: "utf-8"
        }
      );

      if (result.error) {
        throw result.error;
      }
      expect(result.status).toBe(0);
      expect(fs.existsSync(customDbPath)).toBe(true);

      const customDbManager = new DatabaseManager(customDbPath);
      const db = customDbManager.getDatabase();
      const admin = db.prepare("SELECT email, role FROM users WHERE email = ?").get("subadmin@test.com") as any;
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
