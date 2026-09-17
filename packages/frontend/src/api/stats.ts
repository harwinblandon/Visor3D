import type { StatsSummary } from "@visor3d/shared";
import { apiFetch } from "./client";

export function getSummary(modelId: string): Promise<StatsSummary> {
  return apiFetch<StatsSummary>(`/api/stats/summary?modelId=${encodeURIComponent(modelId)}`);
}
