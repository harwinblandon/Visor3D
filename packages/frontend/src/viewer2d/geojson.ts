import type { Feature, FeatureCollection, LineString, Point, Polygon } from "geojson";
import type { LngLat } from "./math/geo";

export function lineFeature(id: string, points: LngLat[], properties: Record<string, unknown> = {}): Feature<LineString> {
  return { type: "Feature", id, properties, geometry: { type: "LineString", coordinates: points } };
}

export function polygonFeature(id: string, points: LngLat[], properties: Record<string, unknown> = {}): Feature<Polygon> {
  const ring = points.length >= 3 ? [...points, points[0]] : points;
  return { type: "Feature", id, properties, geometry: { type: "Polygon", coordinates: [ring] } };
}

export function pointFeature(id: string, position: LngLat, properties: Record<string, unknown> = {}): Feature<Point> {
  return { type: "Feature", id, properties, geometry: { type: "Point", coordinates: position } };
}

export function featureCollection<T extends Feature>(features: T[]): FeatureCollection {
  return { type: "FeatureCollection", features };
}
