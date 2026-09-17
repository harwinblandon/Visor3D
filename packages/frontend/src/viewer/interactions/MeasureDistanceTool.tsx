import { useEffect } from "react";
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

  useEffect(() => {
    if (activeTool !== "measure-distance") return;
    if (pendingPoints.length < 2) return;

    const [a, b] = pendingPoints;
    const distance = computeDistance(a, b);
    const id = crypto.randomUUID();
    addDistanceMeasurement({ id, points: [a.clone(), b.clone()], distance });

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
        })
        .catch((err) => console.error("No se pudo guardar la medición de distancia:", err));
    }
  }, [activeTool, pendingPoints, addDistanceMeasurement, modelId]);

  return (
    <group>
      {distanceMeasurements.map((m) => (
        <DistanceLine key={m.id} a={m.points[0]} b={m.points[1]} distance={m.distance} />
      ))}
      {activeTool === "measure-distance" && pendingPoints.length === 1 && (
        <mesh position={pendingPoints[0]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshBasicMaterial color="#ffcc00" />
        </mesh>
      )}
    </group>
  );
}
