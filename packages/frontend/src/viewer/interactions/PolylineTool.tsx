import { Line } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useViewerStore } from "../../state/viewerStore";
import { computePolylineLength } from "../math/distance";
import { PolylineShape } from "../overlays/PolylineShape";
import { createMeasurement } from "../../api/measurements";
import { theme } from "../../styles/theme";

export function finalizePolyline() {
  const { pendingPoints, addPolylineMeasurement, clearPendingPoints, modelId } = useViewerStore.getState();
  if (pendingPoints.length < 2) return;

  const points = pendingPoints.map((p) => p.clone());
  const length = computePolylineLength(points);
  const id = crypto.randomUUID();
  addPolylineMeasurement({ id, points, length });
  clearPendingPoints();

  if (modelId) {
    createMeasurement({
      modelId,
      type: "polyline",
      points: points.map((p) => ({ x: p.x, y: p.y, z: p.z })),
      value: length,
      unit: "m",
    })
      .then((saved) => {
        useViewerStore.setState((state) => ({
          polylineMeasurements: state.polylineMeasurements.map((m) =>
            m.id === id ? { ...m, id: saved.id } : m,
          ),
        }));
      })
      .catch((err) => console.error("No se pudo guardar la polilínea:", err));
  }
}

export function PolylineTool() {
  const activeTool = useViewerStore((s) => s.activeTool);
  const pendingPoints = useViewerStore((s) => s.pendingPoints);
  const polylineMeasurements = useViewerStore((s) => s.polylineMeasurements);
  const editingMeasurement = useViewerStore((s) => s.editingMeasurement);
  const startDrag = useViewerStore((s) => s.startDrag);

  const showPreview = activeTool === "vectorize-polyline" && pendingPoints.length > 0;
  const isEditingThis = (id: string) => editingMeasurement?.type === "polyline" && editingMeasurement.id === id;

  const handlePendingVertexDown = (index: number) => (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    startDrag(index);
  };

  return (
    <group>
      {polylineMeasurements.map((m) =>
        isEditingThis(m.id) && editingMeasurement ? (
          <PolylineShape
            key={m.id}
            points={editingMeasurement.points}
            length={computePolylineLength(editingMeasurement.points)}
            editable
            onVertexDown={startDrag}
          />
        ) : (
          <PolylineShape key={m.id} points={m.points} length={m.length} />
        ),
      )}

      {showPreview && (
        <>
          {pendingPoints.length > 1 && <Line points={pendingPoints} color={theme.color.polyline} lineWidth={2} />}
          {pendingPoints.map((p, i) => (
            <mesh key={i} position={p} onPointerDown={handlePendingVertexDown(i)}>
              <sphereGeometry args={[0.04, 10, 10]} />
              <meshBasicMaterial color={theme.color.polyline} />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}
