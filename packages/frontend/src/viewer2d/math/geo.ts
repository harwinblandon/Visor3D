import distance from "@turf/distance";
import area from "@turf/area";
import circle from "@turf/circle";
import { point, polygon } from "@turf/helpers";
import type { Polygon, Position } from "geojson";

/** [longitud, latitud] — mismo orden que usan GeoJSON y MapLibre. */
export type LngLat = [number, number];

export function computeDistance(a: LngLat, b: LngLat): number {
  return distance(point(a), point(b), { units: "meters" });
}

export function computePolylineLength(points: LngLat[]): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) total += computeDistance(points[i], points[i + 1]);
  return total;
}

/** Área geodésica en m² de un polígono simple (no hace falta cerrar el anillo). */
export function computeArea(points: LngLat[]): number {
  if (points.length < 3) return 0;
  const ring: Position[] = [...points, points[0]];
  return area(polygon([ring]));
}

export function computeCircleRadius(center: LngLat, edge: LngLat): number {
  return computeDistance(center, edge);
}

/** Aproxima el círculo geodésico (centro + radio en metros) como un polígono, para dibujarlo. */
export function circlePolygonPoints(center: LngLat, edge: LngLat, steps = 64): LngLat[] {
  const radiusKm = computeCircleRadius(center, edge) / 1000;
  const poly = circle(point(center), radiusKm, { steps, units: "kilometers" }) as { geometry: Polygon };
  return poly.geometry.coordinates[0] as LngLat[];
}
