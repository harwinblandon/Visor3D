import type { Measurement, MeasurementType, Point3D } from "@visor3d/shared";
import { pool } from "../db/pool.js";

interface MeasurementRow {
  id: string;
  model_id: string;
  type: MeasurementType;
  points: Point3D[];
  value: number;
  unit: string;
  label: string | null;
  author: string | null;
  note: string | null;
  created_at: string;
}

function mapRow(row: MeasurementRow): Measurement {
  return {
    id: row.id,
    modelId: row.model_id,
    type: row.type,
    points: row.points,
    value: Number(row.value),
    unit: row.unit,
    label: row.label,
    author: row.author,
    note: row.note,
    createdAt: row.created_at,
  };
}

export interface CreateMeasurementInput {
  modelId: string;
  type: MeasurementType;
  points: Point3D[];
  value: number;
  unit: string;
  label?: string | null;
  author?: string | null;
  note?: string | null;
}

export async function createMeasurement(input: CreateMeasurementInput): Promise<Measurement> {
  const { rows } = await pool.query<MeasurementRow>(
    `INSERT INTO measurements (model_id, type, points, value, unit, label, author, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      input.modelId,
      input.type,
      JSON.stringify(input.points),
      input.value,
      input.unit,
      input.label ?? null,
      input.author ?? null,
      input.note ?? null,
    ],
  );
  return mapRow(rows[0]);
}

export async function listMeasurements(modelId: string): Promise<Measurement[]> {
  const { rows } = await pool.query<MeasurementRow>(
    "SELECT * FROM measurements WHERE model_id = $1 ORDER BY created_at ASC",
    [modelId],
  );
  return rows.map(mapRow);
}

export async function deleteMeasurement(id: string): Promise<boolean> {
  const { rowCount } = await pool.query("DELETE FROM measurements WHERE id = $1", [id]);
  return (rowCount ?? 0) > 0;
}
