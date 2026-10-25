import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { INITIAL_SCHEMA } from "./schema.js";

const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite");

export interface SqliteDatabase {
  exec(sql: string): void;
  prepare(sql: string): {
    run(...params: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint };
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
  };
  close(): void;
}

export class DatabaseManager {
  private db: SqliteDatabase | null = null;
  private dbPath: string;

  constructor(dbPath: string = process.env.DATABASE_PATH || "./data/cardeal.db") {
    this.dbPath = dbPath;
  }

  public getDatabase(): SqliteDatabase {
    if (!this.db) {
      if (this.dbPath !== ":memory:") {
        const dir = path.dirname(this.dbPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }
      this.db = new DatabaseSync(this.dbPath) as SqliteDatabase;
      if (this.dbPath !== ":memory:") {
        this.db.exec("PRAGMA journal_mode = WAL;");
      }
      this.db.exec("PRAGMA foreign_keys = ON;");
      this.runMigrations();
    }
    return this.db;
  }

  public runMigrations(): void {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    this.db.exec(INITIAL_SCHEMA);
  }

  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  public getPath(): string {
    return this.dbPath;
  }
}

let defaultManager: DatabaseManager | null = null;

export function getDatabaseManager(customPath?: string): DatabaseManager {
  if (customPath) {
    return new DatabaseManager(customPath);
  }
  if (!defaultManager) {
    defaultManager = new DatabaseManager();
  }
  return defaultManager;
}

export function resetDefaultDatabaseManager(): void {
  if (defaultManager) {
    defaultManager.close();
    defaultManager = null;
  }
}
