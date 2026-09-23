import { useEffect, useRef } from "react";
import { Marker } from "maplibre-gl";
import { useOrthophotoStore } from "../../state/orthophotoStore";
import { useMap } from "../MapContext";
import { theme } from "../../styles/theme";

function pinElement(color: string, selected: boolean): HTMLDivElement {
  const el = document.createElement("div");
  const size = selected ? 22 : 16;
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.borderRadius = "50%";
  el.style.background = color;
  el.style.border = `2px solid ${selected ? "#ffffff" : "rgba(0,0,0,0.6)"}`;
  el.style.boxShadow = "0 0 6px rgba(0,0,0,0.6)";
  el.style.cursor = "pointer";
  return el;
}

export function AnnotationTool() {
  const map = useMap();
  const annotations = useOrthophotoStore((s) => s.annotations);
  const selectedAnnotationId = useOrthophotoStore((s) => s.selectedAnnotationId);
  const setSelectedAnnotationId = useOrthophotoStore((s) => s.setSelectedAnnotationId);
  const pendingAnnotation = useOrthophotoStore((s) => s.pendingAnnotation);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const pendingMarkerRef = useRef<Marker | null>(null);

  useEffect(() => {
    if (!map) return;

    const existingIds = new Set(annotations.map((a) => a.id));
    for (const [id, marker] of markersRef.current) {
      if (!existingIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }

    for (const a of annotations) {
      const color = a.severity ? theme.color.severity[a.severity] : theme.color.textMuted;
      const selected = a.id === selectedAnnotationId;
      const el = pinElement(color, selected);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelectedAnnotationId(a.id);
      });

      const existing = markersRef.current.get(a.id);
      if (existing) existing.remove();

      const marker = new Marker({ element: el }).setLngLat([a.position.x, a.position.y]).addTo(map);
      markersRef.current.set(a.id, marker);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, annotations, selectedAnnotationId]);

  useEffect(() => {
    return () => {
      for (const marker of markersRef.current.values()) marker.remove();
      markersRef.current.clear();
    };
  }, [map]);

  useEffect(() => {
    if (!map) return;
    pendingMarkerRef.current?.remove();
    pendingMarkerRef.current = null;

    if (pendingAnnotation) {
      const el = document.createElement("div");
      el.style.width = "18px";
      el.style.height = "18px";
      el.style.borderRadius = "50%";
      el.style.background = theme.color.accent;
      el.style.border = "2px solid #ffffff";
      el.style.boxShadow = "0 0 6px rgba(0,0,0,0.6)";
      pendingMarkerRef.current = new Marker({ element: el }).setLngLat(pendingAnnotation.point).addTo(map);
    }

    return () => {
      pendingMarkerRef.current?.remove();
      pendingMarkerRef.current = null;
    };
  }, [map, pendingAnnotation]);

  return null;
}
