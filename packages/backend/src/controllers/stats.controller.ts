import type { Request, Response, NextFunction } from "express";
import * as statsService from "../services/stats.service.js";

export async function getSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const { modelId, orthophotoId } = req.query;
    if ((!modelId || typeof modelId !== "string") && (!orthophotoId || typeof orthophotoId !== "string")) {
      return res.status(400).json({ error: "Falta el parámetro 'modelId' u 'orthophotoId'" });
    }
    res.json(
      await statsService.getSummary({
        modelId: typeof modelId === "string" ? modelId : undefined,
        orthophotoId: typeof orthophotoId === "string" ? orthophotoId : undefined,
      }),
    );
  } catch (err) {
    next(err);
  }
}
