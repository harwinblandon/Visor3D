import { Line, Html } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { Vector3 } from "three";
import { computePlumb } from "../math/plumb";
import { theme } from "../../styles/theme";

interface PlumbLineProps {
  base: Vector3;
  top: Vector3;
  label?: string | null;
  editable?: boolean;
  onVertexDown?: (index: number) => void;
}

// Radio fijo y pequeño (no proporcional a la altura medida): en un muro de 20 m, el radio
// "proporcional" de antes llegaba a 20+ cm, mucho más grande que la propia desviación que se
// quiere detectar (unos pocos cm) -- tapaba el punto exacto donde se hizo clic en vez de
// marcarlo con precisión.
const VERTEX_RADIUS = 0.035;
const VERTEX_RADIUS_EDITABLE = 0.05;

export function PlumbLine({ base, top, label, editable, onVertexDown }: PlumbLineProps) {
  const { deviation, height, topRef } = computePlumb(base, top);
  const radius = editable ? VERTEX_RADIUS_EDITABLE : VERTEX_RADIUS;

  const handleDown = (index: number) => (event: ThreeEvent<PointerEvent>) => {
    if (!editable) return;
    event.stopPropagation();
    onVertexDown?.(index);
  };

  return (
    <group>
      {/* Referencia vertical (el "plomo" ideal) desde la base hasta la altura del punto superior */}
      <Line points={[base, topRef]} color={theme.color.textMuted} lineWidth={1.5} dashed dashScale={8} />
      {/* El muro real, tal como se clicó */}
      <Line points={[base, top]} color={theme.color.plumb} lineWidth={editable ? 3 : 2} />
      {/* Desviación horizontal medida en el punto superior */}
      {deviation > 0.001 && <Line points={[topRef, top]} color={theme.color.plumb} lineWidth={1.5} dashed dashScale={4} />}

      <mesh position={base} onPointerDown={handleDown(0)}>
        <sphereGeometry args={[radius, 12, 12]} />
        <meshBasicMaterial color={editable ? "#ffffff" : theme.color.plumb} transparent opacity={0.45} depthWrite={false} />
      </mesh>
      <mesh position={top} onPointerDown={handleDown(1)}>
        <sphereGeometry args={[radius, 12, 12]} />
        <meshBasicMaterial color={editable ? "#ffffff" : theme.color.plumb} transparent opacity={0.45} depthWrite={false} />
      </mesh>

      {/* Anclada al punto superior pero desplazada hacia arriba (no centrada encima), para
          que la etiqueta nunca tape la bolita que marca exactamente dónde quedó el punto. */}
      <Html position={top} style={{ transform: "translate(-50%, -160%)" }}>
        <div
          style={{
            background: "rgba(15, 17, 20, 0.9)",
            border: `1px solid ${theme.color.plumb}`,
            color: theme.color.plumb,
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
          {(deviation * 100).toFixed(1)} cm en {height.toFixed(2)} m
        </div>
      </Html>
    </group>
  );
}
