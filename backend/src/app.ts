import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import { DatabaseManager } from "./database/connection.js";
import { AuthService } from "./services/authService.js";
import { AuthController } from "./controllers/authController.js";
import { createAuthRoutes } from "./routes/authRoutes.js";

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

  // Services & Controllers
  const authService = new AuthService(options.dbManager, options.jwtSecret);
  const authController = new AuthController(authService);

  // Mount Auth Routes
  app.use("/api/auth", createAuthRoutes(authController));

  // Health check endpoint
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  // Central error handler matching BACKEND.md contract
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const statusCode = err.statusCode || 500;
    const code = err.code || (statusCode === 500 ? "INTERNAL_SERVER_ERROR" : "ERROR");
    const message = err.message || "An unexpected error occurred.";

    res.status(statusCode).json({
      error: {
        code,
        message
      }
    });
  });

  return app;
}
