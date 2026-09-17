import { BufferGeometry, Float32BufferAttribute, Vector3 } from "three";
import earcut from "earcut";

export interface NewellResult {
  area: number;
  normal: Vector3;
}

/**
 * Formula de Newell (shoelace generalizada a 3D): robusta para poligonos
 * convexos y concavos, incluso si los puntos no son perfectamente coplanares
 * (da el area proyectada sobre el plano de mejor ajuste, que es lo correcto
 * para superficies casi planas como fachadas).
 */
export function computeNewellArea(points: Vector3[]): NewellResult {
  const normal = new Vector3(0, 0, 0);
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const current = points[i];
    const next = points[(i + 1) % n];
    normal.x += (current.y - next.y) * (current.z + next.z);
    normal.y += (current.z - next.z) * (current.x + next.x);
    normal.z += (current.x - next.x) * (current.y + next.y);
  }

  const area = normal.length() * 0.5;
  normal.normalize();

  return { area, normal };
}

/**
 * Triangula el poligono proyectando los puntos al plano centroide+normal
 * (soporta poligonos concavos via earcut), pero reconstruye la geometria con
 * las posiciones 3D originales para que el relleno visual siga el relieve
 * real de la superficie.
 */
export function triangulateForRender(points: Vector3[], normal: Vector3): BufferGeometry {
  const centroid = points
    .reduce((acc, p) => acc.add(p), new Vector3())
    .multiplyScalar(1 / points.length);

  // Base ortonormal del plano perpendicular a `normal`.
  const u = new Vector3();
  if (Math.abs(normal.x) < 0.9) {
    u.set(1, 0, 0).cross(normal).normalize();
  } else {
    u.set(0, 1, 0).cross(normal).normalize();
  }
  const v = normal.clone().cross(u).normalize();

  const flat2D: number[] = [];
  for (const p of points) {
    const rel = p.clone().sub(centroid);
    flat2D.push(rel.dot(u), rel.dot(v));
  }

  const indices = earcut(flat2D);

  const positions: number[] = [];
  for (const p of points) {
    positions.push(p.x, p.y, p.z);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}
