import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsRoot = path.join(__dirname, "..", "..", "uploads");

const FORMAT_CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

// Cache de conexiones SQLite de solo lectura por archivo .mbtiles, evita reabrir el
// archivo en cada tesela (las teselas de una ortofoto publicada se piden constantemente).
const dbCache = new Map<string, Database.Database>();
const metadataCache = new Map<string, Map<string, string>>();

function openDb(relativeFilePath: string): Database.Database {
  const absPath = path.join(uploadsRoot, relativeFilePath);
  let db = dbCache.get(absPath);
  if (!db) {
    db = new Database(absPath, { readonly: true, fileMustExist: true });
    dbCache.set(absPath, db);
  }
  return db;
}

function getMetadata(relativeFilePath: string, key: string): string | undefined {
  const absPath = path.join(uploadsRoot, relativeFilePath);
  let meta = metadataCache.get(absPath);
  if (!meta) {
    const db = openDb(relativeFilePath);
    const rows = db.prepare("SELECT name, value FROM metadata").all() as { name: string; value: string }[];
    meta = new Map(rows.map((r) => [r.name, r.value]));
    metadataCache.set(absPath, meta);
  }
  return meta.get(key);
}

export interface TileResult {
  data: Buffer;
  contentType: string;
}

export function getTile(relativeFilePath: string, z: number, x: number, y: number): TileResult | null {
  const db = openDb(relativeFilePath);
  // MBTiles usa el esquema TMS (fila 0 = sur), el visor pide XYZ estándar (fila 0 = norte).
  const tmsY = 2 ** z - 1 - y;
  const row = db
    .prepare("SELECT tile_data FROM tiles WHERE zoom_level = ? AND tile_column = ? AND tile_row = ?")
    .get(z, x, tmsY) as { tile_data: Buffer } | undefined;
  if (!row) return null;

  const format = getMetadata(relativeFilePath, "format") ?? "png";
  return {
    data: row.tile_data,
    contentType: FORMAT_CONTENT_TYPES[format.toLowerCase()] ?? "application/octet-stream",
  };
}

export interface MbtilesBoundsZoom {
  boundsWest: number;
  boundsSouth: number;
  boundsEast: number;
  boundsNorth: number;
  minZoom: number;
  maxZoom: number;
}

/**
 * Lee bounds/zoom directamente de la tabla "metadata" de un .mbtiles recien subido (GDAL los
 * escribe ahi mismo al generar el archivo), para no tener que pedirselos al usuario a mano en
 * el formulario de subida. absoluteFilePath es la ruta completa en disco (no relativa a
 * uploads/), ya que esto se usa justo al recibir el archivo, antes de servir teselas.
 */
export function readBoundsAndZoom(absoluteFilePath: string): MbtilesBoundsZoom | null {
  let db: Database.Database | undefined;
  try {
    db = new Database(absoluteFilePath, { readonly: true, fileMustExist: true });
    const rows = db.prepare("SELECT name, value FROM metadata").all() as { name: string; value: string }[];
    const meta = new Map(rows.map((r) => [r.name, r.value]));

    const boundsRaw = meta.get("bounds");
    const minZoomRaw = meta.get("minzoom");
    const maxZoomRaw = meta.get("maxzoom");
    if (!boundsRaw || minZoomRaw === undefined || maxZoomRaw === undefined) return null;

    const parts = boundsRaw.split(",").map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return null;
    const [boundsWest, boundsSouth, boundsEast, boundsNorth] = parts;

    const minZoom = Number(minZoomRaw);
    const maxZoom = Number(maxZoomRaw);
    if (Number.isNaN(minZoom) || Number.isNaN(maxZoom)) return null;

    return { boundsWest, boundsSouth, boundsEast, boundsNorth, minZoom, maxZoom };
  } catch {
    return null;
  } finally {
    db?.close();
  }
}

export function closeAll(): void {
  for (const db of dbCache.values()) db.close();
  dbCache.clear();
  metadataCache.clear();
}
