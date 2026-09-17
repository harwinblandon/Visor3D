import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";

export function isValidAdminKey(candidate: string | undefined): boolean {
  if (!candidate || !env.adminPassword) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(env.adminPassword);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const key = req.header("x-admin-key");
  if (!isValidAdminKey(key)) {
    return res.status(401).json({ error: "Clave de administrador inválida o ausente" });
  }
  next();
}
