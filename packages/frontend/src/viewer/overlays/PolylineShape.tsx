import { Line, Html } from "@react-three/drei";
import { Vector3 } from "three";
import { theme } from "../../styles/theme";

interface PolylineShapeProps {
  points: Vector3[];
  length: number;
}

export function PolylineShape({ points, length }: PolylineShapeProps) {
  const mid = points[Math.floor(points.length / 2)];

  return (
    <group>
      <Line points={points} color={theme.color.polyline} lineWidth={2} />
      {points.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.04, 10, 10]} />
          <meshBasicMaterial color={theme.color.polyline} />
        </mesh>
      ))}
      <Html position={mid} center>
        <div
          style={{
            background: "rgba(15, 17, 20, 0.9)",
            border: `1px solid ${theme.color.polyline}`,
            color: theme.color.polyline,
            padding: "3px 9px",
            borderRadius: 5,
            fontSize: 12,
            fontWeight: 600,
            fontFamily: theme.font,
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          {length.toFixed(2)} m
        </div>
      </Html>
    </group>
  );
}
