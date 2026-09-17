import type { Request, Response, NextFunction } from "express";
import * as measurementsService from "../services/measurements.service.js";

export async function createMeasurement(req: Request, res: Response, next: NextFunction) {
  try {
    const { modelId, type, points, value, unit, label, author, note } = req.body;
    if (!modelId || !type || !points || value === undefined || !unit) {
      return res.status(400).json({ error: "Faltan campos requeridos (modelId, type, points, value, unit)" });
    }
    const measurement = await measurementsService.createMeasurement({
      modelId,
      type,
      points,
      value,
      unit,
      label,
      author,
      note,
    });
    res.status(201).json(measurement);
  } catch (err) {
    next(err);
  }
}

export async function listMeasurements(req: Request, res: Response, next: NextFunction) {
  try {
    const { modelId } = req.query;
    if (!modelId || typeof modelId !== "string") {
      return res.status(400).json({ error: "Falta el parámetro 'modelId'" });
    }
    res.json(await measurementsService.listMeasurements(modelId));
  } catch (err) {
    next(err);
  }
}

export async function deleteMeasurement(req: Request, res: Response, next: NextFunction) {
  try {
    const deleted = await measurementsService.deleteMeasurement(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Medición no encontrada" });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
