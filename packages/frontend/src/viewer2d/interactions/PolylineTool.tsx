import { useMemo } from "react";
import type { LineLayerSpecification, SymbolLayerSpecification } from "maplibre-gl";
import { useOrthophotoStore } from "../../state/orthophotoStore";
import { useMap } from "../MapContext";
import { useGeoJsonLayer } from "../useGeoJsonLayer";
import { lineFeature, pointFeature, featureCollection } from "../geojson";
import { computePolylineLength } from "../math/geo";
import { createMeasurement } from "../../api/measurements";
import { theme } from "../../styles/theme";

const SOURCE_ID = "polyline-measurements";
const PENDING_SOURCE_ID = "polyline-pending";

const LAYERS: [LineLayerSpecification, SymbolLayerSpecification] = [
  {
    id: "polyline-measurements-line",
    type: "line",
    source: SOURCE_ID,
    filter: ["==", ["geometry-type"], "LineString"],
    paint: { "line-color": theme.color.polyline, "line-width": 3 },
  },
  {
    id: "polyline-measurements-label",
    type: "symbol",
    source: SOURCE_ID,
    filter: ["==", ["geometry-type"], "Point"],
    layout: { "text-field": ["get", "label"], "text-size": 12, "text-offset": [0, -1], "text-allow-overlap": true },
    paint: { "text-color": theme.color.text, "text-halo-color": theme.color.bg, "text-halo-width": 1.5 },
  },
];

const PENDING_LAYERS: [LineLayerSpecification] = [
  {
    id: "polyline-pending-line",
    type: "line",
    source: PENDING_SOURCE_ID,
    paint: { "line-color": theme.color.polyline, "line-width": 2, "line-dasharray": [2, 2] },
  },
];

export function finalizePolyline() {
  const { pendingPoints, addPolylineMeasurement, clearPendingPoints, orthophotoId } = useOrthophotoStore.getState();
  if (pendingPoints.length < 2) return;

  const points = [...pendingPoints];
  const length = computePolylineLength(points);
  const id = crypto.randomUUID();
  addPolylineMeasurement({ id, points, length, label: null, layer: null, note: null });
  clearPendingPoints();

  if (orthophotoId) {
    createMeasurement({
      orthophotoId,
      type: "polyline",
      points: points.map((p) => ({ x: p[0], y: p[1], z: 0 })),
      value: length,
      unit: "m",
    })
      .then((saved) => {
        useOrthophotoStore.setState((state) => ({
          polylineMeasurements: state.polylineMeasurements.map((m) => (m.id === id ? { ...m, id: saved.id } : m)),
        }));
        useOrthophotoStore.getState().setLastCreatedMeasurementId(saved.id);
      })
      .catch((err) => console.error("No se pudo guardar la polilínea:", err));
  }
}

export function PolylineTool() {
  const map = useMap();
  const activeTool = useOrthophotoStore((s) => s.activeTool);
  const pendingPoints = useOrthophotoStore((s) => s.pendingPoints);
  const polylineMeasurements = useOrthophotoStore((s) => s.polylineMeasurements);
  const editingMeasurement = useOrthophotoStore((s) => s.editingMeasurement);

  const data = useMemo(() => {
    const features = polylineMeasurements.flatMap((m) => {
      const isEditing = editingMeasurement?.type === "polyline" && editingMeasurement.id === m.id;
      const points = isEditing ? editingMeasurement!.points : m.points;
      const length = isEditing ? computePolylineLength(points) : m.length;
      const mid = points[Math.floor(points.length / 2)];
      return [
        lineFeature(m.id, points),
        pointFeature(`${m.id}-label`, mid, { label: `${length.toFixed(2)} m${m.label ? ` — ${m.label}` : ""}` }),
      ];
    });
    return featureCollection(features);
  }, [polylineMeasurements, editingMeasurement]);

  useGeoJsonLayer(map, SOURCE_ID, LAYERS, data);

  const pendingData = useMemo(() => {
    if (activeTool !== "vectorize-polyline" || pendingPoints.length < 2) return featureCollection([]);
    return featureCollection([lineFeature("pending", pendingPoints)]);
  }, [activeTool, pendingPoints]);

  useGeoJsonLayer(map, PENDING_SOURCE_ID, PENDING_LAYERS, pendingData);

  return null;
}
