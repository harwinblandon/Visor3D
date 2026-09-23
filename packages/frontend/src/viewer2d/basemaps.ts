/**
 * Mapas base opcionales que se muestran DEBAJO de la ortofoto (util al alejar el zoom
 * mas alla de su cobertura, o mientras carga). Mismo proveedor gratuito (Esri) que ya
 * usa LocationMap.tsx para el mapa de ubicacion.
 */

export const SATELLITE_TILES = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
export const SATELLITE_ATTRIBUTION = "Esri, Maxar, Earthstar Geographics";

/** Capa de referencia (vias, limites, nombres de lugares) que compuesta sobre el satelital da el efecto "hibrido". */
export const HYBRID_LABELS_TILES =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";
export const HYBRID_LABELS_ATTRIBUTION = "Esri";

export const SATELLITE_SOURCE_ID = "basemap-satellite";
export const SATELLITE_LAYER_ID = "basemap-satellite-layer";
export const HYBRID_LABELS_SOURCE_ID = "basemap-hybrid-labels";
export const HYBRID_LABELS_LAYER_ID = "basemap-hybrid-labels-layer";
