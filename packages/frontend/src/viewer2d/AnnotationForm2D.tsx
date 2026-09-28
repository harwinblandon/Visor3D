import { useState } from "react";
import type { DamageType, Severity } from "@h-geovisor/shared";
import { useOrthophotoStore } from "../state/orthophotoStore";
import { createAnnotation, uploadAnnotationPhotos } from "../api/annotations";
import { getStoredAdminKey } from "../api/auth";
import { theme } from "../styles/theme";

const CATEGORY_SUGGESTIONS = [
  "Punto de referencia",
  "Lindero",
  "Acceso",
  "Construcción",
  "Cultivo",
  "Cuerpo de agua",
  "Vía",
  "Daño",
  "Otro",
];

const SEVERITIES: { value: Severity | ""; label: string }[] = [
  { value: "", label: "Sin definir" },
  { value: "baja", label: "Baja" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" },
];

const AUTHOR_STORAGE_KEY = "h_geovisor_author_name";

const fieldStyle: React.CSSProperties = {
  padding: "8px 10px",
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

export function AnnotationForm2D() {
  const orthophotoId = useOrthophotoStore((s) => s.orthophotoId);
  const pendingAnnotation = useOrthophotoStore((s) => s.pendingAnnotation);
  const setPendingAnnotation = useOrthophotoStore((s) => s.setPendingAnnotation);
  const addAnnotation = useOrthophotoStore((s) => s.addAnnotation);

  const [damageType, setDamageType] = useState<DamageType>("");
  const [severity, setSeverity] = useState<Severity | "">("");
  const [description, setDescription] = useState("");
  const [detectedAt, setDetectedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [author, setAuthor] = useState(() => localStorage.getItem(AUTHOR_STORAGE_KEY) ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!pendingAnnotation || !orthophotoId) return null;

  const handleCancel = () => setPendingAnnotation(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!damageType.trim()) {
      setError("Escribe una categoría (ej. Grieta, Material, Acabado)");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      localStorage.setItem(AUTHOR_STORAGE_KEY, author);

      const annotation = await createAnnotation({
        orthophotoId,
        position: { x: pendingAnnotation.point[0], y: pendingAnnotation.point[1], z: 0 },
        damageType: damageType.trim(),
        severity: severity || null,
        description: description || undefined,
        author: author || undefined,
        detectedAt: detectedAt || undefined,
      });

      if (files.length > 0) {
        const photos = await uploadAnnotationPhotos(annotation.id, files);
        annotation.photos = photos as typeof annotation.photos;
      }

      addAnnotation(annotation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar la anotación");
      setSubmitting(false);
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
          width: "min(380px, 100%)",
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
          boxSizing: "border-box",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        <h3 style={{ color: theme.color.text, margin: 0, fontSize: 15, fontWeight: 600 }}>Nueva anotación</h3>

        <label style={labelStyle}>
          Categoría (elige una sugerencia o escribe la tuya)
          <input
            type="text"
            list="annotation-category-suggestions-2d"
            value={damageType}
            onChange={(e) => setDamageType(e.target.value)}
            placeholder="Ej. Grieta, Material, Acabado..."
            style={{ ...fieldStyle, marginTop: 4 }}
          />
          <datalist id="annotation-category-suggestions-2d">
            {CATEGORY_SUGGESTIONS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>

        <label style={labelStyle}>
          Severidad (opcional)
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as Severity | "")}
            style={{ ...fieldStyle, marginTop: 4 }}
          >
            {SEVERITIES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          Descripción
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{ ...fieldStyle, marginTop: 4, resize: "vertical" }}
          />
        </label>

        <div style={{ display: "flex", gap: 10 }}>
          <label style={{ ...labelStyle, flex: 1 }}>
            Fecha detectada
            <input
              type="date"
              value={detectedAt}
              onChange={(e) => setDetectedAt(e.target.value)}
              style={{ ...fieldStyle, marginTop: 4 }}
            />
          </label>
          <label style={{ ...labelStyle, flex: 1 }}>
            Autor
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Tu nombre"
              style={{ ...fieldStyle, marginTop: 4 }}
            />
          </label>
        </div>

        {!!getStoredAdminKey() && (
          <label style={labelStyle}>
            Fotos (opcional)
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              style={{ display: "block", marginTop: 4, color: theme.color.text, fontSize: 12 }}
            />
          </label>
        )}

        {error && <p style={{ color: theme.color.danger, fontSize: 12, margin: 0 }}>{error}</p>}

        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={handleCancel}
            style={{
              flex: 1,
              padding: "10px 14px",
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
          <button
            type="submit"
            disabled={submitting}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: theme.radius,
              border: "none",
              background: theme.color.accent,
              color: "#0b0d10",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {submitting ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
