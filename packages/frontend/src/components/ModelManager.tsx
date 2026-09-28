import { useEffect, useState } from "react";
import type { Model } from "@h-geovisor/shared";
import { listModels, activateModel, deleteModel, setModelPublished, updateModel, modelShareUrl } from "../api/models";
import { LocationPicker } from "./LocationPicker";
import { theme } from "../styles/theme";

interface ModelManagerProps {
  onActivated: (model: Model) => void;
  onUpdated: (model: Model) => void;
  onUploadNew: () => void;
  onClose: () => void;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "—";
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" });
}

const actionButtonStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 6,
  border: `1px solid ${theme.color.border}`,
  background: "transparent",
  color: theme.color.textMuted,
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 6,
  border: `1px solid ${theme.color.border}`,
  background: theme.color.panel,
  color: theme.color.text,
  fontFamily: theme.font,
  fontSize: 12,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

interface ModelEditFormProps {
  model: Model;
  onCancel: () => void;
  onSaved: (model: Model) => void;
}

function ModelEditForm({ model, onCancel, onSaved }: ModelEditFormProps) {
  const [name, setName] = useState(model.name);
  const [crsDescription, setCrsDescription] = useState(model.crsDescription ?? "");
  const [latitude, setLatitude] = useState(model.latitude !== null ? String(model.latitude) : "");
  const [longitude, setLongitude] = useState(model.longitude !== null ? String(model.longitude) : "");
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("El nombre no puede quedar vacío");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await updateModel(model.id, {
        name: name.trim(),
        crsDescription: crsDescription.trim() || null,
        latitude: latitude.trim() ? Number(latitude) : null,
        longitude: longitude.trim() ? Number(longitude) : null,
      });
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar los cambios");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={{ color: theme.color.textMuted, fontSize: 11 }}>
        Nombre
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, marginTop: 4 }} />
      </label>

      <label style={{ color: theme.color.textMuted, fontSize: 11 }}>
        Descripción del CRS (opcional)
        <input
          type="text"
          value={crsDescription}
          onChange={(e) => setCrsDescription(e.target.value)}
          placeholder="Ej. Local, centrado en obra"
          style={{ ...inputStyle, marginTop: 4 }}
        />
      </label>

      <div style={{ display: "flex", gap: 8 }}>
        <label style={{ color: theme.color.textMuted, fontSize: 11, flex: 1 }}>
          Latitud
          <input
            type="number"
            step="any"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            placeholder="Ej. 4.6097"
            style={{ ...inputStyle, marginTop: 4 }}
          />
        </label>
        <label style={{ color: theme.color.textMuted, fontSize: 11, flex: 1 }}>
          Longitud
          <input
            type="number"
            step="any"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            placeholder="Ej. -74.0817"
            style={{ ...inputStyle, marginTop: 4 }}
          />
        </label>
      </div>

      <button
        type="button"
        onClick={() => setShowPicker((v) => !v)}
        style={{ ...actionButtonStyle, color: theme.color.accent, borderColor: theme.color.accent, alignSelf: "flex-start" }}
      >
        {showPicker ? "Ocultar mapa" : "📍 Marcar ubicación en el mapa"}
      </button>

      {showPicker && (
        <LocationPicker
          latitude={latitude.trim() ? Number(latitude) : null}
          longitude={longitude.trim() ? Number(longitude) : null}
          onPick={(lat, lng) => {
            setLatitude(lat.toFixed(6));
            setLongitude(lng.toFixed(6));
          }}
        />
      )}

      {error && <p style={{ color: theme.color.danger, fontSize: 11, margin: 0 }}>{error}</p>}

      <div style={{ display: "flex", gap: 6 }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{ flex: 1, padding: "8px 10px", borderRadius: 6, border: "none", background: theme.color.accent, color: "#0b0d10", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
        <button type="button" onClick={onCancel} style={{ flex: 1, ...actionButtonStyle, padding: "8px 10px" }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function ModelManager({ onActivated, onUpdated, onUploadNew, onClose }: ModelManagerProps) {
  const [models, setModels] = useState<Model[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const reload = () => {
    listModels()
      .then(setModels)
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar los modelos"));
  };

  useEffect(reload, []);

  const handleActivate = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      const model = await activateModel(id);
      onActivated(model);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al activar el modelo");
    } finally {
      setBusyId(null);
    }
  };

  const handleTogglePublished = async (m: Model) => {
    setBusyId(m.id);
    setError(null);
    try {
      await setModelPublished(m.id, !m.isPublished);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cambiar la visibilidad");
    } finally {
      setBusyId(null);
    }
  };

  const handleCopyLink = async (m: Model) => {
    try {
      await navigator.clipboard.writeText(modelShareUrl(m));
      setCopiedId(m.id);
      setTimeout(() => setCopiedId((v) => (v === m.id ? null : v)), 2000);
    } catch {
      setError("No se pudo copiar el enlace. Cópialo manualmente: " + modelShareUrl(m));
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await deleteModel(id);
      setConfirmDeleteId(null);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar el modelo");
    } finally {
      setBusyId(null);
    }
  };

  const isBusy = busyId !== null || editingId !== null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 40,
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
          width: "min(580px, 100%)",
          maxHeight: "80vh",
          boxSizing: "border-box",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ color: theme.color.text, margin: 0, fontSize: 15, fontWeight: 600 }}>
            Modelos cargados
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{ border: "none", background: "transparent", color: theme.color.textMuted, cursor: "pointer", fontSize: 18 }}
          >
            ×
          </button>
        </div>

        <p style={{ color: theme.color.textMuted, fontSize: 11, margin: 0 }}>
          "Publicado" controla si alguien con el enlace puede verlo. "Activo" es el que se muestra por
          defecto al entrar sin un enlace específico.
        </p>

        {error && <p style={{ color: theme.color.danger, fontSize: 12, margin: 0 }}>{error}</p>}

        <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          {models === null && <p style={{ color: theme.color.textMuted, fontSize: 13 }}>Cargando...</p>}
          {models?.length === 0 && <p style={{ color: theme.color.textMuted, fontSize: 13 }}>Ningún modelo cargado todavía.</p>}

          {models?.map((m) => (
            <div
              key={m.id}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: "10px 12px",
                borderRadius: theme.radius,
                background: theme.color.panelAlt,
                border: `1px solid ${m.isActive ? theme.color.accent : theme.color.border}`,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ color: theme.color.text, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.name}
                  </span>
                  {m.isActive && (
                    <span style={{ color: theme.color.accent, fontSize: 10, fontWeight: 700, border: `1px solid ${theme.color.accent}`, borderRadius: 4, padding: "1px 5px" }}>
                      ACTIVO
                    </span>
                  )}
                  <span
                    style={{
                      color: m.isPublished ? theme.color.severity.baja : theme.color.severity.alta,
                      fontSize: 10,
                      fontWeight: 700,
                      border: `1px solid ${m.isPublished ? theme.color.severity.baja : theme.color.severity.alta}`,
                      borderRadius: 4,
                      padding: "1px 5px",
                    }}
                  >
                    {m.isPublished ? "PUBLICADO" : "OCULTO"}
                  </span>
                </div>
                <div style={{ color: theme.color.textMuted, fontSize: 11, marginTop: 2 }}>
                  {formatDate(m.uploadedAt)} · {formatSize(m.fileSizeBytes)}
                  {m.crsDescription && ` · ${m.crsDescription}`}
                </div>
                {m.latitude !== null && m.longitude !== null && (
                  <div style={{ color: theme.color.textMuted, fontSize: 11 }}>
                    📍 {m.latitude.toFixed(5)}, {m.longitude.toFixed(5)}
                  </div>
                )}
              </div>

              {editingId === m.id ? (
                <ModelEditForm
                  model={m}
                  onCancel={() => setEditingId(null)}
                  onSaved={(saved) => {
                    setEditingId(null);
                    reload();
                    onUpdated(saved);
                  }}
                />
              ) : (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setEditingId(m.id)}
                    style={{ ...actionButtonStyle, color: theme.color.accent, borderColor: theme.color.accent }}
                  >
                    ✎ Editar info
                  </button>

                  <button type="button" onClick={() => handleCopyLink(m)} style={{ ...actionButtonStyle, color: theme.color.accent, borderColor: theme.color.accent }}>
                    {copiedId === m.id ? "¡Copiado!" : "Copiar enlace"}
                  </button>

                  <button
                    type="button"
                    disabled={busyId === m.id}
                    onClick={() => handleTogglePublished(m)}
                    style={actionButtonStyle}
                  >
                    {m.isPublished ? "Ocultar" : "Publicar"}
                  </button>

                  {!m.isActive && (
                    <button
                      type="button"
                      disabled={busyId === m.id}
                      onClick={() => handleActivate(m.id)}
                      style={{ ...actionButtonStyle, color: theme.color.accent, borderColor: theme.color.accent }}
                    >
                      Trabajar en este
                    </button>
                  )}

                  {confirmDeleteId === m.id ? (
                    <>
                      <button
                        type="button"
                        disabled={busyId === m.id}
                        onClick={() => handleDelete(m.id)}
                        style={{ padding: "6px 10px", borderRadius: 6, border: "none", background: theme.color.danger, color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600 }}
                      >
                        Confirmar borrado
                      </button>
                      <button type="button" onClick={() => setConfirmDeleteId(null)} style={actionButtonStyle}>
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(m.id)}
                      style={actionButtonStyle}
                      onMouseEnter={(e) => (e.currentTarget.style.color = theme.color.danger)}
                      onMouseLeave={(e) => (e.currentTarget.style.color = theme.color.textMuted)}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onUploadNew}
          style={{
            padding: "10px 16px",
            borderRadius: theme.radius,
            border: "none",
            background: theme.color.accent,
            color: "#0b0d10",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
            marginTop: 6,
          }}
        >
          Subir nuevo modelo
        </button>
      </div>
    </div>
  );
}
