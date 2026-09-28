import type { TourStop, Point3D } from "@h-geovisor/shared";
import { pool } from "../db/pool.js";

interface TourStopRow {
  id: string;
  model_id: string;
  order_index: number;
  position_x: number;
  position_y: number;
  position_z: number;
  target_x: number;
  target_y: number;
  target_z: number;
  label: string | null;
  created_at: string;
}

function mapRow(row: TourStopRow): TourStop {
  return {
    id: row.id,
    modelId: row.model_id,
    orderIndex: row.order_index,
    position: { x: row.position_x, y: row.position_y, z: row.position_z },
    target: { x: row.target_x, y: row.target_y, z: row.target_z },
    label: row.label,
    createdAt: row.created_at,
  };
}

export interface CreateTourStopInput {
  modelId: string;
  position: Point3D;
  target: Point3D;
  label?: string | null;
}

export async function createTourStop(input: CreateTourStopInput): Promise<TourStop> {
  const { rows: maxRows } = await pool.query<{ max: number | null }>(
    "SELECT MAX(order_index) AS max FROM tour_stops WHERE model_id = $1",
    [input.modelId],
  );
  const nextIndex = (maxRows[0].max ?? -1) + 1;

  const { rows } = await pool.query<TourStopRow>(
    `INSERT INTO tour_stops (model_id, order_index, position_x, position_y, position_z, target_x, target_y, target_z, label)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      input.modelId,
      nextIndex,
      input.position.x,
      input.position.y,
      input.position.z,
      input.target.x,
      input.target.y,
      input.target.z,
      input.label ?? null,
    ],
  );
  return mapRow(rows[0]);
}

export async function listTourStops(modelId: string): Promise<TourStop[]> {
  const { rows } = await pool.query<TourStopRow>(
    "SELECT * FROM tour_stops WHERE model_id = $1 ORDER BY order_index ASC",
    [modelId],
  );
  return rows.map(mapRow);
}

export async function deleteTourStop(id: string): Promise<boolean> {
  const { rowCount } = await pool.query("DELETE FROM tour_stops WHERE id = $1", [id]);
  return (rowCount ?? 0) > 0;
}

export async function moveTourStop(id: string, direction: "up" | "down"): Promise<TourStop[] | null> {
  const { rows: currentRows } = await pool.query<TourStopRow>("SELECT * FROM tour_stops WHERE id = $1", [id]);
  const current = currentRows[0];
  if (!current) return null;

  const { rows: siblings } = await pool.query<TourStopRow>(
    `SELECT * FROM tour_stops WHERE model_id = $1 AND order_index ${direction === "up" ? "<" : ">"} $2
     ORDER BY order_index ${direction === "up" ? "DESC" : "ASC"} LIMIT 1`,
    [current.model_id, current.order_index],
  );
  const neighbor = siblings[0];
  if (!neighbor) return listTourStops(current.model_id);

  await pool.query("BEGIN");
  try {
    await pool.query("UPDATE tour_stops SET order_index = $2 WHERE id = $1", [current.id, neighbor.order_index]);
    await pool.query("UPDATE tour_stops SET order_index = $2 WHERE id = $1", [neighbor.id, current.order_index]);
    await pool.query("COMMIT");
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }

  return listTourStops(current.model_id);
}
