import type { Annotation, AnnotationPhoto, DamageType, Severity, AnnotationStatus } from "@visor3d/shared";
import { pool } from "../db/pool.js";

interface AnnotationRow {
  id: string;
  model_id: string;
  position_x: number;
  position_y: number;
  position_z: number;
  normal_x: number | null;
  normal_y: number | null;
  normal_z: number | null;
  damage_type: DamageType;
  severity: Severity | null;
  status: AnnotationStatus;
  description: string | null;
  author: string | null;
  detected_at: string | null;
  created_at: string;
  updated_at: string;
}

interface PhotoRow {
  id: string;
  annotation_id: string;
  filename: string;
  file_path: string;
  file_size_bytes: string | null;
  uploaded_at: string;
}

function mapPhotoRow(row: PhotoRow): AnnotationPhoto {
  return {
    id: row.id,
    annotationId: row.annotation_id,
    filename: row.filename,
    filePath: row.file_path,
    fileSizeBytes: row.file_size_bytes ? Number(row.file_size_bytes) : null,
    uploadedAt: row.uploaded_at,
  };
}

function mapRow(row: AnnotationRow, photos: AnnotationPhoto[]): Annotation {
  return {
    id: row.id,
    modelId: row.model_id,
    position: { x: row.position_x, y: row.position_y, z: row.position_z },
    normal:
      row.normal_x !== null && row.normal_y !== null && row.normal_z !== null
        ? { x: row.normal_x, y: row.normal_y, z: row.normal_z }
        : null,
    damageType: row.damage_type,
    severity: row.severity,
    status: row.status,
    description: row.description,
    author: row.author,
    detectedAt: row.detected_at ? new Date(row.detected_at).toISOString().slice(0, 10) : null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    photos,
  };
}

export interface CreateAnnotationInput {
  modelId: string;
  position: { x: number; y: number; z: number };
  normal?: { x: number; y: number; z: number } | null;
  damageType: DamageType;
  severity?: Severity | null;
  description?: string | null;
  author?: string | null;
  detectedAt?: string | null;
}

export async function createAnnotation(input: CreateAnnotationInput): Promise<Annotation> {
  const { rows } = await pool.query<AnnotationRow>(
    `INSERT INTO annotations
       (model_id, position_x, position_y, position_z, normal_x, normal_y, normal_z, damage_type, severity, description, author, detected_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      input.modelId,
      input.position.x,
      input.position.y,
      input.position.z,
      input.normal?.x ?? null,
      input.normal?.y ?? null,
      input.normal?.z ?? null,
      input.damageType,
      input.severity ?? null,
      input.description ?? null,
      input.author ?? null,
      input.detectedAt ?? null,
    ],
  );
  return mapRow(rows[0], []);
}

export async function listAnnotations(filters: {
  modelId: string;
  damageType?: string;
  severity?: string;
  from?: string;
  to?: string;
}): Promise<Annotation[]> {
  const conditions = ["model_id = $1"];
  const params: unknown[] = [filters.modelId];

  if (filters.damageType) {
    params.push(filters.damageType);
    conditions.push(`damage_type = $${params.length}`);
  }
  if (filters.severity) {
    params.push(filters.severity);
    conditions.push(`severity = $${params.length}`);
  }
  if (filters.from) {
    params.push(filters.from);
    conditions.push(`detected_at >= $${params.length}`);
  }
  if (filters.to) {
    params.push(filters.to);
    conditions.push(`detected_at <= $${params.length}`);
  }

  const { rows } = await pool.query<AnnotationRow>(
    `SELECT * FROM annotations WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`,
    params,
  );

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const { rows: photoRows } = await pool.query<PhotoRow>(
    "SELECT * FROM annotation_photos WHERE annotation_id = ANY($1) ORDER BY uploaded_at ASC",
    [ids],
  );

  const photosByAnnotation = new Map<string, AnnotationPhoto[]>();
  for (const p of photoRows) {
    const list = photosByAnnotation.get(p.annotation_id) ?? [];
    list.push(mapPhotoRow(p));
    photosByAnnotation.set(p.annotation_id, list);
  }

  return rows.map((r) => mapRow(r, photosByAnnotation.get(r.id) ?? []));
}

export async function getAnnotationById(id: string): Promise<Annotation | null> {
  const { rows } = await pool.query<AnnotationRow>("SELECT * FROM annotations WHERE id = $1", [id]);
  if (!rows[0]) return null;

  const { rows: photoRows } = await pool.query<PhotoRow>(
    "SELECT * FROM annotation_photos WHERE annotation_id = $1 ORDER BY uploaded_at ASC",
    [id],
  );
  return mapRow(rows[0], photoRows.map(mapPhotoRow));
}

export interface UpdateAnnotationInput {
  damageType?: DamageType;
  severity?: Severity | null;
  status?: AnnotationStatus;
  description?: string | null;
}

export async function updateAnnotation(id: string, input: UpdateAnnotationInput): Promise<Annotation | null> {
  const fields: string[] = [];
  const params: unknown[] = [];

  if (input.damageType !== undefined) {
    params.push(input.damageType);
    fields.push(`damage_type = $${params.length}`);
  }
  if (input.severity !== undefined) {
    params.push(input.severity);
    fields.push(`severity = $${params.length}`);
  }
  if (input.status !== undefined) {
    params.push(input.status);
    fields.push(`status = $${params.length}`);
  }
  if (input.description !== undefined) {
    params.push(input.description);
    fields.push(`description = $${params.length}`);
  }

  if (fields.length === 0) return getAnnotationById(id);

  fields.push("updated_at = now()");
  params.push(id);

  const { rows } = await pool.query<AnnotationRow>(
    `UPDATE annotations SET ${fields.join(", ")} WHERE id = $${params.length} RETURNING *`,
    params,
  );
  if (!rows[0]) return null;
  return getAnnotationById(rows[0].id);
}

export async function deleteAnnotation(id: string): Promise<AnnotationPhoto[] | null> {
  const { rows: photoRows } = await pool.query<PhotoRow>(
    "SELECT * FROM annotation_photos WHERE annotation_id = $1",
    [id],
  );
  const { rowCount } = await pool.query("DELETE FROM annotations WHERE id = $1", [id]);
  if (!rowCount) return null;
  return photoRows.map(mapPhotoRow);
}

export async function addPhoto(
  annotationId: string,
  file: { filename: string; originalname: string; size: number },
): Promise<AnnotationPhoto> {
  const { rows } = await pool.query<PhotoRow>(
    `INSERT INTO annotation_photos (annotation_id, filename, file_path, file_size_bytes)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [annotationId, file.filename, `photos/${file.filename}`, file.size],
  );
  return mapPhotoRow(rows[0]);
}

export async function deletePhoto(photoId: string): Promise<AnnotationPhoto | null> {
  const { rows } = await pool.query<PhotoRow>("SELECT * FROM annotation_photos WHERE id = $1", [photoId]);
  if (!rows[0]) return null;
  await pool.query("DELETE FROM annotation_photos WHERE id = $1", [photoId]);
  return mapPhotoRow(rows[0]);
}
