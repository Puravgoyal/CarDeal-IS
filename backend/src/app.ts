import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import { DatabaseManager } from "./database/connection.js";
import { AuthService } from "./services/authService.js";
import { AuthController } from "./controllers/authController.js";
import { createAuthRoutes } from "./routes/authRoutes.js";
import { createAuthMiddleware } from "./middleware/authMiddleware.js";
import { VehicleService } from "./services/vehicleService.js";
import { VehicleController } from "./controllers/vehicleController.js";
import { createVehicleRoutes } from "./routes/vehicleRoutes.js";

export interface AppOptions {
  dbManager: DatabaseManager;
  jwtSecret?: string;
  jwtExpiresIn?: string;
}

export function createApp(options: AppOptions): Express {
  const jwtSecret = options.jwtSecret || process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.trim().length < 32) {
    throw new Error("JWT secret must be explicitly configured with at least 32 characters. Do not rely on fallback defaults.");
  }
  const jwtExpiresIn = options.jwtExpiresIn || process.env.JWT_EXPIRES_IN || "24h";

  const app = express();

  app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true
  }));
  app.use(express.json());

  // Services & Middleware
  const authService = new AuthService(options.dbManager, jwtSecret, jwtExpiresIn);
  const authController = new AuthController(authService);
  const authMiddleware = createAuthMiddleware(jwtSecret);

  const vehicleService = new VehicleService(options.dbManager);
  const vehicleController = new VehicleController(vehicleService);

  // Mount Auth Routes
  const authRouter = createAuthRoutes(authController);
  authRouter.get("/me", authMiddleware.authenticateToken, (req: Request, res: Response) => {
    res.json({ user: req.user });
  });
  app.use("/api/auth", authRouter);

  // Mount Vehicle Routes
  app.use("/api/vehicles", createVehicleRoutes(vehicleController, authMiddleware));

  // Health check endpoint
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  // Central error handler matching BACKEND.md contract
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const statusCode = typeof err.statusCode === "number" && err.statusCode >= 400 && err.statusCode < 600
      ? err.statusCode
      : 500;

    const code = statusCode === 500 ? "INTERNAL_SERVER_ERROR" : (err.code || "ERROR");
    const message = statusCode === 500 ? "An unexpected error occurred." : (err.message || "An unexpected error occurred.");

    res.status(statusCode).json({
      error: {
        code,
        message
      }
    });
  });

  return app;
}
