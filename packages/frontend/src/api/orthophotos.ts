import type { Orthophoto } from "@visor3d/shared";
import { apiFetch } from "./client";
import { getStoredAdminKey } from "./auth";

export function getOrthophoto(id: string): Promise<Orthophoto> {
  const adminKey = getStoredAdminKey();
  return apiFetch<Orthophoto>(`/api/orthophotos/${id}`, {
    headers: adminKey ? { "x-admin-key": adminKey } : undefined,
  });
}

export function listOrthophotos(): Promise<Orthophoto[]> {
  const adminKey = getStoredAdminKey();
  return apiFetch<Orthophoto[]>("/api/orthophotos", {
    headers: adminKey ? { "x-admin-key": adminKey } : undefined,
  });
}

export interface UploadOrthophotoInput {
  file: File;
  name: string;
  crsDescription?: string;
  notes?: string;
  boundsWest: number;
  boundsSouth: number;
  boundsEast: number;
  boundsNorth: number;
  minZoom: number;
  maxZoom: number;
}

export function uploadOrthophoto(input: UploadOrthophotoInput): Promise<Orthophoto> {
  const formData = new FormData();
  formData.append("file", input.file);
  formData.append("name", input.name);
  if (input.crsDescription) formData.append("crsDescription", input.crsDescription);
  if (input.notes) formData.append("notes", input.notes);
  formData.append("boundsWest", String(input.boundsWest));
  formData.append("boundsSouth", String(input.boundsSouth));
  formData.append("boundsEast", String(input.boundsEast));
  formData.append("boundsNorth", String(input.boundsNorth));
  formData.append("minZoom", String(input.minZoom));
  formData.append("maxZoom", String(input.maxZoom));

  const adminKey = getStoredAdminKey();
  return apiFetch<Orthophoto>("/api/orthophotos", {
    method: "POST",
    body: formData,
    headers: adminKey ? { "x-admin-key": adminKey } : undefined,
  });
}

export interface UpdateOrthophotoInput {
  name?: string;
  crsDescription?: string | null;
  notes?: string | null;
}

export function updateOrthophoto(id: string, patch: UpdateOrthophotoInput): Promise<Orthophoto> {
  const adminKey = getStoredAdminKey();
  return apiFetch<Orthophoto>(`/api/orthophotos/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(adminKey ? { "x-admin-key": adminKey } : {}),
    },
    body: JSON.stringify(patch),
  });
}

export function setOrthophotoPublished(id: string, isPublished: boolean): Promise<Orthophoto> {
  const adminKey = getStoredAdminKey();
  return apiFetch<Orthophoto>(`/api/orthophotos/${id}/publish`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(adminKey ? { "x-admin-key": adminKey } : {}),
    },
    body: JSON.stringify({ isPublished }),
  });
}

export function deleteOrthophoto(id: string): Promise<void> {
  const adminKey = getStoredAdminKey();
  return apiFetch<void>(`/api/orthophotos/${id}`, {
    method: "DELETE",
    headers: adminKey ? { "x-admin-key": adminKey } : undefined,
  });
}

export function orthophotoShareUrl(orthophoto: Orthophoto): string {
  return `${window.location.origin}/o/${orthophoto.id}`;
}

export function orthophotoTileUrlTemplate(orthophoto: Orthophoto): string {
  return `${window.location.origin}/api/orthophotos/${orthophoto.id}/tiles/{z}/{x}/{y}`;
}

export function orthophotoTerrainTileUrlTemplate(orthophoto: Orthophoto): string {
  return `${window.location.origin}/api/orthophotos/${orthophoto.id}/terrain-tiles/{z}/{x}/{y}`;
}

export function uploadOrthophotoTerrain(id: string, file: File, minZoom: number, maxZoom: number): Promise<Orthophoto> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("minZoom", String(minZoom));
  formData.append("maxZoom", String(maxZoom));

  const adminKey = getStoredAdminKey();
  return apiFetch<Orthophoto>(`/api/orthophotos/${id}/terrain`, {
    method: "POST",
    body: formData,
    headers: adminKey ? { "x-admin-key": adminKey } : undefined,
  });
}

export function deleteOrthophotoTerrain(id: string): Promise<Orthophoto> {
  const adminKey = getStoredAdminKey();
  return apiFetch<Orthophoto>(`/api/orthophotos/${id}/terrain`, {
    method: "DELETE",
    headers: adminKey ? { "x-admin-key": adminKey } : undefined,
  });
}
