import type { Measurement, MeasurementType, Point3D } from "@visor3d/shared";
import { apiFetch } from "./client";

export interface CreateMeasurementInput {
  modelId: string;
  type: MeasurementType;
  points: Point3D[];
  value: number;
  unit: string;
}

export function createMeasurement(input: CreateMeasurementInput): Promise<Measurement> {
  return apiFetch<Measurement>("/api/measurements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function listMeasurements(modelId: string): Promise<Measurement[]> {
  return apiFetch<Measurement[]>(`/api/measurements?modelId=${encodeURIComponent(modelId)}`);
}

export function updateMeasurement(id: string, points: Point3D[], value: number): Promise<Measurement> {
  return apiFetch<Measurement>(`/api/measurements/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ points, value }),
  });
}

export function deleteMeasurement(id: string): Promise<void> {
  return apiFetch<void>(`/api/measurements/${id}`, { method: "DELETE" });
}
