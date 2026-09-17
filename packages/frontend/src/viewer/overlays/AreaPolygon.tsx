import { useMemo } from "react";
import { Line, Html } from "@react-three/drei";
import { Vector3, DoubleSide } from "three";
import { computeNewellArea, triangulateForRender } from "../math/polygonArea";
import { theme } from "../../styles/theme";

interface AreaPolygonProps {
  points: Vector3[];
  area: number;
}

export function AreaPolygon({ points, area }: AreaPolygonProps) {
  const geometry = useMemo(() => {
    const { normal } = computeNewellArea(points);
    return triangulateForRender(points, normal);
  }, [points]);

  const centroid = useMemo(
    () => points.reduce((acc, p) => acc.add(p), new Vector3()).multiplyScalar(1 / points.length),
    [points],
  );

  const loopPoints = [...points, points[0]];

  return (
    <group>
      <mesh geometry={geometry}>
        <meshBasicMaterial color={theme.color.area} transparent opacity={0.3} side={DoubleSide} depthWrite={false} />
      </mesh>
      <Line points={loopPoints} color={theme.color.area} lineWidth={2} />
      <Html position={centroid} center>
        <div
          style={{
            background: "rgba(15, 17, 20, 0.9)",
            border: `1px solid ${theme.color.area}`,
            color: theme.color.area,
            padding: "3px 9px",
            borderRadius: 5,
            fontSize: 12,
            fontWeight: 600,
            fontFamily: theme.font,
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          {area.toFixed(2)} m²
        </div>
      </Html>
    </group>
  );
}
