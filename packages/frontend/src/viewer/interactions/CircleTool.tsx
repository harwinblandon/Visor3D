import { useEffect } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { Vector3 } from "three";
import { useViewerStore } from "../../state/viewerStore";
import { circleFromPointArray, circleRadius, circleToPointArray } from "../math/circle";
import { CircleOverlay } from "../overlays/CircleOverlay";
import { createMeasurement } from "../../api/measurements";

const WORLD_UP = new Vector3(0, 1, 0);

export function CircleTool() {
  const activeTool = useViewerStore((s) => s.activeTool);
  const pendingPoints = useViewerStore((s) => s.pendingPoints);
  const pendingCircleNormal = useViewerStore((s) => s.pendingCircleNormal);
  const circleMeasurements = useViewerStore((s) => s.circleMeasurements);
  const addCircleMeasurement = useViewerStore((s) => s.addCircleMeasurement);
  const modelId = useViewerStore((s) => s.modelId);
  const editingMeasurement = useViewerStore((s) => s.editingMeasurement);
  const startDrag = useViewerStore((s) => s.startDrag);

  useEffect(() => {
    if (activeTool !== "measure-circle") return;
    if (pendingPoints.length < 2) return;

    const center = pendingPoints[0];
    const edge = pendingPoints[1];
    const normal = pendingCircleNormal ?? WORLD_UP;
    const circle = { center: center.clone(), edge: edge.clone(), normal: normal.clone() };
    const radius = circleRadius(circle);
    const points = circleToPointArray(circle);
    const id = crypto.randomUUID();
    addCircleMeasurement({ id, points, radius, label: null, layer: null, note: null });

    if (modelId) {
      createMeasurement({
        modelId,
        type: "circle",
        points: points.map((p) => ({ x: p.x, y: p.y, z: p.z })),
        value: radius,
        unit: "m",
      })
        .then((saved) => {
          useViewerStore.setState((state) => ({
            circleMeasurements: state.circleMeasurements.map((m) => (m.id === id ? { ...m, id: saved.id } : m)),
          }));
          useViewerStore.getState().setLastCreatedMeasurementId(saved.id);
        })
        .catch((err) => console.error("No se pudo guardar el círculo:", err));
    }
  }, [activeTool, pendingPoints, pendingCircleNormal, addCircleMeasurement, modelId]);

  const isEditingThis = (id: string) => editingMeasurement?.type === "circle" && editingMeasurement.id === id;

  const handlePendingVertexDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    startDrag(0);
  };

  return (
    <group>
      {circleMeasurements.map((m) =>
        isEditingThis(m.id) && editingMeasurement ? (
          <CircleOverlay
            key={m.id}
            circle={circleFromPointArray(editingMeasurement.points)}
            label={m.label}
            editable
            onVertexDown={startDrag}
          />
        ) : (
          <CircleOverlay key={m.id} circle={circleFromPointArray(m.points)} label={m.label} />
        ),
      )}
      {activeTool === "measure-circle" && pendingPoints.length === 1 && (
        <mesh position={pendingPoints[0]} onPointerDown={handlePendingVertexDown}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshBasicMaterial color="#ffcc00" transparent opacity={0.45} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}
