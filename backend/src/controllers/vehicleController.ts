import { Request, Response, NextFunction } from "express";
import { VehicleService } from "../services/vehicleService.js";

export class VehicleController {
  private vehicleService: VehicleService;

  constructor(vehicleService: VehicleService) {
    this.vehicleService = vehicleService;
  }

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const vehicle = await this.vehicleService.create(req.body);
      res.status(201).json({ vehicle });
    } catch (error) {
      next(error);
    }
  };

  public list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const vehicles = await this.vehicleService.list();
      res.status(200).json({ vehicles });
    } catch (error) {
      next(error);
    }
  };

  public search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const vehicles = await this.vehicleService.search(req.query);
      res.status(200).json({ vehicles });
    } catch (error) {
      next(error);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const vehicle = await this.vehicleService.update(id, req.body);
      res.status(200).json({ vehicle });
    } catch (error) {
      next(error);
    }
  };

  public delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      await this.vehicleService.delete(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
