import { useMemo } from "react";
import type { FillLayerSpecification, LineLayerSpecification, SymbolLayerSpecification } from "maplibre-gl";
import { useOrthophotoStore } from "../../state/orthophotoStore";
import { useMap } from "../MapContext";
import { useGeoJsonLayer } from "../useGeoJsonLayer";
import { polygonFeature, pointFeature, featureCollection } from "../geojson";
import { computeArea } from "../math/geo";
import { createMeasurement } from "../../api/measurements";
import { theme } from "../../styles/theme";

const SOURCE_ID = "area-measurements";
const PENDING_SOURCE_ID = "area-pending";

const LAYERS: [FillLayerSpecification, LineLayerSpecification, SymbolLayerSpecification] = [
  {
    id: "area-measurements-fill",
    type: "fill",
    source: SOURCE_ID,
    filter: ["==", ["geometry-type"], "Polygon"],
    paint: { "fill-color": theme.color.area, "fill-opacity": 0.2 },
  },
  {
    id: "area-measurements-outline",
    type: "line",
    source: SOURCE_ID,
    filter: ["==", ["geometry-type"], "Polygon"],
    paint: { "line-color": theme.color.area, "line-width": 2 },
  },
  {
    id: "area-measurements-label",
    type: "symbol",
    source: SOURCE_ID,
    filter: ["==", ["geometry-type"], "Point"],
    layout: { "text-field": ["get", "label"], "text-size": 12, "text-allow-overlap": true },
    paint: { "text-color": theme.color.text, "text-halo-color": theme.color.bg, "text-halo-width": 1.5 },
  },
];

const PENDING_LAYERS: [FillLayerSpecification, LineLayerSpecification] = [
  {
    id: "area-pending-fill",
    type: "fill",
    source: PENDING_SOURCE_ID,
    paint: { "fill-color": theme.color.area, "fill-opacity": 0.12 },
  },
  {
    id: "area-pending-outline",
    type: "line",
    source: PENDING_SOURCE_ID,
    paint: { "line-color": theme.color.area, "line-width": 2, "line-dasharray": [2, 2] },
  },
];

export function finalizeAreaPolygon() {
  const { pendingPoints, addAreaMeasurement, clearPendingPoints, orthophotoId } = useOrthophotoStore.getState();
  if (pendingPoints.length < 3) return;

  const area = computeArea(pendingPoints);
  const points = [...pendingPoints];
  const id = crypto.randomUUID();
  addAreaMeasurement({ id, points, area, label: null, layer: null, note: null });
  clearPendingPoints();

  if (orthophotoId) {
    createMeasurement({
      orthophotoId,
      type: "area",
      points: points.map((p) => ({ x: p[0], y: p[1], z: 0 })),
      value: area,
      unit: "m2",
    })
      .then((saved) => {
        useOrthophotoStore.setState((state) => ({
          areaMeasurements: state.areaMeasurements.map((m) => (m.id === id ? { ...m, id: saved.id } : m)),
        }));
        useOrthophotoStore.getState().setLastCreatedMeasurementId(saved.id);
      })
      .catch((err) => console.error("No se pudo guardar la medición de área:", err));
  }
}

function polygonCentroid(points: [number, number][]): [number, number] {
  const n = points.length;
  const sum = points.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]] as [number, number], [0, 0] as [number, number]);
  return [sum[0] / n, sum[1] / n];
}

export function MeasureAreaTool() {
  const map = useMap();
  const activeTool = useOrthophotoStore((s) => s.activeTool);
  const pendingPoints = useOrthophotoStore((s) => s.pendingPoints);
  const areaMeasurements = useOrthophotoStore((s) => s.areaMeasurements);
  const editingMeasurement = useOrthophotoStore((s) => s.editingMeasurement);

  const data = useMemo(() => {
    const features = areaMeasurements.flatMap((m) => {
      const isEditing = editingMeasurement?.type === "area" && editingMeasurement.id === m.id;
      const points = isEditing ? editingMeasurement!.points : m.points;
      const area = isEditing ? computeArea(points) : m.area;
      return [
        polygonFeature(m.id, points),
        pointFeature(`${m.id}-label`, polygonCentroid(points), {
          label: `${area.toFixed(2)} m²${m.label ? ` — ${m.label}` : ""}`,
        }),
      ];
    });
    return featureCollection(features);
  }, [areaMeasurements, editingMeasurement]);

  useGeoJsonLayer(map, SOURCE_ID, LAYERS, data);

  const pendingData = useMemo(() => {
    if (activeTool !== "measure-area" || pendingPoints.length < 2) return featureCollection([]);
    return featureCollection([polygonFeature("pending", pendingPoints)]);
  }, [activeTool, pendingPoints]);

  useGeoJsonLayer(map, PENDING_SOURCE_ID, PENDING_LAYERS, pendingData);

  return null;
}
