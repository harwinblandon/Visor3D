import { useEffect } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { useViewerStore } from "../../state/viewerStore";
import { computeDistance } from "../math/distance";
import { DistanceLine } from "../overlays/DistanceLine";
import { createMeasurement } from "../../api/measurements";

export function MeasureDistanceTool() {
  const activeTool = useViewerStore((s) => s.activeTool);
  const pendingPoints = useViewerStore((s) => s.pendingPoints);
  const distanceMeasurements = useViewerStore((s) => s.distanceMeasurements);
  const addDistanceMeasurement = useViewerStore((s) => s.addDistanceMeasurement);
  const modelId = useViewerStore((s) => s.modelId);
  const editingMeasurement = useViewerStore((s) => s.editingMeasurement);
  const startDrag = useViewerStore((s) => s.startDrag);

  useEffect(() => {
    if (activeTool !== "measure-distance") return;
    if (pendingPoints.length < 2) return;

    const [a, b] = pendingPoints;
    const distance = computeDistance(a, b);
    const id = crypto.randomUUID();
    addDistanceMeasurement({ id, points: [a.clone(), b.clone()], distance, label: null, layer: null, note: null });

    if (modelId) {
      createMeasurement({
        modelId,
        type: "distance",
        points: [
          { x: a.x, y: a.y, z: a.z },
          { x: b.x, y: b.y, z: b.z },
        ],
        value: distance,
        unit: "m",
      })
        .then((saved) => {
          useViewerStore.setState((state) => ({
            distanceMeasurements: state.distanceMeasurements.map((m) =>
              m.id === id ? { ...m, id: saved.id } : m,
            ),
          }));
          useViewerStore.getState().setLastCreatedMeasurementId(saved.id);
        })
        .catch((err) => console.error("No se pudo guardar la medición de distancia:", err));
    }
  }, [activeTool, pendingPoints, addDistanceMeasurement, modelId]);

  const isEditingThis = (id: string) => editingMeasurement?.type === "distance" && editingMeasurement.id === id;

  const handlePendingVertexDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    startDrag(0);
  };

  return (
    <group>
      {distanceMeasurements.map((m) =>
        isEditingThis(m.id) && editingMeasurement ? (
          <DistanceLine
            key={m.id}
            a={editingMeasurement.points[0]}
            b={editingMeasurement.points[1]}
            distance={computeDistance(editingMeasurement.points[0], editingMeasurement.points[1])}
            label={m.label}
            editable
            onVertexDown={startDrag}
          />
        ) : (
          <DistanceLine key={m.id} a={m.points[0]} b={m.points[1]} distance={m.distance} label={m.label} />
        ),
      )}
      {activeTool === "measure-distance" && pendingPoints.length === 1 && (
        <mesh position={pendingPoints[0]} onPointerDown={handlePendingVertexDown}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshBasicMaterial color="#ffcc00" transparent opacity={0.45} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}
