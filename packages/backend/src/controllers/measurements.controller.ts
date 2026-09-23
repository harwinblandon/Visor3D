import type { Request, Response, NextFunction } from "express";
import * as measurementsService from "../services/measurements.service.js";

export async function createMeasurement(req: Request, res: Response, next: NextFunction) {
  try {
    const { modelId, orthophotoId, type, points, value, unit, label, layer, author, note } = req.body;
    if ((!modelId && !orthophotoId) || (modelId && orthophotoId)) {
      return res.status(400).json({ error: "Debe indicarse exactamente uno de 'modelId' u 'orthophotoId'" });
    }
    if (!type || !points || value === undefined || !unit) {
      return res.status(400).json({ error: "Faltan campos requeridos (type, points, value, unit)" });
    }
    const measurement = await measurementsService.createMeasurement({
      modelId,
      orthophotoId,
      type,
      points,
      value,
      unit,
      label,
      layer,
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
    const { modelId, orthophotoId } = req.query;
    if ((!modelId || typeof modelId !== "string") && (!orthophotoId || typeof orthophotoId !== "string")) {
      return res.status(400).json({ error: "Falta el parámetro 'modelId' u 'orthophotoId'" });
    }
    res.json(
      await measurementsService.listMeasurements({
        modelId: typeof modelId === "string" ? modelId : undefined,
        orthophotoId: typeof orthophotoId === "string" ? orthophotoId : undefined,
      }),
    );
  } catch (err) {
    next(err);
  }
}

export async function updateMeasurement(req: Request, res: Response, next: NextFunction) {
  try {
    const { points, value, label, layer, note } = req.body;
    const patch: Record<string, unknown> = {};
    if (points !== undefined) patch.points = points;
    if (value !== undefined) patch.value = value;
    if (label !== undefined) patch.label = label;
    if (layer !== undefined) patch.layer = layer;
    if (note !== undefined) patch.note = note;

    const measurement = await measurementsService.updateMeasurement(req.params.id, patch);
    if (!measurement) return res.status(404).json({ error: "Medición no encontrada" });
    res.json(measurement);
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
