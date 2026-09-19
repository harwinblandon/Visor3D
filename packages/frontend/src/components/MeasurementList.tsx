import { useViewerStore } from "../state/viewerStore";
import { deleteMeasurement, updateMeasurement } from "../api/measurements";
import { computeDistance, computePolylineLength } from "../viewer/math/distance";
import { computeNewellArea } from "../viewer/math/polygonArea";
import { theme } from "../styles/theme";

function IconButton({ onClick, title, children, color }: { onClick: () => void; title: string; children: React.ReactNode; color?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        border: "none",
        background: "transparent",
        color: color ?? theme.color.textMuted,
        cursor: "pointer",
        fontSize: 13,
        lineHeight: 1,
        padding: 4,
      }}
    >
      {children}
    </button>
  );
}

function Row({
  color,
  label,
  editing,
  disabled,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}: {
  color: string;
  label: string;
  editing: boolean;
  disabled: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: "8px 14px",
        borderBottom: `1px solid ${theme.color.border}`,
        background: editing ? theme.color.panelAlt : "transparent",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
          <span style={{ color: theme.color.text, fontSize: 13 }}>{label}</span>
        </div>
        {!editing && (
          <div style={{ display: "flex", gap: 2 }}>
            <IconButton onClick={onEdit} title="Editar vértices" color={disabled ? theme.color.border : undefined}>
              ✎
            </IconButton>
            <IconButton onClick={onDelete} title="Eliminar">
              ×
            </IconButton>
          </div>
        )}
      </div>
      {editing && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ color: theme.color.textMuted, fontSize: 11 }}>
            Arrastra los puntos blancos sobre el modelo para corregirlos.
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              onClick={onSave}
              style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "none", background: theme.color.accent, color: "#0b0d10", cursor: "pointer", fontSize: 11, fontWeight: 600 }}
            >
              Guardar cambios
            </button>
            <button
              type="button"
              onClick={onCancel}
              style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: `1px solid ${theme.color.border}`, background: "transparent", color: theme.color.textMuted, cursor: "pointer", fontSize: 11 }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
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
  const editingMeasurement = useViewerStore((s) => s.editingMeasurement);
  const startEditingMeasurement = useViewerStore((s) => s.startEditingMeasurement);
  const cancelEditingMeasurement = useViewerStore((s) => s.cancelEditingMeasurement);
  const applyEditedMeasurement = useViewerStore((s) => s.applyEditedMeasurement);

  const isEmpty =
    distanceMeasurements.length === 0 && areaMeasurements.length === 0 && polylineMeasurements.length === 0;

  const withDelete = (removeLocal: (id: string) => void) => (id: string) => {
    removeLocal(id);
    deleteMeasurement(id).catch((err) => console.error("No se pudo eliminar la medición:", err));
  };

  const handleDeleteDistance = withDelete(removeDistanceMeasurement);
  const handleDeleteArea = withDelete(removeAreaMeasurement);
  const handleDeletePolyline = withDelete(removePolylineMeasurement);

  const handleSave = async () => {
    if (!editingMeasurement) return;
    const { id, type, points } = editingMeasurement;
    const value =
      type === "distance"
        ? computeDistance(points[0], points[1])
        : type === "area"
          ? computeNewellArea(points).area
          : computePolylineLength(points);

    try {
      await updateMeasurement(
        id,
        points.map((p) => ({ x: p.x, y: p.y, z: p.z })),
        value,
      );
      applyEditedMeasurement(id, points, value);
    } catch (err) {
      console.error("No se pudo guardar la edición de la medición:", err);
    }
  };

  const isBusy = editingMeasurement !== null;

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
          editing={editingMeasurement?.type === "distance" && editingMeasurement.id === m.id}
          disabled={isBusy}
          onEdit={() => !isBusy && startEditingMeasurement({ id: m.id, type: "distance", points: m.points.map((p) => p.clone()) })}
          onSave={handleSave}
          onCancel={cancelEditingMeasurement}
          onDelete={() => handleDeleteDistance(m.id)}
        />
      ))}

      {areaMeasurements.map((m) => (
        <Row
          key={m.id}
          color={theme.color.area}
          label={`${m.area.toFixed(2)} m²`}
          editing={editingMeasurement?.type === "area" && editingMeasurement.id === m.id}
          disabled={isBusy}
          onEdit={() => !isBusy && startEditingMeasurement({ id: m.id, type: "area", points: m.points.map((p) => p.clone()) })}
          onSave={handleSave}
          onCancel={cancelEditingMeasurement}
          onDelete={() => handleDeleteArea(m.id)}
        />
      ))}

      {polylineMeasurements.map((m) => (
        <Row
          key={m.id}
          color={theme.color.polyline}
          label={`${m.length.toFixed(2)} m (polilínea)`}
          editing={editingMeasurement?.type === "polyline" && editingMeasurement.id === m.id}
          disabled={isBusy}
          onEdit={() => !isBusy && startEditingMeasurement({ id: m.id, type: "polyline", points: m.points.map((p) => p.clone()) })}
          onSave={handleSave}
          onCancel={cancelEditingMeasurement}
          onDelete={() => handleDeletePolyline(m.id)}
        />
      ))}
    </div>
  );
}
