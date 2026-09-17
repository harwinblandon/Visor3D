import type { Request, Response } from "express";
import { isValidAdminKey } from "../middleware/auth.js";

export function verifyAdminKey(req: Request, res: Response) {
  const { password } = req.body ?? {};
  if (!isValidAdminKey(password)) {
    return res.status(401).json({ valid: false });
  }
  res.json({ valid: true });
}
