import type { Vector3 } from "three";

export function computeDistance(a: Vector3, b: Vector3): number {
  return a.distanceTo(b);
}

export function computePolylineLength(points: Vector3[]): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += points[i].distanceTo(points[i + 1]);
  }
  return total;
}
