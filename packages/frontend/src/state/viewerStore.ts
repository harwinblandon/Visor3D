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
  setModelId: (modelId: string | null) => void;
  setActiveTool: (tool: ActiveTool) => void;
  addPendingPoint: (point: Vector3) => void;
  clearPendingPoints: () => void;
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

  setModelId: (modelId) => set({ modelId }),

  setActiveTool: (tool) => set({ activeTool: tool, pendingPoints: [], pendingAnnotation: null }),

  addPendingPoint: (point) =>
    set((state) => ({ pendingPoints: [...state.pendingPoints, point] })),

  clearPendingPoints: () => set({ pendingPoints: [] }),

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
}));
