import { useEffect, useRef } from "react";
import { Map as MapLibreMap, Marker, NavigationControl, type StyleSpecification, type LngLatLike } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { theme } from "../styles/theme";

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onPick: (latitude: number, longitude: number) => void;
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

const DEFAULT_CENTER: LngLatLike = [-20, 15];
const DEFAULT_ZOOM = 1.5;

export function LocationPicker({ latitude, longitude, onPick }: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const hasInitial = latitude !== null && longitude !== null;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: ESRI_STYLE,
      center: hasInitial ? [longitude as number, latitude as number] : DEFAULT_CENTER,
      zoom: hasInitial ? 17 : DEFAULT_ZOOM,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");

    const placeMarker = (lng: number, lat: number) => {
      if (markerRef.current) {
        markerRef.current.setLngLat([lng, lat]);
      } else {
        markerRef.current = new Marker({ color: theme.color.severity.alta, draggable: true })
          .setLngLat([lng, lat])
          .addTo(map);
        markerRef.current.on("dragend", () => {
          const pos = markerRef.current!.getLngLat();
          onPick(pos.lat, pos.lng);
        });
      }
    };

    if (hasInitial) placeMarker(longitude as number, latitude as number);

    map.on("click", (e) => {
      placeMarker(e.lngLat.lng, e.lngLat.lat);
      onPick(e.lngLat.lat, e.lngLat.lng);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: 220,
          borderRadius: theme.radius,
          overflow: "hidden",
          border: `1px solid ${theme.color.border}`,
        }}
      />
      <p style={{ color: theme.color.textMuted, fontSize: 11, margin: "6px 0 0" }}>
        Haz clic en el mapa (o arrastra el pin) para marcar la ubicación real de la edificación.
      </p>
    </div>
  );
}
