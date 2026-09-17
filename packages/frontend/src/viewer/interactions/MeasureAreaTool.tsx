import { Line } from "@react-three/drei";
import { useViewerStore } from "../../state/viewerStore";
import { computeNewellArea } from "../math/polygonArea";
import { AreaPolygon } from "../overlays/AreaPolygon";
import { createMeasurement } from "../../api/measurements";

export function finalizeAreaPolygon() {
  const { pendingPoints, addAreaMeasurement, clearPendingPoints, modelId } = useViewerStore.getState();
  if (pendingPoints.length < 3) return;

  const { area } = computeNewellArea(pendingPoints);
  const points = pendingPoints.map((p) => p.clone());
  const id = crypto.randomUUID();
  addAreaMeasurement({ id, points, area });
  clearPendingPoints();

  if (modelId) {
    createMeasurement({
      modelId,
      type: "area",
      points: points.map((p) => ({ x: p.x, y: p.y, z: p.z })),
      value: area,
      unit: "m2",
    })
      .then((saved) => {
        useViewerStore.setState((state) => ({
          areaMeasurements: state.areaMeasurements.map((m) => (m.id === id ? { ...m, id: saved.id } : m)),
        }));
      })
      .catch((err) => console.error("No se pudo guardar la medición de área:", err));
  }
}

export function MeasureAreaTool() {
  const activeTool = useViewerStore((s) => s.activeTool);
  const pendingPoints = useViewerStore((s) => s.pendingPoints);
  const areaMeasurements = useViewerStore((s) => s.areaMeasurements);

  const showPreview = activeTool === "measure-area" && pendingPoints.length > 0;

  return (
    <group>
      {areaMeasurements.map((m) => (
        <AreaPolygon key={m.id} points={m.points} area={m.area} />
      ))}

      {showPreview && (
        <>
          {pendingPoints.length > 1 && <Line points={pendingPoints} color="#00aaff" lineWidth={2} />}
          {pendingPoints.map((p, i) => (
            <mesh key={i} position={p}>
              <sphereGeometry args={[0.05, 12, 12]} />
              <meshBasicMaterial color="#00aaff" />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}
