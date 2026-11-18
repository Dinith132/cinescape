import { useMemo } from 'react';
import { CONFIG } from '../config';
import { computeFocusedLayout, type FocusedLayout } from '../scene/focusedLayout';
import { useStore } from '../store/useStore';

export function useFocusedLayout(): FocusedLayout | null {
  const selectedIdx = useStore((s) => s.selectedIdx);
  const focusedNeighbors = useStore((s) => s.focusedNeighbors);
  const galaxyData = useStore((s) => s.galaxyData);
  const manifest = useStore((s) => s.manifest);
  const mediaTypeFilter = useStore((s) => s.mediaTypeFilter);
  const neighborCount = useStore((s) => s.neighborCount);
  const selectedGenreIds = useStore((s) => s.selectedGenreIds);

  return useMemo(() => {
    if (selectedIdx === null || !galaxyData || !manifest) return null;

    const cx = galaxyData.positions[selectedIdx * 3] * CONFIG.SCENE_SCALE;
    const cy = galaxyData.positions[selectedIdx * 3 + 1] * CONFIG.SCENE_SCALE;
    const cz = galaxyData.positions[selectedIdx * 3 + 2] * CONFIG.SCENE_SCALE;

    if (!focusedNeighbors) {
      return {
        centerIdx: selectedIdx,
        centerPos: [cx, cy, cz],
        nodes: [],
      };
    }

    return computeFocusedLayout(
      selectedIdx,
      focusedNeighbors,
      galaxyData,
      manifest,
      mediaTypeFilter,
      neighborCount,
      selectedGenreIds,
    );
  }, [
    selectedIdx,
    focusedNeighbors,
    galaxyData,
    manifest,
    mediaTypeFilter,
    neighborCount,
    selectedGenreIds,
  ]);
}
