import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Vector3 } from "three";
import type { Model } from "@h-geovisor/shared";
import { ModelLoader } from "./ModelLoader";
import { CameraRig } from "./CameraRig";
import { VertexNudgeController } from "./interactions/VertexNudgeController";
import { MeasureDistanceTool } from "./interactions/MeasureDistanceTool";
import { MeasureAreaTool, finalizeAreaPolygon } from "./interactions/MeasureAreaTool";
import { PolylineTool, finalizePolyline } from "./interactions/PolylineTool";
import { CircleTool } from "./interactions/CircleTool";
import { MeasurePlumbTool } from "./interactions/MeasurePlumbTool";
import { AnnotationTool } from "./interactions/AnnotationTool";
import { CameraTourController } from "./CameraTourController";
import { Toolbar } from "../components/Toolbar";
import { MeasurementList } from "../components/MeasurementList";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { AnnotationForm } from "../components/AnnotationForm";
import { AnnotationDetail } from "../components/AnnotationDetail";
import { LocationMap } from "../components/LocationMap";
import { TourManager } from "../components/TourManager";
import { TourPlayerBar } from "../components/TourPlayerBar";
import { WelcomeBanner } from "../components/WelcomeBanner";
import { useViewerStore } from "../state/viewerStore";
import { modelFileUrl } from "../api/models";
import { listMeasurements } from "../api/measurements";
import { listAnnotations } from "../api/annotations";
import { listTourStops } from "../api/tourStops";
import { theme } from "../styles/theme";

interface Viewer3DProps {
  model: Model;
  onOpenDashboard: () => void;
  onUploadNewModel: () => void;
  onOpenManager: () => void;
  onOpenOrthophotoManager: () => void;
  onOpenUsagePanel: () => void;
  isAdmin: boolean;
  onUnlock: (password: string) => Promise<boolean>;
  onLock: () => void;
}

export function Viewer3D({
  model,
  onOpenDashboard,
  onUploadNewModel,
  onOpenManager,
  onOpenOrthophotoManager,
  onOpenUsagePanel,
  isAdmin,
  onUnlock,
  onLock,
}: Viewer3DProps) {
  const [bounds, setBounds] = useState<{ center: Vector3; size: Vector3 } | null>(null);
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [isTourManagerOpen, setIsTourManagerOpen] = useState(false);
  const hasLocation = model.latitude !== null && model.longitude !== null;
  const setTourStops = useViewerStore((s) => s.setTourStops);
  const activeTool = useViewerStore((s) => s.activeTool);
  const pendingPoints = useViewerStore((s) => s.pendingPoints);
  const addPendingPoint = useViewerStore((s) => s.addPendingPoint);
  const setModelId = useViewerStore((s) => s.setModelId);
  const setPendingAnnotation = useViewerStore((s) => s.setPendingAnnotation);
  const setAnnotations = useViewerStore((s) => s.setAnnotations);
  const setPendingCircleNormal = useViewerStore((s) => s.setPendingCircleNormal);
  const requestRecenter = useViewerStore((s) => s.requestRecenter);
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

    listMeasurements({ modelId: model.id })
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
            label: r.label,
            layer: r.layer,
            note: r.note,
          }));

        const areaMeasurements = rows
          .filter((r) => r.type === "area")
          .map((r) => ({
            id: r.id,
            points: r.points.map((p) => new Vector3(p.x, p.y, p.z)),
            area: r.value,
            label: r.label,
            layer: r.layer,
            note: r.note,
          }));

        const polylineMeasurements = rows
          .filter((r) => r.type === "polyline")
          .map((r) => ({
            id: r.id,
            points: r.points.map((p) => new Vector3(p.x, p.y, p.z)),
            length: r.value,
            label: r.label,
            layer: r.layer,
            note: r.note,
          }));

        const circleMeasurements = rows
          .filter((r) => r.type === "circle")
          .map((r) => ({
            id: r.id,
            points: r.points.map((p) => new Vector3(p.x, p.y, p.z)),
            radius: r.value,
            label: r.label,
            layer: r.layer,
            note: r.note,
          }));

        const plumbMeasurements = rows
          .filter((r) => r.type === "plumb")
          .map((r) => ({
            id: r.id,
            points: [
              new Vector3(r.points[0].x, r.points[0].y, r.points[0].z),
              new Vector3(r.points[1].x, r.points[1].y, r.points[1].z),
            ] as [Vector3, Vector3],
            deviation: r.value,
            label: r.label,
            layer: r.layer,
            note: r.note,
          }));

        useViewerStore.setState({
          distanceMeasurements,
          areaMeasurements,
          polylineMeasurements,
          circleMeasurements,
          plumbMeasurements,
        });
      })
      .catch((err) => console.error("No se pudieron cargar las mediciones guardadas:", err));

    listAnnotations({ modelId: model.id })
      .then(setAnnotations)
      .catch((err) => console.error("No se pudieron cargar las anotaciones guardadas:", err));

    listTourStops(model.id)
      .then(setTourStops)
      .catch((err) => console.error("No se pudo cargar el recorrido:", err));
  }, [model.id, setModelId, setAnnotations, setTourStops]);

  const handleSurfaceClick = (point: Vector3, normal: Vector3 | null) => {
    if (
      activeTool === "measure-distance" ||
      activeTool === "measure-area" ||
      activeTool === "vectorize-polyline" ||
      activeTool === "measure-plumb"
    ) {
      addPendingPoint(point.clone());
    } else if (activeTool === "measure-circle") {
      if (pendingPoints.length === 0 && normal) setPendingCircleNormal(normal.clone());
      addPendingPoint(point.clone());
    } else if (activeTool === "annotate") {
      setPendingAnnotation({ point: point.clone(), normal: normal ? normal.clone() : null });
    }
  };

  const handleSurfaceDoubleClick = (point: Vector3) => {
    if (activeTool === "measure-area") {
      finalizeAreaPolygon();
    } else if (activeTool === "vectorize-polyline") {
      finalizePolyline();
    } else if (activeTool === "none") {
      requestRecenter(point.clone());
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
        onOpenTourManager={() => setIsTourManagerOpen(true)}
        onOpenOrthophotoManager={onOpenOrthophotoManager}
        onOpenUsagePanel={onOpenUsagePanel}
      />
      <MeasurementList />
      <AnnotationDetail />
      <AnnotationForm />
      <LoadingOverlay />
      <WelcomeBanner />
      {showLocationMap && hasLocation && (
        <LocationMap
          latitude={model.latitude as number}
          longitude={model.longitude as number}
          modelName={model.name}
          onClose={() => setShowLocationMap(false)}
        />
      )}
      {isTourManagerOpen && <TourManager onClose={() => setIsTourManagerOpen(false)} />}
      <TourPlayerBar />
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
        <CircleTool />
        <MeasurePlumbTool />
        <AnnotationTool />
        <CameraTourController />
        <VertexNudgeController />
        <CameraRig target={bounds} />
      </Canvas>
    </div>
  );
}
