import type { Request, Response, NextFunction } from "express";
import * as statsService from "../services/stats.service.js";

export async function getSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const { modelId } = req.query;
    if (!modelId || typeof modelId !== "string") {
      return res.status(400).json({ error: "Falta el parámetro 'modelId'" });
    }
    res.json(await statsService.getSummary(modelId));
  } catch (err) {
    next(err);
  }
}
