import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: "user" | "admin";
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function createAuthMiddleware(jwtSecret: string = process.env.JWT_SECRET || "cardeal_default_dev_secret_key_32_chars") {
  const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Authorization token required."
        }
      });
      return;
    }

    const token = authHeader.substring(7).trim();
    try {
      const decoded = jwt.verify(token, jwtSecret) as { sub: string; email: string; role: "user" | "admin" };
      req.user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role
      };
      next();
    } catch {
      res.status(401).json({
        error: {
          code: "INVALID_TOKEN",
          message: "The provided token is invalid or expired."
        }
      });
    }
  };

  const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || req.user.role !== "admin") {
      res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Administrator privilege required for this action."
        }
      });
      return;
    }
    next();
  };

  return {
    authenticateToken,
    requireAdmin
  };
}
