import type { DamageType, Severity, AnnotationStatus, StatsSummary } from "@visor3d/shared";
import { pool } from "../db/pool.js";

const DAMAGE_TYPES: DamageType[] = ["grieta", "fisura", "desprendimiento", "humedad", "corrosion", "otro"];
const SEVERITIES: Severity[] = ["baja", "media", "alta"];
const STATUSES: AnnotationStatus[] = ["abierto", "en_revision", "resuelto"];

function zeroed<K extends string>(keys: K[]): Record<K, number> {
  return Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
}

export async function getSummary(modelId: string): Promise<StatsSummary> {
  const [totalResult, byTypeResult, bySeverityResult, byStatusResult, overTimeResult] = await Promise.all([
    pool.query("SELECT count(*) FROM annotations WHERE model_id = $1", [modelId]),
    pool.query(
      "SELECT damage_type, count(*) FROM annotations WHERE model_id = $1 GROUP BY damage_type",
      [modelId],
    ),
    pool.query(
      "SELECT severity, count(*) FROM annotations WHERE model_id = $1 GROUP BY severity",
      [modelId],
    ),
    pool.query(
      "SELECT status, count(*) FROM annotations WHERE model_id = $1 GROUP BY status",
      [modelId],
    ),
    pool.query(
      `SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month, count(*)
       FROM annotations WHERE model_id = $1 GROUP BY 1 ORDER BY 1`,
      [modelId],
    ),
  ]);

  const byType = zeroed(DAMAGE_TYPES);
  for (const row of byTypeResult.rows) byType[row.damage_type as DamageType] = Number(row.count);

  const bySeverity = zeroed(SEVERITIES);
  for (const row of bySeverityResult.rows) bySeverity[row.severity as Severity] = Number(row.count);

  const byStatus = zeroed(STATUSES);
  for (const row of byStatusResult.rows) byStatus[row.status as AnnotationStatus] = Number(row.count);

  const overTime = overTimeResult.rows.map((row) => ({ month: row.month as string, count: Number(row.count) }));

  return {
    totalAnnotations: Number(totalResult.rows[0].count),
    byType,
    bySeverity,
    byStatus,
    overTime,
  };
}
