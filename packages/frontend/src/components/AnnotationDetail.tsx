import type { Severity, AnnotationStatus } from "@visor3d/shared";
import { useViewerStore } from "../state/viewerStore";
import { updateAnnotation, deleteAnnotation, photoUrl } from "../api/annotations";
import { theme } from "../styles/theme";

const SEVERITIES: { value: Severity; label: string }[] = [
  { value: "baja", label: "Baja" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" },
];

const STATUSES: { value: AnnotationStatus; label: string }[] = [
  { value: "abierto", label: "Abierto" },
  { value: "en_revision", label: "En revisión" },
  { value: "resuelto", label: "Resuelto" },
];

const selectStyle: React.CSSProperties = {
  padding: "6px 8px",
  borderRadius: 6,
  border: `1px solid ${theme.color.border}`,
  background: theme.color.panelAlt,
  color: theme.color.text,
  fontFamily: theme.font,
  fontSize: 12,
};

const DAMAGE_LABELS: Record<string, string> = {
  grieta: "Grieta",
  fisura: "Fisura",
  desprendimiento: "Desprendimiento",
  humedad: "Humedad",
  corrosion: "Corrosión",
  otro: "Otro",
};

export function AnnotationDetail() {
  const annotations = useViewerStore((s) => s.annotations);
  const selectedAnnotationId = useViewerStore((s) => s.selectedAnnotationId);
  const setSelectedAnnotationId = useViewerStore((s) => s.setSelectedAnnotationId);
  const updateAnnotationLocal = useViewerStore((s) => s.updateAnnotationLocal);
  const removeAnnotation = useViewerStore((s) => s.removeAnnotation);

  const annotation = annotations.find((a) => a.id === selectedAnnotationId);
  if (!annotation) return null;

  const handleSeverityChange = (severity: Severity) => {
    updateAnnotationLocal(annotation.id, { severity });
    updateAnnotation(annotation.id, { severity }).catch((err) => console.error("No se pudo actualizar:", err));
  };

  const handleStatusChange = (status: AnnotationStatus) => {
    updateAnnotationLocal(annotation.id, { status });
    updateAnnotation(annotation.id, { status }).catch((err) => console.error("No se pudo actualizar:", err));
  };

  const handleDelete = () => {
    removeAnnotation(annotation.id);
    deleteAnnotation(annotation.id).catch((err) => console.error("No se pudo eliminar:", err));
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 92,
        right: 292,
        width: 280,
        maxHeight: "calc(100vh - 112px)",
        overflowY: "auto",
        background: theme.color.panel,
        border: `1px solid ${theme.color.border}`,
        borderRadius: theme.radius,
        zIndex: 16,
        fontFamily: theme.font,
        padding: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ color: theme.color.text, fontSize: 14, fontWeight: 600 }}>
          {DAMAGE_LABELS[annotation.damageType] ?? annotation.damageType}
        </span>
        <button
          type="button"
          onClick={() => setSelectedAnnotationId(null)}
          style={{ border: "none", background: "transparent", color: theme.color.textMuted, cursor: "pointer", fontSize: 16 }}
        >
          ×
        </button>
      </div>

      {annotation.description && (
        <p style={{ color: theme.color.textMuted, fontSize: 12, marginTop: 0, marginBottom: 10 }}>
          {annotation.description}
        </p>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <select
          value={annotation.severity}
          onChange={(e) => handleSeverityChange(e.target.value as Severity)}
          style={{ ...selectStyle, flex: 1 }}
        >
          {SEVERITIES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={annotation.status}
          onChange={(e) => handleStatusChange(e.target.value as AnnotationStatus)}
          style={{ ...selectStyle, flex: 1 }}
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {(annotation.author || annotation.detectedAt) && (
        <p style={{ color: theme.color.textMuted, fontSize: 11, marginTop: 0, marginBottom: 10 }}>
          {annotation.author && <>Por {annotation.author} </>}
          {annotation.detectedAt && <>— {annotation.detectedAt}</>}
        </p>
      )}

      {annotation.photos.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
          {annotation.photos.map((photo) => (
            <a key={photo.id} href={photoUrl(photo.filePath)} target="_blank" rel="noreferrer">
              <img
                src={photoUrl(photo.filePath)}
                alt="Foto del daño"
                style={{ width: "100%", height: 70, objectFit: "cover", borderRadius: 6, border: `1px solid ${theme.color.border}` }}
              />
            </a>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleDelete}
        style={{
          width: "100%",
          padding: "8px 12px",
          borderRadius: theme.radius,
          border: `1px solid ${theme.color.danger}`,
          background: "transparent",
          color: theme.color.danger,
          cursor: "pointer",
          fontSize: 12,
        }}
      >
        Eliminar anotación
      </button>
    </div>
  );
}
