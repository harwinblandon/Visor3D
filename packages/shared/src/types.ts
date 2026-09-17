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
  notes: string | null;
  uploadedAt: string;
}

export type MeasurementType = "distance" | "area" | "polyline";

export interface Measurement {
  id: string;
  modelId: string;
  type: MeasurementType;
  points: Point3D[];
  value: number;
  unit: string;
  label: string | null;
  author: string | null;
  note: string | null;
  createdAt: string;
}

export type DamageType =
  | "grieta"
  | "fisura"
  | "desprendimiento"
  | "humedad"
  | "corrosion"
  | "otro";

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
  severity: Severity;
  status: AnnotationStatus;
  description: string | null;
  author: string | null;
  detectedAt: string | null;
  createdAt: string;
  updatedAt: string;
  photos: AnnotationPhoto[];
}

export interface StatsSummary {
  totalAnnotations: number;
  byType: Record<DamageType, number>;
  bySeverity: Record<Severity, number>;
  byStatus: Record<AnnotationStatus, number>;
  overTime: { month: string; count: number }[];
}
