import type { StatsSummary } from "@h-geovisor/shared";
import { apiFetch } from "./client";

export function getSummary(modelId: string): Promise<StatsSummary> {
  return apiFetch<StatsSummary>(`/api/stats/summary?modelId=${encodeURIComponent(modelId)}`);
}
