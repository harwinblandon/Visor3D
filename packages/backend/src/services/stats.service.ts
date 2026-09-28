import type { Severity, AnnotationStatus, StatsSummary } from "@h-geovisor/shared";
import { pool } from "../db/pool.js";

const SEVERITIES: Severity[] = ["baja", "media", "alta"];
const STATUSES: AnnotationStatus[] = ["abierto", "en_revision", "resuelto"];
const NO_SEVERITY_KEY = "sin_definir";

function zeroed<K extends string>(keys: K[]): Record<K, number> {
  return Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
}

export interface GetSummaryFilter {
  modelId?: string;
  orthophotoId?: string;
}

export async function getSummary(filter: GetSummaryFilter): Promise<StatsSummary> {
  const column = filter.modelId ? "model_id" : "orthophoto_id";
  const subjectId = filter.modelId ?? filter.orthophotoId;
  const [totalResult, byTypeResult, bySeverityResult, byStatusResult, overTimeResult] = await Promise.all([
    pool.query(`SELECT count(*) FROM annotations WHERE ${column} = $1`, [subjectId]),
    pool.query(
      `SELECT damage_type, count(*) FROM annotations WHERE ${column} = $1 GROUP BY damage_type`,
      [subjectId],
    ),
    pool.query(
      `SELECT severity, count(*) FROM annotations WHERE ${column} = $1 GROUP BY severity`,
      [subjectId],
    ),
    pool.query(
      `SELECT status, count(*) FROM annotations WHERE ${column} = $1 GROUP BY status`,
      [subjectId],
    ),
    pool.query(
      `SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month, count(*)
       FROM annotations WHERE ${column} = $1 GROUP BY 1 ORDER BY 1`,
      [subjectId],
    ),
  ]);

  const byType: Record<string, number> = {};
  for (const row of byTypeResult.rows) {
    if (row.damage_type) byType[row.damage_type] = Number(row.count);
  }

  const bySeverity: Record<string, number> = zeroed(SEVERITIES);
  bySeverity[NO_SEVERITY_KEY] = 0;
  for (const row of bySeverityResult.rows) {
    const key = row.severity ?? NO_SEVERITY_KEY;
    bySeverity[key] = Number(row.count);
  }

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
