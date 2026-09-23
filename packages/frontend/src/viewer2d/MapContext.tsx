import { createContext, useContext } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";

export const MapContext = createContext<MapLibreMap | null>(null);

export function useMap(): MapLibreMap | null {
  return useContext(MapContext);
}
