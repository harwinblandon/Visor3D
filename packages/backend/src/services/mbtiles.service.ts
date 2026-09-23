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

export function closeAll(): void {
  for (const db of dbCache.values()) db.close();
  dbCache.clear();
  metadataCache.clear();
}
