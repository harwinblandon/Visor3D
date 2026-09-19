import type { Point3D, TourStop } from "@visor3d/shared";
import { apiFetch } from "./client";
import { getStoredAdminKey } from "./auth";

export interface CreateTourStopInput {
  modelId: string;
  position: Point3D;
  target: Point3D;
  label?: string | null;
}

export function createTourStop(input: CreateTourStopInput): Promise<TourStop> {
  const adminKey = getStoredAdminKey();
  return apiFetch<TourStop>("/api/tour-stops", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(adminKey ? { "x-admin-key": adminKey } : {}),
    },
    body: JSON.stringify(input),
  });
}

export function listTourStops(modelId: string): Promise<TourStop[]> {
  return apiFetch<TourStop[]>(`/api/tour-stops?modelId=${encodeURIComponent(modelId)}`);
}

export function deleteTourStop(id: string): Promise<void> {
  const adminKey = getStoredAdminKey();
  return apiFetch<void>(`/api/tour-stops/${id}`, {
    method: "DELETE",
    headers: adminKey ? { "x-admin-key": adminKey } : undefined,
  });
}

export function moveTourStop(id: string, direction: "up" | "down"): Promise<TourStop[]> {
  const adminKey = getStoredAdminKey();
  return apiFetch<TourStop[]>(`/api/tour-stops/${id}/move`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(adminKey ? { "x-admin-key": adminKey } : {}),
    },
    body: JSON.stringify({ direction }),
  });
}
