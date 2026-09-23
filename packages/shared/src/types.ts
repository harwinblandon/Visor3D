import type { FeatureCollection } from "geojson";

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

export interface Orthophoto {
  id: string;
  name: string;
  filename: string;
  originalFilename: string | null;
  filePath: string;
  fileSizeBytes: number | null;
  crsDescription: string | null;
  boundsWest: number;
  boundsSouth: number;
  boundsEast: number;
  boundsNorth: number;
  minZoom: number;
  maxZoom: number;
  isPublished: boolean;
  notes: string | null;
  uploadedAt: string;
}

/** Capa vectorial subida como .kml/.kmz y convertida a GeoJSON, superpuesta sobre una ortofoto. */
export interface OrthophotoLayer {
  id: string;
  orthophotoId: string;
  name: string;
  originalFilename: string | null;
  geojson: FeatureCollection;
  uploadedAt: string;
}

export type MeasurementType = "distance" | "area" | "polyline" | "circle";

/** Punto {x,y,z}; para ortofotos x=longitud, y=latitud, z=0 (mismo esquema, coordenadas geográficas). */
export interface Measurement {
  id: string;
  modelId: string | null;
  orthophotoId: string | null;
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
  modelId: string | null;
  orthophotoId: string | null;
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
