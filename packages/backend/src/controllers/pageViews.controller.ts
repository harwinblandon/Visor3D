import type { Request, Response, NextFunction } from "express";
import * as pageViewsService from "../services/pageViews.service.js";

export async function getSummary(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await pageViewsService.getSummary());
  } catch (err) {
    next(err);
  }
}
