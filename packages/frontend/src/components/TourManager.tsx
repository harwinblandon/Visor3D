import { useEffect, useState } from "react";
import { useViewerStore } from "../state/viewerStore";
import { listTourStops, deleteTourStop, moveTourStop } from "../api/tourStops";
import { useIsMobile } from "../hooks/useIsMobile";
import { theme } from "../styles/theme";

interface TourManagerProps {
  onClose: () => void;
}

export function TourManager({ onClose }: TourManagerProps) {
  const modelId = useViewerStore((s) => s.modelId);
  const tourStops = useViewerStore((s) => s.tourStops);
  const setTourStops = useViewerStore((s) => s.setTourStops);
  const removeTourStop = useViewerStore((s) => s.removeTourStop);
  const requestTourCapture = useViewerStore((s) => s.requestTourCapture);
  const pendingTourCapture = useViewerStore((s) => s.pendingTourCapture);

  const [label, setLabel] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const topOffset = isMobile ? 64 : 92;

  useEffect(() => {
    if (!modelId) return;
    listTourStops(modelId)
      .then(setTourStops)
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar el recorrido"));
  }, [modelId, setTourStops]);

  const handleCapture = () => {
    requestTourCapture(label.trim() || null);
    setLabel("");
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try {
      await deleteTourStop(id);
      removeTourStop(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar la parada");
    } finally {
      setBusyId(null);
    }
  };

  const handleMove = async (id: string, direction: "up" | "down") => {
    setBusyId(id);
    try {
      const stops = await moveTourStop(id, direction);
      setTourStops(stops);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al reordenar");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: topOffset,
        left: isMobile ? 8 : 16,
        width: isMobile ? "min(260px, calc(100vw - 16px))" : 280,
        maxHeight: `calc(100vh - ${topOffset + 16}px)`,
        overflowY: "auto",
        background: theme.color.panel,
        border: `1px solid ${theme.color.border}`,
        borderRadius: theme.radius,
        zIndex: 15,
        fontFamily: theme.font,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 14px",
          borderBottom: `1px solid ${theme.color.border}`,
        }}
      >
        <span style={{ color: theme.color.text, fontSize: 13, fontWeight: 600 }}>Recorrido de cámara</span>
        <button
          type="button"
          onClick={onClose}
          style={{ border: "none", background: "transparent", color: theme.color.textMuted, cursor: "pointer", fontSize: 16 }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, borderBottom: `1px solid ${theme.color.border}` }}>
        <p style={{ color: theme.color.textMuted, fontSize: 11, margin: 0 }}>
          Mueve la cámara a la vista que quieras y agrégala como parada. El cliente podrá reproducir el recorrido en orden.
        </p>
        <input
          type="text"
          placeholder="Nombre de la parada (opcional)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          style={{
            padding: "7px 9px",
            borderRadius: 6,
            border: `1px solid ${theme.color.border}`,
            background: theme.color.panelAlt,
            color: theme.color.text,
            fontFamily: theme.font,
            fontSize: 12,
            outline: "none",
          }}
        />
        <button
          type="button"
          onClick={handleCapture}
          disabled={pendingTourCapture !== null}
          style={{
            padding: "8px 12px",
            borderRadius: theme.radius,
            border: "none",
            background: theme.color.accent,
            color: "#0b0d10",
            cursor: pendingTourCapture ? "not-allowed" : "pointer",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {pendingTourCapture ? "Guardando..." : "📍 Agregar parada aquí"}
        </button>
      </div>

      {error && <p style={{ color: theme.color.danger, fontSize: 11, margin: "8px 14px" }}>{error}</p>}

      {tourStops.length === 0 ? (
        <p style={{ color: theme.color.textMuted, fontSize: 12, padding: 14 }}>Ninguna parada todavía.</p>
      ) : (
        tourStops.map((stop, i) => (
          <div
            key={stop.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 6,
              padding: "8px 14px",
              borderBottom: `1px solid ${theme.color.border}`,
            }}
          >
            <span style={{ color: theme.color.text, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {i + 1}. {stop.label || "Sin nombre"}
            </span>
            <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
              <button
                type="button"
                disabled={i === 0 || busyId === stop.id}
                onClick={() => handleMove(stop.id, "up")}
                title="Mover arriba"
                style={{ border: "none", background: "transparent", color: i === 0 ? theme.color.border : theme.color.textMuted, cursor: "pointer", fontSize: 12, padding: 4 }}
              >
                ↑
              </button>
              <button
                type="button"
                disabled={i === tourStops.length - 1 || busyId === stop.id}
                onClick={() => handleMove(stop.id, "down")}
                title="Mover abajo"
                style={{ border: "none", background: "transparent", color: i === tourStops.length - 1 ? theme.color.border : theme.color.textMuted, cursor: "pointer", fontSize: 12, padding: 4 }}
              >
                ↓
              </button>
              <button
                type="button"
                disabled={busyId === stop.id}
                onClick={() => handleDelete(stop.id)}
                title="Eliminar"
                style={{ border: "none", background: "transparent", color: theme.color.textMuted, cursor: "pointer", fontSize: 14, padding: 4 }}
                onMouseEnter={(e) => (e.currentTarget.style.color = theme.color.danger)}
                onMouseLeave={(e) => (e.currentTarget.style.color = theme.color.textMuted)}
              >
                ×
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
