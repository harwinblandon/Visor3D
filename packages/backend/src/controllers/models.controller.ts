import type { Request, Response, NextFunction } from "express";
import * as modelsService from "../services/models.service.js";
import { isValidAdminKey } from "../middleware/auth.js";
import { fixUploadFilename } from "../utils/encoding.js";
import { maybeRecordView } from "../utils/recordView.js";
import { persistLocalFile, removeFile } from "../utils/fileCache.js";

export async function uploadModel(req: Request, res: Response, next: NextFunction) {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "Falta el archivo .glb (campo 'file')" });
    }
    file.originalname = fixUploadFilename(file.originalname);
    const { name, crsDescription, notes, latitude, longitude } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Falta el campo 'name'" });
    }

    const filePath = `models/${file.filename}`;
    await persistLocalFile(filePath, file.mimetype);

    const model = await modelsService.createModel({
      name,
      filename: file.filename,
      originalFilename: file.originalname,
      filePath,
      fileSizeBytes: file.size,
      crsDescription: crsDescription || null,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      notes: notes || null,
    });

    res.status(201).json(model);
  } catch (err) {
    next(err);
  }
}

export async function listModels(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await modelsService.listModels());
  } catch (err) {
    next(err);
  }
}

export async function getActiveModel(req: Request, res: Response, next: NextFunction) {
  try {
    const model = await modelsService.getActiveModel();
    if (!model) return res.status(404).json({ error: "No hay ningún modelo activo" });
    if (!model.isPublished && !isValidAdminKey(req.header("x-admin-key"))) {
      return res.status(404).json({ error: "No hay ningún modelo activo" });
    }
    maybeRecordView(req, "model", model.id);
    res.json(model);
  } catch (err) {
    next(err);
  }
}

export async function getModelById(req: Request, res: Response, next: NextFunction) {
  try {
    const model = await modelsService.getModelById(req.params.id);
    if (!model) return res.status(404).json({ error: "Modelo no encontrado" });
    if (!model.isPublished && !isValidAdminKey(req.header("x-admin-key"))) {
      return res.status(404).json({ error: "Modelo no encontrado" });
    }
    maybeRecordView(req, "model", model.id);
    res.json(model);
  } catch (err) {
    next(err);
  }
}

export async function activateModel(req: Request, res: Response, next: NextFunction) {
  try {
    const model = await modelsService.setActiveModel(req.params.id);
    if (!model) return res.status(404).json({ error: "Modelo no encontrado" });
    res.json(model);
  } catch (err) {
    next(err);
  }
}

export async function updateModel(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, crsDescription, latitude, longitude, notes } = req.body;
    if (name !== undefined && !String(name).trim()) {
      return res.status(400).json({ error: "El nombre no puede quedar vacío" });
    }

    const patch: Record<string, unknown> = {};
    if (name !== undefined) patch.name = name;
    if (crsDescription !== undefined) patch.crsDescription = crsDescription || null;
    if (latitude !== undefined) patch.latitude = latitude === null ? null : Number(latitude);
    if (longitude !== undefined) patch.longitude = longitude === null ? null : Number(longitude);
    if (notes !== undefined) patch.notes = notes || null;

    const model = await modelsService.updateModel(req.params.id, patch);
    if (!model) return res.status(404).json({ error: "Modelo no encontrado" });
    res.json(model);
  } catch (err) {
    next(err);
  }
}

export async function setPublished(req: Request, res: Response, next: NextFunction) {
  try {
    const { isPublished } = req.body;
    if (typeof isPublished !== "boolean") {
      return res.status(400).json({ error: "Falta el campo booleano 'isPublished'" });
    }
    const model = await modelsService.setPublished(req.params.id, isPublished);
    if (!model) return res.status(404).json({ error: "Modelo no encontrado" });
    res.json(model);
  } catch (err) {
    next(err);
  }
}

export async function deleteModel(req: Request, res: Response, next: NextFunction) {
  try {
    const deleted = await modelsService.deleteModel(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Modelo no encontrado" });

    await removeFile(deleted.modelFilePath);
    await Promise.all(deleted.photoFilePaths.map((p) => removeFile(p)));

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
