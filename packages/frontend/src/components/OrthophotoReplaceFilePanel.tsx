import { useState } from "react";
import type { Orthophoto } from "@h-geovisor/shared";
import { replaceOrthophotoFile } from "../api/orthophotos";
import { theme } from "../styles/theme";

interface OrthophotoReplaceFilePanelProps {
  orthophoto: Orthophoto;
  onClose: (updated?: Orthophoto) => void;
}

const labelStyle: React.CSSProperties = { color: theme.color.textMuted, fontSize: 11, display: "block" };

export function OrthophotoReplaceFilePanel({ orthophoto, onClose }: OrthophotoReplaceFilePanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = file && !busy;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await replaceOrthophotoFile(orthophoto.id, { file });
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
          compartido. Los bounds y el zoom se detectan automáticamente del archivo.
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
