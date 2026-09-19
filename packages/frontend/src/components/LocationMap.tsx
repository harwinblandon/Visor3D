import { useEffect, useRef, useState } from "react";
import {
  Map as MapLibreMap,
  Marker,
  Popup,
  NavigationControl,
  AttributionControl,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useIsMobile } from "../hooks/useIsMobile";
import { theme } from "../styles/theme";

interface LocationMapProps {
  latitude: number;
  longitude: number;
  modelName: string;
  onClose: () => void;
}

const ESRI_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    esri: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Esri, Maxar, Earthstar Geographics",
    },
  },
  layers: [{ id: "esri", type: "raster", source: "esri" }],
};

export function LocationMap({ latitude, longitude, modelName, onClose }: LocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [expanded, setExpanded] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: ESRI_STYLE,
      center: [longitude, latitude],
      zoom: 18,
      attributionControl: false,
    });
    map.addControl(new AttributionControl({ compact: true }));
    map.addControl(new NavigationControl({ showCompass: false }), "bottom-right");

    new Marker({ color: theme.color.severity.alta })
      .setLngLat([longitude, latitude])
      .setPopup(new Popup({ closeButton: false }).setText(modelName))
      .addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [latitude, longitude, modelName]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => mapRef.current?.resize());
    return () => cancelAnimationFrame(frame);
  }, [expanded]);

  const panelStyle: React.CSSProperties = expanded
    ? { top: isMobile ? 64 : 92, right: isMobile ? 8 : 16, bottom: isMobile ? 8 : 16, left: isMobile ? 8 : 16 }
    : {
        bottom: isMobile ? 8 : 16,
        left: isMobile ? 8 : 16,
        width: isMobile ? "min(280px, calc(100vw - 16px))" : 320,
        height: isMobile ? 200 : 260,
      };

  return (
    <div
      style={{
        position: "fixed",
        ...panelStyle,
        borderRadius: theme.radius,
        overflow: "hidden",
        border: `1px solid ${theme.color.border}`,
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        zIndex: 15,
        transition: "all 0.15s ease",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 32,
          background: "rgba(15,17,20,0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 10px",
          zIndex: 1,
          fontFamily: theme.font,
        }}
      >
        <span style={{ color: theme.color.text, fontSize: 12, fontWeight: 600 }}>Ubicación</span>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Reducir" : "Ampliar"}
            style={{ border: "none", background: "transparent", color: theme.color.textMuted, cursor: "pointer", fontSize: 14 }}
          >
            {expanded ? "⤡" : "⤢"}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{ border: "none", background: "transparent", color: theme.color.textMuted, cursor: "pointer", fontSize: 16 }}
          >
            ×
          </button>
        </div>
      </div>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
