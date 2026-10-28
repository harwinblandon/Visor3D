import { pool } from "../db/pool.js";

export type ViewSubjectType = "model" | "orthophoto";

export async function recordView(subjectType: ViewSubjectType, subjectId: string, ipAddress: string | null, userAgent: string | null): Promise<void> {
  await pool.query("INSERT INTO page_views (subject_type, subject_id, ip_address, user_agent) VALUES ($1, $2, $3, $4)", [
    subjectType,
    subjectId,
    ipAddress,
    userAgent,
  ]);
}

export interface DayCount {
  date: string;
  count: number;
}

export interface SubjectCount {
  subjectType: ViewSubjectType;
  subjectId: string;
  name: string;
  count: number;
}

export interface RecentView {
  id: string;
  subjectType: ViewSubjectType;
  subjectId: string;
  name: string;
  ipAddress: string | null;
  userAgent: string | null;
  viewedAt: string;
}

export interface PageViewsSummary {
  totalViews: number;
  uniqueIps: number;
  viewsToday: number;
  byDay: DayCount[];
  bySubject: SubjectCount[];
  recent: RecentView[];
}

export async function getSummary(): Promise<PageViewsSummary> {
  const [totals, today, byDay, bySubject, recent] = await Promise.all([
    pool.query<{ total: string; unique_ips: string }>(
      "SELECT COUNT(*) AS total, COUNT(DISTINCT ip_address) AS unique_ips FROM page_views",
    ),
    pool.query<{ count: string }>("SELECT COUNT(*) AS count FROM page_views WHERE viewed_at >= date_trunc('day', now())"),
    pool.query<{ date: string; count: string }>(
      `SELECT to_char(date_trunc('day', viewed_at), 'YYYY-MM-DD') AS date, COUNT(*) AS count
       FROM page_views
       WHERE viewed_at >= now() - interval '30 days'
       GROUP BY 1
       ORDER BY 1`,
    ),
    pool.query<{ subject_type: ViewSubjectType; subject_id: string; name: string; count: string }>(
      `SELECT pv.subject_type, pv.subject_id,
         COALESCE(m.name, o.name, '(eliminado)') AS name,
         COUNT(*) AS count
       FROM page_views pv
       LEFT JOIN models m ON pv.subject_type = 'model' AND m.id = pv.subject_id
       LEFT JOIN orthophotos o ON pv.subject_type = 'orthophoto' AND o.id = pv.subject_id
       GROUP BY 1, 2, 3
       ORDER BY count DESC
       LIMIT 20`,
    ),
    pool.query<{
      id: string;
      subject_type: ViewSubjectType;
      subject_id: string;
      name: string;
      ip_address: string | null;
      user_agent: string | null;
      viewed_at: string;
    }>(
      `SELECT pv.id, pv.subject_type, pv.subject_id,
         COALESCE(m.name, o.name, '(eliminado)') AS name,
         pv.ip_address, pv.user_agent, pv.viewed_at
       FROM page_views pv
       LEFT JOIN models m ON pv.subject_type = 'model' AND m.id = pv.subject_id
       LEFT JOIN orthophotos o ON pv.subject_type = 'orthophoto' AND o.id = pv.subject_id
       ORDER BY pv.viewed_at DESC
       LIMIT 100`,
    ),
  ]);

  return {
    totalViews: Number(totals.rows[0]?.total ?? 0),
    uniqueIps: Number(totals.rows[0]?.unique_ips ?? 0),
    viewsToday: Number(today.rows[0]?.count ?? 0),
    byDay: byDay.rows.map((r) => ({ date: r.date, count: Number(r.count) })),
    bySubject: bySubject.rows.map((r) => ({
      subjectType: r.subject_type,
      subjectId: r.subject_id,
      name: r.name,
      count: Number(r.count),
    })),
    recent: recent.rows.map((r) => ({
      id: r.id,
      subjectType: r.subject_type,
      subjectId: r.subject_id,
      name: r.name,
      ipAddress: r.ip_address,
      userAgent: r.user_agent,
      viewedAt: r.viewed_at,
    })),
  };
}
