import type { Orthophoto } from "@h-geovisor/shared";
import { pool } from "../db/pool.js";

interface OrthophotoRow {
  id: string;
  name: string;
  filename: string;
  original_filename: string | null;
  file_path: string;
  file_size_bytes: string | null;
  crs_description: string | null;
  bounds_west: number;
  bounds_south: number;
  bounds_east: number;
  bounds_north: number;
  min_zoom: number;
  max_zoom: number;
  is_published: boolean;
  notes: string | null;
  uploaded_at: string;
  terrain_path: string | null;
  terrain_min_zoom: number | null;
  terrain_max_zoom: number | null;
}

function mapRow(row: OrthophotoRow): Orthophoto {
  return {
    id: row.id,
    name: row.name,
    filename: row.filename,
    originalFilename: row.original_filename,
    filePath: row.file_path,
    fileSizeBytes: row.file_size_bytes ? Number(row.file_size_bytes) : null,
    crsDescription: row.crs_description,
    boundsWest: row.bounds_west,
    boundsSouth: row.bounds_south,
    boundsEast: row.bounds_east,
    boundsNorth: row.bounds_north,
    minZoom: row.min_zoom,
    maxZoom: row.max_zoom,
    isPublished: row.is_published,
    notes: row.notes,
    uploadedAt: row.uploaded_at,
    terrainPath: row.terrain_path,
    terrainMinZoom: row.terrain_min_zoom,
    terrainMaxZoom: row.terrain_max_zoom,
  };
}

export interface CreateOrthophotoInput {
  name: string;
  filename: string;
  originalFilename: string | null;
  filePath: string;
  fileSizeBytes: number | null;
  crsDescription?: string | null;
  boundsWest: number;
  boundsSouth: number;
  boundsEast: number;
  boundsNorth: number;
  minZoom: number;
  maxZoom: number;
  notes?: string | null;
}

export async function createOrthophoto(input: CreateOrthophotoInput): Promise<Orthophoto> {
  const { rows } = await pool.query<OrthophotoRow>(
    `INSERT INTO orthophotos
       (name, filename, original_filename, file_path, file_size_bytes, crs_description,
        bounds_west, bounds_south, bounds_east, bounds_north, min_zoom, max_zoom, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      input.name,
      input.filename,
      input.originalFilename,
      input.filePath,
      input.fileSizeBytes,
      input.crsDescription ?? null,
      input.boundsWest,
      input.boundsSouth,
      input.boundsEast,
      input.boundsNorth,
      input.minZoom,
      input.maxZoom,
      input.notes ?? null,
    ],
  );
  return mapRow(rows[0]);
}

export async function listOrthophotos(): Promise<Orthophoto[]> {
  const { rows } = await pool.query<OrthophotoRow>("SELECT * FROM orthophotos ORDER BY uploaded_at DESC");
  return rows.map(mapRow);
}

export async function getOrthophotoById(id: string): Promise<Orthophoto | null> {
  const { rows } = await pool.query<OrthophotoRow>("SELECT * FROM orthophotos WHERE id = $1", [id]);
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function setPublished(id: string, isPublished: boolean): Promise<Orthophoto | null> {
  const { rows } = await pool.query<OrthophotoRow>(
    "UPDATE orthophotos SET is_published = $2 WHERE id = $1 RETURNING *",
    [id, isPublished],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export interface ReplaceFileInput {
  filename: string;
  originalFilename: string | null;
  filePath: string;
  fileSizeBytes: number | null;
  boundsWest: number;
  boundsSouth: number;
  boundsEast: number;
  boundsNorth: number;
  minZoom: number;
  maxZoom: number;
}

export async function replaceFile(id: string, input: ReplaceFileInput): Promise<Orthophoto | null> {
  const { rows } = await pool.query<OrthophotoRow>(
    `UPDATE orthophotos
       SET filename = $2, original_filename = $3, file_path = $4, file_size_bytes = $5,
           bounds_west = $6, bounds_south = $7, bounds_east = $8, bounds_north = $9,
           min_zoom = $10, max_zoom = $11
     WHERE id = $1
     RETURNING *`,
    [
      id,
      input.filename,
      input.originalFilename,
      input.filePath,
      input.fileSizeBytes,
      input.boundsWest,
      input.boundsSouth,
      input.boundsEast,
      input.boundsNorth,
      input.minZoom,
      input.maxZoom,
    ],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export interface SetTerrainInput {
  terrainPath: string;
  terrainMinZoom: number;
  terrainMaxZoom: number;
}

export async function setTerrain(id: string, input: SetTerrainInput): Promise<Orthophoto | null> {
  const { rows } = await pool.query<OrthophotoRow>(
    "UPDATE orthophotos SET terrain_path = $2, terrain_min_zoom = $3, terrain_max_zoom = $4 WHERE id = $1 RETURNING *",
    [id, input.terrainPath, input.terrainMinZoom, input.terrainMaxZoom],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function clearTerrain(id: string): Promise<{ orthophoto: Orthophoto; removedTerrainPath: string | null } | null> {
  const current = await getOrthophotoById(id);
  if (!current) return null;

  const { rows } = await pool.query<OrthophotoRow>(
    "UPDATE orthophotos SET terrain_path = NULL, terrain_min_zoom = NULL, terrain_max_zoom = NULL WHERE id = $1 RETURNING *",
    [id],
  );
  return rows[0] ? { orthophoto: mapRow(rows[0]), removedTerrainPath: current.terrainPath } : null;
}

export interface UpdateOrthophotoInput {
  name?: string;
  crsDescription?: string | null;
  notes?: string | null;
}

export async function updateOrthophoto(id: string, patch: UpdateOrthophotoInput): Promise<Orthophoto | null> {
  const { rows: currentRows } = await pool.query<OrthophotoRow>("SELECT * FROM orthophotos WHERE id = $1", [id]);
  const current = currentRows[0];
  if (!current) return null;

  const name = patch.name !== undefined ? patch.name : current.name;
  const crsDescription = patch.crsDescription !== undefined ? patch.crsDescription : current.crs_description;
  const notes = patch.notes !== undefined ? patch.notes : current.notes;

  const { rows } = await pool.query<OrthophotoRow>(
    "UPDATE orthophotos SET name = $2, crs_description = $3, notes = $4 WHERE id = $1 RETURNING *",
    [id, name, crsDescription, notes],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export interface DeletedOrthophotoFiles {
  orthophotoFilePath: string;
  terrainFilePath: string | null;
  photoFilePaths: string[];
}

export async function deleteOrthophoto(id: string): Promise<DeletedOrthophotoFiles | null> {
  const orthophoto = await getOrthophotoById(id);
  if (!orthophoto) return null;

  const { rows: photoRows } = await pool.query<{ file_path: string }>(
    `SELECT ap.file_path
     FROM annotation_photos ap
     JOIN annotations a ON a.id = ap.annotation_id
     WHERE a.orthophoto_id = $1`,
    [id],
  );

  // El borrado en cascada (measurements, annotations, annotation_photos) queda
  // a cargo de las FK ON DELETE CASCADE definidas en las migraciones.
  await pool.query("DELETE FROM orthophotos WHERE id = $1", [id]);

  return {
    orthophotoFilePath: orthophoto.filePath,
    terrainFilePath: orthophoto.terrainPath,
    photoFilePaths: photoRows.map((r) => r.file_path),
  };
}
