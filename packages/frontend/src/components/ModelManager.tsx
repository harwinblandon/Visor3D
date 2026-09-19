import { useEffect, useState } from "react";
import type { Model } from "@visor3d/shared";
import { listModels, activateModel, deleteModel } from "../api/models";
import { theme } from "../styles/theme";

interface ModelManagerProps {
  onActivated: (model: Model) => void;
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

export function ModelManager({ onActivated, onUploadNew, onClose }: ModelManagerProps) {
  const [models, setModels] = useState<Model[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
          width: 520,
          maxHeight: "80vh",
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

        {error && <p style={{ color: theme.color.danger, fontSize: 12, margin: 0 }}>{error}</p>}

        <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          {models === null && <p style={{ color: theme.color.textMuted, fontSize: 13 }}>Cargando...</p>}
          {models?.length === 0 && <p style={{ color: theme.color.textMuted, fontSize: 13 }}>Ningún modelo cargado todavía.</p>}

          {models?.map((m) => (
            <div
              key={m.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderRadius: theme.radius,
                background: theme.color.panelAlt,
                border: `1px solid ${m.isActive ? theme.color.accent : theme.color.border}`,
                gap: 10,
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: theme.color.text, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.name}
                  </span>
                  {m.isActive && (
                    <span style={{ color: theme.color.accent, fontSize: 10, fontWeight: 700, border: `1px solid ${theme.color.accent}`, borderRadius: 4, padding: "1px 5px" }}>
                      ACTIVO
                    </span>
                  )}
                </div>
                <div style={{ color: theme.color.textMuted, fontSize: 11, marginTop: 2 }}>
                  {formatDate(m.uploadedAt)} · {formatSize(m.fileSizeBytes)}
                </div>
              </div>

              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                {!m.isActive && (
                  <button
                    type="button"
                    disabled={busyId === m.id}
                    onClick={() => handleActivate(m.id)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: `1px solid ${theme.color.accent}`,
                      background: "transparent",
                      color: theme.color.accent,
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
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
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${theme.color.border}`, background: "transparent", color: theme.color.textMuted, cursor: "pointer", fontSize: 11 }}
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(m.id)}
                    style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${theme.color.border}`, background: "transparent", color: theme.color.textMuted, cursor: "pointer", fontSize: 11 }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = theme.color.danger)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = theme.color.textMuted)}
                  >
                    Eliminar
                  </button>
                )}
              </div>
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
