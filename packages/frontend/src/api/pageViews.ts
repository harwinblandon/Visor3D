import { apiFetch } from "./client";
import { getStoredAdminKey } from "./auth";

export type ViewSubjectType = "model" | "orthophoto";

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

export function getPageViewsSummary(): Promise<PageViewsSummary> {
  const adminKey = getStoredAdminKey();
  return apiFetch<PageViewsSummary>("/api/page-views/summary", {
    headers: adminKey ? { "x-admin-key": adminKey } : undefined,
  });
}
