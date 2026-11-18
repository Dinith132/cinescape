import { useEffect, useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { CONFIG } from '../config';
import { useStore } from '../store/useStore';

interface CameraRigProps {
  isSoftwareGl: boolean;
}

interface TweenState {
  startPos: THREE.Vector3;
  startTarget: THREE.Vector3;
  goalPos: THREE.Vector3;
  goalTarget: THREE.Vector3;
  elapsed: number;
  duration: number;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Pre-allocated math helpers for zero GC inside useFrame
const _offset = new THREE.Vector3();

export function CameraRig({ isSoftwareGl }: CameraRigProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const tweenRef = useRef<TweenState | null>(null);
  const lastHandledNonce = useRef<number>(0);

  const { camera } = useThree();
  const cameraCommand = useStore((s) => s.cameraCommand);
  const galaxyData = useStore((s) => s.galaxyData);
  const hasInteracted = useStore((s) => s.hasInteracted);
  const reducedMotion = useStore((s) => s.reducedMotion);
  const selectedIdx = useStore((s) => s.selectedIdx);
  const markInteracted = useStore((s) => s.markInteracted);

  useEffect(() => {
    if (!cameraCommand || cameraCommand.nonce === lastHandledNonce.current) return;
    const controls = controlsRef.current;
    if (!controls) return;

    lastHandledNonce.current = cameraCommand.nonce;

    let goalPos: THREE.Vector3 | null = null;
    let goalTarget: THREE.Vector3 | null = null;
    let duration = CONFIG.CAMERA_FLY_DURATION_MS / 1000;

    if (cameraCommand.type === 'reset') {
      goalPos = new THREE.Vector3(...CONFIG.DEFAULT_CAMERA_POS);
      goalTarget = new THREE.Vector3(...CONFIG.DEFAULT_CAMERA_TARGET);
    } else if (cameraCommand.type === 'fly' && galaxyData) {
      const idx = cameraCommand.targetIdx;
      const px = galaxyData.positions[idx * 3] * CONFIG.SCENE_SCALE;
      const py = galaxyData.positions[idx * 3 + 1] * CONFIG.SCENE_SCALE;
      const pz = galaxyData.positions[idx * 3 + 2] * CONFIG.SCENE_SCALE;

      goalTarget = new THREE.Vector3(px, py, pz);
      _offset.copy(camera.position).sub(controls.target);
      if (_offset.lengthSq() < 0.001) {
        _offset.set(0, 0.35, 1).normalize();
      } else {
        _offset.normalize();
      }
      // Keep a gentle elevated viewing angle when flying from default/far away
      if (Math.abs(_offset.y) < 0.15) {
        _offset.y = 0.24;
        _offset.normalize();
      }
      goalPos = goalTarget.clone().addScaledVector(_offset, CONFIG.FOCUS_CAMERA_DISTANCE);
    } else if (cameraCommand.type === 'zoomIn' || cameraCommand.type === 'zoomOut') {
      duration = 0.36;
      _offset.copy(camera.position).sub(controls.target);
      const currentDist = Math.max(0.1, _offset.length());
      const factor =
        cameraCommand.type === 'zoomIn'
          ? CONFIG.ZOOM_STEP_FACTOR
          : 1 / CONFIG.ZOOM_STEP_FACTOR;
      const nextDist = THREE.MathUtils.clamp(
        currentDist * factor,
        CONFIG.CAMERA_MIN_DISTANCE,
        CONFIG.CAMERA_MAX_DISTANCE,
      );
      _offset.normalize().multiplyScalar(nextDist);
      goalTarget = controls.target.clone();
      goalPos = controls.target.clone().add(_offset);
    }

    if (!goalPos || !goalTarget) return;

    if (reducedMotion) {
      camera.position.copy(goalPos);
      controls.target.copy(goalTarget);
      controls.update();
      tweenRef.current = null;
    } else {
      tweenRef.current = {
        startPos: camera.position.clone(),
        startTarget: controls.target.clone(),
        goalPos,
        goalTarget,
        elapsed: 0,
        duration,
      };
    }
  }, [cameraCommand, galaxyData, camera, reducedMotion]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    const tween = tweenRef.current;
    if (!controls || !tween) return;

    tween.elapsed += Math.min(delta, 0.1);
    const rawT = Math.min(1, tween.elapsed / tween.duration);
    const eased = easeInOutCubic(rawT);

    camera.position.lerpVectors(tween.startPos, tween.goalPos, eased);
    controls.target.lerpVectors(tween.startTarget, tween.goalTarget, eased);
    controls.update();

    if (rawT >= 1) {
      tweenRef.current = null;
    }
  });

  const handleControlStart = () => {
    tweenRef.current = null;
    markInteracted();
  };

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping={!isSoftwareGl && !reducedMotion}
      dampingFactor={CONFIG.ORBIT_DAMPING}
      enableRotate
      enableZoom
      enablePan
      minDistance={CONFIG.CAMERA_MIN_DISTANCE}
      maxDistance={CONFIG.CAMERA_MAX_DISTANCE}
      autoRotate={!hasInteracted && !reducedMotion && selectedIdx === null && !isSoftwareGl}
      autoRotateSpeed={CONFIG.IDLE_AUTO_ROTATE_SPEED}
      onStart={handleControlStart}
    />
  );
}
