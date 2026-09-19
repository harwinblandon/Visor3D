import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { TourStop } from "@visor3d/shared";
import { useViewerStore, TOUR_LEG_DURATION_SECONDS, type TourStatus } from "../state/viewerStore";
import { createTourStop } from "../api/tourStops";

const ENTRY_DURATION_SECONDS = 1.2;

function toVector3(p: { x: number; y: number; z: number }): Vector3 {
  return new Vector3(p.x, p.y, p.z);
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function applyCameraForTime(
  time: number,
  stops: TourStop[],
  camera: { position: Vector3 },
  orbit: OrbitControlsImpl | null,
) {
  if (stops.length === 0) return;
  if (stops.length === 1) {
    camera.position.copy(toVector3(stops[0].position));
    if (orbit) {
      orbit.target.copy(toVector3(stops[0].target));
      orbit.update();
    }
    return;
  }

  const legIndex = Math.min(Math.floor(time / TOUR_LEG_DURATION_SECONDS), stops.length - 2);
  const localT = Math.min(Math.max((time - legIndex * TOUR_LEG_DURATION_SECONDS) / TOUR_LEG_DURATION_SECONDS, 0), 1);
  const eased = easeInOutQuad(localT);
  const from = stops[legIndex];
  const to = stops[legIndex + 1];

  camera.position.lerpVectors(toVector3(from.position), toVector3(to.position), eased);
  if (orbit) {
    orbit.target.lerpVectors(toVector3(from.target), toVector3(to.target), eased);
    orbit.update();
  }
}

export function CameraTourController() {
  const { camera, controls } = useThree();
  const modelId = useViewerStore((s) => s.modelId);
  const pendingTourCapture = useViewerStore((s) => s.pendingTourCapture);
  const addTourStop = useViewerStore((s) => s.addTourStop);
  const clearTourCaptureRequest = useViewerStore((s) => s.clearTourCaptureRequest);

  const entryRef = useRef<{ from: { position: Vector3; target: Vector3 }; elapsed: number } | null>(null);
  const prevStatusRef = useRef<TourStatus>("idle");

  useEffect(() => {
    if (!pendingTourCapture || !modelId) return;
    const orbit = controls as OrbitControlsImpl | null;
    const position = camera.position.clone();
    const target = orbit ? orbit.target.clone() : position.clone();

    createTourStop({
      modelId,
      position: { x: position.x, y: position.y, z: position.z },
      target: { x: target.x, y: target.y, z: target.z },
      label: pendingTourCapture.label,
    })
      .then((saved) => {
        addTourStop(saved);
        clearTourCaptureRequest();
      })
      .catch((err) => {
        console.error("No se pudo guardar la parada del recorrido:", err);
        clearTourCaptureRequest();
      });
  }, [pendingTourCapture, modelId, camera, controls, addTourStop, clearTourCaptureRequest]);

  useFrame((_, delta) => {
    const { tourStatus, tourStops, tourTime, setTourTime, stopTour } = useViewerStore.getState();
    const orbit = controls as OrbitControlsImpl | null;

    if (tourStatus === "idle") {
      entryRef.current = null;
      prevStatusRef.current = "idle";
      return;
    }
    if (tourStops.length === 0) {
      prevStatusRef.current = tourStatus;
      return;
    }

    if (tourStatus === "playing" && prevStatusRef.current !== "playing" && tourTime === 0) {
      entryRef.current = {
        from: {
          position: camera.position.clone(),
          target: orbit ? orbit.target.clone() : camera.position.clone(),
        },
        elapsed: 0,
      };
    }
    prevStatusRef.current = tourStatus;

    if (entryRef.current) {
      if (tourStatus === "playing") entryRef.current.elapsed += delta;
      const t = Math.min(entryRef.current.elapsed / ENTRY_DURATION_SECONDS, 1);
      const eased = easeInOutQuad(t);
      const firstStop = tourStops[0];
      camera.position.lerpVectors(entryRef.current.from.position, toVector3(firstStop.position), eased);
      if (orbit) {
        orbit.target.lerpVectors(entryRef.current.from.target, toVector3(firstStop.target), eased);
        orbit.update();
      }
      if (t >= 1) entryRef.current = null;
      return;
    }

    let time = tourTime;
    if (tourStatus === "playing") {
      const totalDuration = Math.max(tourStops.length - 1, 0) * TOUR_LEG_DURATION_SECONDS;
      time = Math.min(time + delta, totalDuration);
      setTourTime(time);
      if (time >= totalDuration) {
        stopTour();
      }
    }

    applyCameraForTime(time, tourStops, camera, orbit);
  });

  return null;
}
