import path from "node:path";
import { fileURLToPath } from "node:url";
import { unlink } from "node:fs/promises";
import type { Request, Response, NextFunction } from "express";
import * as annotationsService from "../services/annotations.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsRoot = path.join(__dirname, "..", "..", "uploads");

async function safeUnlink(relativePath: string) {
  try {
    await unlink(path.join(uploadsRoot, relativePath));
  } catch (err) {
    console.error(`No se pudo borrar el archivo ${relativePath}:`, err);
  }
}

export async function createAnnotation(req: Request, res: Response, next: NextFunction) {
  try {
    const { modelId, position, normal, damageType, severity, description, author, detectedAt } = req.body;
    if (!modelId || !position || !damageType) {
      return res.status(400).json({ error: "Faltan campos requeridos (modelId, position, damageType)" });
    }
    const annotation = await annotationsService.createAnnotation({
      modelId,
      position,
      normal,
      damageType,
      severity,
      description,
      author,
      detectedAt,
    });
    res.status(201).json(annotation);
  } catch (err) {
    next(err);
  }
}

export async function listAnnotations(req: Request, res: Response, next: NextFunction) {
  try {
    const { modelId, damageType, severity, from, to } = req.query;
    if (!modelId || typeof modelId !== "string") {
      return res.status(400).json({ error: "Falta el parámetro 'modelId'" });
    }
    const annotations = await annotationsService.listAnnotations({
      modelId,
      damageType: typeof damageType === "string" ? damageType : undefined,
      severity: typeof severity === "string" ? severity : undefined,
      from: typeof from === "string" ? from : undefined,
      to: typeof to === "string" ? to : undefined,
    });
    res.json(annotations);
  } catch (err) {
    next(err);
  }
}

export async function getAnnotation(req: Request, res: Response, next: NextFunction) {
  try {
    const annotation = await annotationsService.getAnnotationById(req.params.id);
    if (!annotation) return res.status(404).json({ error: "Anotación no encontrada" });
    res.json(annotation);
  } catch (err) {
    next(err);
  }
}

export async function updateAnnotation(req: Request, res: Response, next: NextFunction) {
  try {
    const { damageType, severity, status, description } = req.body;
    const annotation = await annotationsService.updateAnnotation(req.params.id, {
      damageType,
      severity,
      status,
      description,
    });
    if (!annotation) return res.status(404).json({ error: "Anotación no encontrada" });
    res.json(annotation);
  } catch (err) {
    next(err);
  }
}

export async function deleteAnnotation(req: Request, res: Response, next: NextFunction) {
  try {
    const photos = await annotationsService.deleteAnnotation(req.params.id);
    if (!photos) return res.status(404).json({ error: "Anotación no encontrada" });
    await Promise.all(photos.map((p) => safeUnlink(p.filePath)));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function addPhotos(req: Request, res: Response, next: NextFunction) {
  try {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) {
      return res.status(400).json({ error: "No se recibieron archivos (campo 'files')" });
    }
    const annotation = await annotationsService.getAnnotationById(req.params.id);
    if (!annotation) return res.status(404).json({ error: "Anotación no encontrada" });

    const photos = await Promise.all(
      files.map((file) => annotationsService.addPhoto(req.params.id, file)),
    );
    res.status(201).json(photos);
  } catch (err) {
    next(err);
  }
}

export async function deletePhoto(req: Request, res: Response, next: NextFunction) {
  try {
    const photo = await annotationsService.deletePhoto(req.params.photoId);
    if (!photo) return res.status(404).json({ error: "Foto no encontrada" });
    await safeUnlink(photo.filePath);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
