import type { Annotation, DamageType, Severity, AnnotationStatus, Point3D } from "@visor3d/shared";
import { apiFetch } from "./client";

export interface CreateAnnotationInput {
  modelId: string;
  position: Point3D;
  normal?: Point3D | null;
  damageType: DamageType;
  severity: Severity;
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

export function listAnnotations(modelId: string): Promise<Annotation[]> {
  return apiFetch<Annotation[]>(`/api/annotations?modelId=${encodeURIComponent(modelId)}`);
}

export interface UpdateAnnotationInput {
  damageType?: DamageType;
  severity?: Severity;
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
  return apiFetch(`/api/annotations/${annotationId}/photos`, { method: "POST", body: formData });
}

export function deleteAnnotationPhoto(annotationId: string, photoId: string): Promise<void> {
  return apiFetch<void>(`/api/annotations/${annotationId}/photos/${photoId}`, { method: "DELETE" });
}

export function photoUrl(filePath: string): string {
  return `/uploads/${filePath}`;
}
