import { useState } from "react";
import type { Orthophoto } from "@visor3d/shared";
import { uploadOrthophoto } from "../api/orthophotos";
import { theme } from "../styles/theme";

interface OrthophotoUploadPanelProps {
  onUploaded: (orthophoto: Orthophoto) => void;
  onCancel: () => void;
}

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: theme.radius,
  border: `1px solid ${theme.color.border}`,
  background: theme.color.panelAlt,
  color: theme.color.text,
  fontFamily: theme.font,
  fontSize: 13,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = { color: theme.color.textMuted, fontSize: 12, display: "block" };

const cardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
  padding: "28px 32px",
  borderRadius: 12,
  background: theme.color.panel,
  border: `1px solid ${theme.color.border}`,
  width: "min(420px, 100%)",
  maxHeight: "calc(100vh - 32px)",
  overflowY: "auto",
  boxSizing: "border-box",
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
};

export function OrthophotoUploadPanel({ onUploaded, onCancel }: OrthophotoUploadPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [crsDescription, setCrsDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [boundsWest, setBoundsWest] = useState("");
  const [boundsSouth, setBoundsSouth] = useState("");
  const [boundsEast, setBoundsEast] = useState("");
  const [boundsNorth, setBoundsNorth] = useState("");
  const [minZoom, setMinZoom] = useState("");
  const [maxZoom, setMaxZoom] = useState("");
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const boundsValid = [boundsWest, boundsSouth, boundsEast, boundsNorth, minZoom, maxZoom].every((v) => v.trim() !== "");
  const canSubmit = file && name.trim() && boundsValid && status !== "uploading";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name.trim() || !boundsValid) return;
    setStatus("uploading");
    setError(null);
    try {
      const orthophoto = await uploadOrthophoto({
        file,
        name: name.trim(),
        crsDescription: crsDescription || undefined,
        notes: notes || undefined,
        boundsWest: Number(boundsWest),
        boundsSouth: Number(boundsSouth),
        boundsEast: Number(boundsEast),
        boundsNorth: Number(boundsNorth),
        minZoom: Number(minZoom),
        maxZoom: Number(maxZoom),
      });
      onUploaded(orthophoto);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Error al subir la ortofoto");
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
      <form onSubmit={handleSubmit} style={cardStyle}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <img src="/logo.png" alt="Logo" style={{ height: 84, width: "auto" }} />
          <h2 style={{ color: theme.color.text, margin: 0, fontSize: 16, fontWeight: 600 }}>Subir ortofoto (.mbtiles)</h2>
          <p style={{ color: theme.color.textMuted, fontSize: 11, textAlign: "center", margin: 0 }}>
            Genera el archivo con <code>tools/process-orthophoto.mjs</code> — al terminar imprime los
            bounds, el zoom y el peso que necesitas copiar aquí.
          </p>
        </div>

        <label style={labelStyle}>
          Archivo .mbtiles
          <input
            type="file"
            accept=".mbtiles"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            style={{ display: "block", marginTop: 6, color: theme.color.text, fontSize: 13 }}
          />
        </label>

        <label style={labelStyle}>
          Nombre
          <input
            type="text"
            placeholder="Ej. Predios SAE"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ ...inputStyle, marginTop: 6 }}
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

        <label style={labelStyle}>
          Descripción del CRS (opcional)
          <input
            type="text"
            placeholder="Ej. EPSG:3857 (Web Mercator)"
            value={crsDescription}
            onChange={(e) => setCrsDescription(e.target.value)}
            style={{ ...inputStyle, marginTop: 6 }}
          />
        </label>

        <label style={labelStyle}>
          Notas (opcional)
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            style={{ ...inputStyle, marginTop: 6, resize: "vertical" }}
          />
        </label>

        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            padding: "12px 16px",
            borderRadius: theme.radius,
            border: "none",
            background: !canSubmit ? theme.color.border : theme.color.accent,
            color: !canSubmit ? theme.color.textMuted : "#0b0d10",
            cursor: !canSubmit ? "not-allowed" : "pointer",
            fontWeight: 600,
            fontSize: 14,
            marginTop: 6,
          }}
        >
          {status === "uploading" ? "Subiendo..." : "Subir ortofoto"}
        </button>

        {error && <p style={{ color: theme.color.danger, fontSize: 12, margin: 0 }}>{error}</p>}

        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: "8px 16px",
            borderRadius: theme.radius,
            border: `1px solid ${theme.color.border}`,
            background: "transparent",
            color: theme.color.textMuted,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Cancelar
        </button>
      </form>
    </div>
  );
}
