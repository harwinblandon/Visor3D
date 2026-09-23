import { useEffect, useRef } from "react";
import { Marker, type Map as MapLibreMap } from "maplibre-gl";
import { useOrthophotoStore } from "../../state/orthophotoStore";
import type { LngLat } from "../math/geo";
import { theme } from "../../styles/theme";

function makeVertexElement(): HTMLDivElement {
  const el = document.createElement("div");
  el.style.width = "14px";
  el.style.height = "14px";
  el.style.borderRadius = "50%";
  el.style.background = "#fff";
  el.style.border = `2px solid ${theme.color.bg}`;
  el.style.boxShadow = "0 0 0 2px rgba(0,0,0,0.45)";
  el.style.cursor = "grab";
  return el;
}

/** Marcadores arrastrables para corregir los vertices de la medicion en edicion (ver MeasurementList2D). */
export function EditableVertices({ map }: { map: MapLibreMap | null }) {
  const editingMeasurement = useOrthophotoStore((s) => s.editingMeasurement);
  const startDrag = useOrthophotoStore((s) => s.startDrag);
  const updateDragPoint = useOrthophotoStore((s) => s.updateDragPoint);
  const endDrag = useOrthophotoStore((s) => s.endDrag);
  const markersRef = useRef<Marker[]>([]);

  useEffect(() => {
    if (!map || !editingMeasurement) return;

    const initialPoints = editingMeasurement.points;
    const markers = initialPoints.map((pt, index) => {
      const marker = new Marker({ element: makeVertexElement(), draggable: true }).setLngLat(pt).addTo(map);
      marker.on("dragstart", () => startDrag(index));
      marker.on("drag", () => {
        const { lng, lat } = marker.getLngLat();
        updateDragPoint([lng, lat] as LngLat);
      });
      marker.on("dragend", () => endDrag());
      return marker;
    });
    markersRef.current = markers;

    return () => {
      markers.forEach((m) => m.remove());
      markersRef.current = [];
    };
    // Solo se reconstruye al cambiar de medicion en edicion, no en cada punto arrastrado
    // (el propio marcador ya se redibuja nativamente durante el drag).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, editingMeasurement?.id, editingMeasurement?.points.length]);

  return null;
}
