import { useEffect, useMemo } from "react";
import type { LineLayerSpecification, SymbolLayerSpecification } from "maplibre-gl";
import { useOrthophotoStore } from "../../state/orthophotoStore";
import { useMap } from "../MapContext";
import { useGeoJsonLayer } from "../useGeoJsonLayer";
import { lineFeature, pointFeature, featureCollection } from "../geojson";
import { computeDistance } from "../math/geo";
import { createMeasurement } from "../../api/measurements";
import { theme } from "../../styles/theme";

const SOURCE_ID = "distance-measurements";

const LAYERS: [LineLayerSpecification, SymbolLayerSpecification] = [
  {
    id: "distance-measurements-line",
    type: "line",
    source: SOURCE_ID,
    filter: ["==", ["geometry-type"], "LineString"],
    paint: { "line-color": theme.color.distance, "line-width": 3 },
  },
  {
    id: "distance-measurements-label",
    type: "symbol",
    source: SOURCE_ID,
    filter: ["==", ["geometry-type"], "Point"],
    layout: { "text-field": ["get", "label"], "text-size": 12, "text-offset": [0, -1], "text-allow-overlap": true },
    paint: { "text-color": theme.color.text, "text-halo-color": theme.color.bg, "text-halo-width": 1.5 },
  },
];

export function MeasureDistanceTool() {
  const map = useMap();
  const activeTool = useOrthophotoStore((s) => s.activeTool);
  const pendingPoints = useOrthophotoStore((s) => s.pendingPoints);
  const distanceMeasurements = useOrthophotoStore((s) => s.distanceMeasurements);
  const addDistanceMeasurement = useOrthophotoStore((s) => s.addDistanceMeasurement);
  const orthophotoId = useOrthophotoStore((s) => s.orthophotoId);
  const editingMeasurement = useOrthophotoStore((s) => s.editingMeasurement);
  const setLastCreatedMeasurementId = useOrthophotoStore((s) => s.setLastCreatedMeasurementId);

  useEffect(() => {
    if (activeTool !== "measure-distance") return;
    if (pendingPoints.length < 2) return;

    const [a, b] = pendingPoints;
    const dist = computeDistance(a, b);
    const id = crypto.randomUUID();
    addDistanceMeasurement({ id, points: [a, b], distance: dist, label: null, layer: null, note: null });

    if (orthophotoId) {
      createMeasurement({
        orthophotoId,
        type: "distance",
        points: [
          { x: a[0], y: a[1], z: 0 },
          { x: b[0], y: b[1], z: 0 },
        ],
        value: dist,
        unit: "m",
      })
        .then((saved) => {
          useOrthophotoStore.setState((state) => ({
            distanceMeasurements: state.distanceMeasurements.map((m) => (m.id === id ? { ...m, id: saved.id } : m)),
          }));
          setLastCreatedMeasurementId(saved.id);
        })
        .catch((err) => console.error("No se pudo guardar la medición de distancia:", err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool, pendingPoints]);

  const data = useMemo(() => {
    const features = distanceMeasurements.flatMap((m) => {
      const isEditing = editingMeasurement?.type === "distance" && editingMeasurement.id === m.id;
      const points = isEditing ? (editingMeasurement!.points as [typeof m.points[0], typeof m.points[1]]) : m.points;
      const dist = isEditing ? computeDistance(points[0], points[1]) : m.distance;
      const mid: [number, number] = [(points[0][0] + points[1][0]) / 2, (points[0][1] + points[1][1]) / 2];
      return [
        lineFeature(m.id, points),
        pointFeature(`${m.id}-label`, mid, { label: `${dist.toFixed(2)} m${m.label ? ` — ${m.label}` : ""}` }),
      ];
    });
    return featureCollection(features);
  }, [distanceMeasurements, editingMeasurement]);

  useGeoJsonLayer(map, SOURCE_ID, LAYERS, data);

  return null;
}
