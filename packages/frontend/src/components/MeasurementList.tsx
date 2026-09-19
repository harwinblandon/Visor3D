import { useEffect, useState } from "react";
import { useViewerStore, type EditingMeasurementType, type MeasurementMeta } from "../state/viewerStore";
import { deleteMeasurement, updateMeasurement } from "../api/measurements";
import { computeDistance, computePolylineLength } from "../viewer/math/distance";
import { computeNewellArea } from "../viewer/math/polygonArea";
import { circleFromPointArray, circleRadius } from "../viewer/math/circle";
import { useIsMobile } from "../hooks/useIsMobile";
import { theme } from "../styles/theme";

const LAYER_SUGGESTIONS = ["Paramentos", "Ventanas", "Puertas", "Vías", "Cubierta", "Estructura", "Acabados"];

const inputStyle: React.CSSProperties = {
  padding: "6px 8px",
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

interface MetaFormProps {
  initial: MeasurementMeta;
  onSave: (patch: MeasurementMeta) => void;
  onCancel: () => void;
}

function MetaForm({ initial, onSave, onCancel }: MetaFormProps) {
  const [label, setLabel] = useState(initial.label ?? "");
  const [layer, setLayer] = useState(initial.layer ?? "");
  const [note, setNote] = useState(initial.note ?? "");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <input
        type="text"
        placeholder="Nombre corto (ej. Muro norte)"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        style={inputStyle}
      />
      <input
        type="text"
        list="layer-suggestions"
        placeholder="Capa (ej. Paramentos, Ventanas, Vías)"
        value={layer}
        onChange={(e) => setLayer(e.target.value)}
        style={inputStyle}
      />
      <textarea
        placeholder="Descripción (opcional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        style={{ ...inputStyle, resize: "vertical" }}
      />
      <div style={{ display: "flex", gap: 6 }}>
        <button
          type="button"
          onClick={() => onSave({ label: label.trim() || null, layer: layer.trim() || null, note: note.trim() || null })}
          style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "none", background: theme.color.accent, color: "#0b0d10", cursor: "pointer", fontSize: 11, fontWeight: 600 }}
        >
          Guardar
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
  );
}

interface RowProps {
  color: string;
  value: string;
  meta: MeasurementMeta;
  editingVertices: boolean;
  editingMeta: boolean;
  disabled: boolean;
  onEditVertices: () => void;
  onSaveVertices: () => void;
  onCancelVertices: () => void;
  onOpenMeta: () => void;
  onSaveMeta: (patch: MeasurementMeta) => void;
  onCancelMeta: () => void;
  onDelete: () => void;
}

function Row({
  color,
  value,
  meta,
  editingVertices,
  editingMeta,
  disabled,
  onEditVertices,
  onSaveVertices,
  onCancelVertices,
  onOpenMeta,
  onSaveMeta,
  onCancelMeta,
  onDelete,
}: RowProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: "8px 14px",
        borderBottom: `1px solid ${theme.color.border}`,
        background: editingVertices || editingMeta ? theme.color.panelAlt : "transparent",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ color: theme.color.text, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {value}
              {meta.label && <span style={{ color: theme.color.textMuted }}> — {meta.label}</span>}
            </div>
            {meta.layer && (
              <span style={{ color: theme.color.accent, fontSize: 10, fontWeight: 600 }}>{meta.layer}</span>
            )}
          </div>
        </div>
        {!editingVertices && !editingMeta && (
          <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
            <IconButton onClick={onOpenMeta} title="Descripción y capa" color={disabled ? theme.color.border : undefined}>
              🏷
            </IconButton>
            <IconButton onClick={onEditVertices} title="Editar vértices" color={disabled ? theme.color.border : undefined}>
              ✎
            </IconButton>
            <IconButton onClick={onDelete} title="Eliminar">
              ×
            </IconButton>
          </div>
        )}
      </div>

      {editingVertices && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ color: theme.color.textMuted, fontSize: 11 }}>
            Arrastra los puntos blancos sobre el modelo para corregirlos.
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              onClick={onSaveVertices}
              style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "none", background: theme.color.accent, color: "#0b0d10", cursor: "pointer", fontSize: 11, fontWeight: 600 }}
            >
              Guardar cambios
            </button>
            <button
              type="button"
              onClick={onCancelVertices}
              style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: `1px solid ${theme.color.border}`, background: "transparent", color: theme.color.textMuted, cursor: "pointer", fontSize: 11 }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {editingMeta && <MetaForm initial={meta} onSave={onSaveMeta} onCancel={onCancelMeta} />}
    </div>
  );
}

export function MeasurementList() {
  const distanceMeasurements = useViewerStore((s) => s.distanceMeasurements);
  const areaMeasurements = useViewerStore((s) => s.areaMeasurements);
  const polylineMeasurements = useViewerStore((s) => s.polylineMeasurements);
  const circleMeasurements = useViewerStore((s) => s.circleMeasurements);
  const removeDistanceMeasurement = useViewerStore((s) => s.removeDistanceMeasurement);
  const removeAreaMeasurement = useViewerStore((s) => s.removeAreaMeasurement);
  const removePolylineMeasurement = useViewerStore((s) => s.removePolylineMeasurement);
  const removeCircleMeasurement = useViewerStore((s) => s.removeCircleMeasurement);
  const editingMeasurement = useViewerStore((s) => s.editingMeasurement);
  const startEditingMeasurement = useViewerStore((s) => s.startEditingMeasurement);
  const cancelEditingMeasurement = useViewerStore((s) => s.cancelEditingMeasurement);
  const applyEditedMeasurement = useViewerStore((s) => s.applyEditedMeasurement);
  const updateMeasurementMeta = useViewerStore((s) => s.updateMeasurementMeta);
  const lastCreatedMeasurementId = useViewerStore((s) => s.lastCreatedMeasurementId);

  const [metaEditingId, setMetaEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (lastCreatedMeasurementId) setMetaEditingId(lastCreatedMeasurementId);
  }, [lastCreatedMeasurementId]);

  const isEmpty =
    distanceMeasurements.length === 0 &&
    areaMeasurements.length === 0 &&
    polylineMeasurements.length === 0 &&
    circleMeasurements.length === 0;

  const withDelete = (removeLocal: (id: string) => void) => (id: string) => {
    removeLocal(id);
    deleteMeasurement(id).catch((err) => console.error("No se pudo eliminar la medición:", err));
  };

  const handleDeleteDistance = withDelete(removeDistanceMeasurement);
  const handleDeleteArea = withDelete(removeAreaMeasurement);
  const handleDeletePolyline = withDelete(removePolylineMeasurement);
  const handleDeleteCircle = withDelete(removeCircleMeasurement);

  const handleSaveVertices = async () => {
    if (!editingMeasurement) return;
    const { id, type, points } = editingMeasurement;
    const value =
      type === "distance"
        ? computeDistance(points[0], points[1])
        : type === "area"
          ? computeNewellArea(points).area
          : type === "circle"
            ? circleRadius(circleFromPointArray(points))
            : computePolylineLength(points);

    try {
      await updateMeasurement(id, { points: points.map((p) => ({ x: p.x, y: p.y, z: p.z })), value });
      applyEditedMeasurement(id, points, value);
    } catch (err) {
      console.error("No se pudo guardar la edición de la medición:", err);
    }
  };

  const handleSaveMeta = async (id: string, type: EditingMeasurementType, patch: MeasurementMeta) => {
    try {
      await updateMeasurement(id, patch);
      updateMeasurementMeta(id, type, patch);
      setMetaEditingId(null);
    } catch (err) {
      console.error("No se pudo guardar la descripción de la medición:", err);
    }
  };

  const isBusy = editingMeasurement !== null || metaEditingId !== null;
  const isMobile = useIsMobile();
  const topOffset = isMobile ? 64 : 92;

  return (
    <div
      style={{
        position: "fixed",
        top: topOffset,
        right: isMobile ? 8 : 16,
        width: isMobile ? "min(240px, calc(100vw - 16px))" : 280,
        maxHeight: `calc(100vh - ${topOffset + 16}px)`,
        overflowY: "auto",
        background: theme.color.panel,
        border: `1px solid ${theme.color.border}`,
        borderRadius: theme.radius,
        zIndex: 15,
        fontFamily: theme.font,
      }}
    >
      <datalist id="layer-suggestions">
        {LAYER_SUGGESTIONS.map((l) => (
          <option key={l} value={l} />
        ))}
      </datalist>

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
          value={`${m.distance.toFixed(2)} m`}
          meta={m}
          editingVertices={editingMeasurement?.type === "distance" && editingMeasurement.id === m.id}
          editingMeta={metaEditingId === m.id}
          disabled={isBusy}
          onEditVertices={() => !isBusy && startEditingMeasurement({ id: m.id, type: "distance", points: m.points.map((p) => p.clone()) })}
          onSaveVertices={handleSaveVertices}
          onCancelVertices={cancelEditingMeasurement}
          onOpenMeta={() => !isBusy && setMetaEditingId(m.id)}
          onSaveMeta={(patch) => handleSaveMeta(m.id, "distance", patch)}
          onCancelMeta={() => setMetaEditingId(null)}
          onDelete={() => handleDeleteDistance(m.id)}
        />
      ))}

      {areaMeasurements.map((m) => (
        <Row
          key={m.id}
          color={theme.color.area}
          value={`${m.area.toFixed(2)} m²`}
          meta={m}
          editingVertices={editingMeasurement?.type === "area" && editingMeasurement.id === m.id}
          editingMeta={metaEditingId === m.id}
          disabled={isBusy}
          onEditVertices={() => !isBusy && startEditingMeasurement({ id: m.id, type: "area", points: m.points.map((p) => p.clone()) })}
          onSaveVertices={handleSaveVertices}
          onCancelVertices={cancelEditingMeasurement}
          onOpenMeta={() => !isBusy && setMetaEditingId(m.id)}
          onSaveMeta={(patch) => handleSaveMeta(m.id, "area", patch)}
          onCancelMeta={() => setMetaEditingId(null)}
          onDelete={() => handleDeleteArea(m.id)}
        />
      ))}

      {polylineMeasurements.map((m) => (
        <Row
          key={m.id}
          color={theme.color.polyline}
          value={`${m.length.toFixed(2)} m (polilínea)`}
          meta={m}
          editingVertices={editingMeasurement?.type === "polyline" && editingMeasurement.id === m.id}
          editingMeta={metaEditingId === m.id}
          disabled={isBusy}
          onEditVertices={() => !isBusy && startEditingMeasurement({ id: m.id, type: "polyline", points: m.points.map((p) => p.clone()) })}
          onSaveVertices={handleSaveVertices}
          onCancelVertices={cancelEditingMeasurement}
          onOpenMeta={() => !isBusy && setMetaEditingId(m.id)}
          onSaveMeta={(patch) => handleSaveMeta(m.id, "polyline", patch)}
          onCancelMeta={() => setMetaEditingId(null)}
          onDelete={() => handleDeletePolyline(m.id)}
        />
      ))}

      {circleMeasurements.map((m) => (
        <Row
          key={m.id}
          color={theme.color.circle}
          value={`r=${m.radius.toFixed(2)} m`}
          meta={m}
          editingVertices={editingMeasurement?.type === "circle" && editingMeasurement.id === m.id}
          editingMeta={metaEditingId === m.id}
          disabled={isBusy}
          onEditVertices={() => !isBusy && startEditingMeasurement({ id: m.id, type: "circle", points: m.points.map((p) => p.clone()) })}
          onSaveVertices={handleSaveVertices}
          onCancelVertices={cancelEditingMeasurement}
          onOpenMeta={() => !isBusy && setMetaEditingId(m.id)}
          onSaveMeta={(patch) => handleSaveMeta(m.id, "circle", patch)}
          onCancelMeta={() => setMetaEditingId(null)}
          onDelete={() => handleDeleteCircle(m.id)}
        />
      ))}
    </div>
  );
}
