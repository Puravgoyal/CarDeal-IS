import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import { DatabaseManager } from "./database/connection.js";
import { AuthService } from "./services/authService.js";
import { AuthController } from "./controllers/authController.js";
import { createAuthRoutes } from "./routes/authRoutes.js";
import { createAuthMiddleware } from "./middleware/authMiddleware.js";

export interface AppOptions {
  dbManager: DatabaseManager;
  jwtSecret?: string;
}

export function createApp(options: AppOptions): Express {
  const app = express();
  const jwtSecret = options.jwtSecret || process.env.JWT_SECRET || "cardeal_default_dev_secret_key_32_chars";

  app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true
  }));
  app.use(express.json());

  // Services & Middleware
  const authService = new AuthService(options.dbManager, jwtSecret);
  const authController = new AuthController(authService);
  const { authenticateToken, requireAdmin } = createAuthMiddleware(jwtSecret);

  // Mount Auth Routes
  const authRouter = createAuthRoutes(authController);
  authRouter.get("/me", authenticateToken, (req: Request, res: Response) => {
    res.json({ user: req.user });
  });
  app.use("/api/auth", authRouter);

  // Placeholder vehicle route for testing admin guard
  app.post("/api/vehicles", authenticateToken, requireAdmin, (_req: Request, res: Response) => {
    res.status(201).json({ status: "created" });
  });

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
