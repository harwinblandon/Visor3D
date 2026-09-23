import { useEffect, useMemo } from "react";
import type { FillLayerSpecification, LineLayerSpecification, SymbolLayerSpecification } from "maplibre-gl";
import { useOrthophotoStore } from "../../state/orthophotoStore";
import { useMap } from "../MapContext";
import { useGeoJsonLayer } from "../useGeoJsonLayer";
import { polygonFeature, pointFeature, featureCollection } from "../geojson";
import { computeCircleRadius, circlePolygonPoints } from "../math/geo";
import { createMeasurement } from "../../api/measurements";
import { theme } from "../../styles/theme";

const SOURCE_ID = "circle-measurements";
const PENDING_SOURCE_ID = "circle-pending";

const LAYERS: [FillLayerSpecification, LineLayerSpecification, SymbolLayerSpecification] = [
  {
    id: "circle-measurements-fill",
    type: "fill",
    source: SOURCE_ID,
    filter: ["==", ["geometry-type"], "Polygon"],
    paint: { "fill-color": theme.color.circle, "fill-opacity": 0.15 },
  },
  {
    id: "circle-measurements-outline",
    type: "line",
    source: SOURCE_ID,
    filter: ["==", ["geometry-type"], "Polygon"],
    paint: { "line-color": theme.color.circle, "line-width": 2 },
  },
  {
    id: "circle-measurements-label",
    type: "symbol",
    source: SOURCE_ID,
    filter: ["==", ["geometry-type"], "Point"],
    layout: { "text-field": ["get", "label"], "text-size": 12, "text-allow-overlap": true },
    paint: { "text-color": theme.color.text, "text-halo-color": theme.color.bg, "text-halo-width": 1.5 },
  },
];

const PENDING_LAYERS: [FillLayerSpecification, LineLayerSpecification] = [
  {
    id: "circle-pending-fill",
    type: "fill",
    source: PENDING_SOURCE_ID,
    paint: { "fill-color": theme.color.circle, "fill-opacity": 0.1 },
  },
  {
    id: "circle-pending-outline",
    type: "line",
    source: PENDING_SOURCE_ID,
    paint: { "line-color": theme.color.circle, "line-width": 2, "line-dasharray": [2, 2] },
  },
];

export function CircleTool() {
  const map = useMap();
  const activeTool = useOrthophotoStore((s) => s.activeTool);
  const pendingPoints = useOrthophotoStore((s) => s.pendingPoints);
  const circleMeasurements = useOrthophotoStore((s) => s.circleMeasurements);
  const addCircleMeasurement = useOrthophotoStore((s) => s.addCircleMeasurement);
  const orthophotoId = useOrthophotoStore((s) => s.orthophotoId);
  const editingMeasurement = useOrthophotoStore((s) => s.editingMeasurement);
  const setLastCreatedMeasurementId = useOrthophotoStore((s) => s.setLastCreatedMeasurementId);

  useEffect(() => {
    if (activeTool !== "measure-circle") return;
    if (pendingPoints.length < 2) return;

    const [center, edge] = pendingPoints;
    const radius = computeCircleRadius(center, edge);
    const id = crypto.randomUUID();
    addCircleMeasurement({ id, points: [center, edge], radius, label: null, layer: null, note: null });

    if (orthophotoId) {
      createMeasurement({
        orthophotoId,
        type: "circle",
        points: [
          { x: center[0], y: center[1], z: 0 },
          { x: edge[0], y: edge[1], z: 0 },
        ],
        value: radius,
        unit: "m",
      })
        .then((saved) => {
          useOrthophotoStore.setState((state) => ({
            circleMeasurements: state.circleMeasurements.map((m) => (m.id === id ? { ...m, id: saved.id } : m)),
          }));
          setLastCreatedMeasurementId(saved.id);
        })
        .catch((err) => console.error("No se pudo guardar el círculo:", err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool, pendingPoints]);

  const data = useMemo(() => {
    const features = circleMeasurements.flatMap((m) => {
      const isEditing = editingMeasurement?.type === "circle" && editingMeasurement.id === m.id;
      const points = isEditing ? (editingMeasurement!.points as [typeof m.points[0], typeof m.points[1]]) : m.points;
      const radius = isEditing ? computeCircleRadius(points[0], points[1]) : m.radius;
      const ring = circlePolygonPoints(points[0], points[1]);
      return [
        polygonFeature(m.id, ring),
        pointFeature(`${m.id}-label`, points[0], { label: `r=${radius.toFixed(2)} m${m.label ? ` — ${m.label}` : ""}` }),
      ];
    });
    return featureCollection(features);
  }, [circleMeasurements, editingMeasurement]);

  useGeoJsonLayer(map, SOURCE_ID, LAYERS, data);

  const pendingData = useMemo(() => {
    if (activeTool !== "measure-circle" || pendingPoints.length < 2) return featureCollection([]);
    return featureCollection([polygonFeature("pending", circlePolygonPoints(pendingPoints[0], pendingPoints[1]))]);
  }, [activeTool, pendingPoints]);

  useGeoJsonLayer(map, PENDING_SOURCE_ID, PENDING_LAYERS, pendingData);

  return null;
}
