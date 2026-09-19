import { create } from "zustand";
import type { Vector3 } from "three";
import type { Annotation } from "@visor3d/shared";

export type ActiveTool = "none" | "measure-distance" | "measure-area" | "vectorize-polyline" | "annotate";

export interface PendingAnnotation {
  point: Vector3;
  normal: Vector3 | null;
}

export interface DistanceMeasurement {
  id: string;
  points: [Vector3, Vector3];
  distance: number;
}

export interface AreaMeasurement {
  id: string;
  points: Vector3[];
  area: number;
}

export interface PolylineMeasurement {
  id: string;
  points: Vector3[];
  length: number;
}

export type EditingMeasurementType = "distance" | "area" | "polyline";

export interface EditingMeasurement {
  id: string;
  type: EditingMeasurementType;
  points: Vector3[];
}

interface ViewerState {
  modelId: string | null;
  activeTool: ActiveTool;
  pendingPoints: Vector3[];
  distanceMeasurements: DistanceMeasurement[];
  areaMeasurements: AreaMeasurement[];
  polylineMeasurements: PolylineMeasurement[];
  annotations: Annotation[];
  pendingAnnotation: PendingAnnotation | null;
  selectedAnnotationId: string | null;
  editingMeasurement: EditingMeasurement | null;
  draggingIndex: number | null;
  setModelId: (modelId: string | null) => void;
  setActiveTool: (tool: ActiveTool) => void;
  addPendingPoint: (point: Vector3) => void;
  clearPendingPoints: () => void;
  removeLastPendingPoint: () => void;
  addDistanceMeasurement: (measurement: DistanceMeasurement) => void;
  removeDistanceMeasurement: (id: string) => void;
  addAreaMeasurement: (measurement: AreaMeasurement) => void;
  removeAreaMeasurement: (id: string) => void;
  addPolylineMeasurement: (measurement: PolylineMeasurement) => void;
  removePolylineMeasurement: (id: string) => void;
  setPendingAnnotation: (pending: PendingAnnotation | null) => void;
  setAnnotations: (annotations: Annotation[]) => void;
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotationLocal: (id: string, patch: Partial<Annotation>) => void;
  removeAnnotation: (id: string) => void;
  setSelectedAnnotationId: (id: string | null) => void;
  startEditingMeasurement: (m: EditingMeasurement) => void;
  cancelEditingMeasurement: () => void;
  applyEditedMeasurement: (id: string, points: Vector3[], value: number) => void;
  startDrag: (index: number) => void;
  endDrag: () => void;
  updateDragPoint: (point: Vector3) => void;
}

export const useViewerStore = create<ViewerState>((set) => ({
  modelId: null,
  activeTool: "none",
  pendingPoints: [],
  distanceMeasurements: [],
  areaMeasurements: [],
  polylineMeasurements: [],
  annotations: [],
  pendingAnnotation: null,
  selectedAnnotationId: null,
  editingMeasurement: null,
  draggingIndex: null,

  setModelId: (modelId) => set({ modelId }),

  setActiveTool: (tool) => set({ activeTool: tool, pendingPoints: [], pendingAnnotation: null }),

  addPendingPoint: (point) =>
    set((state) => ({ pendingPoints: [...state.pendingPoints, point] })),

  clearPendingPoints: () => set({ pendingPoints: [] }),

  removeLastPendingPoint: () =>
    set((state) => ({ pendingPoints: state.pendingPoints.slice(0, -1) })),

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
    set({ editingMeasurement: m, activeTool: "none", pendingPoints: [], pendingAnnotation: null }),

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
    })),

  startDrag: (index) => set({ draggingIndex: index }),

  endDrag: () => set({ draggingIndex: null }),

  updateDragPoint: (point) =>
    set((state) => {
      if (state.draggingIndex === null) return {};
      if (state.editingMeasurement) {
        const points = state.editingMeasurement.points.slice();
        points[state.draggingIndex] = point;
        return { editingMeasurement: { ...state.editingMeasurement, points } };
      }
      const points = state.pendingPoints.slice();
      points[state.draggingIndex] = point;
      return { pendingPoints: points };
    }),
}));
