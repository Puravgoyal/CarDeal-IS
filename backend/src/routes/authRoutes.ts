import { Router } from "express";
import { AuthController } from "../controllers/authController.js";
import { loginRateLimiter } from "../middleware/rateLimiter.js";

export function createAuthRoutes(authController: AuthController): Router {
  const router = Router();
  router.post("/register", authController.register);
  router.post("/login", loginRateLimiter, authController.login);
  return router;
}
