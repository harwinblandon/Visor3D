import { useEffect, useRef } from "react";
import { Box3, Group, Vector3 } from "three";
import { useGLTF } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { modelOcclusionRef } from "./modelOcclusionRef";

interface ModelLoaderProps {
  url: string;
  onLoaded?: (bounds: { center: Vector3; size: Vector3 }) => void;
  onSurfaceClick?: (point: Vector3, normal: Vector3 | null) => void;
  onSurfaceDoubleClick?: (point: Vector3) => void;
  onSurfacePointerMove?: (point: Vector3) => void;
}

export function ModelLoader({
  url,
  onLoaded,
  onSurfaceClick,
  onSurfaceDoubleClick,
  onSurfacePointerMove,
}: ModelLoaderProps) {
  const { scene } = useGLTF(url, "/draco/");
  const groupRef = useRef<Group>(null);

  useEffect(() => {
    if (!groupRef.current) return;
    const box = new Box3().setFromObject(groupRef.current);
    const center = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3());
    onLoaded?.({ center, size });
    modelOcclusionRef.current = groupRef.current;
    return () => {
      modelOcclusionRef.current = new Group();
    };
  }, [scene, onLoaded]);

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    const worldNormal = event.face
      ? event.face.normal.clone().transformDirection(event.object.matrixWorld)
      : null;
    onSurfaceClick?.(event.point, worldNormal);
  };

  const handleDoubleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSurfaceDoubleClick?.(event.point);
  };

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!onSurfacePointerMove) return;
    event.stopPropagation();
    onSurfacePointerMove(event.point);
  };

  return (
    <primitive
      ref={groupRef}
      object={scene}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onPointerMove={onSurfacePointerMove ? handlePointerMove : undefined}
    />
  );
}
