import dotenv from "dotenv";
dotenv.config();

import { createApp } from "./app.js";
import { getDatabaseManager } from "./database/connection.js";

const PORT = parseInt(process.env.PORT || "4000", 10);
const DATABASE_PATH = process.env.DATABASE_PATH || "./data/cardeal.db";
const JWT_SECRET = process.env.JWT_SECRET || "cardeal_secure_dev_jwt_secret_key_at_least_32_chars!";

const dbManager = getDatabaseManager(DATABASE_PATH);
// Initialize database schema and migrations
dbManager.getDatabase();

const app = createApp({ dbManager, jwtSecret: JWT_SECRET });

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
