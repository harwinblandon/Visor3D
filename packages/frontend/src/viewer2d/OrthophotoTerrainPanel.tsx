import { useState } from "react";
import type { Orthophoto } from "@visor3d/shared";
import { uploadOrthophotoTerrain, deleteOrthophotoTerrain } from "../api/orthophotos";
import { theme } from "../styles/theme";

interface OrthophotoTerrainPanelProps {
  orthophoto: Orthophoto;
  onClose: (updated?: { terrainPath: string | null; terrainMinZoom: number | null; terrainMaxZoom: number | null }) => void;
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

const actionButtonStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 6,
  border: `1px solid ${theme.color.border}`,
  background: "transparent",
  color: theme.color.textMuted,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
};

export function OrthophotoTerrainPanel({ orthophoto, onClose }: OrthophotoTerrainPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [minZoom, setMinZoom] = useState("");
  const [maxZoom, setMaxZoom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasTerrain, setHasTerrain] = useState(!!orthophoto.terrainPath);

  const canSubmit = file && minZoom.trim() && maxZoom.trim() && !busy;

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !minZoom.trim() || !maxZoom.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await uploadOrthophotoTerrain(orthophoto.id, file, Number(minZoom), Number(maxZoom));
      setHasTerrain(true);
      setFile(null);
      onClose({
        terrainPath: updated.terrainPath,
        terrainMinZoom: updated.terrainMinZoom,
        terrainMaxZoom: updated.terrainMaxZoom,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir el terreno");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteOrthophotoTerrain(orthophoto.id);
      setHasTerrain(false);
      onClose({ terrainPath: null, terrainMinZoom: null, terrainMaxZoom: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al quitar el terreno");
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
        onSubmit={handleUpload}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: 24,
          borderRadius: 12,
          background: theme.color.panel,
          border: `1px solid ${theme.color.border}`,
          width: "min(400px, 100%)",
          maxHeight: "80vh",
          overflowY: "auto",
          boxSizing: "border-box",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ color: theme.color.text, margin: 0, fontSize: 15, fontWeight: 600 }}>Terreno 3D</h3>
          <button
            type="button"
            onClick={() => onClose()}
            style={{ border: "none", background: "transparent", color: theme.color.textMuted, cursor: "pointer", fontSize: 18 }}
          >
            ×
          </button>
        </div>

        <p style={{ color: theme.color.textMuted, fontSize: 11, margin: 0 }}>
          Sube un .mbtiles de terreno (elevación codificada en RGB) generado con{" "}
          <code>tools/process-terrain.mjs</code> a partir de un DEM/DTM en GeoTIFF (por
          ejemplo, exportado desde Metashape). Una vez cargado, aparece un botón de
          terreno en el mapa para inclinar la vista y ver el relieve real debajo de{" "}
          <strong>{orthophoto.name}</strong>.
        </p>

        {hasTerrain && (
          <div
            style={{
              padding: "8px 10px",
              borderRadius: 6,
              background: theme.color.panelAlt,
              color: theme.color.severity.baja,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Esta ortofoto ya tiene terreno 3D cargado.
          </div>
        )}

        <label style={labelStyle}>
          Archivo .mbtiles del terreno
          <input
            type="file"
            accept=".mbtiles"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            style={{ display: "block", marginTop: 6, color: theme.color.text, fontSize: 12 }}
          />
        </label>

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
          {busy ? "Subiendo..." : hasTerrain ? "Reemplazar terreno" : "Subir terreno"}
        </button>

        {hasTerrain && (
          <button type="button" disabled={busy} onClick={handleRemove} style={{ ...actionButtonStyle, color: theme.color.danger, borderColor: theme.color.danger }}>
            Quitar terreno 3D
          </button>
        )}
      </form>
    </div>
  );
}
