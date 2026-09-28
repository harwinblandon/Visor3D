import { Vector3 } from "three";
import type { CircleDef, Point3D } from "@h-geovisor/shared";
import { circleFromPoints, circlePolygon, circleRadius as sharedCircleRadius, circleToPoints } from "@h-geovisor/shared";

export interface Circle3 {
  center: Vector3;
  edge: Vector3;
  normal: Vector3;
}

function toPoint3D(v: Vector3): Point3D {
  return { x: v.x, y: v.y, z: v.z };
}

function toVector3(p: Point3D): Vector3 {
  return new Vector3(p.x, p.y, p.z);
}

function toDef(c: Circle3): CircleDef {
  return { center: toPoint3D(c.center), edge: toPoint3D(c.edge), normal: toPoint3D(c.normal) };
}

export function circleRadius(c: Circle3): number {
  return sharedCircleRadius(toDef(c));
}

/** Aproxima el círculo como un anillo de puntos en su plano, para dibujarlo. */
export function circlePolygonPoints(c: Circle3, segments = 48): Vector3[] {
  return circlePolygon(toDef(c), segments).map(toVector3);
}

/** Codifica el círculo como [centro, borde, centro+normal] para guardarlo como `points`. */
export function circleToPointArray(c: Circle3): Vector3[] {
  return circleToPoints(toDef(c)).map(toVector3);
}

/** Reconstruye centro/borde/normal a partir del array de 3 puntos guardado. */
export function circleFromPointArray(points: Vector3[]): Circle3 {
  const def = circleFromPoints(points.map(toPoint3D));
  return { center: toVector3(def.center), edge: toVector3(def.edge), normal: toVector3(def.normal) };
}
