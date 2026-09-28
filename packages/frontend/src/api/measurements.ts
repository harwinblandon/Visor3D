import type { Measurement, MeasurementType, Point3D } from "@h-geovisor/shared";
import { apiFetch } from "./client";

export interface CreateMeasurementInput {
  modelId?: string;
  orthophotoId?: string;
  type: MeasurementType;
  points: Point3D[];
  value: number;
  unit: string;
  label?: string | null;
  layer?: string | null;
}

export function createMeasurement(input: CreateMeasurementInput): Promise<Measurement> {
  return apiFetch<Measurement>("/api/measurements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function listMeasurements(filter: { modelId?: string; orthophotoId?: string }): Promise<Measurement[]> {
  const param = filter.modelId ? `modelId=${encodeURIComponent(filter.modelId)}` : `orthophotoId=${encodeURIComponent(filter.orthophotoId!)}`;
  return apiFetch<Measurement[]>(`/api/measurements?${param}`);
}

export interface UpdateMeasurementInput {
  points?: Point3D[];
  value?: number;
  label?: string | null;
  layer?: string | null;
  note?: string | null;
}

export function updateMeasurement(id: string, patch: UpdateMeasurementInput): Promise<Measurement> {
  return apiFetch<Measurement>(`/api/measurements/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export function deleteMeasurement(id: string): Promise<void> {
  return apiFetch<void>(`/api/measurements/${id}`, { method: "DELETE" });
}
