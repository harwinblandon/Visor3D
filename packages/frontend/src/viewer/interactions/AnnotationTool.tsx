import { Html } from "@react-three/drei";
import { useViewerStore } from "../../state/viewerStore";
import { AnnotationPin } from "../overlays/AnnotationPin";
import { theme } from "../../styles/theme";

export function AnnotationTool() {
  const annotations = useViewerStore((s) => s.annotations);
  const selectedAnnotationId = useViewerStore((s) => s.selectedAnnotationId);
  const setSelectedAnnotationId = useViewerStore((s) => s.setSelectedAnnotationId);
  const pendingAnnotation = useViewerStore((s) => s.pendingAnnotation);

  return (
    <group>
      {annotations.map((a) => (
        <AnnotationPin
          key={a.id}
          annotation={a}
          selected={a.id === selectedAnnotationId}
          onSelect={setSelectedAnnotationId}
        />
      ))}

      {pendingAnnotation && (
        <Html position={pendingAnnotation.point} center>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: theme.color.accent,
              border: "2px solid #ffffff",
              boxShadow: "0 0 6px rgba(0,0,0,0.6)",
            }}
          />
        </Html>
      )}
    </group>
  );
}
