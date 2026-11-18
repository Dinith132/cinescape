import { useEffect, useMemo, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG } from '../config';
import { useStore } from '../store/useStore';
import type { FocusedLayout } from './focusedLayout';
import {
  centerStarFragmentShader,
  centerStarVertexShader,
  neighborFragmentShader,
  neighborVertexShader,
} from './shaders';

interface FocusedConstellationProps {
  layout: FocusedLayout;
}

interface LabelBox {
  idx: number;
  sx: number;
  sy: number;
  ox: number;
  oy: number;
  width: number;
  height: number;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// Pre-allocated math helpers for zero GC inside useFrame
const _proj = new THREE.Vector3();
const _centerColor = new THREE.Color('#ffffff');
const _violetMix = new THREE.Color('#c7bfff');
const _neighborColor = new THREE.Color();
const _hoverLineMix = new THREE.Color('#70f8e8');

export function FocusedConstellation({ layout }: FocusedConstellationProps) {
  const searchEngine = useStore((s) => s.searchEngine);
  const hoveredIdx = useStore((s) => s.hoveredIdx);
  const reducedMotion = useStore((s) => s.reducedMotion);
  const selectTitleByIdx = useStore((s) => s.selectTitleByIdx);
  const setHoverState = useStore((s) => s.setHoverState);

  const { gl, camera, size } = useThree();

  const burstStartRef = useRef<number>(performance.now());
  const prevCenterIdxRef = useRef<number | null>(null);
  const burstTriggeredForCenterRef = useRef<number | null>(null);
  const labelRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const labelBoxesRef = useRef<LabelBox[]>([]);

  const { centerIdx, centerPos, nodes } = layout;

  useEffect(() => {
    if (prevCenterIdxRef.current !== centerIdx) {
      prevCenterIdxRef.current = centerIdx;
      burstTriggeredForCenterRef.current = null;
    }
    if (nodes.length > 0 && burstTriggeredForCenterRef.current !== centerIdx) {
      burstTriggeredForCenterRef.current = centerIdx;
      burstStartRef.current = performance.now();
    }
  }, [centerIdx, nodes.length]);

  // Reuse pre-allocated center star geometry across center changes
  const centerGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
    return geo;
  }, []);

  useEffect(() => {
    const posAttr = centerGeometry.getAttribute('position') as THREE.BufferAttribute;
    posAttr.setXYZ(0, centerPos[0], centerPos[1], centerPos[2]);
    posAttr.needsUpdate = true;
    centerGeometry.computeBoundingSphere();
  }, [centerGeometry, centerPos]);

  useEffect(() => () => centerGeometry.dispose(), [centerGeometry]);

  const centerMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: centerStarVertexShader,
        fragmentShader: centerStarFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uPixelRatio: { value: gl.getPixelRatio() },
          uTime: { value: 0 },
          uReducedMotion: { value: 0 },
        },
      }),
    [gl],
  );

  useEffect(() => () => centerMaterial.dispose(), [centerMaterial]);

  // Reuse pre-allocated neighbor & line BufferGeometries up to NEIGHBOR_COUNT_MAX
  const neighborResources = useMemo(() => {
    const maxK = CONFIG.NEIGHBOR_COUNT_MAX;

    const pointGeo = new THREE.BufferGeometry();
    pointGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxK * 3), 3));
    pointGeo.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(maxK * 3), 3));
    pointGeo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(maxK), 1));
    pointGeo.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(maxK), 1));
    pointGeo.setAttribute('aIsHovered', new THREE.BufferAttribute(new Float32Array(maxK), 1));
    pointGeo.setDrawRange(0, 0);

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxK * 2 * 3), 3));
    lineGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(maxK * 2 * 3), 3));
    lineGeo.setDrawRange(0, 0);

    return { pointGeo, lineGeo };
  }, []);

  useEffect(() => {
    return () => {
      neighborResources.pointGeo.dispose();
      neighborResources.lineGeo.dispose();
    };
  }, [neighborResources]);

  const neighborMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: neighborVertexShader,
        fragmentShader: neighborFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uPixelRatio: { value: gl.getPixelRatio() },
          uTime: { value: 0 },
          uReducedMotion: { value: 0 },
        },
      }),
    [gl],
  );

  useEffect(() => () => neighborMaterial.dispose(), [neighborMaterial]);

  const lineMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  useEffect(() => () => lineMaterial.dispose(), [lineMaterial]);

  // Populate reused neighbor & line geometry buffers when layout changes
  useEffect(() => {
    const { pointGeo, lineGeo } = neighborResources;
    const k = Math.min(nodes.length, CONFIG.NEIGHBOR_COUNT_MAX);

    const ptPosAttr = pointGeo.getAttribute('position') as THREE.BufferAttribute;
    const ptColorAttr = pointGeo.getAttribute('aColor') as THREE.BufferAttribute;
    const ptSizeAttr = pointGeo.getAttribute('aSize') as THREE.BufferAttribute;
    const ptSeedAttr = pointGeo.getAttribute('aSeed') as THREE.BufferAttribute;
    const linePosAttr = lineGeo.getAttribute('position') as THREE.BufferAttribute;

    const ptPos = ptPosAttr.array as Float32Array;
    const ptCol = ptColorAttr.array as Float32Array;
    const ptSize = ptSizeAttr.array as Float32Array;
    const ptSeed = ptSeedAttr.array as Float32Array;
    const lnPos = linePosAttr.array as Float32Array;

    const startAtCenter =
      !reducedMotion &&
      burstTriggeredForCenterRef.current === centerIdx &&
      performance.now() - burstStartRef.current < 120;

    for (let i = 0; i < k; i++) {
      const node = nodes[i];
      if (startAtCenter) {
        ptPos[i * 3] = centerPos[0];
        ptPos[i * 3 + 1] = centerPos[1];
        ptPos[i * 3 + 2] = centerPos[2];
      } else {
        ptPos[i * 3] = node.position[0];
        ptPos[i * 3 + 1] = node.position[1];
        ptPos[i * 3 + 2] = node.position[2];
      }

      _neighborColor.set(node.genreColor);
      ptCol[i * 3] = _neighborColor.r;
      ptCol[i * 3 + 1] = _neighborColor.g;
      ptCol[i * 3 + 2] = _neighborColor.b;

      ptSize[i] = 0.45 + 0.55 * Math.min(1, Math.max(0, node.score));
      ptSeed[i] = i * 0.85;

      lnPos[i * 6] = centerPos[0];
      lnPos[i * 6 + 1] = centerPos[1];
      lnPos[i * 6 + 2] = centerPos[2];

      const endPos = startAtCenter ? centerPos : node.position;
      lnPos[i * 6 + 3] = endPos[0];
      lnPos[i * 6 + 4] = endPos[1];
      lnPos[i * 6 + 5] = endPos[2];
    }

    pointGeo.setDrawRange(0, k);
    lineGeo.setDrawRange(0, k * 2);

    ptPosAttr.needsUpdate = true;
    ptColorAttr.needsUpdate = true;
    ptSizeAttr.needsUpdate = true;
    ptSeedAttr.needsUpdate = true;
    linePosAttr.needsUpdate = true;
  }, [neighborResources, nodes, centerPos, centerIdx, reducedMotion]);

  // Sync hover state into neighbor point & line color buffers
  useEffect(() => {
    const k = Math.min(nodes.length, CONFIG.NEIGHBOR_COUNT_MAX);
    const hoverAttr = neighborResources.pointGeo.getAttribute(
      'aIsHovered',
    ) as THREE.BufferAttribute;
    const lineColorAttr = neighborResources.lineGeo.getAttribute(
      'color',
    ) as THREE.BufferAttribute;

    const hoverArr = hoverAttr.array as Float32Array;
    const colorArr = lineColorAttr.array as Float32Array;

    for (let i = 0; i < k; i++) {
      const node = nodes[i];
      const isHov = hoveredIdx === node.idx;
      hoverArr[i] = isHov ? 1 : 0;

      // Brightness proportional to similarity score
      const scoreNorm = Math.min(1, Math.max(0, (node.score - 0.3) / 0.62));
      const brightness = isHov ? 1.0 : 0.22 + 0.72 * scoreNorm;

      _neighborColor.set(node.genreColor);
      if (isHov) {
        _neighborColor.lerp(_hoverLineMix, 0.55);
      }

      const startColor = _centerColor.copy(_violetMix).lerp(_neighborColor, 0.35);
      colorArr[i * 6] = startColor.r * brightness;
      colorArr[i * 6 + 1] = startColor.g * brightness;
      colorArr[i * 6 + 2] = startColor.b * brightness;

      colorArr[i * 6 + 3] = _neighborColor.r * brightness;
      colorArr[i * 6 + 4] = _neighborColor.g * brightness;
      colorArr[i * 6 + 5] = _neighborColor.b * brightness;
    }

    hoverAttr.needsUpdate = true;
    lineColorAttr.needsUpdate = true;
  }, [neighborResources, nodes, hoveredIdx]);

  // Animate burst-out, lines growing outward, pulse uniforms, and zero-overlap label placement
  useFrame((state) => {
    const elapsedTime = state.clock.elapsedTime;
    const pixelRatio = gl.getPixelRatio();

    centerMaterial.uniforms.uTime.value = elapsedTime;
    centerMaterial.uniforms.uPixelRatio.value = pixelRatio;
    centerMaterial.uniforms.uReducedMotion.value = reducedMotion ? 1 : 0;

    neighborMaterial.uniforms.uTime.value = elapsedTime;
    neighborMaterial.uniforms.uPixelRatio.value = pixelRatio;
    neighborMaterial.uniforms.uReducedMotion.value = reducedMotion ? 1 : 0;

    const now = performance.now();
    const elapsedBurstMs = now - burstStartRef.current;

    const ptPosAttr = neighborResources.pointGeo.getAttribute(
      'position',
    ) as THREE.BufferAttribute;
    const linePosAttr = neighborResources.lineGeo.getAttribute(
      'position',
    ) as THREE.BufferAttribute;
    const ptArr = ptPosAttr.array as Float32Array;
    const lineArr = linePosAttr.array as Float32Array;

    let posDirty = false;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      let t = 1;
      if (!reducedMotion) {
        const localMs = elapsedBurstMs - i * CONFIG.NEIGHBOR_STAGGER_MS;
        if (localMs <= 0) {
          t = 0;
        } else if (localMs < CONFIG.NEIGHBOR_BURST_MS) {
          t = easeOutCubic(localMs / CONFIG.NEIGHBOR_BURST_MS);
        }
      }

      const x = centerPos[0] + (node.position[0] - centerPos[0]) * t;
      const y = centerPos[1] + (node.position[1] - centerPos[1]) * t;
      const z = centerPos[2] + (node.position[2] - centerPos[2]) * t;

      if (
        ptArr[i * 3] !== x ||
        ptArr[i * 3 + 1] !== y ||
        ptArr[i * 3 + 2] !== z
      ) {
        ptArr[i * 3] = x;
        ptArr[i * 3 + 1] = y;
        ptArr[i * 3 + 2] = z;

        lineArr[i * 6 + 3] = x;
        lineArr[i * 6 + 4] = y;
        lineArr[i * 6 + 5] = z;
        posDirty = true;
      }
    }

    if (posDirty) {
      ptPosAttr.needsUpdate = true;
      linePosAttr.needsUpdate = true;
    }

    // Screen-space collision-free placement for the closest 8 labels
    _proj.set(centerPos[0], centerPos[1], centerPos[2]).project(camera);
    const centerSx = ((_proj.x + 1) * 0.5) * size.width;
    const centerSy = ((-_proj.y + 1) * 0.5) * size.height;

    const closestCount = Math.min(CONFIG.CLOSEST_LABELED_COUNT, nodes.length);
    const boxes = labelBoxesRef.current;
    boxes.length = 0;

    for (let i = 0; i < closestCount; i++) {
      const node = nodes[i];
      _proj
        .set(ptArr[i * 3], ptArr[i * 3 + 1], ptArr[i * 3 + 2])
        .project(camera);

      const sx = ((_proj.x + 1) * 0.5) * size.width;
      const sy = ((-_proj.y + 1) * 0.5) * size.height;
      const dx = sx - centerSx;
      const dy = sy - centerSy;
      const onRight = dx >= -4;
      const ox = onRight ? 12 : -148;
      const oy = dy >= 0 ? -10 : -22;

      boxes.push({
        idx: node.idx,
        sx,
        sy,
        ox,
        oy,
        width: 138,
        height: node.isSameFranchise ? 42 : 28,
      });
    }

    // 6-pass 2D AABB relaxation against center label and sibling labels
    const centerBoxLeft = centerSx - 84;
    const centerBoxRight = centerSx + 84;
    const centerBoxTop = centerSy - 16;
    const centerBoxBottom = centerSy + 44;

    for (let pass = 0; pass < 6; pass++) {
      for (let i = 0; i < boxes.length; i++) {
        const b = boxes[i];
        const l = b.sx + b.ox;
        const r = l + b.width;
        const t = b.sy + b.oy;
        const bt = t + b.height;

        // Avoid center star label
        if (l < centerBoxRight && r > centerBoxLeft && t < centerBoxBottom && bt > centerBoxTop) {
          const pushDown = b.sy >= centerSy;
          b.oy += pushDown ? 14 : -14;
        }

        // Avoid sibling labels
        for (let j = i + 1; j < boxes.length; j++) {
          const b2 = boxes[j];
          const l2 = b2.sx + b2.ox;
          const r2 = l2 + b2.width;
          const t2 = b2.sy + b2.oy;
          const bt2 = t2 + b2.height;

          const overlapX = Math.min(r, r2) - Math.max(l, l2);
          const overlapY = Math.min(bt, bt2) - Math.max(t, t2);
          if (overlapX > 0 && overlapY > 0) {
            const push = (overlapY + 4) * 0.5;
            if (b.sy + b.oy <= b2.sy + b2.oy) {
              b.oy -= push;
              b2.oy += push;
            } else {
              b.oy += push;
              b2.oy -= push;
            }
          }
        }
      }
    }

    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      const el = labelRefs.current.get(b.idx);
      if (!el) continue;

      const localMs = elapsedBurstMs - i * CONFIG.NEIGHBOR_STAGGER_MS;
      const labelAlpha = reducedMotion
        ? 1
        : Math.min(1, Math.max(0, (localMs - CONFIG.NEIGHBOR_BURST_MS * 0.45) / 220));

      el.style.transform = `translate3d(${Math.round(b.ox)}px, ${Math.round(b.oy)}px, 0)`;
      el.style.opacity = String(labelAlpha);
    }
  });

  const centerEntry = searchEngine?.entries[centerIdx] ?? null;

  // Determine which neighbors get labels: closest 8 always + any other neighbor when hovered
  const labeledNodes = useMemo(() => {
    const closest = nodes.slice(0, CONFIG.CLOSEST_LABELED_COUNT);
    if (hoveredIdx === null) return closest;
    const extraHovered = nodes
      .slice(CONFIG.CLOSEST_LABELED_COUNT)
      .find((n) => n.idx === hoveredIdx);
    return extraHovered ? [...closest, extraHovered] : closest;
  }, [nodes, hoveredIdx]);

  return (
    <group>
      {/* Center-to-neighbor connection rays in ONE LineSegments draw call */}
      <lineSegments
        geometry={neighborResources.lineGeo}
        material={lineMaterial}
        frustumCulled={false}
      />

      {/* Neighbor star points */}
      <points
        geometry={neighborResources.pointGeo}
        material={neighborMaterial}
        frustumCulled={false}
      />

      {/* Glowing white center point with halo */}
      <points
        geometry={centerGeometry}
        material={centerMaterial}
        frustumCulled={false}
      />

      {/* Focal Center Label */}
      {centerEntry && (
        <Html position={centerPos} center zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
          <div className="mt-10 flex flex-col items-center px-3.5 py-1.5 rounded-full bg-[#0d101c]/85 border border-[#8b7bff]/40 shadow-[0_0_24px_rgba(139,123,255,0.28)] whitespace-nowrap select-none">
            <span className="font-display text-xs font-bold tracking-tight text-[#eef0f6]">
              {centerEntry.title}
              {centerEntry.year > 0 && (
                <span className="ml-1.5 font-normal text-[#c7bfff]">({centerEntry.year})</span>
              )}
            </span>
          </div>
        </Html>
      )}

      {/* Always-shown closest 8 neighbor labels + hovered extra label */}
      {labeledNodes.map((node, i) => {
        const entry = searchEngine?.entries[node.idx];
        if (!entry) return null;
        const isHovered = hoveredIdx === node.idx;
        const isExtraHovered = i >= CONFIG.CLOSEST_LABELED_COUNT;

        return (
          <Html
            key={node.idx}
            position={node.position}
            zIndexRange={[12, 0]}
            style={{ pointerEvents: 'auto' }}
          >
            <button
              ref={(el) => {
                if (el) labelRefs.current.set(node.idx, el);
                else labelRefs.current.delete(node.idx);
              }}
              type="button"
              onMouseEnter={(e) =>
                setHoverState(node.idx, { x: e.clientX, y: e.clientY })
              }
              onMouseLeave={() => setHoverState(null, null)}
              onClick={(e) => {
                e.stopPropagation();
                selectTitleByIdx(node.idx, { syncHash: true, flyCamera: true });
              }}
              style={
                isExtraHovered
                  ? { transform: 'translate3d(12px, -14px, 0)', opacity: 1 }
                  : undefined
              }
              className={`group flex flex-col items-start text-left select-none cursor-pointer transition-colors ${
                isHovered ? 'text-[#eef0f6]' : 'text-[#eef0f6]/85 hover:text-[#eef0f6]'
              }`}
            >
              <span className="px-2 py-0.5 rounded-md bg-[#07080f]/75 border border-white/10 group-hover:border-[#8b7bff]/50 text-[11px] font-medium leading-tight whitespace-nowrap shadow-sm">
                {entry.title}
                <span className="ml-1.5 text-[10px] text-[#8b93a7] tabular-nums">
                  {node.matchPercent}%
                </span>
              </span>
              {node.isSameFranchise && (
                <span className="mt-0.5 px-1.5 py-px rounded bg-[#8b7bff]/20 border border-[#8b7bff]/40 text-[9px] font-semibold uppercase tracking-wider text-[#c7bfff] whitespace-nowrap">
                  same franchise
                </span>
              )}
            </button>
          </Html>
        );
      })}
    </group>
  );
}
