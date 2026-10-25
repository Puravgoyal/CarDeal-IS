import { Router } from "express";
import { VehicleController } from "../controllers/vehicleController.js";

export interface VehicleRouteMiddleware {
  authenticateToken: any;
  requireAdmin: any;
}

export function createVehicleRoutes(
  vehicleController: VehicleController,
  middleware: VehicleRouteMiddleware
): Router {
  const router = Router();

  // All vehicle routes require authentication
  router.use(middleware.authenticateToken);

  // Listing
  router.get("/", vehicleController.list);

  // Admin mutations
  router.post("/", middleware.requireAdmin, vehicleController.create);
  router.put("/:id", middleware.requireAdmin, vehicleController.update);
  router.delete("/:id", middleware.requireAdmin, vehicleController.delete);

  return router;
}
