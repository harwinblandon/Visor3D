import { Line, Html } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { Vector3 } from "three";
import { theme } from "../../styles/theme";

interface PolylineShapeProps {
  points: Vector3[];
  length: number;
  label?: string | null;
  editable?: boolean;
  onVertexDown?: (index: number) => void;
}

// Radio fijo y pequeño, igual que en PlumbLine/DistanceLine/AreaPolygon.
const VERTEX_RADIUS = 0.035;
const VERTEX_RADIUS_EDITABLE = 0.05;

export function PolylineShape({ points, length, label, editable, onVertexDown }: PolylineShapeProps) {
  const mid = points[Math.floor(points.length / 2)];

  const handleDown = (index: number) => (event: ThreeEvent<PointerEvent>) => {
    if (!editable) return;
    event.stopPropagation();
    onVertexDown?.(index);
  };

  return (
    <group>
      <Line points={points} color={theme.color.polyline} lineWidth={editable ? 3 : 2} />
      {points.map((p, i) => (
        <mesh key={i} position={p} onPointerDown={handleDown(i)}>
          <sphereGeometry args={[editable ? VERTEX_RADIUS_EDITABLE : VERTEX_RADIUS, 10, 10]} />
          <meshBasicMaterial color={editable ? "#ffffff" : theme.color.polyline} />
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
          {label ? `${label}: ` : ""}
          {length.toFixed(2)} m
        </div>
      </Html>
    </group>
  );
}
