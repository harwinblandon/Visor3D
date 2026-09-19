import type { Point3D } from "./types.js";

function sub(a: Point3D, b: Point3D): Point3D {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}
function add(a: Point3D, b: Point3D): Point3D {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}
function scale(a: Point3D, s: number): Point3D {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}
function length(a: Point3D): number {
  return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
}
function normalize(a: Point3D): Point3D {
  const l = length(a) || 1;
  return scale(a, 1 / l);
}
function cross(a: Point3D, b: Point3D): Point3D {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}

export interface CircleDef {
  center: Point3D;
  edge: Point3D;
  normal: Point3D;
}

/**
 * Codifica un círculo (centro + punto en el borde + normal del plano) como
 * 3 puntos para guardarlo en el mismo campo `points` que las demás mediciones:
 * [centro, borde, centro+normal_unitaria].
 */
export function circleToPoints(c: CircleDef): Point3D[] {
  return [c.center, c.edge, add(c.center, normalize(c.normal))];
}

export function circleFromPoints(points: Point3D[]): CircleDef {
  const [center, edge, normalPoint] = points;
  return { center, edge, normal: normalize(sub(normalPoint, center)) };
}

export function circleRadius(c: CircleDef): number {
  return length(sub(c.edge, c.center));
}

/** Aproxima el círculo como un polígono cerrado en su plano (para render y exportación). */
export function circlePolygon(c: CircleDef, segments = 48): Point3D[] {
  const n = normalize(c.normal);
  const arbitrary: Point3D = Math.abs(n.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
  const u = normalize(cross(arbitrary, n));
  const v = cross(n, u);
  const r = circleRadius(c);

  const points: Point3D[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const offset = add(scale(u, r * Math.cos(angle)), scale(v, r * Math.sin(angle)));
    points.push(add(c.center, offset));
  }
  return points;
}
