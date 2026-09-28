import { useEffect } from "react";
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

export const LAYER_PALETTE = [theme.color.accent, "#f59e0b", "#34d399", "#f472b6", "#a78bfa", "#60a5fa"];

function escapeHtml(value: unknown): string {
  return String(value).replace(/</g, "&lt;");
}

// El KML trae campos fijos name/description (los que ya mapea togeojson); un shapefile en
// cambio trae sus propios atributos con nombres arbitrarios (ID de predio, area,
// propietario...) desde su .dbf. Si la capa define labelField se usa ese atributo como
// titulo; si no, se cae al name/description de KML, y si tampoco hay eso se listan todos
// los atributos como tabla para que un shapefile no quede mudo en el popup.
function popupHtml(properties: Record<string, unknown> | null, labelField: string | null): string {
  if (labelField && properties?.[labelField] != null && properties[labelField] !== "") {
    return `<div style="font-family:${theme.font};font-size:12px;max-width:220px;">
      <div style="font-weight:600;">${escapeHtml(properties[labelField])}</div>
    </div>`;
  }

  const name = properties?.name as string | undefined;
  const description = properties?.description as string | undefined;

  if (name || description) {
    return `<div style="font-family:${theme.font};font-size:12px;max-width:220px;">
      <div style="font-weight:600;margin-bottom:4px;">${escapeHtml(name ?? "Sin nombre")}</div>
      ${description ? `<div style="color:#8b95a1;">${escapeHtml(description)}</div>` : ""}
    </div>`;
  }

  const entries = Object.entries(properties ?? {}).filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (entries.length === 0) {
    return `<div style="font-family:${theme.font};font-size:12px;">Sin atributos</div>`;
  }
  const rows = entries
    .map(
      ([key, value]) =>
        `<tr><td style="color:#8b95a1;padding-right:8px;vertical-align:top;">${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  return `<div style="font-family:${theme.font};font-size:12px;max-width:260px;">
    <table style="border-collapse:collapse;">${rows}</table>
  </div>`;
}

function KmlLayer({ layer, fallbackColor, visible }: { layer: OrthophotoLayer; fallbackColor: string; visible: boolean }) {
  const map = useMap();
  const sourceId = `kml-layer-${layer.id}`;
  const color = layer.color ?? fallbackColor;
  const visibility = visible ? "visible" : "none";

  const layers: [FillLayerSpecification, LineLayerSpecification, CircleLayerSpecification] = [
    {
      id: `${sourceId}-fill`,
      type: "fill",
      source: sourceId,
      filter: ["==", ["geometry-type"], "Polygon"],
      layout: { visibility },
      paint: { "fill-color": color, "fill-opacity": layer.fillOpacity },
    },
    {
      id: `${sourceId}-line`,
      type: "line",
      source: sourceId,
      filter: ["in", ["geometry-type"], ["literal", ["Polygon", "LineString"]]],
      layout: { visibility },
      paint: { "line-color": color, "line-width": layer.lineWidth },
    },
    {
      id: `${sourceId}-point`,
      type: "circle",
      source: sourceId,
      filter: ["==", ["geometry-type"], "Point"],
      layout: { visibility },
      paint: { "circle-color": color, "circle-radius": 5, "circle-stroke-color": "#ffffff", "circle-stroke-width": 1.5 },
    },
  ];

  useGeoJsonLayer(map, sourceId, layers, layer.geojson);

  // El add/remove de la fuente ya lo maneja useGeoJsonLayer (solo al montar/desmontar); el
  // toggle de visibilidad es mucho mas frecuente que eso, asi que se aplica aparte con
  // setLayoutProperty en vez de forzar a useGeoJsonLayer a recrear la capa en cada click.
  useEffect(() => {
    if (!map) return;
    for (const l of layers) {
      if (map.getLayer(l.id)) map.setLayoutProperty(l.id, "visibility", visibility);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, visibility]);

  useEffect(() => {
    if (!map) return;
    const clickableLayerIds = layers.map((l) => l.id);
    let popup: Popup | null = null;

    const handleClick = (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature) return;
      popup?.remove();
      popup = new Popup({ closeButton: true }).setLngLat(e.lngLat).setHTML(popupHtml(feature.properties, layer.labelField)).addTo(map);
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
  }, [map, sourceId, layer.labelField]);

  return null;
}

export function KmlLayers() {
  const map = useMap();
  const orthophotoId = useOrthophotoStore((s) => s.orthophotoId);
  const layers = useOrthophotoStore((s) => s.layers);
  const hiddenLayerIds = useOrthophotoStore((s) => s.hiddenLayerIds);
  const setLayers = useOrthophotoStore((s) => s.setLayers);

  useEffect(() => {
    if (!orthophotoId) return;
    listOrthophotoLayers(orthophotoId)
      .then(setLayers)
      .catch((err) => console.error("No se pudieron cargar las capas KML/KMZ:", err));
  }, [orthophotoId, setLayers]);

  if (!map) return null;

  return (
    <>
      {layers.map((layer, i) => (
        <KmlLayer key={layer.id} layer={layer} fallbackColor={LAYER_PALETTE[i % LAYER_PALETTE.length]} visible={!hiddenLayerIds.has(layer.id)} />
      ))}
    </>
  );
}
