import { Line, Html } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { Vector3 } from "three";
import { theme } from "../../styles/theme";

interface DistanceLineProps {
  a: Vector3;
  b: Vector3;
  distance: number;
  label?: string | null;
  editable?: boolean;
  onVertexDown?: (index: number) => void;
}

export function DistanceLine({ a, b, distance, label, editable, onVertexDown }: DistanceLineProps) {
  const midpoint = a.clone().add(b).multiplyScalar(0.5);
  const radius = Math.max(distance * 0.01, 0.02) * (editable ? 1.8 : 1);

  const handleDown = (index: number) => (event: ThreeEvent<PointerEvent>) => {
    if (!editable) return;
    event.stopPropagation();
    onVertexDown?.(index);
  };

  return (
    <group>
      <Line points={[a, b]} color={theme.color.distance} lineWidth={editable ? 3 : 2} />
      <mesh position={a} onPointerDown={handleDown(0)}>
        <sphereGeometry args={[radius, 12, 12]} />
        <meshBasicMaterial color={editable ? "#ffffff" : theme.color.distance} />
      </mesh>
      <mesh position={b} onPointerDown={handleDown(1)}>
        <sphereGeometry args={[radius, 12, 12]} />
        <meshBasicMaterial color={editable ? "#ffffff" : theme.color.distance} />
      </mesh>
      <Html position={midpoint} center>
        <div
          style={{
            background: "rgba(15, 17, 20, 0.9)",
            border: `1px solid ${theme.color.distance}`,
            color: theme.color.distance,
            padding: "3px 9px",
            borderRadius: 5,
            fontSize: 12,
            fontWeight: 600,
            fontFamily: theme.font,
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          {label ? `${label}: ` : ""}
          {distance.toFixed(2)} m
        </div>
      </Html>
    </group>
  );
}
