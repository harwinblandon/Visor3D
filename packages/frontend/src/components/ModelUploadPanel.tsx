import { useState } from "react";
import type { Model } from "@visor3d/shared";
import { uploadModel } from "../api/models";
import { LocationPicker } from "./LocationPicker";
import { theme } from "../styles/theme";

interface ModelUploadPanelProps {
  isAdmin: boolean;
  onUnlock: (password: string) => Promise<boolean>;
  onUploaded: (model: Model) => void;
  onCancel?: () => void;
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
};

const cardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
  padding: "28px 32px",
  borderRadius: 12,
  background: theme.color.panel,
  border: `1px solid ${theme.color.border}`,
  width: "min(380px, 100%)",
  maxHeight: "calc(100vh - 32px)",
  overflowY: "auto",
  boxSizing: "border-box",
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
};

function UnlockGate({
  onUnlock,
  onCancel,
}: {
  onUnlock: (password: string) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setError(null);
    const ok = await onUnlock(password);
    setChecking(false);
    if (!ok) setError("Clave incorrecta.");
  };

  return (
    <form onSubmit={handleSubmit} style={cardStyle}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <img src="/logo.png" alt="Logo" style={{ height: 84, width: "auto" }} />
        <h2 style={{ color: theme.color.text, margin: 0, fontSize: 16, fontWeight: 600 }}>
          Acceso de administrador
        </h2>
        <p style={{ color: theme.color.textMuted, fontSize: 12, textAlign: "center", margin: 0 }}>
          Subir o reemplazar el modelo 3D requiere la clave de administrador.
        </p>
      </div>

      <input
        type="password"
        autoFocus
        placeholder="Clave de administrador"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
      />

      {error && <p style={{ color: theme.color.danger, fontSize: 12, margin: 0 }}>{error}</p>}

      <button
        type="submit"
        disabled={!password || checking}
        style={{
          padding: "12px 16px",
          borderRadius: theme.radius,
          border: "none",
          background: !password ? theme.color.border : theme.color.accent,
          color: !password ? theme.color.textMuted : "#0b0d10",
          cursor: !password ? "not-allowed" : "pointer",
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        {checking ? "Verificando..." : "Desbloquear"}
      </button>

      {onCancel && (
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
          Cancelar y volver al visor
        </button>
      )}
    </form>
  );
}

export function ModelUploadPanel({ isAdmin, onUnlock, onUploaded, onCancel }: ModelUploadPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [crsDescription, setCrsDescription] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name) return;
    setStatus("uploading");
    setError(null);
    try {
      const model = await uploadModel({
        file,
        name,
        crsDescription: crsDescription || undefined,
        latitude: latitude ? Number(latitude) : undefined,
        longitude: longitude ? Number(longitude) : undefined,
      });
      onUploaded(model);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Error al subir el modelo");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100vw",
        height: "100vh",
        fontFamily: theme.font,
        background: theme.color.bg,
        padding: 16,
        boxSizing: "border-box",
      }}
    >
      {!isAdmin ? (
        <UnlockGate onUnlock={onUnlock} onCancel={onCancel} />
      ) : (
        <form onSubmit={handleSubmit} style={cardStyle}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <img src="/logo.png" alt="Logo" style={{ height: 84, width: "auto" }} />
            <h2 style={{ color: theme.color.text, margin: 0, fontSize: 16, fontWeight: 600 }}>
              Subir modelo 3D (.glb)
            </h2>
          </div>

          <label style={{ color: theme.color.textMuted, fontSize: 12 }}>
            Archivo GLB
            <input
              type="file"
              accept=".glb"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              style={{ display: "block", marginTop: 6, color: theme.color.text, fontSize: 13 }}
            />
          </label>

          <label style={{ color: theme.color.textMuted, fontSize: 12 }}>
            Nombre del proyecto/edificación
            <input
              type="text"
              placeholder="Ej. Edificio Torre Norte"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ ...inputStyle, display: "block", marginTop: 6, width: "100%", boxSizing: "border-box" }}
            />
          </label>

          <label style={{ color: theme.color.textMuted, fontSize: 12 }}>
            Descripción del CRS (opcional)
            <input
              type="text"
              placeholder="Ej. Local, centrado en obra"
              value={crsDescription}
              onChange={(e) => setCrsDescription(e.target.value)}
              style={{ ...inputStyle, display: "block", marginTop: 6, width: "100%", boxSizing: "border-box" }}
            />
          </label>

          <div style={{ display: "flex", gap: 10 }}>
            <label style={{ color: theme.color.textMuted, fontSize: 12, flex: 1 }}>
              Latitud (opcional)
              <input
                type="number"
                step="any"
                placeholder="Ej. 4.6097"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                style={{ ...inputStyle, display: "block", marginTop: 6, width: "100%", boxSizing: "border-box" }}
              />
            </label>
            <label style={{ color: theme.color.textMuted, fontSize: 12, flex: 1 }}>
              Longitud (opcional)
              <input
                type="number"
                step="any"
                placeholder="Ej. -74.0817"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                style={{ ...inputStyle, display: "block", marginTop: 6, width: "100%", boxSizing: "border-box" }}
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => setShowPicker((v) => !v)}
            style={{
              padding: "8px 10px",
              borderRadius: theme.radius,
              border: `1px solid ${theme.color.border}`,
              background: "transparent",
              color: theme.color.accent,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: theme.font,
              alignSelf: "flex-start",
            }}
          >
            {showPicker ? "Ocultar mapa" : "📍 Marcar ubicación en el mapa (opcional)"}
          </button>

          {showPicker && (
            <LocationPicker
              latitude={latitude ? Number(latitude) : null}
              longitude={longitude ? Number(longitude) : null}
              onPick={(lat, lng) => {
                setLatitude(lat.toFixed(6));
                setLongitude(lng.toFixed(6));
              }}
            />
          )}

          <button
            type="submit"
            disabled={!file || !name || status === "uploading"}
            style={{
              padding: "12px 16px",
              borderRadius: theme.radius,
              border: "none",
              background: !file || !name ? theme.color.border : theme.color.accent,
              color: !file || !name ? theme.color.textMuted : "#0b0d10",
              cursor: !file || !name ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: 14,
              marginTop: 6,
            }}
          >
            {status === "uploading" ? "Subiendo..." : "Subir y visualizar"}
          </button>

          {error && <p style={{ color: theme.color.danger, fontSize: 12, margin: 0 }}>{error}</p>}

          {onCancel && (
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
              Cancelar y volver al visor
            </button>
          )}
        </form>
      )}
    </div>
  );
}
