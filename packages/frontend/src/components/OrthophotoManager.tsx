import { useEffect, useState } from "react";
import type { Orthophoto, OrthophotoLayer } from "@visor3d/shared";
import {
  listOrthophotos,
  deleteOrthophoto,
  setOrthophotoPublished,
  updateOrthophoto,
  orthophotoShareUrl,
} from "../api/orthophotos";
import { listOrthophotoLayers, uploadOrthophotoLayer, deleteOrthophotoLayer } from "../api/orthophotoLayers";
import { OrthophotoReplaceFilePanel } from "./OrthophotoReplaceFilePanel";
import { theme } from "../styles/theme";

interface OrthophotoManagerProps {
  onUpdated: (orthophoto: Orthophoto) => void;
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

interface OrthophotoEditFormProps {
  orthophoto: Orthophoto;
  onCancel: () => void;
  onSaved: (orthophoto: Orthophoto) => void;
}

function OrthophotoEditForm({ orthophoto, onCancel, onSaved }: OrthophotoEditFormProps) {
  const [name, setName] = useState(orthophoto.name);
  const [crsDescription, setCrsDescription] = useState(orthophoto.crsDescription ?? "");
  const [notes, setNotes] = useState(orthophoto.notes ?? "");
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
      const saved = await updateOrthophoto(orthophoto.id, {
        name: name.trim(),
        crsDescription: crsDescription.trim() || null,
        notes: notes.trim() || null,
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
          placeholder="Ej. EPSG:3857 (Web Mercator)"
          style={{ ...inputStyle, marginTop: 4 }}
        />
      </label>

      <label style={{ color: theme.color.textMuted, fontSize: 11 }}>
        Notas (opcional)
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          style={{ ...inputStyle, marginTop: 4, resize: "vertical" }}
        />
      </label>

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

export function LayersSection({ orthophotoId }: { orthophotoId: string }) {
  const [layers, setLayers] = useState<OrthophotoLayer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busyLayerId, setBusyLayerId] = useState<string | null>(null);

  const reload = () => {
    listOrthophotoLayers(orthophotoId)
      .then(setLayers)
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar las capas"));
  };

  useEffect(reload, [orthophotoId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await uploadOrthophotoLayer(orthophotoId, file);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir la capa");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (layerId: string) => {
    setBusyLayerId(layerId);
    try {
      await deleteOrthophotoLayer(orthophotoId, layerId);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar la capa");
    } finally {
      setBusyLayerId(null);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "8px 10px",
        borderRadius: 6,
        background: theme.color.panel,
        border: `1px solid ${theme.color.border}`,
      }}
    >
      <span style={{ color: theme.color.textMuted, fontSize: 11, fontWeight: 600 }}>Capas KML/KMZ/Shapefile</span>

      {layers === null && <span style={{ color: theme.color.textMuted, fontSize: 11 }}>Cargando...</span>}
      {layers?.length === 0 && <span style={{ color: theme.color.textMuted, fontSize: 11 }}>Ninguna capa cargada.</span>}

      {layers?.map((l) => (
        <div key={l.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
          <span style={{ color: theme.color.text, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {l.name} <span style={{ color: theme.color.textMuted }}>({l.geojson.features.length} figura{l.geojson.features.length === 1 ? "" : "s"})</span>
          </span>
          <button
            type="button"
            disabled={busyLayerId === l.id}
            onClick={() => handleDelete(l.id)}
            style={{ border: "none", background: "transparent", color: theme.color.textMuted, cursor: "pointer", fontSize: 12, flexShrink: 0 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = theme.color.danger)}
            onMouseLeave={(e) => (e.currentTarget.style.color = theme.color.textMuted)}
          >
            ×
          </button>
        </div>
      ))}

      {error && <span style={{ color: theme.color.danger, fontSize: 11 }}>{error}</span>}

      <label
        style={{
          ...actionButtonStyle,
          color: theme.color.accent,
          borderColor: theme.color.accent,
          textAlign: "center",
          cursor: uploading ? "default" : "pointer",
        }}
      >
        {uploading ? "Subiendo..." : "+ Subir .kml/.kmz/.zip (shapefile)"}
        <input type="file" accept=".kml,.kmz,.zip" onChange={handleUpload} disabled={uploading} style={{ display: "none" }} />
      </label>
    </div>
  );
}

export function OrthophotoManager({ onUpdated, onUploadNew, onClose }: OrthophotoManagerProps) {
  const [orthophotos, setOrthophotos] = useState<Orthophoto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [layersOpenId, setLayersOpenId] = useState<string | null>(null);
  const [replaceFileId, setReplaceFileId] = useState<string | null>(null);

  const reload = () => {
    listOrthophotos()
      .then(setOrthophotos)
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar las ortofotos"));
  };

  useEffect(reload, []);

  const handleTogglePublished = async (o: Orthophoto) => {
    setBusyId(o.id);
    setError(null);
    try {
      await setOrthophotoPublished(o.id, !o.isPublished);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cambiar la visibilidad");
    } finally {
      setBusyId(null);
    }
  };

  const handleCopyLink = async (o: Orthophoto) => {
    try {
      await navigator.clipboard.writeText(orthophotoShareUrl(o));
      setCopiedId(o.id);
      setTimeout(() => setCopiedId((v) => (v === o.id ? null : v)), 2000);
    } catch {
      setError("No se pudo copiar el enlace. Cópialo manualmente: " + orthophotoShareUrl(o));
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await deleteOrthophoto(id);
      setConfirmDeleteId(null);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar la ortofoto");
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
          width: "min(620px, 100%)",
          maxHeight: "80vh",
          boxSizing: "border-box",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ color: theme.color.text, margin: 0, fontSize: 15, fontWeight: 600 }}>
            Ortofotos cargadas
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
          Cada ortofoto solo se ve por su propio enlace — "Publicado" controla si alguien con el
          enlace puede verla.
        </p>

        {error && <p style={{ color: theme.color.danger, fontSize: 12, margin: 0 }}>{error}</p>}

        <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          {orthophotos === null && <p style={{ color: theme.color.textMuted, fontSize: 13 }}>Cargando...</p>}
          {orthophotos?.length === 0 && <p style={{ color: theme.color.textMuted, fontSize: 13 }}>Ninguna ortofoto cargada todavía.</p>}

          {orthophotos?.map((o) => (
            <div
              key={o.id}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: "10px 12px",
                borderRadius: theme.radius,
                background: theme.color.panelAlt,
                border: `1px solid ${theme.color.border}`,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ color: theme.color.text, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {o.name}
                  </span>
                  <span
                    style={{
                      color: o.isPublished ? theme.color.severity.baja : theme.color.severity.alta,
                      fontSize: 10,
                      fontWeight: 700,
                      border: `1px solid ${o.isPublished ? theme.color.severity.baja : theme.color.severity.alta}`,
                      borderRadius: 4,
                      padding: "1px 5px",
                    }}
                  >
                    {o.isPublished ? "PUBLICADO" : "OCULTO"}
                  </span>
                </div>
                <div style={{ color: theme.color.textMuted, fontSize: 11, marginTop: 2 }}>
                  {formatDate(o.uploadedAt)} · {formatSize(o.fileSizeBytes)} · zoom {o.minZoom}–{o.maxZoom}
                  {o.crsDescription && ` · ${o.crsDescription}`}
                </div>
              </div>

              {editingId === o.id ? (
                <OrthophotoEditForm
                  orthophoto={o}
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
                    onClick={() => setEditingId(o.id)}
                    style={{ ...actionButtonStyle, color: theme.color.accent, borderColor: theme.color.accent }}
                  >
                    ✎ Editar info
                  </button>

                  <button type="button" onClick={() => handleCopyLink(o)} style={{ ...actionButtonStyle, color: theme.color.accent, borderColor: theme.color.accent }}>
                    {copiedId === o.id ? "¡Copiado!" : "Copiar enlace"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setLayersOpenId(layersOpenId === o.id ? null : o.id)}
                    style={{ ...actionButtonStyle, color: theme.color.accent, borderColor: theme.color.accent }}
                  >
                    {layersOpenId === o.id ? "Ocultar capas" : "Capas KML/KMZ/SHP"}
                  </button>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setReplaceFileId(o.id)}
                    style={{ ...actionButtonStyle, color: theme.color.accent, borderColor: theme.color.accent }}
                  >
                    ⟲ Reemplazar archivo
                  </button>

                  <button
                    type="button"
                    disabled={busyId === o.id}
                    onClick={() => handleTogglePublished(o)}
                    style={actionButtonStyle}
                  >
                    {o.isPublished ? "Ocultar" : "Publicar"}
                  </button>

                  {confirmDeleteId === o.id ? (
                    <>
                      <button
                        type="button"
                        disabled={busyId === o.id}
                        onClick={() => handleDelete(o.id)}
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
                      onClick={() => setConfirmDeleteId(o.id)}
                      style={actionButtonStyle}
                      onMouseEnter={(e) => (e.currentTarget.style.color = theme.color.danger)}
                      onMouseLeave={(e) => (e.currentTarget.style.color = theme.color.textMuted)}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              )}

              {layersOpenId === o.id && <LayersSection orthophotoId={o.id} />}
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
          Subir nueva ortofoto
        </button>
      </div>

      {replaceFileId && (
        <OrthophotoReplaceFilePanel
          orthophoto={orthophotos!.find((o) => o.id === replaceFileId)!}
          onClose={(updated) => {
            setReplaceFileId(null);
            if (updated) {
              reload();
              onUpdated(updated);
            }
          }}
        />
      )}
    </div>
  );
}
