import type { Request, Response, NextFunction } from "express";
import * as modelsService from "../services/models.service.js";
import * as measurementsService from "../services/measurements.service.js";
import * as annotationsService from "../services/annotations.service.js";
import { buildDXF, buildGeoJSON, buildAnnotationsCSV } from "../services/export.service.js";

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase() || "modelo";
}

export async function exportModel(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const format = String(req.query.format ?? "").toLowerCase();
    if (format !== "dxf" && format !== "geojson") {
      return res.status(400).json({ error: "Parámetro 'format' debe ser 'dxf' o 'geojson'" });
    }

    const model = await modelsService.getModelById(id);
    if (!model) return res.status(404).json({ error: "Modelo no encontrado" });

    const measurements = await measurementsService.listMeasurements(id);
    const baseName = slugify(model.name);

    if (format === "dxf") {
      const dxf = buildDXF(measurements);
      res.setHeader("Content-Type", "application/dxf");
      res.setHeader("Content-Disposition", `attachment; filename="${baseName}.dxf"`);
      return res.send(dxf);
    }

    const geojson = buildGeoJSON(measurements);
    res.setHeader("Content-Type", "application/geo+json");
    res.setHeader("Content-Disposition", `attachment; filename="${baseName}.geojson"`);
    return res.send(JSON.stringify(geojson, null, 2));
  } catch (err) {
    next(err);
  }
}

export async function exportAnnotations(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const model = await modelsService.getModelById(id);
    if (!model) return res.status(404).json({ error: "Modelo no encontrado" });

    const annotations = await annotationsService.listAnnotations({ modelId: id });
    const csv = buildAnnotationsCSV(annotations);
    const baseName = slugify(model.name);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${baseName}_inventario_danos.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
}
