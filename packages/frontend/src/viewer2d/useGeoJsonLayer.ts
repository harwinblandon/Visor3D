import { useEffect, useRef } from "react";
import type { Map as MapLibreMap, LayerSpecification, GeoJSONSource } from "maplibre-gl";
import type { FeatureCollection } from "geojson";

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

/**
 * Agrega una fuente GeoJSON + sus capas de estilo al mapa mientras el componente esta
 * montado, y actualiza los datos con `setData` en cada cambio (sin recrear la fuente).
 */
export function useGeoJsonLayer(map: MapLibreMap | null, sourceId: string, layers: LayerSpecification[], data: FeatureCollection = EMPTY) {
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    if (!map) return;

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, { type: "geojson", data: dataRef.current });
    }
    for (const layer of layers) {
      if (!map.getLayer(layer.id)) map.addLayer(layer);
    }

    return () => {
      for (const layer of layers) {
        if (map.getLayer(layer.id)) map.removeLayer(layer.id);
      }
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, sourceId]);

  useEffect(() => {
    if (!map) return;
    const source = map.getSource(sourceId) as GeoJSONSource | undefined;
    source?.setData(data);
  }, [map, sourceId, data]);
}
