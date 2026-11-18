import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG } from '../config';
import { useStore } from '../store/useStore';
import { galaxyFragmentShader, galaxyVertexShader } from './shaders';

export function GalaxyPoints() {
  const manifest = useStore((s) => s.manifest);
  const galaxyData = useStore((s) => s.galaxyData);
  const selectedIdx = useStore((s) => s.selectedIdx);
  const hoveredIdx = useStore((s) => s.hoveredIdx);
  const selectedGenreIds = useStore((s) => s.selectedGenreIds);
  const mediaTypeFilter = useStore((s) => s.mediaTypeFilter);
  const reducedMotion = useStore((s) => s.reducedMotion);

  const { gl } = useThree();

  const geometry = useMemo(() => {
    if (!galaxyData || !manifest) return null;

    const count = galaxyData.count;
    const scaledPositions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const genreVisible = new Float32Array(count);
    const types = new Float32Array(count);
    const seeds = new Float32Array(count);
    const indices = new Float32Array(count);

    const palette = new Map<number, THREE.Color>();
    for (const group of manifest.genre_groups) {
      palette.set(group.id, new THREE.Color(group.color));
    }
    const fallbackColor = new THREE.Color('#8b7bff');

    for (let i = 0; i < count; i++) {
      scaledPositions[i * 3] = galaxyData.positions[i * 3] * CONFIG.SCENE_SCALE;
      scaledPositions[i * 3 + 1] = galaxyData.positions[i * 3 + 1] * CONFIG.SCENE_SCALE;
      scaledPositions[i * 3 + 2] = galaxyData.positions[i * 3 + 2] * CONFIG.SCENE_SCALE;

      const genreId = galaxyData.attributes[i * 4];
      const typeCode = galaxyData.attributes[i * 4 + 1];
      const sizeByte = galaxyData.attributes[i * 4 + 2];

      const color = palette.get(genreId) ?? fallbackColor;
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = sizeByte / 255;
      genreVisible[i] = 1;
      types[i] = typeCode;
      seeds[i] = ((i * 2654435761) % 6283) / 1000;
      indices[i] = i;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(scaledPositions, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aGenreVisible', new THREE.BufferAttribute(genreVisible, 1));
    geo.setAttribute('aType', new THREE.BufferAttribute(types, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    geo.setAttribute('aIndex', new THREE.BufferAttribute(indices, 1));
    geo.computeBoundingSphere();

    return geo;
  }, [galaxyData, manifest]);

  useEffect(() => {
    return () => {
      geometry?.dispose();
    };
  }, [geometry]);

  // Update per-vertex genre visibility whenever multi-select genre filters change
  useEffect(() => {
    if (!geometry || !galaxyData) return;
    const attr = geometry.getAttribute('aGenreVisible') as THREE.BufferAttribute | undefined;
    if (!attr) return;
    const arr = attr.array as Float32Array;
    const allActive = selectedGenreIds.length === 0;
    const allowedSet = allActive ? null : new Set(selectedGenreIds);

    for (let i = 0; i < galaxyData.count; i++) {
      if (allowedSet === null) {
        arr[i] = 1;
      } else {
        arr[i] = allowedSet.has(galaxyData.attributes[i * 4]) ? 1 : 0;
      }
    }
    attr.needsUpdate = true;
  }, [geometry, galaxyData, selectedGenreIds]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: galaxyVertexShader,
      fragmentShader: galaxyFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uPixelRatio: { value: gl.getPixelRatio() },
        uBaseSize: { value: CONFIG.POINT_BASE_SIZE },
        uSizeRange: { value: CONFIG.POINT_SIZE_RANGE },
        uHoveredScale: { value: CONFIG.HOVERED_POINT_SCALE },
        uDimmedOpacity: { value: CONFIG.DIMMED_GALAXY_OPACITY },
        uTime: { value: 0 },
        uSelectedIdx: { value: -1 },
        uHoveredIdx: { value: -1 },
        uActiveType: { value: -1 },
        uReducedMotion: { value: 0 },
      },
    });
  }, [gl]);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  useEffect(() => {
    material.uniforms.uSelectedIdx.value = selectedIdx ?? -1;
    material.uniforms.uHoveredIdx.value = hoveredIdx ?? -1;
    material.uniforms.uActiveType.value =
      mediaTypeFilter === 'movie' ? 0 : mediaTypeFilter === 'tv' ? 1 : -1;
    material.uniforms.uReducedMotion.value = reducedMotion ? 1 : 0;
  }, [material, selectedIdx, hoveredIdx, mediaTypeFilter, reducedMotion]);

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uPixelRatio.value = gl.getPixelRatio();
  });

  if (!geometry || !galaxyData) return null;

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
