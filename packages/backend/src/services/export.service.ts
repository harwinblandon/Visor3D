import Drawing from "dxf-writer";
import type { Measurement, Annotation, Point3D } from "@visor3d/shared";
import { circleFromPoints, circlePolygon } from "@visor3d/shared";

const LAYER_BY_TYPE: Record<Measurement["type"], string> = {
  distance: "Distancias",
  area: "Areas",
  polyline: "Polilineas",
  circle: "Circulos",
};

const COLOR_BY_TYPE: Record<Measurement["type"], number> = {
  distance: Drawing.ACI.YELLOW,
  area: Drawing.ACI.CYAN,
  polyline: Drawing.ACI.WHITE,
  circle: Drawing.ACI.MAGENTA,
};

function resolveLayerName(m: Measurement): string {
  const custom = m.layer?.trim();
  return custom ? custom : LAYER_BY_TYPE[m.type];
}

/** Puntos "reales" de la geometría de una medición, expandiendo círculos a un polígono aproximado. */
function geometryPoints(m: Measurement): Point3D[] {
  if (m.type === "circle") {
    return circlePolygon(circleFromPoints(m.points));
  }
  return m.points;
}

function featurePoints(m: Measurement): Array<[number, number, number]> {
  const pts = geometryPoints(m).map((p) => [p.x, p.y, p.z] as [number, number, number]);
  if ((m.type === "area" || m.type === "circle") && pts.length > 0) {
    return [...pts, pts[0]];
  }
  return pts;
}

export function buildDXF(measurements: Measurement[]): string {
  const drawing = new Drawing();
  drawing.setUnits("Meters");

  const layerColors = new Map<string, number>();
  for (const m of measurements) {
    const name = resolveLayerName(m);
    if (!layerColors.has(name)) layerColors.set(name, COLOR_BY_TYPE[m.type]);
  }
  for (const [name, color] of layerColors) {
    drawing.addLayer(name, color, "CONTINUOUS");
  }

  for (const m of measurements) {
    drawing.setActiveLayer(resolveLayerName(m));
    const pts = featurePoints(m);
    if (pts.length >= 2) {
      drawing.drawPolyline3d(pts);
    }
  }

  return drawing.toDxfString();
}

const DAMAGE_LABELS: Record<string, string> = {
  grieta: "Grieta",
  fisura: "Fisura",
  desprendimiento: "Desprendimiento",
  humedad: "Humedad",
  corrosion: "Corrosión",
  otro: "Otro",
};

const SEVERITY_LABELS: Record<string, string> = { baja: "Baja", media: "Media", alta: "Alta" };

const STATUS_LABELS: Record<string, string> = {
  abierto: "Abierto",
  en_revision: "En revisión",
  resuelto: "Resuelto",
};

function csvField(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildAnnotationsCSV(annotations: Annotation[]): string {
  const headers = [
    "Fecha detectada",
    "Categoría",
    "Severidad",
    "Estado",
    "Descripción",
    "Autor",
    "Posición X (m)",
    "Posición Y (m)",
    "Posición Z (m)",
    "N° de fotos",
    "Fecha de registro",
  ];

  const rows = annotations.map((a) => [
    csvField(a.detectedAt),
    csvField(DAMAGE_LABELS[a.damageType] ?? a.damageType),
    csvField(a.severity ? (SEVERITY_LABELS[a.severity] ?? a.severity) : ""),
    csvField(STATUS_LABELS[a.status] ?? a.status),
    csvField(a.description),
    csvField(a.author),
    csvField(a.position.x.toFixed(3)),
    csvField(a.position.y.toFixed(3)),
    csvField(a.position.z.toFixed(3)),
    csvField(a.photos.length),
    csvField(a.createdAt),
  ]);

  const lines = [headers.map(csvField).join(","), ...rows.map((r) => r.join(","))];
  return "﻿" + lines.join("\r\n");
}

export function buildGeoJSON(measurements: Measurement[]): object {
  return {
    type: "FeatureCollection",
    features: measurements.map((m) => ({
      type: "Feature",
      properties: {
        id: m.id,
        measurementType: m.type,
        layer: resolveLayerName(m),
        value: m.value,
        unit: m.unit,
        label: m.label,
        author: m.author,
        note: m.note,
        createdAt: m.createdAt,
      },
      geometry:
        m.type === "area" || m.type === "circle"
          ? { type: "Polygon", coordinates: [featurePoints(m)] }
          : { type: "LineString", coordinates: featurePoints(m) },
    })),
  };
}
