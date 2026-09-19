export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Model {
  id: string;
  name: string;
  filename: string;
  originalFilename: string | null;
  filePath: string;
  fileSizeBytes: number | null;
  crsDescription: string | null;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
  isPublished: boolean;
  notes: string | null;
  uploadedAt: string;
}

export type MeasurementType = "distance" | "area" | "polyline" | "circle";

export interface Measurement {
  id: string;
  modelId: string;
  type: MeasurementType;
  points: Point3D[];
  value: number;
  unit: string;
  label: string | null;
  layer: string | null;
  author: string | null;
  note: string | null;
  createdAt: string;
}

/** Categoría libre elegida por quien anota (antes limitada a una lista fija de tipos de daño). */
export type DamageType = string;

export type Severity = "baja" | "media" | "alta";

export type AnnotationStatus = "abierto" | "en_revision" | "resuelto";

export interface AnnotationPhoto {
  id: string;
  annotationId: string;
  filename: string;
  filePath: string;
  fileSizeBytes: number | null;
  uploadedAt: string;
}

export interface Annotation {
  id: string;
  modelId: string;
  position: Point3D;
  normal: Point3D | null;
  damageType: DamageType;
  severity: Severity | null;
  status: AnnotationStatus;
  description: string | null;
  author: string | null;
  detectedAt: string | null;
  createdAt: string;
  updatedAt: string;
  photos: AnnotationPhoto[];
}

export interface TourStop {
  id: string;
  modelId: string;
  orderIndex: number;
  position: Point3D;
  target: Point3D;
  label: string | null;
  createdAt: string;
}

export interface StatsSummary {
  totalAnnotations: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  byStatus: Record<AnnotationStatus, number>;
  overTime: { month: string; count: number }[];
}
