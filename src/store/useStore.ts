import { create } from 'zustand';
import { CONFIG } from '../config';
import {
  clearShardCaches,
  getDetailsForTitle,
  getNeighborsForTitle,
  loadGalaxyBinary,
  loadManifest,
  loadPosters,
  loadSearchEngine,
  type SearchEngine,
} from '../data/loader';
import type {
  GalaxyBinaryData,
  Manifest,
  MediaTypeFilter,
  NeighborItem,
  TitleDetails,
} from '../data/types';

export type LoadPhase = 'loading' | 'ready' | 'error';
export type ViewMode = 'galaxy' | 'list';

export type CameraCommand =
  | { type: 'fly'; targetIdx: number; nonce: number }
  | { type: 'zoomIn'; nonce: number }
  | { type: 'zoomOut'; nonce: number }
  | { type: 'reset'; nonce: number };

export interface HoverScreenPos {
  x: number;
  y: number;
}

interface CinescapeState {
  // Dataset & loading state
  manifest: Manifest | null;
  galaxyData: GalaxyBinaryData | null;
  searchEngine: SearchEngine | null;
  posters: string[] | null;
  isDemoData: boolean;
  loadPhase: LoadPhase;
  loadProgress: number;
  loadError: string | null;

  // Selection, neighbors, details & navigation
  selectedIdx: number | null;
  hoveredIdx: number | null;
  hoverScreenPos: HoverScreenPos | null;
  pendingRouteKey: string | null;
  hasInteracted: boolean;
  focusedNeighbors: NeighborItem | null;
  neighborsLoading: boolean;
  neighborsError: string | null;
  detailsOpen: boolean;
  titleDetails: TitleDetails | null;
  detailsLoading: boolean;
  detailsError: string | null;

  // Filters & view mode
  selectedGenreIds: number[];
  mediaTypeFilter: MediaTypeFilter;
  neighborCount: number;
  viewMode: ViewMode;
  webglAvailable: boolean;
  filtersOpen: boolean;

  // Motion preference
  reducedMotion: boolean;

  // Camera command bus
  cameraCommand: CameraCommand | null;

  // Actions
  initializeData: () => Promise<void>;
  selectTitleByIdx: (
    idx: number | null,
    options?: { syncHash?: boolean; flyCamera?: boolean; openPanel?: boolean },
  ) => void;
  setPendingRouteKey: (key: string | null) => void;
  setHoverState: (idx: number | null, screenPos: HoverScreenPos | null) => void;
  markInteracted: () => void;
  toggleGenreId: (genreId: number) => void;
  clearGenreFilters: () => void;
  resetAllFilters: () => void;
  setMediaTypeFilter: (filter: MediaTypeFilter) => void;
  setNeighborCount: (count: number) => void;
  setViewMode: (mode: ViewMode) => void;
  setWebglAvailable: (available: boolean) => void;
  setFiltersOpen: (open: boolean) => void;
  openDetailsPanel: () => void;
  closeDetailsPanel: () => void;
  retryDetailsFetch: () => void;
  setReducedMotion: (reduced: boolean) => void;
  triggerZoomIn: () => void;
  triggerZoomOut: () => void;
  triggerResetCamera: () => void;
}

let commandNonce = 0;
function nextNonce(): number {
  commandNonce += 1;
  return commandNonce;
}

let neighborRequestSeq = 0;
let detailsRequestSeq = 0;

function writeHashForIdx(idx: number | null, searchEngine: SearchEngine | null): void {
  const targetHash =
    idx !== null && searchEngine?.entries[idx]
      ? `#/t/${searchEngine.entries[idx].routeKey}`
      : '#/';
  if (window.location.hash !== targetHash) {
    window.location.hash = targetHash;
  }
}

async function fetchFocusedNeighbors(idx: number | null): Promise<void> {
  const reqId = ++neighborRequestSeq;
  if (idx === null) {
    useStore.setState({
      focusedNeighbors: null,
      neighborsLoading: false,
      neighborsError: null,
    });
    return;
  }

  const { manifest, isDemoData } = useStore.getState();
  if (!manifest) return;

  useStore.setState({
    focusedNeighbors: null,
    neighborsLoading: true,
    neighborsError: null,
  });

  try {
    const item = await getNeighborsForTitle(manifest, isDemoData, idx);
    if (reqId !== neighborRequestSeq) return;
    useStore.setState({
      focusedNeighbors: item,
      neighborsLoading: false,
      neighborsError: null,
    });
  } catch (err) {
    if (reqId !== neighborRequestSeq) return;
    const message =
      err instanceof Error ? err.message : 'Unable to load similar titles.';
    useStore.setState({
      focusedNeighbors: null,
      neighborsLoading: false,
      neighborsError: message,
    });
  }
}

async function fetchTitleDetails(idx: number | null): Promise<void> {
  const reqId = ++detailsRequestSeq;
  if (idx === null) {
    useStore.setState({
      titleDetails: null,
      detailsLoading: false,
      detailsError: null,
    });
    return;
  }

  const { manifest, isDemoData } = useStore.getState();
  if (!manifest) return;

  useStore.setState({
    titleDetails: null,
    detailsLoading: true,
    detailsError: null,
  });

  try {
    const details = await getDetailsForTitle(manifest, isDemoData, idx);
    if (reqId !== detailsRequestSeq) return;
    useStore.setState({
      titleDetails: details,
      detailsLoading: false,
      detailsError: null,
    });
  } catch (err) {
    if (reqId !== detailsRequestSeq) return;
    const message =
      err instanceof Error ? err.message : 'Unable to load title details.';
    useStore.setState({
      titleDetails: null,
      detailsLoading: false,
      detailsError: message,
    });
  }
}

export const useStore = create<CinescapeState>((set, get) => ({
  manifest: null,
  galaxyData: null,
  searchEngine: null,
  posters: null,
  isDemoData: false,
  loadPhase: 'loading',
  loadProgress: 0,
  loadError: null,

  selectedIdx: null,
  hoveredIdx: null,
  hoverScreenPos: null,
  pendingRouteKey: null,
  hasInteracted: false,
  focusedNeighbors: null,
  neighborsLoading: false,
  neighborsError: null,
  detailsOpen: false,
  titleDetails: null,
  detailsLoading: false,
  detailsError: null,

  selectedGenreIds: [],
  mediaTypeFilter: 'all',
  neighborCount: CONFIG.NEIGHBOR_COUNT_DEFAULT,
  viewMode: 'galaxy',
  webglAvailable: true,
  filtersOpen: false,

  reducedMotion: false,
  cameraCommand: null,

  initializeData: async () => {
    const startTime = performance.now();
    clearShardCaches();
    set({
      loadPhase: 'loading',
      loadProgress: 0,
      loadError: null,
      searchEngine: null,
      posters: null,
      focusedNeighbors: null,
      titleDetails: null,
    });

    try {
      const { manifest, isDemoData } = await loadManifest();
      set({ manifest, isDemoData });

      const galaxyData = await loadGalaxyBinary(manifest, isDemoData, (progress) => {
        set({ loadProgress: progress });
      });

      const elapsed = performance.now() - startTime;
      const remaining = Math.max(0, CONFIG.MIN_LOADING_MS - elapsed);
      if (remaining > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, remaining));
      }

      set({
        galaxyData,
        loadProgress: 1,
        loadPhase: 'ready',
      });

      void loadSearchEngine(manifest, isDemoData)
        .then((engine) => {
          set({ searchEngine: engine });
          const pendingKey = get().pendingRouteKey;
          if (pendingKey) {
            const matchedIdx = engine.keyToIdx.get(pendingKey);
            if (matchedIdx !== undefined) {
              set({
                selectedIdx: matchedIdx,
                detailsOpen: true,
                pendingRouteKey: null,
                hasInteracted: true,
                cameraCommand: { type: 'fly', targetIdx: matchedIdx, nonce: nextNonce() },
              });
              void fetchFocusedNeighbors(matchedIdx);
              void fetchTitleDetails(matchedIdx);
            } else {
              set({ pendingRouteKey: null });
            }
          }
        })
        .catch(() => {
          // Search index failure leaves galaxy explorable
        });

      void loadPosters(manifest, isDemoData)
        .then((posters) => {
          set({ posters });
        })
        .catch(() => {
          // Posters fall back to neutral placeholders cleanly
        });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not load the Cinescape galaxy dataset.';
      set({
        loadPhase: 'error',
        loadError: message,
      });
    }
  },

  selectTitleByIdx: (idx, options) => {
    const { syncHash = true, flyCamera = true, openPanel = idx !== null } = options ?? {};
    const { searchEngine } = get();

    set({
      selectedIdx: idx,
      detailsOpen: openPanel && idx !== null,
      hoveredIdx: null,
      hoverScreenPos: null,
      hasInteracted: idx !== null ? true : get().hasInteracted,
      cameraCommand:
        flyCamera && idx !== null
          ? { type: 'fly', targetIdx: idx, nonce: nextNonce() }
          : flyCamera && idx === null
            ? { type: 'reset', nonce: nextNonce() }
            : get().cameraCommand,
    });

    void fetchFocusedNeighbors(idx);
    if (idx !== null && openPanel) {
      void fetchTitleDetails(idx);
    } else if (idx === null) {
      void fetchTitleDetails(null);
    }

    if (syncHash) {
      writeHashForIdx(idx, searchEngine);
    }
  },

  setPendingRouteKey: (key) => {
    const { searchEngine } = get();
    if (!key) {
      set({
        pendingRouteKey: null,
        selectedIdx: null,
        detailsOpen: false,
        hoveredIdx: null,
        hoverScreenPos: null,
      });
      void fetchFocusedNeighbors(null);
      void fetchTitleDetails(null);
      return;
    }

    if (searchEngine) {
      const matchedIdx = searchEngine.keyToIdx.get(key);
      if (matchedIdx !== undefined) {
        set({
          selectedIdx: matchedIdx,
          detailsOpen: true,
          hoveredIdx: null,
          hoverScreenPos: null,
          pendingRouteKey: null,
          hasInteracted: true,
          cameraCommand: { type: 'fly', targetIdx: matchedIdx, nonce: nextNonce() },
        });
        void fetchFocusedNeighbors(matchedIdx);
        void fetchTitleDetails(matchedIdx);
        return;
      }
    }

    set({ pendingRouteKey: key });
  },

  setHoverState: (hoveredIdx, hoverScreenPos) => set({ hoveredIdx, hoverScreenPos }),

  markInteracted: () => {
    if (!get().hasInteracted) {
      set({ hasInteracted: true });
    }
  },

  toggleGenreId: (genreId) => {
    const current = get().selectedGenreIds;
    const exists = current.includes(genreId);
    set({
      selectedGenreIds: exists
        ? current.filter((id) => id !== genreId)
        : [...current, genreId],
    });
  },

  clearGenreFilters: () => set({ selectedGenreIds: [] }),

  resetAllFilters: () => set({ selectedGenreIds: [], mediaTypeFilter: 'all' }),

  setMediaTypeFilter: (mediaTypeFilter) => set({ mediaTypeFilter }),

  setNeighborCount: (count) =>
    set({
      neighborCount: Math.max(
        CONFIG.NEIGHBOR_COUNT_MIN,
        Math.min(CONFIG.NEIGHBOR_COUNT_MAX, count),
      ),
    }),

  setViewMode: (viewMode) => {
    if (!get().webglAvailable && viewMode === 'galaxy') return;
    set({ viewMode });
  },

  setWebglAvailable: (webglAvailable) =>
    set((state) => ({
      webglAvailable,
      viewMode: webglAvailable ? state.viewMode : 'list',
    })),

  setFiltersOpen: (filtersOpen) => set({ filtersOpen }),

  openDetailsPanel: () => {
    const { selectedIdx, titleDetails } = get();
    if (selectedIdx === null) return;
    set({ detailsOpen: true });
    if (!titleDetails || titleDetails.i !== selectedIdx) {
      void fetchTitleDetails(selectedIdx);
    }
  },

  closeDetailsPanel: () => set({ detailsOpen: false }),

  retryDetailsFetch: () => {
    const { selectedIdx } = get();
    if (selectedIdx !== null) {
      void fetchTitleDetails(selectedIdx);
    }
  },

  setReducedMotion: (reducedMotion) => {
    try {
      window.localStorage.setItem(CONFIG.REDUCED_MOTION_STORAGE_KEY, String(reducedMotion));
    } catch {
      // Ignore storage errors
    }
    set({ reducedMotion });
  },

  triggerZoomIn: () =>
    set({
      hasInteracted: true,
      cameraCommand: { type: 'zoomIn', nonce: nextNonce() },
    }),

  triggerZoomOut: () =>
    set({
      hasInteracted: true,
      cameraCommand: { type: 'zoomOut', nonce: nextNonce() },
    }),

  triggerResetCamera: () => {
    set({
      hasInteracted: true,
      selectedIdx: null,
      detailsOpen: false,
      hoveredIdx: null,
      hoverScreenPos: null,
      cameraCommand: { type: 'reset', nonce: nextNonce() },
    });
    void fetchFocusedNeighbors(null);
    void fetchTitleDetails(null);
    writeHashForIdx(null, get().searchEngine);
  },
}));
