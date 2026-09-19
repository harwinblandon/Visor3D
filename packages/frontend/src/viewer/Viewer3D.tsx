import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Vector3 } from "three";
import type { Model } from "@visor3d/shared";
import { ModelLoader } from "./ModelLoader";
import { CameraRig } from "./CameraRig";
import { MeasureDistanceTool } from "./interactions/MeasureDistanceTool";
import { MeasureAreaTool, finalizeAreaPolygon } from "./interactions/MeasureAreaTool";
import { PolylineTool, finalizePolyline } from "./interactions/PolylineTool";
import { AnnotationTool } from "./interactions/AnnotationTool";
import { Toolbar } from "../components/Toolbar";
import { MeasurementList } from "../components/MeasurementList";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { AnnotationForm } from "../components/AnnotationForm";
import { AnnotationDetail } from "../components/AnnotationDetail";
import { LocationMap } from "../components/LocationMap";
import { useViewerStore } from "../state/viewerStore";
import { modelFileUrl } from "../api/models";
import { listMeasurements } from "../api/measurements";
import { listAnnotations } from "../api/annotations";
import { theme } from "../styles/theme";

interface Viewer3DProps {
  model: Model;
  onOpenDashboard: () => void;
  onUploadNewModel: () => void;
  onOpenManager: () => void;
  isAdmin: boolean;
  onUnlock: (password: string) => Promise<boolean>;
  onLock: () => void;
}

export function Viewer3D({
  model,
  onOpenDashboard,
  onUploadNewModel,
  onOpenManager,
  isAdmin,
  onUnlock,
  onLock,
}: Viewer3DProps) {
  const [bounds, setBounds] = useState<{ center: Vector3; size: Vector3 } | null>(null);
  const [showLocationMap, setShowLocationMap] = useState(false);
  const hasLocation = model.latitude !== null && model.longitude !== null;
  const activeTool = useViewerStore((s) => s.activeTool);
  const addPendingPoint = useViewerStore((s) => s.addPendingPoint);
  const setModelId = useViewerStore((s) => s.setModelId);
  const setPendingAnnotation = useViewerStore((s) => s.setPendingAnnotation);
  const setAnnotations = useViewerStore((s) => s.setAnnotations);
  const draggingIndex = useViewerStore((s) => s.draggingIndex);
  const updateDragPoint = useViewerStore((s) => s.updateDragPoint);
  const endDrag = useViewerStore((s) => s.endDrag);

  useEffect(() => {
    if (draggingIndex === null) return;
    const handlePointerUp = () => endDrag();
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [draggingIndex, endDrag]);

  useEffect(() => {
    setModelId(model.id);

    listMeasurements(model.id)
      .then((rows) => {
        const distanceMeasurements = rows
          .filter((r) => r.type === "distance")
          .map((r) => ({
            id: r.id,
            points: [
              new Vector3(r.points[0].x, r.points[0].y, r.points[0].z),
              new Vector3(r.points[1].x, r.points[1].y, r.points[1].z),
            ] as [Vector3, Vector3],
            distance: r.value,
          }));

        const areaMeasurements = rows
          .filter((r) => r.type === "area")
          .map((r) => ({
            id: r.id,
            points: r.points.map((p) => new Vector3(p.x, p.y, p.z)),
            area: r.value,
          }));

        const polylineMeasurements = rows
          .filter((r) => r.type === "polyline")
          .map((r) => ({
            id: r.id,
            points: r.points.map((p) => new Vector3(p.x, p.y, p.z)),
            length: r.value,
          }));

        useViewerStore.setState({ distanceMeasurements, areaMeasurements, polylineMeasurements });
      })
      .catch((err) => console.error("No se pudieron cargar las mediciones guardadas:", err));

    listAnnotations(model.id)
      .then(setAnnotations)
      .catch((err) => console.error("No se pudieron cargar las anotaciones guardadas:", err));
  }, [model.id, setModelId, setAnnotations]);

  const handleSurfaceClick = (point: Vector3, normal: Vector3 | null) => {
    if (activeTool === "measure-distance" || activeTool === "measure-area" || activeTool === "vectorize-polyline") {
      addPendingPoint(point.clone());
    } else if (activeTool === "annotate") {
      setPendingAnnotation({ point: point.clone(), normal: normal ? normal.clone() : null });
    }
  };

  const handleSurfaceDoubleClick = () => {
    if (activeTool === "measure-area") {
      finalizeAreaPolygon();
    } else if (activeTool === "vectorize-polyline") {
      finalizePolyline();
    }
  };

  const handleSurfacePointerMove = (point: Vector3) => {
    updateDragPoint(point.clone());
  };

  const floorY = bounds ? bounds.center.y - bounds.size.y / 2 : 0;
  const gridSize = bounds ? Math.max(bounds.size.x, bounds.size.z) * 1.6 : 100;

  return (
    <div style={{ width: "100vw", height: "100vh", background: theme.color.bg }}>
      <Toolbar
        modelName={model.name}
        onOpenDashboard={onOpenDashboard}
        onUploadNewModel={onUploadNewModel}
        onOpenManager={onOpenManager}
        hasLocation={hasLocation}
        onToggleLocation={() => setShowLocationMap((v) => !v)}
        isAdmin={isAdmin}
        onUnlock={onUnlock}
        onLock={onLock}
      />
      <MeasurementList />
      <AnnotationDetail />
      <AnnotationForm />
      <LoadingOverlay />
      {showLocationMap && hasLocation && (
        <LocationMap
          latitude={model.latitude as number}
          longitude={model.longitude as number}
          modelName={model.name}
          onClose={() => setShowLocationMap(false)}
        />
      )}
      <Canvas camera={{ fov: 50 }}>
        <color attach="background" args={[theme.color.bgCanvas]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 20, 10]} intensity={1.2} />
        <Suspense fallback={null}>
          <ModelLoader
            url={modelFileUrl(model)}
            onLoaded={setBounds}
            onSurfaceClick={handleSurfaceClick}
            onSurfaceDoubleClick={handleSurfaceDoubleClick}
            onSurfacePointerMove={draggingIndex !== null ? handleSurfacePointerMove : undefined}
          />
        </Suspense>
        {bounds && (
          <gridHelper args={[gridSize, 24, "#33383f", "#22262b"]} position={[bounds.center.x, floorY, bounds.center.z]} />
        )}
        <MeasureDistanceTool />
        <MeasureAreaTool />
        <PolylineTool />
        <AnnotationTool />
        <CameraRig target={bounds} />
      </Canvas>
    </div>
  );
}
