import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG } from '../config';
import { useStore } from '../store/useStore';
import type { FocusedLayout } from './focusedLayout';

interface PointPickerProps {
  focusedLayout: FocusedLayout | null;
}

const _viewProj = new THREE.Matrix4();

export function PointPicker({ focusedLayout }: PointPickerProps) {
  const { camera, gl, size } = useThree();

  const galaxyData = useStore((s) => s.galaxyData);
  const selectedIdx = useStore((s) => s.selectedIdx);
  const selectedGenreIds = useStore((s) => s.selectedGenreIds);
  const mediaTypeFilter = useStore((s) => s.mediaTypeFilter);
  const setHoverState = useStore((s) => s.setHoverState);
  const selectTitleByIdx = useStore((s) => s.selectTitleByIdx);

  const stateRef = useRef({
    galaxyData,
    selectedIdx,
    focusedLayout,
    selectedGenreIds,
    mediaTypeFilter,
    size,
  });

  stateRef.current = {
    galaxyData,
    selectedIdx,
    focusedLayout,
    selectedGenreIds,
    mediaTypeFilter,
    size,
  };

  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const lastPickTimeRef = useRef<number>(0);

  useEffect(() => {
    const dom = gl.domElement;

    function pickNearestAtClient(clientX: number, clientY: number): number | null {
      const {
        galaxyData: gData,
        selectedIdx: curSelected,
        focusedLayout: layout,
        selectedGenreIds: genreFilters,
        mediaTypeFilter: typeFilter,
        size: canvasSize,
      } = stateRef.current;

      if (!gData) return null;

      const rect = dom.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const halfW = canvasSize.width * 0.5;
      const halfH = canvasSize.height * 0.5;

      camera.updateMatrixWorld();
      _viewProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      const m = _viewProj.elements;

      // 1. Prioritize focused neighbor nodes and center star when in Focused View
      if (layout) {
        const neighborThresholdSq = CONFIG.PICK_NEIGHBOR_RADIUS_PX * CONFIG.PICK_NEIGHBOR_RADIUS_PX;
        let bestNeighborIdx: number | null = null;
        let bestNeighborDistSq = neighborThresholdSq;

        for (let i = 0; i < layout.nodes.length; i++) {
          const node = layout.nodes[i];
          const x = node.position[0];
          const y = node.position[1];
          const z = node.position[2];

          const w = m[3] * x + m[7] * y + m[11] * z + m[15];
          if (w <= 0.001) continue;
          const invW = 1 / w;
          const ndcX = (m[0] * x + m[4] * y + m[8] * z + m[12]) * invW;
          const ndcY = (m[1] * x + m[5] * y + m[9] * z + m[13]) * invW;
          const ndcZ = (m[2] * x + m[6] * y + m[10] * z + m[14]) * invW;
          if (ndcZ < -1 || ndcZ > 1) continue;

          const sx = (ndcX + 1) * halfW;
          const sy = (-ndcY + 1) * halfH;
          const dx = sx - px;
          const dy = sy - py;
          const distSq = dx * dx + dy * dy;
          if (distSq < bestNeighborDistSq) {
            bestNeighborDistSq = distSq;
            bestNeighborIdx = node.idx;
          }
        }

        if (bestNeighborIdx !== null) {
          return bestNeighborIdx;
        }
      }

      // 2. Fast throttled screen-space scan over the 20k galaxy positions
      const thresholdSq = CONFIG.PICK_RADIUS_PX * CONFIG.PICK_RADIUS_PX;
      let bestIdx: number | null = null;
      let bestDistSq = thresholdSq;

      const pos = gData.positions;
      const attrs = gData.attributes;
      const scale = CONFIG.SCENE_SCALE;
      const typeFilterCode = typeFilter === 'movie' ? 0 : typeFilter === 'tv' ? 1 : -1;
      const allowedGenres = genreFilters.length > 0 ? new Set(genreFilters) : null;
      const count = gData.count;

      for (let i = 0; i < count; i++) {
        if (i === curSelected) continue;
        if (allowedGenres !== null && !allowedGenres.has(attrs[i * 4])) continue;
        if (typeFilterCode !== -1 && attrs[i * 4 + 1] !== typeFilterCode) continue;

        const x = pos[i * 3] * scale;
        const y = pos[i * 3 + 1] * scale;
        const z = pos[i * 3 + 2] * scale;

        const w = m[3] * x + m[7] * y + m[11] * z + m[15];
        if (w <= 0.001) continue;

        const invW = 1 / w;
        const ndcX = (m[0] * x + m[4] * y + m[8] * z + m[12]) * invW;
        if (ndcX < -1.05 || ndcX > 1.05) continue;

        const ndcY = (m[1] * x + m[5] * y + m[9] * z + m[13]) * invW;
        if (ndcY < -1.05 || ndcY > 1.05) continue;

        const ndcZ = (m[2] * x + m[6] * y + m[10] * z + m[14]) * invW;
        if (ndcZ < -1 || ndcZ > 1) continue;

        const sx = (ndcX + 1) * halfW;
        const sy = (-ndcY + 1) * halfH;
        const dx = sx - px;
        const dy = sy - py;
        const distSq = dx * dx + dy * dy;

        if (distSq < bestDistSq) {
          bestDistSq = distSq;
          bestIdx = i;
        }
      }

      return bestIdx;
    }

    const handlePointerDown = (event: PointerEvent) => {
      pointerDownRef.current = { x: event.clientX, y: event.clientY };
    };

    const handlePointerMove = (event: PointerEvent) => {
      const now = performance.now();
      if (now - lastPickTimeRef.current < CONFIG.PICK_THROTTLE_MS) return;
      lastPickTimeRef.current = now;

      // Avoid hovering stars while dragging the camera
      if (event.buttons !== 0) {
        setHoverState(null, null);
        dom.style.cursor = 'grabbing';
        return;
      }

      const hitIdx = pickNearestAtClient(event.clientX, event.clientY);
      if (hitIdx !== null) {
        setHoverState(hitIdx, { x: event.clientX, y: event.clientY });
        dom.style.cursor = 'pointer';
      } else {
        if (useStore.getState().hoveredIdx !== null) {
          setHoverState(null, null);
        }
        dom.style.cursor = 'grab';
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (!pointerDownRef.current) return;
      const dx = event.clientX - pointerDownRef.current.x;
      const dy = event.clientY - pointerDownRef.current.y;
      pointerDownRef.current = null;

      if (Math.hypot(dx, dy) > CONFIG.CLICK_DRAG_THRESHOLD_PX) {
        dom.style.cursor = 'grab';
        return;
      }

      const hitIdx = pickNearestAtClient(event.clientX, event.clientY);
      if (hitIdx !== null && hitIdx !== stateRef.current.selectedIdx) {
        selectTitleByIdx(hitIdx, { syncHash: true, flyCamera: true });
      }
    };

    const handlePointerLeave = () => {
      setHoverState(null, null);
      dom.style.cursor = 'auto';
    };

    dom.addEventListener('pointerdown', handlePointerDown);
    dom.addEventListener('pointermove', handlePointerMove);
    dom.addEventListener('pointerup', handlePointerUp);
    dom.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      dom.removeEventListener('pointerdown', handlePointerDown);
      dom.removeEventListener('pointermove', handlePointerMove);
      dom.removeEventListener('pointerup', handlePointerUp);
      dom.removeEventListener('pointerleave', handlePointerLeave);
      dom.style.cursor = 'auto';
    };
  }, [gl, camera, setHoverState, selectTitleByIdx]);

  return null;
}
