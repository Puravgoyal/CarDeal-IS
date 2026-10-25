import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import { DatabaseManager } from "./database/connection.js";

export interface AppOptions {
  dbManager: DatabaseManager;
  jwtSecret?: string;
}

export function createApp(options: AppOptions): Express {
  const app = express();

  app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true
  }));
  app.use(express.json());

  // Health check endpoint
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  return app;
}
