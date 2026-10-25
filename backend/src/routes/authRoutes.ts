import { Router } from "express";
import { AuthController } from "../controllers/authController.js";

export function createAuthRoutes(authController: AuthController): Router {
  const router = Router();
  router.post("/register", authController.register);
  return router;
}
