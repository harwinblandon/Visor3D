import { useViewerStore } from "../state/viewerStore";
import { deleteMeasurement } from "../api/measurements";
import { theme } from "../styles/theme";

function RowDelete({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Eliminar"
      style={{
        border: "none",
        background: "transparent",
        color: theme.color.textMuted,
        cursor: "pointer",
        fontSize: 16,
        lineHeight: 1,
        padding: 4,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = theme.color.danger)}
      onMouseLeave={(e) => (e.currentTarget.style.color = theme.color.textMuted)}
    >
      ×
    </button>
  );
}

function Row({ color, label, onDelete }: { color: string; label: string; onDelete: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 14px",
        borderBottom: `1px solid ${theme.color.border}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
        <span style={{ color: theme.color.text, fontSize: 13 }}>{label}</span>
      </div>
      <RowDelete onClick={onDelete} />
    </div>
  );
}

export function MeasurementList() {
  const distanceMeasurements = useViewerStore((s) => s.distanceMeasurements);
  const areaMeasurements = useViewerStore((s) => s.areaMeasurements);
  const polylineMeasurements = useViewerStore((s) => s.polylineMeasurements);
  const removeDistanceMeasurement = useViewerStore((s) => s.removeDistanceMeasurement);
  const removeAreaMeasurement = useViewerStore((s) => s.removeAreaMeasurement);
  const removePolylineMeasurement = useViewerStore((s) => s.removePolylineMeasurement);

  const isEmpty =
    distanceMeasurements.length === 0 && areaMeasurements.length === 0 && polylineMeasurements.length === 0;

  const withDelete = (removeLocal: (id: string) => void) => (id: string) => {
    removeLocal(id);
    deleteMeasurement(id).catch((err) => console.error("No se pudo eliminar la medición:", err));
  };

  const handleDeleteDistance = withDelete(removeDistanceMeasurement);
  const handleDeleteArea = withDelete(removeAreaMeasurement);
  const handleDeletePolyline = withDelete(removePolylineMeasurement);

  return (
    <div
      style={{
        position: "fixed",
        top: 92,
        right: 16,
        width: 260,
        maxHeight: "calc(100vh - 112px)",
        overflowY: "auto",
        background: theme.color.panel,
        border: `1px solid ${theme.color.border}`,
        borderRadius: theme.radius,
        zIndex: 15,
        fontFamily: theme.font,
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          borderBottom: `1px solid ${theme.color.border}`,
          color: theme.color.text,
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        Mediciones
      </div>

      {isEmpty && (
        <div style={{ padding: 14, color: theme.color.textMuted, fontSize: 12 }}>
          Ninguna todavía. Usa las herramientas de la barra superior.
        </div>
      )}

      {distanceMeasurements.map((m) => (
        <Row
          key={m.id}
          color={theme.color.distance}
          label={`${m.distance.toFixed(2)} m`}
          onDelete={() => handleDeleteDistance(m.id)}
        />
      ))}

      {areaMeasurements.map((m) => (
        <Row
          key={m.id}
          color={theme.color.area}
          label={`${m.area.toFixed(2)} m²`}
          onDelete={() => handleDeleteArea(m.id)}
        />
      ))}

      {polylineMeasurements.map((m) => (
        <Row
          key={m.id}
          color={theme.color.polyline}
          label={`${m.length.toFixed(2)} m (polilínea)`}
          onDelete={() => handleDeletePolyline(m.id)}
        />
      ))}
    </div>
  );
}
