import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Vector3, type PerspectiveCamera } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useViewerStore } from "../state/viewerStore";

interface CameraRigProps {
  target: { center: Vector3; size: Vector3 } | null;
}

export function CameraRig({ target }: CameraRigProps) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const isDragging = useViewerStore((s) => s.draggingIndex !== null);
  const isTouring = useViewerStore((s) => s.tourStatus !== "idle");
  const recenterRequest = useViewerStore((s) => s.recenterRequest);
  const clearRecenterRequest = useViewerStore((s) => s.clearRecenterRequest);
  const minDistanceRef = useRef(0.05);

  useEffect(() => {
    if (!target || !controlsRef.current) return;

    const { center, size } = target;
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 1.5;

    const perspectiveCamera = camera as PerspectiveCamera;
    perspectiveCamera.position.set(
      center.x + distance * 0.6,
      center.y + distance * 0.4,
      center.z + distance * 0.6,
    );
    perspectiveCamera.near = Math.max(maxDim / 1000, 0.01);
    perspectiveCamera.far = maxDim * 100;
    perspectiveCamera.updateProjectionMatrix();

    // Distancia minima de zoom: evita que el dolly de OrbitControls se
    // "pegue" acercandose asintoticamente al pivote sin nunca llegar.
    minDistanceRef.current = Math.max(maxDim * 0.002, 0.05);
    controlsRef.current.minDistance = minDistanceRef.current;

    controlsRef.current.target.copy(center);
    controlsRef.current.update();
  }, [target, camera]);

  useEffect(() => {
    if (!recenterRequest || !controlsRef.current) return;
    controlsRef.current.target.copy(recenterRequest);
    controlsRef.current.update();
    clearRecenterRequest();
  }, [recenterRequest, clearRecenterRequest]);

  return <OrbitControls ref={controlsRef} makeDefault enableDamping enabled={!isDragging && !isTouring} />;
}
