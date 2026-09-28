import type { Request, Response, NextFunction } from "express";
import * as orthophotosService from "../services/orthophotos.service.js";
import * as layersService from "../services/orthophotoLayers.service.js";
import { isValidAdminKey } from "../middleware/auth.js";

export async function uploadLayer(req: Request, res: Response, next: NextFunction) {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "Falta el archivo .kml/.kmz/.zip (campo 'file')" });
    }
    const orthophotoId = req.params.id;
    const orthophoto = await orthophotosService.getOrthophotoById(orthophotoId);
    if (!orthophoto) return res.status(404).json({ error: "Ortofoto no encontrada" });

    const isShapefile = /\.(zip|shp)$/i.test(file.originalname);
    const name = (req.body.name as string | undefined)?.trim() || file.originalname.replace(/\.(kml|kmz|zip|shp)$/i, "");

    let geojson;
    try {
      geojson = isShapefile
        ? await layersService.parseShapefile(file.buffer, file.originalname)
        : await layersService.parseKmlOrKmz(file.buffer, file.originalname);
    } catch (err) {
      return res.status(400).json({ error: err instanceof Error ? err.message : "No se pudo leer el archivo" });
    }

    const layer = await layersService.createLayer({
      orthophotoId,
      name,
      originalFilename: file.originalname,
      geojson,
    });
    res.status(201).json(layer);
  } catch (err) {
    next(err);
  }
}

export async function listLayers(req: Request, res: Response, next: NextFunction) {
  try {
    const orthophotoId = req.params.id;
    const orthophoto = await orthophotosService.getOrthophotoById(orthophotoId);
    if (!orthophoto) return res.status(404).json({ error: "Ortofoto no encontrada" });
    if (!orthophoto.isPublished && !isValidAdminKey(req.header("x-admin-key"))) {
      return res.status(404).json({ error: "Ortofoto no encontrada" });
    }
    res.json(await layersService.listLayers(orthophotoId));
  } catch (err) {
    next(err);
  }
}

export async function updateLayerStyle(req: Request, res: Response, next: NextFunction) {
  try {
    const { color, lineWidth, fillOpacity, labelField } = req.body;
    const layer = await layersService.updateLayerStyle(req.params.layerId, {
      color: color !== undefined ? color : undefined,
      lineWidth: lineWidth !== undefined ? Number(lineWidth) : undefined,
      fillOpacity: fillOpacity !== undefined ? Number(fillOpacity) : undefined,
      labelField: labelField !== undefined ? labelField : undefined,
    });
    if (!layer) return res.status(404).json({ error: "Capa no encontrada" });
    res.json(layer);
  } catch (err) {
    next(err);
  }
}

export async function deleteLayer(req: Request, res: Response, next: NextFunction) {
  try {
    const deleted = await layersService.deleteLayer(req.params.layerId);
    if (!deleted) return res.status(404).json({ error: "Capa no encontrada" });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
