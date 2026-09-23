import { useEffect, useState } from "react";
import {
  Popup,
  type CircleLayerSpecification,
  type FillLayerSpecification,
  type LineLayerSpecification,
  type MapLayerMouseEvent,
} from "maplibre-gl";
import type { OrthophotoLayer } from "@visor3d/shared";
import { useOrthophotoStore } from "../../state/orthophotoStore";
import { useMap } from "../MapContext";
import { useGeoJsonLayer } from "../useGeoJsonLayer";
import { listOrthophotoLayers } from "../../api/orthophotoLayers";
import { theme } from "../../styles/theme";

const PALETTE = [theme.color.accent, "#f59e0b", "#34d399", "#f472b6", "#a78bfa", "#60a5fa"];

function popupHtml(properties: Record<string, unknown> | null): string {
  const name = (properties?.name as string | undefined) ?? "Sin nombre";
  const description = properties?.description as string | undefined;
  const safeName = String(name).replace(/</g, "&lt;");
  const safeDesc = description ? String(description).replace(/</g, "&lt;") : "";
  return `<div style="font-family:${theme.font};font-size:12px;max-width:220px;">
    <div style="font-weight:600;margin-bottom:4px;">${safeName}</div>
    ${safeDesc ? `<div style="color:#8b95a1;">${safeDesc}</div>` : ""}
  </div>`;
}

function KmlLayer({ layer, color }: { layer: OrthophotoLayer; color: string }) {
  const map = useMap();
  const sourceId = `kml-layer-${layer.id}`;

  const layers: [FillLayerSpecification, LineLayerSpecification, CircleLayerSpecification] = [
    {
      id: `${sourceId}-fill`,
      type: "fill",
      source: sourceId,
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: { "fill-color": color, "fill-opacity": 0.2 },
    },
    {
      id: `${sourceId}-line`,
      type: "line",
      source: sourceId,
      filter: ["in", ["geometry-type"], ["literal", ["Polygon", "LineString"]]],
      paint: { "line-color": color, "line-width": 2 },
    },
    {
      id: `${sourceId}-point`,
      type: "circle",
      source: sourceId,
      filter: ["==", ["geometry-type"], "Point"],
      paint: { "circle-color": color, "circle-radius": 5, "circle-stroke-color": "#ffffff", "circle-stroke-width": 1.5 },
    },
  ];

  useGeoJsonLayer(map, sourceId, layers, layer.geojson);

  useEffect(() => {
    if (!map) return;
    const clickableLayerIds = layers.map((l) => l.id);
    let popup: Popup | null = null;

    const handleClick = (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature) return;
      popup?.remove();
      popup = new Popup({ closeButton: true }).setLngLat(e.lngLat).setHTML(popupHtml(feature.properties)).addTo(map);
    };
    const handleEnter = () => (map.getCanvas().style.cursor = "pointer");
    const handleLeave = () => (map.getCanvas().style.cursor = "");

    for (const id of clickableLayerIds) {
      map.on("click", id, handleClick);
      map.on("mouseenter", id, handleEnter);
      map.on("mouseleave", id, handleLeave);
    }

    return () => {
      for (const id of clickableLayerIds) {
        map.off("click", id, handleClick);
        map.off("mouseenter", id, handleEnter);
        map.off("mouseleave", id, handleLeave);
      }
      popup?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, sourceId]);

  return null;
}

export function KmlLayers() {
  const map = useMap();
  const orthophotoId = useOrthophotoStore((s) => s.orthophotoId);
  const [layers, setLayers] = useState<OrthophotoLayer[]>([]);

  useEffect(() => {
    if (!orthophotoId) return;
    listOrthophotoLayers(orthophotoId)
      .then(setLayers)
      .catch((err) => console.error("No se pudieron cargar las capas KML/KMZ:", err));
  }, [orthophotoId]);

  if (!map) return null;

  return (
    <>
      {layers.map((layer, i) => (
        <KmlLayer key={layer.id} layer={layer} color={PALETTE[i % PALETTE.length]} />
      ))}
    </>
  );
}
