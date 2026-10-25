import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/authService.js";
import { recordFailedLogin, recordSuccessfulLogin } from "../middleware/rateLimiter.js";

export class AuthController {
  private authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  public register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.authService.register(req.body);
      res.status(201).json({ user });
    } catch (error) {
      next(error);
    }
  };

  public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;
      const result = await this.authService.login(email, password);
      recordSuccessfulLogin(req);
      res.status(200).json(result);
    } catch (error) {
      recordFailedLogin(req);
      next(error);
    }
  };
}
