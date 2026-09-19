import { useMemo } from "react";
import { Line, Html } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { BufferGeometry, Float32BufferAttribute, DoubleSide, type Vector3 } from "three";
import { circlePolygonPoints, circleRadius, type Circle3 } from "../math/circle";
import { theme } from "../../styles/theme";

interface CircleOverlayProps {
  circle: Circle3;
  label?: string | null;
  editable?: boolean;
  onVertexDown?: (index: number) => void;
}

export function CircleOverlay({ circle, label, editable, onVertexDown }: CircleOverlayProps) {
  const radius = circleRadius(circle);
  const ring = useMemo(() => circlePolygonPoints(circle), [circle]);
  const loopPoints = [...ring, ring[0]];

  const geometry = useMemo(() => {
    const positions: number[] = [circle.center.x, circle.center.y, circle.center.z];
    for (const p of ring) positions.push(p.x, p.y, p.z);
    const indices: number[] = [];
    for (let i = 1; i <= ring.length; i++) {
      const next = i === ring.length ? 1 : i + 1;
      indices.push(0, i, next);
    }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [ring, circle.center]);

  const handleDown = (index: number) => (event: ThreeEvent<PointerEvent>) => {
    if (!editable) return;
    event.stopPropagation();
    onVertexDown?.(index);
  };

  const handleRadius = Math.max(radius * 0.06, 0.03) * (editable ? 1.5 : 1);

  return (
    <group>
      <mesh geometry={geometry}>
        <meshBasicMaterial color={theme.color.circle} transparent opacity={0.3} side={DoubleSide} depthWrite={false} />
      </mesh>
      <Line points={loopPoints} color={theme.color.circle} lineWidth={editable ? 3 : 2} />
      {editable && (
        <>
          <mesh position={circle.center} onPointerDown={handleDown(0)}>
            <sphereGeometry args={[handleRadius, 12, 12]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={circle.edge} onPointerDown={handleDown(1)}>
            <sphereGeometry args={[handleRadius, 12, 12]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </>
      )}
      <Html position={circle.center as Vector3} center>
        <div
          style={{
            background: "rgba(15, 17, 20, 0.9)",
            border: `1px solid ${theme.color.circle}`,
            color: theme.color.circle,
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
          r={radius.toFixed(2)} m
        </div>
      </Html>
    </group>
  );
}
