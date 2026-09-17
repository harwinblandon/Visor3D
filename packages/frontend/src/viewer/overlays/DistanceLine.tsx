import { Line, Html } from "@react-three/drei";
import { Vector3 } from "three";
import { theme } from "../../styles/theme";

interface DistanceLineProps {
  a: Vector3;
  b: Vector3;
  distance: number;
}

export function DistanceLine({ a, b, distance }: DistanceLineProps) {
  const midpoint = a.clone().add(b).multiplyScalar(0.5);

  return (
    <group>
      <Line points={[a, b]} color={theme.color.distance} lineWidth={2} />
      <mesh position={a}>
        <sphereGeometry args={[Math.max(distance * 0.01, 0.02), 12, 12]} />
        <meshBasicMaterial color={theme.color.distance} />
      </mesh>
      <mesh position={b}>
        <sphereGeometry args={[Math.max(distance * 0.01, 0.02), 12, 12]} />
        <meshBasicMaterial color={theme.color.distance} />
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
          {distance.toFixed(2)} m
        </div>
      </Html>
    </group>
  );
}
