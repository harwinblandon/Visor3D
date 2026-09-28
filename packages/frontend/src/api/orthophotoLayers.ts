import type { OrthophotoLayer } from "@visor3d/shared";
import { apiFetch } from "./client";
import { getStoredAdminKey } from "./auth";

export function listOrthophotoLayers(orthophotoId: string): Promise<OrthophotoLayer[]> {
  const adminKey = getStoredAdminKey();
  return apiFetch<OrthophotoLayer[]>(`/api/orthophotos/${orthophotoId}/layers`, {
    headers: adminKey ? { "x-admin-key": adminKey } : undefined,
  });
}

export function uploadOrthophotoLayer(orthophotoId: string, file: File, name?: string): Promise<OrthophotoLayer> {
  const formData = new FormData();
  formData.append("file", file);
  if (name) formData.append("name", name);

  const adminKey = getStoredAdminKey();
  return apiFetch<OrthophotoLayer>(`/api/orthophotos/${orthophotoId}/layers`, {
    method: "POST",
    body: formData,
    headers: adminKey ? { "x-admin-key": adminKey } : undefined,
  });
}

export interface UpdateOrthophotoLayerStyleInput {
  name?: string;
  color?: string | null;
  lineWidth?: number;
  fillOpacity?: number;
  labelField?: string | null;
}

export function updateOrthophotoLayerStyle(
  orthophotoId: string,
  layerId: string,
  patch: UpdateOrthophotoLayerStyleInput,
): Promise<OrthophotoLayer> {
  const adminKey = getStoredAdminKey();
  return apiFetch<OrthophotoLayer>(`/api/orthophotos/${orthophotoId}/layers/${layerId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(adminKey ? { "x-admin-key": adminKey } : {}),
    },
    body: JSON.stringify(patch),
  });
}

export function deleteOrthophotoLayer(orthophotoId: string, layerId: string): Promise<void> {
  const adminKey = getStoredAdminKey();
  return apiFetch<void>(`/api/orthophotos/${orthophotoId}/layers/${layerId}`, {
    method: "DELETE",
    headers: adminKey ? { "x-admin-key": adminKey } : undefined,
  });
}
