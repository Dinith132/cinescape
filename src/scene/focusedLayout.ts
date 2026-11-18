import { CONFIG } from '../config';
import type {
  GalaxyBinaryData,
  Manifest,
  MediaTypeFilter,
  NeighborItem,
} from '../data/types';

export interface FocusedNode {
  idx: number;
  rank: number;
  score: number;
  matchPercent: number;
  isSameFranchise: boolean;
  genreId: number;
  genreColor: string;
  typeCode: 0 | 1;
  targetDistance: number;
  position: [number, number, number];
}

export interface FocusedLayout {
  centerIdx: number;
  centerPos: [number, number, number];
  nodes: FocusedNode[];
}

function seededUnitDirection(seedA: number, seedB: number): [number, number, number] {
  let h = (seedA * 374761393 + seedB * 668265263) | 0;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  const u = ((h >>> 0) % 10000) / 10000;
  h = ((h ^ (h >> 15)) * 2246822519) | 0;
  const v = ((h >>> 0) % 10000) / 10000;

  const theta = u * Math.PI * 2;
  const z = v * 2 - 1;
  const r = Math.sqrt(Math.max(0, 1 - z * z));
  return [r * Math.cos(theta), z, r * Math.sin(theta)];
}

export function mapScoreToDistance(score: number): number {
  const span = CONFIG.NEIGHBOR_SCORE_HIGH - CONFIG.NEIGHBOR_SCORE_LOW;
  const t = span > 0 ? Math.min(1, Math.max(0, (score - CONFIG.NEIGHBOR_SCORE_LOW) / span)) : 0.5;
  return CONFIG.NEIGHBOR_MAX_DIST - t * (CONFIG.NEIGHBOR_MAX_DIST - CONFIG.NEIGHBOR_MIN_DIST);
}

export function computeFocusedLayout(
  centerIdx: number,
  neighborItem: NeighborItem,
  galaxyData: GalaxyBinaryData,
  manifest: Manifest,
  mediaTypeFilter: MediaTypeFilter,
  neighborCount: number,
  selectedGenreIds: number[] = [],
): FocusedLayout {
  const cx = galaxyData.positions[centerIdx * 3] * CONFIG.SCENE_SCALE;
  const cy = galaxyData.positions[centerIdx * 3 + 1] * CONFIG.SCENE_SCALE;
  const cz = galaxyData.positions[centerIdx * 3 + 2] * CONFIG.SCENE_SCALE;
  const centerPos: [number, number, number] = [cx, cy, cz];

  const franchiseRanks = new Set<number>(neighborItem.f ?? []);
  const allowedGenres = selectedGenreIds.length > 0 ? new Set(selectedGenreIds) : null;
  const genreColorMap = new Map<number, string>();
  for (const group of manifest.genre_groups) {
    genreColorMap.set(group.id, group.color);
  }

  const nodes: FocusedNode[] = [];
  const totalAvailable = neighborItem.n.length;

  for (let i = 0; i < totalAvailable; i++) {
    const nIdx = neighborItem.n[i];
    if (nIdx < 0 || nIdx >= galaxyData.count) continue;

    const genreId = galaxyData.attributes[nIdx * 4];
    if (allowedGenres !== null && !allowedGenres.has(genreId)) continue;

    const typeCode = (galaxyData.attributes[nIdx * 4 + 1] === 1 ? 1 : 0) as 0 | 1;
    if (mediaTypeFilter === 'movie' && typeCode !== 0) continue;
    if (mediaTypeFilter === 'tv' && typeCode !== 1) continue;

    const rawScore = neighborItem.s[i] ?? 0;
    const score = rawScore / manifest.score_scale;
    const matchPercent = Math.max(
      1,
      Math.min(99, Math.round((rawScore / manifest.score_scale) * 100)),
    );
    const targetDistance = mapScoreToDistance(score);

    const nx = galaxyData.positions[nIdx * 3] * CONFIG.SCENE_SCALE;
    const ny = galaxyData.positions[nIdx * 3 + 1] * CONFIG.SCENE_SCALE;
    const nz = galaxyData.positions[nIdx * 3 + 2] * CONFIG.SCENE_SCALE;

    let dx = nx - cx;
    let dy = ny - cy;
    let dz = nz - cz;
    const len = Math.hypot(dx, dy, dz);

    if (len < 1e-4) {
      const fallback = seededUnitDirection(centerIdx + 1, nIdx + 7);
      dx = fallback[0];
      dy = fallback[1];
      dz = fallback[2];
    } else {
      dx /= len;
      dy /= len;
      dz /= len;
    }

    const genreColor = genreColorMap.get(genreId) ?? CONFIG.ACCENT_HEX;

    nodes.push({
      idx: nIdx,
      rank: nodes.length,
      score,
      matchPercent,
      isSameFranchise: franchiseRanks.has(i),
      genreId,
      genreColor,
      typeCode,
      targetDistance,
      position: [
        cx + dx * targetDistance,
        cy + dy * targetDistance,
        cz + dz * targetDistance,
      ],
    });

    if (nodes.length >= neighborCount) break;
  }

  // Pairwise relaxation pass with radial shell preservation so neighbors never overlap
  // while strictly preserving closer = more similar distance from P.
  const minSep = CONFIG.NEIGHBOR_MIN_SEPARATION;
  const minSepSq = minSep * minSep;

  for (let iter = 0; iter < CONFIG.NEIGHBOR_RELAX_ITERATIONS; iter++) {
    for (let a = 0; a < nodes.length; a++) {
      for (let b = a + 1; b < nodes.length; b++) {
        const pa = nodes[a].position;
        const pb = nodes[b].position;

        let rx = pa[0] - pb[0];
        let ry = pa[1] - pb[1];
        let rz = pa[2] - pb[2];
        const distSq = rx * rx + ry * ry + rz * rz;

        if (distSq < minSepSq) {
          if (distSq < 1e-6) {
            const dir = seededUnitDirection(a + 13, b + 29);
            rx = dir[0];
            ry = dir[1];
            rz = dir[2];
          } else {
            const dist = Math.sqrt(distSq);
            rx /= dist;
            ry /= dist;
            rz /= dist;
          }

          const overlap = minSep - Math.sqrt(Math.max(distSq, 1e-6));
          const push = overlap * 0.52;
          pa[0] += rx * push;
          pa[1] += ry * push;
          pa[2] += rz * push;
          pb[0] -= rx * push;
          pb[1] -= ry * push;
          pb[2] -= rz * push;
        }
      }
    }

    // Re-project each neighbor back onto its score-defined radial shell around centerPos
    for (let i = 0; i < nodes.length; i++) {
      const p = nodes[i].position;
      const vx = p[0] - cx;
      const vy = p[1] - cy;
      const vz = p[2] - cz;
      const vLen = Math.hypot(vx, vy, vz);
      const r = nodes[i].targetDistance;
      if (vLen < 1e-4) {
        const fallback = seededUnitDirection(centerIdx + 3, nodes[i].idx + 17);
        p[0] = cx + fallback[0] * r;
        p[1] = cy + fallback[1] * r;
        p[2] = cz + fallback[2] * r;
      } else {
        p[0] = cx + (vx / vLen) * r;
        p[1] = cy + (vy / vLen) * r;
        p[2] = cz + (vz / vLen) * r;
      }
    }
  }

  return { centerIdx, centerPos, nodes };
}
