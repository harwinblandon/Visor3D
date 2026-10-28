import { useState } from "react";
import type { Orthophoto } from "@h-geovisor/shared";
import { uploadOrthophotoTerrain, deleteOrthophotoTerrain } from "../api/orthophotos";
import { theme } from "../styles/theme";

interface OrthophotoTerrainPanelProps {
  orthophoto: Orthophoto;
  onClose: (updated?: { terrainPath: string | null; terrainMinZoom: number | null; terrainMaxZoom: number | null }) => void;
}

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasTerrain, setHasTerrain] = useState(!!orthophoto.terrainPath);

  const canSubmit = file && !busy;

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await uploadOrthophotoTerrain(orthophoto.id, file);
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
