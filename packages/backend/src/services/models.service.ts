import type { Model } from "@visor3d/shared";
import { pool } from "../db/pool.js";

interface ModelRow {
  id: string;
  name: string;
  filename: string;
  original_filename: string | null;
  file_path: string;
  file_size_bytes: string | null;
  crs_description: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  notes: string | null;
  uploaded_at: string;
}

function mapRow(row: ModelRow): Model {
  return {
    id: row.id,
    name: row.name,
    filename: row.filename,
    originalFilename: row.original_filename,
    filePath: row.file_path,
    fileSizeBytes: row.file_size_bytes ? Number(row.file_size_bytes) : null,
    crsDescription: row.crs_description,
    latitude: row.latitude,
    longitude: row.longitude,
    isActive: row.is_active,
    notes: row.notes,
    uploadedAt: row.uploaded_at,
  };
}

export interface CreateModelInput {
  name: string;
  filename: string;
  originalFilename: string | null;
  filePath: string;
  fileSizeBytes: number | null;
  crsDescription?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
}

export async function createModel(input: CreateModelInput): Promise<Model> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE models SET is_active = false WHERE is_active = true");
    const { rows } = await client.query<ModelRow>(
      `INSERT INTO models (name, filename, original_filename, file_path, file_size_bytes, crs_description, latitude, longitude, notes, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
       RETURNING *`,
      [
        input.name,
        input.filename,
        input.originalFilename,
        input.filePath,
        input.fileSizeBytes,
        input.crsDescription ?? null,
        input.latitude ?? null,
        input.longitude ?? null,
        input.notes ?? null,
      ],
    );
    await client.query("COMMIT");
    return mapRow(rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function listModels(): Promise<Model[]> {
  const { rows } = await pool.query<ModelRow>("SELECT * FROM models ORDER BY uploaded_at DESC");
  return rows.map(mapRow);
}

export async function getActiveModel(): Promise<Model | null> {
  const { rows } = await pool.query<ModelRow>("SELECT * FROM models WHERE is_active = true LIMIT 1");
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function getModelById(id: string): Promise<Model | null> {
  const { rows } = await pool.query<ModelRow>("SELECT * FROM models WHERE id = $1", [id]);
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function setActiveModel(id: string): Promise<Model | null> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE models SET is_active = false WHERE is_active = true");
    const { rows } = await client.query<ModelRow>(
      "UPDATE models SET is_active = true WHERE id = $1 RETURNING *",
      [id],
    );
    await client.query("COMMIT");
    return rows[0] ? mapRow(rows[0]) : null;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export interface DeletedModelFiles {
  modelFilePath: string;
  photoFilePaths: string[];
}

export async function deleteModel(id: string): Promise<DeletedModelFiles | null> {
  const model = await getModelById(id);
  if (!model) return null;

  const { rows: photoRows } = await pool.query<{ file_path: string }>(
    `SELECT ap.file_path
     FROM annotation_photos ap
     JOIN annotations a ON a.id = ap.annotation_id
     WHERE a.model_id = $1`,
    [id],
  );

  // El borrado en cascada (measurements, annotations, annotation_photos) queda
  // a cargo de las FK ON DELETE CASCADE definidas en las migraciones.
  await pool.query("DELETE FROM models WHERE id = $1", [id]);

  return {
    modelFilePath: model.filePath,
    photoFilePaths: photoRows.map((r) => r.file_path),
  };
}
