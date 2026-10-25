import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { DatabaseManager, getDatabaseManager } from "../database/connection.js";
import { PasswordService } from "../services/passwordService.js";
import { SanitizedUser } from "../services/authService.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function provisionAdminUser(
  dbManager: DatabaseManager,
  email: string,
  password: string
): Promise<SanitizedUser> {
  if (!EMAIL_REGEX.test(email.trim())) {
    throw new Error("Valid email is required to provision admin.");
  }
  if (!password || password.length < 12 || password.length > 128) {
    throw new Error("Admin password must be between 12 and 128 characters.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const db = dbManager.getDatabase();
  const passwordHash = await PasswordService.hash(password);

  const existingStmt = db.prepare("SELECT id FROM users WHERE email = ?");
  const existing = existingStmt.get(normalizedEmail) as { id: string } | undefined;

  if (existing) {
    const updateStmt = db.prepare(
      "UPDATE users SET password_hash = ?, role = 'admin' WHERE id = ?"
    );
    updateStmt.run(passwordHash, existing.id);
    return {
      id: existing.id,
      email: normalizedEmail,
      role: "admin"
    };
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const insertStmt = db.prepare(
    "INSERT INTO users (id, email, password_hash, role, created_at) VALUES (?, ?, ?, 'admin', ?)"
  );
  insertStmt.run(id, normalizedEmail, passwordHash, createdAt);

  return {
    id,
    email: normalizedEmail,
    role: "admin"
  };
}

// CLI entry point
const isDirectExecution = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectExecution) {
  const email = process.argv[2] || process.env.ADMIN_EMAIL;
  const password = process.argv[3] || process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error("Usage: npm run admin:provision <email> <password>");
    process.exit(1);
  }

  const dbManager = getDatabaseManager();
  provisionAdminUser(dbManager, email, password)
    .then((admin) => {
      console.log(`[Admin Provisioning] Successfully provisioned admin user: ${admin.email} (id: ${admin.id})`);
      dbManager.close();
      process.exit(0);
    })
    .catch((err) => {
      console.error(`[Admin Provisioning Failed]: ${err.message}`);
      dbManager.close();
      process.exit(1);
    });
}
