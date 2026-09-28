import { useState } from "react";
import type { Orthophoto } from "@h-geovisor/shared";
import { replaceOrthophotoFile } from "../api/orthophotos";
import { theme } from "../styles/theme";

interface OrthophotoReplaceFilePanelProps {
  orthophoto: Orthophoto;
  onClose: (updated?: Orthophoto) => void;
}

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: theme.radius,
  border: `1px solid ${theme.color.border}`,
  background: theme.color.panelAlt,
  color: theme.color.text,
  fontFamily: theme.font,
  fontSize: 12,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = { color: theme.color.textMuted, fontSize: 11, display: "block" };

export function OrthophotoReplaceFilePanel({ orthophoto, onClose }: OrthophotoReplaceFilePanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [boundsWest, setBoundsWest] = useState(String(orthophoto.boundsWest));
  const [boundsSouth, setBoundsSouth] = useState(String(orthophoto.boundsSouth));
  const [boundsEast, setBoundsEast] = useState(String(orthophoto.boundsEast));
  const [boundsNorth, setBoundsNorth] = useState(String(orthophoto.boundsNorth));
  const [minZoom, setMinZoom] = useState(String(orthophoto.minZoom));
  const [maxZoom, setMaxZoom] = useState(String(orthophoto.maxZoom));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    file && boundsWest.trim() && boundsSouth.trim() && boundsEast.trim() && boundsNorth.trim() && minZoom.trim() && maxZoom.trim() && !busy;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await replaceOrthophotoFile(orthophoto.id, {
        file,
        boundsWest: Number(boundsWest),
        boundsSouth: Number(boundsSouth),
        boundsEast: Number(boundsEast),
        boundsNorth: Number(boundsNorth),
        minZoom: Number(minZoom),
        maxZoom: Number(maxZoom),
      });
      onClose(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al reemplazar el archivo");
      setBusy(false);
    }
  };

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
      <form
        onSubmit={handleSubmit}
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
          <h3 style={{ color: theme.color.text, margin: 0, fontSize: 15, fontWeight: 600 }}>Reemplazar archivo</h3>
          <button
            type="button"
            onClick={() => onClose()}
            style={{ border: "none", background: "transparent", color: theme.color.textMuted, cursor: "pointer", fontSize: 18 }}
          >
            ×
          </button>
        </div>

        <p style={{ color: theme.color.textMuted, fontSize: 11, margin: 0 }}>
          Sube un .mbtiles nuevo para <strong>{orthophoto.name}</strong> conservando el mismo enlace —
          útil al reprocesar con otros parámetros (zoom, formato) sin perder el acceso ya
          compartido.
        </p>

        <label style={labelStyle}>
          Archivo .mbtiles
          <input
            type="file"
            accept=".mbtiles"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            style={{ display: "block", marginTop: 6, color: theme.color.text, fontSize: 12 }}
          />
        </label>

        <div style={{ display: "flex", gap: 10 }}>
          <label style={{ ...labelStyle, flex: 1 }}>
            Bounds oeste
            <input type="number" step="any" value={boundsWest} onChange={(e) => setBoundsWest(e.target.value)} style={{ ...inputStyle, marginTop: 6 }} />
          </label>
          <label style={{ ...labelStyle, flex: 1 }}>
            Bounds sur
            <input type="number" step="any" value={boundsSouth} onChange={(e) => setBoundsSouth(e.target.value)} style={{ ...inputStyle, marginTop: 6 }} />
          </label>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <label style={{ ...labelStyle, flex: 1 }}>
            Bounds este
            <input type="number" step="any" value={boundsEast} onChange={(e) => setBoundsEast(e.target.value)} style={{ ...inputStyle, marginTop: 6 }} />
          </label>
          <label style={{ ...labelStyle, flex: 1 }}>
            Bounds norte
            <input type="number" step="any" value={boundsNorth} onChange={(e) => setBoundsNorth(e.target.value)} style={{ ...inputStyle, marginTop: 6 }} />
          </label>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <label style={{ ...labelStyle, flex: 1 }}>
            Zoom mínimo
            <input type="number" step="1" value={minZoom} onChange={(e) => setMinZoom(e.target.value)} style={{ ...inputStyle, marginTop: 6 }} />
          </label>
          <label style={{ ...labelStyle, flex: 1 }}>
            Zoom máximo
            <input type="number" step="1" value={maxZoom} onChange={(e) => setMaxZoom(e.target.value)} style={{ ...inputStyle, marginTop: 6 }} />
          </label>
        </div>

        {error && <p style={{ color: theme.color.danger, fontSize: 12, margin: 0 }}>{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            padding: "10px 14px",
            borderRadius: theme.radius,
            border: "none",
            background: !canSubmit ? theme.color.border : theme.color.accent,
            color: !canSubmit ? theme.color.textMuted : "#0b0d10",
            cursor: !canSubmit ? "not-allowed" : "pointer",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          {busy ? "Subiendo..." : "Reemplazar archivo"}
        </button>
      </form>
    </div>
  );
}
