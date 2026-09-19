import type { Model } from "@visor3d/shared";
import { apiFetch } from "./client";
import { getStoredAdminKey } from "./auth";

export function getActiveModel(): Promise<Model> {
  const adminKey = getStoredAdminKey();
  return apiFetch<Model>("/api/models/active", {
    headers: adminKey ? { "x-admin-key": adminKey } : undefined,
  });
}

export function listModels(): Promise<Model[]> {
  const adminKey = getStoredAdminKey();
  return apiFetch<Model[]>("/api/models", {
    headers: adminKey ? { "x-admin-key": adminKey } : undefined,
  });
}

export function getModel(id: string): Promise<Model> {
  const adminKey = getStoredAdminKey();
  return apiFetch<Model>(`/api/models/${id}`, {
    headers: adminKey ? { "x-admin-key": adminKey } : undefined,
  });
}

export interface UploadModelInput {
  file: File;
  name: string;
  crsDescription?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
}

export function uploadModel(input: UploadModelInput): Promise<Model> {
  const formData = new FormData();
  formData.append("file", input.file);
  formData.append("name", input.name);
  if (input.crsDescription) formData.append("crsDescription", input.crsDescription);
  if (input.notes) formData.append("notes", input.notes);
  if (input.latitude !== undefined) formData.append("latitude", String(input.latitude));
  if (input.longitude !== undefined) formData.append("longitude", String(input.longitude));

  const adminKey = getStoredAdminKey();
  return apiFetch<Model>("/api/models", {
    method: "POST",
    body: formData,
    headers: adminKey ? { "x-admin-key": adminKey } : undefined,
  });
}

export function activateModel(id: string): Promise<Model> {
  const adminKey = getStoredAdminKey();
  return apiFetch<Model>(`/api/models/${id}/activate`, {
    method: "PATCH",
    headers: adminKey ? { "x-admin-key": adminKey } : undefined,
  });
}

export function setModelPublished(id: string, isPublished: boolean): Promise<Model> {
  const adminKey = getStoredAdminKey();
  return apiFetch<Model>(`/api/models/${id}/publish`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(adminKey ? { "x-admin-key": adminKey } : {}),
    },
    body: JSON.stringify({ isPublished }),
  });
}

export function deleteModel(id: string): Promise<void> {
  const adminKey = getStoredAdminKey();
  return apiFetch<void>(`/api/models/${id}`, {
    method: "DELETE",
    headers: adminKey ? { "x-admin-key": adminKey } : undefined,
  });
}

export function modelShareUrl(model: Model): string {
  return `${window.location.origin}/m/${model.id}`;
}

export function modelFileUrl(model: Model): string {
  return `/uploads/${model.filePath}`;
}

export function exportUrl(modelId: string, format: "dxf" | "geojson"): string {
  return `/api/models/${modelId}/export?format=${format}`;
}

export function exportAnnotationsUrl(modelId: string): string {
  return `/api/models/${modelId}/export-annotations`;
}
