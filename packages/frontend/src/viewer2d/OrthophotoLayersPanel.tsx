import { LayersSection } from "../components/OrthophotoManager";
import { theme } from "../styles/theme";

interface OrthophotoLayersPanelProps {
  orthophotoId: string;
  orthophotoName: string;
  onClose: () => void;
}

export function OrthophotoLayersPanel({ orthophotoId, orthophotoName, onClose }: OrthophotoLayersPanelProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 45,
        fontFamily: theme.font,
        padding: 16,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: 24,
          borderRadius: 12,
          background: theme.color.panel,
          border: `1px solid ${theme.color.border}`,
          width: "min(420px, 100%)",
          maxHeight: "80vh",
          overflowY: "auto",
          boxSizing: "border-box",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ color: theme.color.text, margin: 0, fontSize: 15, fontWeight: 600 }}>Capas KML/KMZ</h3>
          <button
            type="button"
            onClick={onClose}
            style={{ border: "none", background: "transparent", color: theme.color.textMuted, cursor: "pointer", fontSize: 18 }}
          >
            ×
          </button>
        </div>

        <p style={{ color: theme.color.textMuted, fontSize: 11, margin: 0 }}>
          Sube un .kml o .kmz (los KMZ se descomprimen automáticamente) con resultados —
          linderos, puntos, polígonos — para superponerlos sobre <strong>{orthophotoName}</strong>.
          Al hacer clic sobre una figura se muestra su nombre y descripción.
        </p>

        <LayersSection orthophotoId={orthophotoId} />
      </div>
    </div>
  );
}
