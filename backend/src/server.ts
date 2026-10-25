import dotenv from "dotenv";
dotenv.config();

import { createApp } from "./app.js";
import { getDatabaseManager } from "./database/connection.js";

const PORT = parseInt(process.env.PORT || "4000", 10);
const DATABASE_PATH = process.env.DATABASE_PATH || "./data/cardeal.db";
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.trim().length < 32) {
  console.error("FATAL: JWT_SECRET environment variable is missing or shorter than 32 characters.");
  console.error("Generate a secure private secret with: openssl rand -hex 32");
  process.exit(1);
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

const dbManager = getDatabaseManager(DATABASE_PATH);
dbManager.getDatabase();

const app = createApp({ dbManager, jwtSecret: JWT_SECRET, jwtExpiresIn: JWT_EXPIRES_IN });

const server = app.listen(PORT, () => {
  console.log(`[CarDeal IS Backend] Server running on http://localhost:${PORT}`);
  console.log(`[CarDeal IS Backend] Connected to file-backed SQLite database: ${DATABASE_PATH}`);
});

function handleShutdown(signal: string) {
  console.log(`\n[CarDeal IS Backend] Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    dbManager.close();
    console.log("[CarDeal IS Backend] Database closed and server terminated.");
    process.exit(0);
  });
}

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));
