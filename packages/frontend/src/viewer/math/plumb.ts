import { Vector3 } from "three";

export interface PlumbResult {
  /** Desviación horizontal entre el muro y la vertical, en metros. */
  deviation: number;
  /** Altura vertical entre los dos puntos clicados, en metros. */
  height: number;
  /** Punto de referencia: justo encima de la base, a la altura del punto superior. */
  topRef: Vector3;
}

/**
 * Compara un punto en la base de un muro con otro más arriba sobre el mismo muro: calcula
 * cuánto se desvía el muro de una vertical perfecta que sube desde la base (el "plomo" o
 * referencia de aplomado en topografía/construcción).
 */
export function computePlumb(base: Vector3, top: Vector3): PlumbResult {
  const topRef = new Vector3(base.x, top.y, base.z);
  const deviation = Math.hypot(top.x - base.x, top.z - base.z);
  const height = Math.abs(top.y - base.y);
  return { deviation, height, topRef };
}
