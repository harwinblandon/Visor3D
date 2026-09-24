import path from "node:path";
import { fileURLToPath } from "node:url";
import { unlink } from "node:fs/promises";
import type { Request, Response, NextFunction } from "express";
import * as orthophotosService from "../services/orthophotos.service.js";
import * as mbtilesService from "../services/mbtiles.service.js";
import { isValidAdminKey } from "../middleware/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsRoot = path.join(__dirname, "..", "..", "uploads");

async function safeUnlink(relativePath: string) {
  try {
    await unlink(path.join(uploadsRoot, relativePath));
  } catch (err) {
    console.error(`No se pudo borrar el archivo ${relativePath}:`, err);
  }
}

export async function uploadOrthophoto(req: Request, res: Response, next: NextFunction) {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "Falta el archivo .mbtiles (campo 'file')" });
    }
    const { name, crsDescription, notes, boundsWest, boundsSouth, boundsEast, boundsNorth, minZoom, maxZoom } =
      req.body;
    if (!name) {
      return res.status(400).json({ error: "Falta el campo 'name'" });
    }
    if (
      boundsWest === undefined ||
      boundsSouth === undefined ||
      boundsEast === undefined ||
      boundsNorth === undefined ||
      minZoom === undefined ||
      maxZoom === undefined
    ) {
      return res
        .status(400)
        .json({ error: "Faltan campos requeridos (boundsWest, boundsSouth, boundsEast, boundsNorth, minZoom, maxZoom)" });
    }

    const orthophoto = await orthophotosService.createOrthophoto({
      name,
      filename: file.filename,
      originalFilename: file.originalname,
      filePath: `orthophotos/${file.filename}`,
      fileSizeBytes: file.size,
      crsDescription: crsDescription || null,
      boundsWest: Number(boundsWest),
      boundsSouth: Number(boundsSouth),
      boundsEast: Number(boundsEast),
      boundsNorth: Number(boundsNorth),
      minZoom: Number(minZoom),
      maxZoom: Number(maxZoom),
      notes: notes || null,
    });

    res.status(201).json(orthophoto);
  } catch (err) {
    next(err);
  }
}

export async function listOrthophotos(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await orthophotosService.listOrthophotos());
  } catch (err) {
    next(err);
  }
}

export async function getOrthophotoById(req: Request, res: Response, next: NextFunction) {
  try {
    const orthophoto = await orthophotosService.getOrthophotoById(req.params.id);
    if (!orthophoto) return res.status(404).json({ error: "Ortofoto no encontrada" });
    if (!orthophoto.isPublished && !isValidAdminKey(req.header("x-admin-key"))) {
      return res.status(404).json({ error: "Ortofoto no encontrada" });
    }
    res.json(orthophoto);
  } catch (err) {
    next(err);
  }
}

export async function updateOrthophoto(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, crsDescription, notes } = req.body;
    if (name !== undefined && !String(name).trim()) {
      return res.status(400).json({ error: "El nombre no puede quedar vacío" });
    }

    const patch: Record<string, unknown> = {};
    if (name !== undefined) patch.name = name;
    if (crsDescription !== undefined) patch.crsDescription = crsDescription || null;
    if (notes !== undefined) patch.notes = notes || null;

    const orthophoto = await orthophotosService.updateOrthophoto(req.params.id, patch);
    if (!orthophoto) return res.status(404).json({ error: "Ortofoto no encontrada" });
    res.json(orthophoto);
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
    const orthophoto = await orthophotosService.setPublished(req.params.id, isPublished);
    if (!orthophoto) return res.status(404).json({ error: "Ortofoto no encontrada" });
    res.json(orthophoto);
  } catch (err) {
    next(err);
  }
}

export async function getTile(req: Request, res: Response, next: NextFunction) {
  try {
    const orthophoto = await orthophotosService.getOrthophotoById(req.params.id);
    if (!orthophoto) return res.status(404).end();
    if (!orthophoto.isPublished && !isValidAdminKey(req.header("x-admin-key"))) {
      return res.status(404).end();
    }

    const z = Number(req.params.z);
    const x = Number(req.params.x);
    const y = Number(req.params.y);
    if (!Number.isInteger(z) || !Number.isInteger(x) || !Number.isInteger(y)) {
      return res.status(400).end();
    }

    const tile = mbtilesService.getTile(orthophoto.filePath, z, x, y);
    if (!tile) return res.status(404).end();

    res.setHeader("Content-Type", tile.contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.send(tile.data);
  } catch (err) {
    next(err);
  }
}

export async function deleteOrthophoto(req: Request, res: Response, next: NextFunction) {
  try {
    const deleted = await orthophotosService.deleteOrthophoto(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Ortofoto no encontrada" });

    await safeUnlink(deleted.orthophotoFilePath);
    if (deleted.terrainFilePath) await safeUnlink(deleted.terrainFilePath);
    await Promise.all(deleted.photoFilePaths.map((p) => safeUnlink(p)));

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function uploadTerrain(req: Request, res: Response, next: NextFunction) {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "Falta el archivo .mbtiles del terreno (campo 'file')" });
    }
    const { minZoom, maxZoom } = req.body;
    if (minZoom === undefined || maxZoom === undefined) {
      return res.status(400).json({ error: "Faltan campos requeridos (minZoom, maxZoom)" });
    }

    const previous = await orthophotosService.getOrthophotoById(req.params.id);
    if (!previous) {
      await safeUnlink(`orthophotos/${file.filename}`);
      return res.status(404).json({ error: "Ortofoto no encontrada" });
    }

    const orthophoto = await orthophotosService.setTerrain(req.params.id, {
      terrainPath: `orthophotos/${file.filename}`,
      terrainMinZoom: Number(minZoom),
      terrainMaxZoom: Number(maxZoom),
    });

    if (previous.terrainPath) await safeUnlink(previous.terrainPath);

    res.status(201).json(orthophoto);
  } catch (err) {
    next(err);
  }
}

export async function deleteTerrain(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await orthophotosService.clearTerrain(req.params.id);
    if (!result) return res.status(404).json({ error: "Ortofoto no encontrada" });

    if (result.removedTerrainPath) await safeUnlink(result.removedTerrainPath);

    res.json(result.orthophoto);
  } catch (err) {
    next(err);
  }
}

export async function getTerrainTile(req: Request, res: Response, next: NextFunction) {
  try {
    const orthophoto = await orthophotosService.getOrthophotoById(req.params.id);
    if (!orthophoto || !orthophoto.terrainPath) return res.status(404).end();
    if (!orthophoto.isPublished && !isValidAdminKey(req.header("x-admin-key"))) {
      return res.status(404).end();
    }

    const z = Number(req.params.z);
    const x = Number(req.params.x);
    const y = Number(req.params.y);
    if (!Number.isInteger(z) || !Number.isInteger(x) || !Number.isInteger(y)) {
      return res.status(400).end();
    }

    const tile = mbtilesService.getTile(orthophoto.terrainPath, z, x, y);
    if (!tile) return res.status(404).end();

    res.setHeader("Content-Type", tile.contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.send(tile.data);
  } catch (err) {
    next(err);
  }
}
