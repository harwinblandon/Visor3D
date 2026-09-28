import { create } from "zustand";
import type { Vector3 } from "three";
import type { Annotation, TourStop } from "@h-geovisor/shared";

export type ActiveTool =
  | "none"
  | "measure-distance"
  | "measure-area"
  | "vectorize-polyline"
  | "measure-circle"
  | "annotate";

export interface PendingAnnotation {
  point: Vector3;
  normal: Vector3 | null;
}

export interface MeasurementMeta {
  label: string | null;
  layer: string | null;
  note: string | null;
}

export interface DistanceMeasurement extends MeasurementMeta {
  id: string;
  points: [Vector3, Vector3];
  distance: number;
}

export interface AreaMeasurement extends MeasurementMeta {
  id: string;
  points: Vector3[];
  area: number;
}

export interface PolylineMeasurement extends MeasurementMeta {
  id: string;
  points: Vector3[];
  length: number;
}

/** points: [centro, borde, centro+normal] — ver viewer/math/circle.ts */
export interface CircleMeasurement extends MeasurementMeta {
  id: string;
  points: Vector3[];
  radius: number;
}

export type EditingMeasurementType = "distance" | "area" | "polyline" | "circle";

export type TourStatus = "idle" | "playing" | "paused";

/** Segundos de interpolación entre dos paradas consecutivas del recorrido. */
export const TOUR_LEG_DURATION_SECONDS = 2.5;

export interface EditingMeasurement {
  id: string;
  type: EditingMeasurementType;
  points: Vector3[];
}

interface ViewerState {
  modelId: string | null;
  activeTool: ActiveTool;
  pendingPoints: Vector3[];
  pendingCircleNormal: Vector3 | null;
  distanceMeasurements: DistanceMeasurement[];
  areaMeasurements: AreaMeasurement[];
  polylineMeasurements: PolylineMeasurement[];
  circleMeasurements: CircleMeasurement[];
  annotations: Annotation[];
  pendingAnnotation: PendingAnnotation | null;
  selectedAnnotationId: string | null;
  editingMeasurement: EditingMeasurement | null;
  draggingIndex: number | null;
  lastCreatedMeasurementId: string | null;
  tourStops: TourStop[];
  tourStatus: TourStatus;
  tourTime: number;
  pendingTourCapture: { label: string | null } | null;
  recenterRequest: Vector3 | null;
  lookAroundMode: boolean;
  setModelId: (modelId: string | null) => void;
  setActiveTool: (tool: ActiveTool) => void;
  addPendingPoint: (point: Vector3) => void;
  clearPendingPoints: () => void;
  removeLastPendingPoint: () => void;
  setPendingCircleNormal: (normal: Vector3 | null) => void;
  addDistanceMeasurement: (measurement: DistanceMeasurement) => void;
  removeDistanceMeasurement: (id: string) => void;
  addAreaMeasurement: (measurement: AreaMeasurement) => void;
  removeAreaMeasurement: (id: string) => void;
  addPolylineMeasurement: (measurement: PolylineMeasurement) => void;
  removePolylineMeasurement: (id: string) => void;
  addCircleMeasurement: (measurement: CircleMeasurement) => void;
  removeCircleMeasurement: (id: string) => void;
  setPendingAnnotation: (pending: PendingAnnotation | null) => void;
  setAnnotations: (annotations: Annotation[]) => void;
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotationLocal: (id: string, patch: Partial<Annotation>) => void;
  removeAnnotation: (id: string) => void;
  setSelectedAnnotationId: (id: string | null) => void;
  startEditingMeasurement: (m: EditingMeasurement) => void;
  cancelEditingMeasurement: () => void;
  applyEditedMeasurement: (id: string, points: Vector3[], value: number) => void;
  updateMeasurementMeta: (id: string, type: EditingMeasurementType, patch: Partial<MeasurementMeta>) => void;
  setLastCreatedMeasurementId: (id: string | null) => void;
  startDrag: (index: number) => void;
  endDrag: () => void;
  updateDragPoint: (point: Vector3) => void;
  setTourStops: (stops: TourStop[]) => void;
  addTourStop: (stop: TourStop) => void;
  removeTourStop: (id: string) => void;
  requestTourCapture: (label: string | null) => void;
  clearTourCaptureRequest: () => void;
  startTour: () => void;
  pauseTour: () => void;
  resumeTour: () => void;
  stopTour: () => void;
  seekTour: (time: number) => void;
  setTourTime: (time: number) => void;
  requestRecenter: (point: Vector3) => void;
  clearRecenterRequest: () => void;
  setLookAroundMode: (enabled: boolean) => void;
  toggleLookAroundMode: () => void;
}

export const useViewerStore = create<ViewerState>((set) => ({
  modelId: null,
  activeTool: "none",
  pendingPoints: [],
  pendingCircleNormal: null,
  distanceMeasurements: [],
  areaMeasurements: [],
  polylineMeasurements: [],
  circleMeasurements: [],
  annotations: [],
  pendingAnnotation: null,
  selectedAnnotationId: null,
  editingMeasurement: null,
  draggingIndex: null,
  lastCreatedMeasurementId: null,
  tourStops: [],
  tourStatus: "idle",
  tourTime: 0,
  pendingTourCapture: null,
  recenterRequest: null,
  lookAroundMode: false,

  setModelId: (modelId) => set({ modelId }),

  setActiveTool: (tool) => set({ activeTool: tool, pendingPoints: [], pendingCircleNormal: null, pendingAnnotation: null }),

  addPendingPoint: (point) =>
    set((state) => ({ pendingPoints: [...state.pendingPoints, point] })),

  clearPendingPoints: () => set({ pendingPoints: [], pendingCircleNormal: null }),

  removeLastPendingPoint: () =>
    set((state) => ({ pendingPoints: state.pendingPoints.slice(0, -1) })),

  setPendingCircleNormal: (normal) => set({ pendingCircleNormal: normal }),

  addDistanceMeasurement: (measurement) =>
    set((state) => ({
      distanceMeasurements: [...state.distanceMeasurements, measurement],
      pendingPoints: [],
    })),

  removeDistanceMeasurement: (id) =>
    set((state) => ({
      distanceMeasurements: state.distanceMeasurements.filter((m) => m.id !== id),
    })),

  addAreaMeasurement: (measurement) =>
    set((state) => ({
      areaMeasurements: [...state.areaMeasurements, measurement],
      pendingPoints: [],
    })),

  removeAreaMeasurement: (id) =>
    set((state) => ({
      areaMeasurements: state.areaMeasurements.filter((m) => m.id !== id),
    })),

  addPolylineMeasurement: (measurement) =>
    set((state) => ({
      polylineMeasurements: [...state.polylineMeasurements, measurement],
      pendingPoints: [],
    })),

  removePolylineMeasurement: (id) =>
    set((state) => ({
      polylineMeasurements: state.polylineMeasurements.filter((m) => m.id !== id),
    })),

  addCircleMeasurement: (measurement) =>
    set((state) => ({
      circleMeasurements: [...state.circleMeasurements, measurement],
      pendingPoints: [],
      pendingCircleNormal: null,
    })),

  removeCircleMeasurement: (id) =>
    set((state) => ({
      circleMeasurements: state.circleMeasurements.filter((m) => m.id !== id),
    })),

  setPendingAnnotation: (pending) => set({ pendingAnnotation: pending }),

  setAnnotations: (annotations) => set({ annotations }),

  addAnnotation: (annotation) =>
    set((state) => ({ annotations: [...state.annotations, annotation], pendingAnnotation: null })),

  updateAnnotationLocal: (id, patch) =>
    set((state) => ({
      annotations: state.annotations.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    })),

  removeAnnotation: (id) =>
    set((state) => ({
      annotations: state.annotations.filter((a) => a.id !== id),
      selectedAnnotationId: state.selectedAnnotationId === id ? null : state.selectedAnnotationId,
    })),

  setSelectedAnnotationId: (id) => set({ selectedAnnotationId: id }),

  startEditingMeasurement: (m) =>
    set({ editingMeasurement: m, activeTool: "none", pendingPoints: [], pendingCircleNormal: null, pendingAnnotation: null }),

  cancelEditingMeasurement: () => set({ editingMeasurement: null, draggingIndex: null }),

  applyEditedMeasurement: (id, points, value) =>
    set((state) => ({
      editingMeasurement: null,
      draggingIndex: null,
      distanceMeasurements:
        state.editingMeasurement?.type === "distance"
          ? state.distanceMeasurements.map((m) =>
              m.id === id ? { ...m, points: [points[0], points[1]] as [Vector3, Vector3], distance: value } : m,
            )
          : state.distanceMeasurements,
      areaMeasurements:
        state.editingMeasurement?.type === "area"
          ? state.areaMeasurements.map((m) => (m.id === id ? { ...m, points, area: value } : m))
          : state.areaMeasurements,
      polylineMeasurements:
        state.editingMeasurement?.type === "polyline"
          ? state.polylineMeasurements.map((m) => (m.id === id ? { ...m, points, length: value } : m))
          : state.polylineMeasurements,
      circleMeasurements:
        state.editingMeasurement?.type === "circle"
          ? state.circleMeasurements.map((m) => (m.id === id ? { ...m, points, radius: value } : m))
          : state.circleMeasurements,
    })),

  updateMeasurementMeta: (id, type, patch) =>
    set((state) => ({
      distanceMeasurements:
        type === "distance"
          ? state.distanceMeasurements.map((m) => (m.id === id ? { ...m, ...patch } : m))
          : state.distanceMeasurements,
      areaMeasurements:
        type === "area"
          ? state.areaMeasurements.map((m) => (m.id === id ? { ...m, ...patch } : m))
          : state.areaMeasurements,
      polylineMeasurements:
        type === "polyline"
          ? state.polylineMeasurements.map((m) => (m.id === id ? { ...m, ...patch } : m))
          : state.polylineMeasurements,
      circleMeasurements:
        type === "circle"
          ? state.circleMeasurements.map((m) => (m.id === id ? { ...m, ...patch } : m))
          : state.circleMeasurements,
    })),

  setLastCreatedMeasurementId: (id) => set({ lastCreatedMeasurementId: id }),

  startDrag: (index) => set({ draggingIndex: index }),

  endDrag: () => set({ draggingIndex: null }),

  updateDragPoint: (point) =>
    set((state) => {
      if (state.draggingIndex === null) return {};
      if (state.editingMeasurement) {
        const isCircleCenterDrag = state.editingMeasurement.type === "circle" && state.draggingIndex === 0;
        const points = state.editingMeasurement.points.slice();
        if (isCircleCenterDrag) {
          const oldCenter = points[0];
          const delta = point.clone().sub(oldCenter);
          points[0] = point;
          if (points[1]) points[1] = points[1].clone().add(delta);
          if (points[2]) points[2] = points[2].clone().add(delta);
        } else {
          points[state.draggingIndex] = point;
        }
        return { editingMeasurement: { ...state.editingMeasurement, points } };
      }
      const points = state.pendingPoints.slice();
      points[state.draggingIndex] = point;
      return { pendingPoints: points };
    }),

  setTourStops: (stops) => set({ tourStops: stops }),

  addTourStop: (stop) => set((state) => ({ tourStops: [...state.tourStops, stop] })),

  removeTourStop: (id) =>
    set((state) => ({ tourStops: state.tourStops.filter((s) => s.id !== id) })),

  requestTourCapture: (label) => set({ pendingTourCapture: { label } }),

  clearTourCaptureRequest: () => set({ pendingTourCapture: null }),

  startTour: () =>
    set((state) => (state.tourStops.length > 0 ? { tourStatus: "playing", tourTime: 0 } : {})),

  pauseTour: () => set((state) => (state.tourStatus === "playing" ? { tourStatus: "paused" } : {})),

  resumeTour: () => set((state) => (state.tourStatus === "paused" ? { tourStatus: "playing" } : {})),

  stopTour: () => set({ tourStatus: "idle", tourTime: 0 }),

  seekTour: (time) =>
    set((state) => {
      const totalDuration = Math.max(state.tourStops.length - 1, 0) * TOUR_LEG_DURATION_SECONDS;
      const clamped = Math.max(0, Math.min(time, totalDuration));
      return {
        tourTime: clamped,
        tourStatus: state.tourStatus === "idle" ? "paused" : state.tourStatus,
      };
    }),

  setTourTime: (time) => set({ tourTime: time }),

  requestRecenter: (point) => set({ recenterRequest: point }),

  clearRecenterRequest: () => set({ recenterRequest: null }),

  setLookAroundMode: (enabled) => set({ lookAroundMode: enabled }),

  toggleLookAroundMode: () => set((state) => ({ lookAroundMode: !state.lookAroundMode })),
}));
