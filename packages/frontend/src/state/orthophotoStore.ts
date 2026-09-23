import { create } from "zustand";
import type { Annotation } from "@visor3d/shared";
import type { LngLat } from "../viewer2d/math/geo";

export type ActiveTool2D = "none" | "measure-distance" | "measure-area" | "vectorize-polyline" | "measure-circle" | "annotate";

export interface PendingAnnotation2D {
  point: LngLat;
}

export interface MeasurementMeta2D {
  label: string | null;
  layer: string | null;
  note: string | null;
}

export interface DistanceMeasurement2D extends MeasurementMeta2D {
  id: string;
  points: [LngLat, LngLat];
  distance: number;
}

export interface AreaMeasurement2D extends MeasurementMeta2D {
  id: string;
  points: LngLat[];
  area: number;
}

export interface PolylineMeasurement2D extends MeasurementMeta2D {
  id: string;
  points: LngLat[];
  length: number;
}

/** points: [centro, borde] */
export interface CircleMeasurement2D extends MeasurementMeta2D {
  id: string;
  points: [LngLat, LngLat];
  radius: number;
}

export type EditingMeasurementType2D = "distance" | "area" | "polyline" | "circle";

export interface EditingMeasurement2D {
  id: string;
  type: EditingMeasurementType2D;
  points: LngLat[];
}

interface OrthophotoState {
  orthophotoId: string | null;
  activeTool: ActiveTool2D;
  pendingPoints: LngLat[];
  distanceMeasurements: DistanceMeasurement2D[];
  areaMeasurements: AreaMeasurement2D[];
  polylineMeasurements: PolylineMeasurement2D[];
  circleMeasurements: CircleMeasurement2D[];
  annotations: Annotation[];
  pendingAnnotation: PendingAnnotation2D | null;
  selectedAnnotationId: string | null;
  editingMeasurement: EditingMeasurement2D | null;
  draggingIndex: number | null;
  lastCreatedMeasurementId: string | null;
  setOrthophotoId: (id: string | null) => void;
  setActiveTool: (tool: ActiveTool2D) => void;
  addPendingPoint: (point: LngLat) => void;
  clearPendingPoints: () => void;
  removeLastPendingPoint: () => void;
  addDistanceMeasurement: (m: DistanceMeasurement2D) => void;
  removeDistanceMeasurement: (id: string) => void;
  addAreaMeasurement: (m: AreaMeasurement2D) => void;
  removeAreaMeasurement: (id: string) => void;
  addPolylineMeasurement: (m: PolylineMeasurement2D) => void;
  removePolylineMeasurement: (id: string) => void;
  addCircleMeasurement: (m: CircleMeasurement2D) => void;
  removeCircleMeasurement: (id: string) => void;
  setPendingAnnotation: (pending: PendingAnnotation2D | null) => void;
  setAnnotations: (annotations: Annotation[]) => void;
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotationLocal: (id: string, patch: Partial<Annotation>) => void;
  removeAnnotation: (id: string) => void;
  setSelectedAnnotationId: (id: string | null) => void;
  startEditingMeasurement: (m: EditingMeasurement2D) => void;
  cancelEditingMeasurement: () => void;
  applyEditedMeasurement: (id: string, points: LngLat[], value: number) => void;
  updateMeasurementMeta: (id: string, type: EditingMeasurementType2D, patch: Partial<MeasurementMeta2D>) => void;
  setLastCreatedMeasurementId: (id: string | null) => void;
  startDrag: (index: number) => void;
  endDrag: () => void;
  updateDragPoint: (point: LngLat) => void;
}

export const useOrthophotoStore = create<OrthophotoState>((set) => ({
  orthophotoId: null,
  activeTool: "none",
  pendingPoints: [],
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

  setOrthophotoId: (orthophotoId) => set({ orthophotoId }),

  setActiveTool: (tool) => set({ activeTool: tool, pendingPoints: [], pendingAnnotation: null }),

  addPendingPoint: (point) => set((state) => ({ pendingPoints: [...state.pendingPoints, point] })),

  clearPendingPoints: () => set({ pendingPoints: [] }),

  removeLastPendingPoint: () => set((state) => ({ pendingPoints: state.pendingPoints.slice(0, -1) })),

  addDistanceMeasurement: (m) =>
    set((state) => ({ distanceMeasurements: [...state.distanceMeasurements, m], pendingPoints: [] })),

  removeDistanceMeasurement: (id) =>
    set((state) => ({ distanceMeasurements: state.distanceMeasurements.filter((m) => m.id !== id) })),

  addAreaMeasurement: (m) => set((state) => ({ areaMeasurements: [...state.areaMeasurements, m], pendingPoints: [] })),

  removeAreaMeasurement: (id) =>
    set((state) => ({ areaMeasurements: state.areaMeasurements.filter((m) => m.id !== id) })),

  addPolylineMeasurement: (m) =>
    set((state) => ({ polylineMeasurements: [...state.polylineMeasurements, m], pendingPoints: [] })),

  removePolylineMeasurement: (id) =>
    set((state) => ({ polylineMeasurements: state.polylineMeasurements.filter((m) => m.id !== id) })),

  addCircleMeasurement: (m) =>
    set((state) => ({ circleMeasurements: [...state.circleMeasurements, m], pendingPoints: [] })),

  removeCircleMeasurement: (id) =>
    set((state) => ({ circleMeasurements: state.circleMeasurements.filter((m) => m.id !== id) })),

  setPendingAnnotation: (pending) => set({ pendingAnnotation: pending }),

  setAnnotations: (annotations) => set({ annotations }),

  addAnnotation: (annotation) =>
    set((state) => ({ annotations: [...state.annotations, annotation], pendingAnnotation: null })),

  updateAnnotationLocal: (id, patch) =>
    set((state) => ({ annotations: state.annotations.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),

  removeAnnotation: (id) =>
    set((state) => ({
      annotations: state.annotations.filter((a) => a.id !== id),
      selectedAnnotationId: state.selectedAnnotationId === id ? null : state.selectedAnnotationId,
    })),

  setSelectedAnnotationId: (id) => set({ selectedAnnotationId: id }),

  startEditingMeasurement: (m) => set({ editingMeasurement: m, activeTool: "none", pendingPoints: [], pendingAnnotation: null }),

  cancelEditingMeasurement: () => set({ editingMeasurement: null, draggingIndex: null }),

  applyEditedMeasurement: (id, points, value) =>
    set((state) => ({
      editingMeasurement: null,
      draggingIndex: null,
      distanceMeasurements:
        state.editingMeasurement?.type === "distance"
          ? state.distanceMeasurements.map((m) =>
              m.id === id ? { ...m, points: [points[0], points[1]] as [LngLat, LngLat], distance: value } : m,
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
          ? state.circleMeasurements.map((m) =>
              m.id === id ? { ...m, points: [points[0], points[1]] as [LngLat, LngLat], radius: value } : m,
            )
          : state.circleMeasurements,
    })),

  updateMeasurementMeta: (id, type, patch) =>
    set((state) => ({
      distanceMeasurements:
        type === "distance"
          ? state.distanceMeasurements.map((m) => (m.id === id ? { ...m, ...patch } : m))
          : state.distanceMeasurements,
      areaMeasurements:
        type === "area" ? state.areaMeasurements.map((m) => (m.id === id ? { ...m, ...patch } : m)) : state.areaMeasurements,
      polylineMeasurements:
        type === "polyline"
          ? state.polylineMeasurements.map((m) => (m.id === id ? { ...m, ...patch } : m))
          : state.polylineMeasurements,
      circleMeasurements:
        type === "circle" ? state.circleMeasurements.map((m) => (m.id === id ? { ...m, ...patch } : m)) : state.circleMeasurements,
    })),

  setLastCreatedMeasurementId: (id) => set({ lastCreatedMeasurementId: id }),

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
