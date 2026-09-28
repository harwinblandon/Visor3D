import { useEffect, useRef, useState } from "react";
import {
  Map as MapLibreMap,
  NavigationControl,
  AttributionControl,
  GeolocateControl,
  TerrainControl,
  setWorkerUrl,
  type MapMouseEvent,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Orthophoto } from "@h-geovisor/shared";
import { getStoredAdminKey } from "../api/auth";
import { orthophotoTileUrlTemplate, orthophotoTerrainTileUrlTemplate } from "../api/orthophotos";
import { listMeasurements } from "../api/measurements";
import { listAnnotations } from "../api/annotations";
import { useIsMobile } from "../hooks/useIsMobile";
import { theme } from "../styles/theme";
import { useOrthophotoStore } from "../state/orthophotoStore";
import { MapContext } from "./MapContext";
import { OrthophotoToolbar } from "./OrthophotoToolbar";
import { MeasurementList2D } from "./MeasurementList2D";
import { AnnotationForm2D } from "./AnnotationForm2D";
import { AnnotationDetail2D } from "./AnnotationDetail2D";
import { MeasureDistanceTool } from "./interactions/MeasureDistanceTool";
import { MeasureAreaTool, finalizeAreaPolygon } from "./interactions/MeasureAreaTool";
import { PolylineTool, finalizePolyline } from "./interactions/PolylineTool";
import { CircleTool } from "./interactions/CircleTool";
import { AnnotationTool } from "./interactions/AnnotationTool";
import { EditableVertices } from "./interactions/EditableVertices";
import { KmlLayers } from "./interactions/KmlLayers";
import { OrthophotoLayersPanel } from "./OrthophotoLayersPanel";
import { OrthophotoTerrainPanel } from "./OrthophotoTerrainPanel";
import {
  SATELLITE_TILES,
  SATELLITE_ATTRIBUTION,
  HYBRID_LABELS_TILES,
  HYBRID_LABELS_ATTRIBUTION,
  SATELLITE_SOURCE_ID,
  SATELLITE_LAYER_ID,
  HYBRID_LABELS_SOURCE_ID,
  HYBRID_LABELS_LAYER_ID,
} from "./basemaps";
import type { LngLat } from "./math/geo";

interface OrthophotoViewerProps {
  orthophoto: Orthophoto;
  isAdmin: boolean;
  onUnlock: (password: string) => Promise<boolean>;
  onLock: () => void;
  onOpenManager: () => void;
}

const POINT_TOOLS = new Set(["measure-distance", "measure-area", "vectorize-polyline", "measure-circle"]);
const TERRAIN_SOURCE_ID = "orthophoto-terrain";

interface TerrainOverride {
  terrainPath: string | null;
  terrainMinZoom: number | null;
  terrainMaxZoom: number | null;
}

// maplibre-gl calcula la URL de su web worker en base a la ubicacion del propio paquete;
// eso se rompe al empaquetar para produccion (Rollup lo inlinea todo en un solo archivo),
// asi que se apunta explicitamente a una copia estatica servida desde public/ (el worker
// tambien importa maplibre-gl-shared.mjs como archivo hermano, por eso van los dos juntos).
setWorkerUrl("/maplibre-gl-worker.mjs");

export function OrthophotoViewer({ orthophoto, isAdmin, onUnlock, onLock, onOpenManager }: OrthophotoViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const terrainControlRef = useRef<TerrainControl | null>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [loaded, setLoaded] = useState(false);
  const isMobile = useIsMobile();

  const [cursorCoords, setCursorCoords] = useState<LngLat | null>(null);
  const [isLayersPanelOpen, setIsLayersPanelOpen] = useState(false);
  const [layersVersion, setLayersVersion] = useState(0);
  const [isTerrainPanelOpen, setIsTerrainPanelOpen] = useState(false);
  const [terrainOverride, setTerrainOverride] = useState<TerrainOverride | null>(null);

  const setOrthophotoId = useOrthophotoStore((s) => s.setOrthophotoId);
  const setAnnotations = useOrthophotoStore((s) => s.setAnnotations);
  const activeTool = useOrthophotoStore((s) => s.activeTool);
  const basemap = useOrthophotoStore((s) => s.basemap);

  useEffect(() => {
    if (!containerRef.current) return;
    setLoaded(false);
    setMap(null);

    const tilesPathPrefix = `/api/orthophotos/${orthophoto.id}/tiles/`;
    const adminKey = getStoredAdminKey();

    const mapInstance = new MapLibreMap({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          orthophoto: {
            type: "raster",
            tiles: [orthophotoTileUrlTemplate(orthophoto)],
            tileSize: 256,
            minzoom: orthophoto.minZoom,
            maxzoom: orthophoto.maxZoom,
            bounds: [orthophoto.boundsWest, orthophoto.boundsSouth, orthophoto.boundsEast, orthophoto.boundsNorth],
          },
        },
        layers: [{ id: "orthophoto", type: "raster", source: "orthophoto" }],
      },
      attributionControl: false,
      transformRequest: (url) => (adminKey && url.includes(tilesPathPrefix) ? { url, headers: { "x-admin-key": adminKey } } : { url }),
    });

    mapInstance.addControl(new AttributionControl({ compact: true }));
    mapInstance.addControl(new NavigationControl({ showCompass: true, visualizePitch: false }), "top-right");
    mapInstance.addControl(
      new GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      "top-right",
    );

    mapInstance.on("mousemove", (e: MapMouseEvent) => setCursorCoords([e.lngLat.lng, e.lngLat.lat]));

    mapInstance.on("click", (e) => {
      const point: LngLat = [e.lngLat.lng, e.lngLat.lat];
      const state = useOrthophotoStore.getState();
      if (POINT_TOOLS.has(state.activeTool)) {
        state.addPendingPoint(point);
      } else if (state.activeTool === "annotate") {
        state.setPendingAnnotation({ point });
      }
    });

    mapInstance.on("dblclick", (e) => {
      const state = useOrthophotoStore.getState();
      if (state.activeTool === "measure-area" && state.pendingPoints.length >= 3) {
        e.preventDefault();
        finalizeAreaPolygon();
      } else if (state.activeTool === "vectorize-polyline" && state.pendingPoints.length >= 2) {
        e.preventDefault();
        finalizePolyline();
      }
    });

    mapInstance.on("load", () => {
      mapInstance.fitBounds(
        [
          [orthophoto.boundsWest, orthophoto.boundsSouth],
          [orthophoto.boundsEast, orthophoto.boundsNorth],
        ],
        { padding: 32, duration: 0 },
      );
      setLoaded(true);
      setMap(mapInstance);
    });

    mapRef.current = mapInstance;

    return () => {
      mapInstance.remove();
      mapRef.current = null;
      setMap(null);
    };
  }, [orthophoto]);

  useEffect(() => {
    if (!map) return;
    map.getCanvas().style.cursor = activeTool !== "none" ? "crosshair" : "";
  }, [map, activeTool]);

  useEffect(() => {
    if (!map) return;

    const removeIfExists = (layerId: string, sourceId: string) => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };

    removeIfExists(SATELLITE_LAYER_ID, SATELLITE_SOURCE_ID);
    removeIfExists(HYBRID_LABELS_LAYER_ID, HYBRID_LABELS_SOURCE_ID);

    if (basemap === "satellite" || basemap === "hybrid") {
      map.addSource(SATELLITE_SOURCE_ID, { type: "raster", tiles: [SATELLITE_TILES], tileSize: 256, attribution: SATELLITE_ATTRIBUTION });
      map.addLayer({ id: SATELLITE_LAYER_ID, type: "raster", source: SATELLITE_SOURCE_ID }, "orthophoto");
    }
    if (basemap === "hybrid") {
      map.addSource(HYBRID_LABELS_SOURCE_ID, {
        type: "raster",
        tiles: [HYBRID_LABELS_TILES],
        tileSize: 256,
        attribution: HYBRID_LABELS_ATTRIBUTION,
      });
      map.addLayer({ id: HYBRID_LABELS_LAYER_ID, type: "raster", source: HYBRID_LABELS_SOURCE_ID }, "orthophoto");
    }
  }, [map, basemap]);

  useEffect(() => {
    if (!map) return;
    const terrainPath = terrainOverride?.terrainPath ?? orthophoto.terrainPath;
    const terrainMinZoom = terrainOverride?.terrainMinZoom ?? orthophoto.terrainMinZoom;
    const terrainMaxZoom = terrainOverride?.terrainMaxZoom ?? orthophoto.terrainMaxZoom;

    if (map.getTerrain()) map.setTerrain(null);
    if (terrainControlRef.current) {
      map.removeControl(terrainControlRef.current);
      terrainControlRef.current = null;
    }
    if (map.getSource(TERRAIN_SOURCE_ID)) map.removeSource(TERRAIN_SOURCE_ID);

    if (terrainPath && terrainMinZoom !== null && terrainMaxZoom !== null) {
      map.addSource(TERRAIN_SOURCE_ID, {
        type: "raster-dem",
        tiles: [orthophotoTerrainTileUrlTemplate(orthophoto)],
        tileSize: 256,
        minzoom: terrainMinZoom,
        maxzoom: terrainMaxZoom,
        bounds: [orthophoto.boundsWest, orthophoto.boundsSouth, orthophoto.boundsEast, orthophoto.boundsNorth],
        encoding: "terrarium",
      });
      const control = new TerrainControl({ source: TERRAIN_SOURCE_ID, exaggeration: 1 });
      map.addControl(control, "top-right");
      terrainControlRef.current = control;
    }
  }, [map, orthophoto, terrainOverride]);

  useEffect(() => {
    setOrthophotoId(orthophoto.id);

    listMeasurements({ orthophotoId: orthophoto.id })
      .then((rows) => {
        const distanceMeasurements = rows
          .filter((r) => r.type === "distance")
          .map((r) => ({
            id: r.id,
            points: [
              [r.points[0].x, r.points[0].y],
              [r.points[1].x, r.points[1].y],
            ] as [LngLat, LngLat],
            distance: r.value,
            label: r.label,
            layer: r.layer,
            note: r.note,
          }));

        const areaMeasurements = rows
          .filter((r) => r.type === "area")
          .map((r) => ({
            id: r.id,
            points: r.points.map((p) => [p.x, p.y] as LngLat),
            area: r.value,
            label: r.label,
            layer: r.layer,
            note: r.note,
          }));

        const polylineMeasurements = rows
          .filter((r) => r.type === "polyline")
          .map((r) => ({
            id: r.id,
            points: r.points.map((p) => [p.x, p.y] as LngLat),
            length: r.value,
            label: r.label,
            layer: r.layer,
            note: r.note,
          }));

        const circleMeasurements = rows
          .filter((r) => r.type === "circle")
          .map((r) => ({
            id: r.id,
            points: [
              [r.points[0].x, r.points[0].y],
              [r.points[1].x, r.points[1].y],
            ] as [LngLat, LngLat],
            radius: r.value,
            label: r.label,
            layer: r.layer,
            note: r.note,
          }));

        useOrthophotoStore.setState({ distanceMeasurements, areaMeasurements, polylineMeasurements, circleMeasurements });
      })
      .catch((err) => console.error("No se pudieron cargar las mediciones guardadas:", err));

    listAnnotations({ orthophotoId: orthophoto.id })
      .then(setAnnotations)
      .catch((err) => console.error("No se pudieron cargar las anotaciones guardadas:", err));
  }, [orthophoto.id, setOrthophotoId, setAnnotations]);

  return (
    <MapContext.Provider value={map}>
      <div style={{ width: "100vw", height: "100vh", background: theme.color.bg }}>
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: isMobile ? 56 : 76,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: isMobile ? "0 10px" : "0 20px",
            background: theme.color.panel,
            borderBottom: `1px solid ${theme.color.border}`,
            zIndex: 20,
            boxSizing: "border-box",
            gap: isMobile ? 8 : 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 14, flex: "1 1 auto", minWidth: 0, overflow: "hidden" }}>
            <img src="/logo.png" alt="Logo" style={{ height: isMobile ? 34 : 57, width: "auto", display: "block", flexShrink: 0 }} />
            <div style={{ width: 1, height: 28, background: theme.color.border, flexShrink: 0 }} />
            <span
              style={{
                color: theme.color.textMuted,
                fontFamily: theme.font,
                fontSize: isMobile ? 12 : 13,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {orthophoto.name}
            </span>
          </div>
          <OrthophotoToolbar
            orthophotoId={orthophoto.id}
            isAdmin={isAdmin}
            onUnlock={onUnlock}
            onLock={onLock}
            onOpenManager={onOpenManager}
            onOpenLayers={() => setIsLayersPanelOpen(true)}
            onOpenTerrain={() => setIsTerrainPanelOpen(true)}
          />
        </div>

        <MeasurementList2D />
        <AnnotationDetail2D />
        <AnnotationForm2D />

        {isLayersPanelOpen && (
          <OrthophotoLayersPanel
            orthophotoId={orthophoto.id}
            orthophotoName={orthophoto.name}
            onClose={() => {
              setIsLayersPanelOpen(false);
              setLayersVersion((v) => v + 1);
            }}
          />
        )}

        {isTerrainPanelOpen && (
          <OrthophotoTerrainPanel
            orthophoto={orthophoto}
            onClose={(updated) => {
              setIsTerrainPanelOpen(false);
              if (updated) setTerrainOverride(updated);
            }}
          />
        )}

        {!loaded && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: theme.color.bg,
              zIndex: 30,
              fontFamily: theme.font,
            }}
          >
            <span style={{ color: theme.color.textMuted, fontSize: 13 }}>Cargando ortofoto...</span>
          </div>
        )}

        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

        {cursorCoords && (
          <div
            onClick={() => navigator.clipboard?.writeText(`${cursorCoords[1].toFixed(6)}, ${cursorCoords[0].toFixed(6)}`)}
            title="Clic para copiar"
            style={{
              position: "fixed",
              bottom: 8,
              left: 8,
              padding: "5px 9px",
              borderRadius: theme.radius,
              background: "rgba(15,17,20,0.85)",
              border: `1px solid ${theme.color.border}`,
              color: theme.color.textMuted,
              fontFamily: theme.font,
              fontSize: 11,
              zIndex: 12,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Lat {cursorCoords[1].toFixed(6)} · Lng {cursorCoords[0].toFixed(6)}
          </div>
        )}

        <KmlLayers key={layersVersion} />
        <MeasureDistanceTool />
        <MeasureAreaTool />
        <PolylineTool />
        <CircleTool />
        <AnnotationTool />
        <EditableVertices map={map} />
      </div>
    </MapContext.Provider>
  );
}
