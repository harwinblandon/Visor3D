import type { Annotation, DamageType, Severity, AnnotationStatus, Point3D } from "@visor3d/shared";
import { apiFetch } from "./client";
import { getStoredAdminKey } from "./auth";

export interface CreateAnnotationInput {
  modelId?: string;
  orthophotoId?: string;
  position: Point3D;
  normal?: Point3D | null;
  damageType: DamageType;
  severity?: Severity | null;
  description?: string;
  author?: string;
  detectedAt?: string;
}

export function createAnnotation(input: CreateAnnotationInput): Promise<Annotation> {
  return apiFetch<Annotation>("/api/annotations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function listAnnotations(filter: { modelId?: string; orthophotoId?: string }): Promise<Annotation[]> {
  const param = filter.modelId ? `modelId=${encodeURIComponent(filter.modelId)}` : `orthophotoId=${encodeURIComponent(filter.orthophotoId!)}`;
  return apiFetch<Annotation[]>(`/api/annotations?${param}`);
}

export interface UpdateAnnotationInput {
  damageType?: DamageType;
  severity?: Severity | null;
  status?: AnnotationStatus;
  description?: string;
}

export function updateAnnotation(id: string, input: UpdateAnnotationInput): Promise<Annotation> {
  return apiFetch<Annotation>(`/api/annotations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function deleteAnnotation(id: string): Promise<void> {
  return apiFetch<void>(`/api/annotations/${id}`, { method: "DELETE" });
}

export function uploadAnnotationPhotos(annotationId: string, files: File[]) {
  const formData = new FormData();
  for (const file of files) formData.append("files", file);
  const adminKey = getStoredAdminKey();
  return apiFetch(`/api/annotations/${annotationId}/photos`, {
    method: "POST",
    body: formData,
    headers: adminKey ? { "x-admin-key": adminKey } : undefined,
  });
}

export function deleteAnnotationPhoto(annotationId: string, photoId: string): Promise<void> {
  const adminKey = getStoredAdminKey();
  return apiFetch<void>(`/api/annotations/${annotationId}/photos/${photoId}`, {
    method: "DELETE",
    headers: adminKey ? { "x-admin-key": adminKey } : undefined,
  });
}

export function photoUrl(filePath: string): string {
  return `/uploads/${filePath}`;
}
