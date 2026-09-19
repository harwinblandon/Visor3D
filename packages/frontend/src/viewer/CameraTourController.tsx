import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useViewerStore } from "../state/viewerStore";
import { createTourStop } from "../api/tourStops";

const LEG_DURATION_SECONDS = 2.5;

interface PlaybackState {
  legIndex: number;
  elapsed: number;
  from: { position: Vector3; target: Vector3 };
}

export function CameraTourController() {
  const { camera, controls } = useThree();
  const modelId = useViewerStore((s) => s.modelId);
  const tourStops = useViewerStore((s) => s.tourStops);
  const isTouring = useViewerStore((s) => s.isTouring);
  const pendingTourCapture = useViewerStore((s) => s.pendingTourCapture);
  const addTourStop = useViewerStore((s) => s.addTourStop);
  const clearTourCaptureRequest = useViewerStore((s) => s.clearTourCaptureRequest);
  const stopTour = useViewerStore((s) => s.stopTour);

  const playback = useRef<PlaybackState | null>(null);

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

  useEffect(() => {
    if (!isTouring) {
      playback.current = null;
      return;
    }
    const orbit = controls as OrbitControlsImpl | null;
    playback.current = {
      legIndex: 0,
      elapsed: 0,
      from: {
        position: camera.position.clone(),
        target: orbit ? orbit.target.clone() : camera.position.clone(),
      },
    };
    // Solo debe reiniciar el recorrido cuando isTouring cambia a true.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTouring]);

  useFrame((_, delta) => {
    if (!isTouring || !playback.current || tourStops.length === 0) return;
    const orbit = controls as OrbitControlsImpl | null;
    const state = playback.current;
    const stop = tourStops[state.legIndex];
    if (!stop) {
      stopTour();
      return;
    }

    state.elapsed += delta;
    const t = Math.min(state.elapsed / LEG_DURATION_SECONDS, 1);
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    const toPosition = new Vector3(stop.position.x, stop.position.y, stop.position.z);
    const toTarget = new Vector3(stop.target.x, stop.target.y, stop.target.z);

    camera.position.lerpVectors(state.from.position, toPosition, eased);
    if (orbit) {
      orbit.target.lerpVectors(state.from.target, toTarget, eased);
      orbit.update();
    }

    if (t >= 1) {
      state.legIndex += 1;
      state.elapsed = 0;
      state.from = { position: toPosition.clone(), target: toTarget.clone() };
      if (state.legIndex >= tourStops.length) {
        stopTour();
      }
    }
  });

  return null;
}
