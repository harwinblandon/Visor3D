import { Vector3 } from "three";
import { Html } from "@react-three/drei";
import type { Annotation } from "@visor3d/shared";
import { theme } from "../../styles/theme";

interface AnnotationPinProps {
  annotation: Annotation;
  selected: boolean;
  onSelect: (id: string) => void;
}

export function AnnotationPin({ annotation, selected, onSelect }: AnnotationPinProps) {
  const position = new Vector3(annotation.position.x, annotation.position.y, annotation.position.z);
  const color = annotation.severity ? theme.color.severity[annotation.severity] : theme.color.textMuted;
  const size = selected ? 22 : 16;

  return (
    <Html position={position} center>
      <div
        onClick={(e) => {
          e.stopPropagation();
          onSelect(annotation.id);
        }}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: color,
          border: `2px solid ${selected ? "#ffffff" : "rgba(0,0,0,0.6)"}`,
          boxShadow: "0 0 6px rgba(0,0,0,0.6)",
          cursor: "pointer",
        }}
      />
    </Html>
  );
}
