import { Request, Response, NextFunction } from "express";

interface AttemptRecord {
  count: number;
  blockedUntil?: number;
}

const failedAttempts = new Map<string, AttemptRecord>();
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export function getClientKey(req: Request): string {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const ip = req.ip || req.socket.remoteAddress || "unknown_ip";
  return `${ip}:${email}`;
}

export function loginRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const key = getClientKey(req);
  const record = failedAttempts.get(key);

  const now = Date.now();
  if (record && record.blockedUntil && record.blockedUntil > now) {
    res.status(429).json({
      error: {
        code: "TOO_MANY_REQUESTS",
        message: "Too many failed login attempts. Please try again later."
      }
    });
    return;
  }

  next();
}

export function recordFailedLogin(req: Request): void {
  const key = getClientKey(req);
  const now = Date.now();
  const record = failedAttempts.get(key) || { count: 0 };
  record.count += 1;

  if (record.count >= MAX_ATTEMPTS) {
    record.blockedUntil = now + BLOCK_DURATION_MS;
  }
  failedAttempts.set(key, record);
}

export function recordSuccessfulLogin(req: Request): void {
  const key = getClientKey(req);
  failedAttempts.delete(key);
}

export function resetLoginRateLimiter(): void {
  failedAttempts.clear();
}
