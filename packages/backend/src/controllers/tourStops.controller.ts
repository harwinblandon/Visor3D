import type { Request, Response, NextFunction } from "express";
import * as tourStopsService from "../services/tourStops.service.js";

export async function createTourStop(req: Request, res: Response, next: NextFunction) {
  try {
    const { modelId, position, target, label } = req.body;
    if (!modelId || !position || !target) {
      return res.status(400).json({ error: "Faltan campos requeridos (modelId, position, target)" });
    }
    const stop = await tourStopsService.createTourStop({ modelId, position, target, label });
    res.status(201).json(stop);
  } catch (err) {
    next(err);
  }
}

export async function listTourStops(req: Request, res: Response, next: NextFunction) {
  try {
    const { modelId } = req.query;
    if (!modelId || typeof modelId !== "string") {
      return res.status(400).json({ error: "Falta el parámetro 'modelId'" });
    }
    res.json(await tourStopsService.listTourStops(modelId));
  } catch (err) {
    next(err);
  }
}

export async function deleteTourStop(req: Request, res: Response, next: NextFunction) {
  try {
    const deleted = await tourStopsService.deleteTourStop(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Parada no encontrada" });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function moveTourStop(req: Request, res: Response, next: NextFunction) {
  try {
    const { direction } = req.body;
    if (direction !== "up" && direction !== "down") {
      return res.status(400).json({ error: "El campo 'direction' debe ser 'up' o 'down'" });
    }
    const stops = await tourStopsService.moveTourStop(req.params.id, direction);
    if (!stops) return res.status(404).json({ error: "Parada no encontrada" });
    res.json(stops);
  } catch (err) {
    next(err);
  }
}
