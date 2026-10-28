import { useEffect } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { useViewerStore } from "../../state/viewerStore";
import { computePlumb } from "../math/plumb";
import { PlumbLine } from "../overlays/PlumbLine";
import { createMeasurement } from "../../api/measurements";

export function MeasurePlumbTool() {
  const activeTool = useViewerStore((s) => s.activeTool);
  const pendingPoints = useViewerStore((s) => s.pendingPoints);
  const plumbMeasurements = useViewerStore((s) => s.plumbMeasurements);
  const addPlumbMeasurement = useViewerStore((s) => s.addPlumbMeasurement);
  const modelId = useViewerStore((s) => s.modelId);
  const editingMeasurement = useViewerStore((s) => s.editingMeasurement);
  const startDrag = useViewerStore((s) => s.startDrag);

  useEffect(() => {
    if (activeTool !== "measure-plumb") return;
    if (pendingPoints.length < 2) return;

    const [base, top] = pendingPoints;
    const { deviation } = computePlumb(base, top);
    const id = crypto.randomUUID();
    addPlumbMeasurement({ id, points: [base.clone(), top.clone()], deviation, label: null, layer: null, note: null });

    if (modelId) {
      createMeasurement({
        modelId,
        type: "plumb",
        points: [
          { x: base.x, y: base.y, z: base.z },
          { x: top.x, y: top.y, z: top.z },
        ],
        value: deviation,
        unit: "m",
      })
        .then((saved) => {
          useViewerStore.setState((state) => ({
            plumbMeasurements: state.plumbMeasurements.map((m) => (m.id === id ? { ...m, id: saved.id } : m)),
          }));
          useViewerStore.getState().setLastCreatedMeasurementId(saved.id);
        })
        .catch((err) => console.error("No se pudo guardar la verificación de verticalidad:", err));
    }
  }, [activeTool, pendingPoints, addPlumbMeasurement, modelId]);

  const isEditingThis = (id: string) => editingMeasurement?.type === "plumb" && editingMeasurement.id === id;

  const handlePendingVertexDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    startDrag(0);
  };

  return (
    <group>
      {plumbMeasurements.map((m) =>
        isEditingThis(m.id) && editingMeasurement ? (
          <PlumbLine
            key={m.id}
            base={editingMeasurement.points[0]}
            top={editingMeasurement.points[1]}
            label={m.label}
            editable
            onVertexDown={startDrag}
          />
        ) : (
          <PlumbLine key={m.id} base={m.points[0]} top={m.points[1]} label={m.label} />
        ),
      )}
      {activeTool === "measure-plumb" && pendingPoints.length === 1 && (
        <mesh position={pendingPoints[0]} onPointerDown={handlePendingVertexDown}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshBasicMaterial color="#ffcc00" />
        </mesh>
      )}
    </group>
  );
}
