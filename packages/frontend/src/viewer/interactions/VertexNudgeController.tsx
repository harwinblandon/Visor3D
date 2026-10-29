import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { useViewerStore } from "../../state/viewerStore";

const STEP = 0.01;
const STEP_COARSE = 0.1;
const STEP_FINE = 0.001;

const ARROW_DIRECTIONS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, 1],
  ArrowDown: [0, -1],
};

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}

/** Permite afinar con las flechas del teclado el vértice seleccionado de una
 *  medición en edición, para corregirlo con precisión tras arrastrarlo con
 *  el mouse (zoom + mouse por sí solos no bajan de la resolución en píxeles
 *  de la pantalla a la distancia actual de la cámara). */
export function VertexNudgeController() {
  const { camera } = useThree();
  const editingMeasurement = useViewerStore((s) => s.editingMeasurement);
  const selectedVertexIndex = useViewerStore((s) => s.selectedVertexIndex);
  const nudgeSelectedVertex = useViewerStore((s) => s.nudgeSelectedVertex);

  useEffect(() => {
    if (!editingMeasurement || selectedVertexIndex === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const direction = ARROW_DIRECTIONS[event.key];
      if (!direction || isTypingTarget(event.target)) return;
      event.preventDefault();

      const step = event.shiftKey ? STEP_COARSE : event.altKey ? STEP_FINE : STEP;
      const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
      const up = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
      const delta = right
        .multiplyScalar(direction[0] * step)
        .add(up.multiplyScalar(direction[1] * step));

      nudgeSelectedVertex(delta);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingMeasurement, selectedVertexIndex, camera, nudgeSelectedVertex]);

  return null;
}
