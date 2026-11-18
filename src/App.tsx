import { useEffect, useRef } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import {
  ArrowLeft,
  LayoutGrid,
  Orbit,
  PanelRightOpen,
  Pause,
  Play,
  SlidersHorizontal,
} from 'lucide-react';
import { useHashRoute } from './hooks/useHashRoute';
import { useReducedMotion } from './hooks/useReducedMotion';
import { Scene } from './scene/Scene';
import { useStore } from './store/useStore';
import { Controls } from './ui/Controls';
import { DetailsPanel } from './ui/DetailsPanel';
import { FocusedControls } from './ui/FocusedControls';
import { Footer } from './ui/Footer';
import { HoverCard } from './ui/HoverCard';
import { Legend } from './ui/Legend';
import { ListView } from './ui/ListView';
import { LoadingScreen } from './ui/LoadingScreen';
import { SearchBar } from './ui/SearchBar';

export default function App() {
  useHashRoute();
  const { reducedMotion, toggleReducedMotion } = useReducedMotion();

  const initializeData = useStore((s) => s.initializeData);
  const loadPhase = useStore((s) => s.loadPhase);
  const isDemoData = useStore((s) => s.isDemoData);
  const selectedIdx = useStore((s) => s.selectedIdx);
  const viewMode = useStore((s) => s.viewMode);
  const webglAvailable = useStore((s) => s.webglAvailable);
  const filtersOpen = useStore((s) => s.filtersOpen);
  const mediaTypeFilter = useStore((s) => s.mediaTypeFilter);
  const selectedGenreIds = useStore((s) => s.selectedGenreIds);
  const detailsOpen = useStore((s) => s.detailsOpen);
  const manifest = useStore((s) => s.manifest);

  const setViewMode = useStore((s) => s.setViewMode);
  const setFiltersOpen = useStore((s) => s.setFiltersOpen);
  const setMediaTypeFilter = useStore((s) => s.setMediaTypeFilter);
  const toggleGenreId = useStore((s) => s.toggleGenreId);
  const resetAllFilters = useStore((s) => s.resetAllFilters);
  const openDetailsPanel = useStore((s) => s.openDetailsPanel);
  const triggerResetCamera = useStore((s) => s.triggerResetCamera);

  const filterPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void initializeData();
  }, [initializeData]);

  useEffect(() => {
    if (!filtersOpen) return;
    const handleOutside = (event: MouseEvent) => {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(event.target as Node)) {
        setFiltersOpen(false);
      }
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setFiltersOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [filtersOpen, setFiltersOpen]);

  const hasActiveFilter = mediaTypeFilter !== 'all' || selectedGenreIds.length > 0;
  const activeFilterCount =
    (mediaTypeFilter !== 'all' ? 1 : 0) + selectedGenreIds.length;
  const isDetailsShowing = detailsOpen && selectedIdx !== null;

  return (
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'user'}>
      <div className="relative w-screen h-screen overflow-hidden flex flex-col bg-[#07080f] text-[#eef0f6]">
        {/* Main Interactive Viewport */}
        <main className="relative flex-1 min-h-0 overflow-hidden">
          {loadPhase === 'ready' && viewMode === 'galaxy' && webglAvailable && <Scene />}
          {loadPhase === 'ready' && (viewMode === 'list' || !webglAvailable) && <ListView />}

          {/* Top HUD Bar */}
          <header className="pointer-events-none fixed top-0 left-0 right-0 z-30 px-4 md:px-6 pt-3.5">
            <div className="w-full flex flex-wrap md:flex-nowrap items-start justify-between gap-3">
              {/* Top-Left: Brand Logo + Demo Data Badge + Focused Actions */}
              <div className="pointer-events-auto flex flex-col items-start gap-2 flex-shrink-0 order-1">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      triggerResetCamera();
                      if (webglAvailable && viewMode !== 'galaxy') {
                        setViewMode('galaxy');
                      }
                    }}
                    className="glass-panel px-3 py-2 flex items-center gap-2.5 hover:border-white/20 transition-colors cursor-pointer"
                    title="Reset to Cinescape home"
                  >
                    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle cx="12" cy="12" r="3" fill="#eef0f6" />
                      <ellipse
                        cx="12"
                        cy="12"
                        rx="9.5"
                        ry="4.2"
                        transform="rotate(-24 12 12)"
                        stroke="#8b7bff"
                        strokeWidth="1.6"
                      />
                      <circle cx="18.5" cy="9" r="1.4" fill="#4fdbcc" />
                    </svg>
                    <span className="font-display text-base font-bold tracking-tight text-[#eef0f6] whitespace-nowrap">
                      Cinescape
                    </span>
                  </button>

                  {isDemoData && loadPhase === 'ready' && (
                    <span
                      title="Showing synthetic demo dataset because public/data/manifest.json was not found"
                      className="px-2.5 py-1 rounded-full bg-[#8b7bff]/15 border border-[#8b7bff]/35 text-[11px] font-medium text-[#c7bfff] whitespace-nowrap"
                    >
                      demo data
                    </span>
                  )}
                </div>

                {selectedIdx !== null && (
                  <div className="flex flex-wrap items-center gap-2">
                    {viewMode === 'galaxy' && webglAvailable && (
                      <button
                        type="button"
                        onClick={triggerResetCamera}
                        className="glass-panel px-3 py-1.5 inline-flex items-center gap-2 text-xs font-medium text-[#eef0f6] hover:border-[#8b7bff]/50 hover:bg-[#0d101c]/80 transition-colors cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5 text-[#8b7bff]" aria-hidden="true" />
                        <span>Explore Full Galaxy</span>
                      </button>
                    )}

                    {!detailsOpen && (
                      <button
                        type="button"
                        onClick={openDetailsPanel}
                        aria-label="Open title details panel"
                        className="glass-panel px-3 py-1.5 inline-flex items-center gap-2 text-xs font-medium text-[#eef0f6] hover:border-[#8b7bff]/50 hover:bg-[#0d101c]/80 transition-colors cursor-pointer"
                      >
                        <PanelRightOpen className="w-3.5 h-3.5 text-[#8b7bff]" aria-hidden="true" />
                        <span>Details</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Top-Center: Search Bar */}
              <div className="pointer-events-auto w-full md:flex-1 flex justify-center order-3 md:order-2">
                <SearchBar />
              </div>

              {/* Top-Right: Filters, List view, Reduce motion icon buttons */}
              <div
                ref={filterPopoverRef}
                className="pointer-events-auto relative flex items-center gap-1 glass-panel p-1 flex-shrink-0 order-2 md:order-3"
              >
                <button
                  type="button"
                  onClick={() => setFiltersOpen(!filtersOpen)}
                  aria-expanded={filtersOpen}
                  aria-label={
                    activeFilterCount > 0
                      ? `Filters (${activeFilterCount} active)`
                      : 'Filters'
                  }
                  title="Filters"
                  className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                    filtersOpen || hasActiveFilter
                      ? 'bg-[#8b7bff]/20 text-[#eef0f6]'
                      : 'text-[#8b93a7] hover:text-[#eef0f6] hover:bg-white/10'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
                  {hasActiveFilter && (
                    <span
                      className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#8b7bff]"
                      aria-hidden="true"
                    />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode(viewMode === 'galaxy' ? 'list' : 'galaxy')}
                  disabled={!webglAvailable}
                  aria-pressed={viewMode === 'list'}
                  aria-label={viewMode === 'list' ? 'Switch to 3D view' : 'Switch to list view'}
                  title={viewMode === 'list' ? 'Back to 3D view' : 'List view'}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    viewMode === 'list'
                      ? 'bg-[#8b7bff]/20 text-[#eef0f6]'
                      : 'text-[#8b93a7] hover:text-[#eef0f6] hover:bg-white/10'
                  }`}
                >
                  {viewMode === 'list' ? (
                    <Orbit className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <LayoutGrid className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={toggleReducedMotion}
                  aria-pressed={reducedMotion}
                  aria-label={reducedMotion ? 'Disable reduce motion' : 'Enable reduce motion'}
                  title={reducedMotion ? 'Reduce motion: On' : 'Reduce motion: Off'}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                    reducedMotion
                      ? 'bg-[#8b7bff]/20 text-[#eef0f6]'
                      : 'text-[#8b93a7] hover:text-[#eef0f6] hover:bg-white/10'
                  }`}
                >
                  {reducedMotion ? (
                    <Play className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Pause className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>

                {/* Filters & Genre Legend Popover */}
                <AnimatePresence>
                  {filtersOpen && (
                    <motion.div
                      role="region"
                      aria-label="Filters"
                      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                      transition={{ duration: 0.14 }}
                      className="absolute right-0 top-[54px] w-72 sm:w-80 glass-panel-elevated p-4 z-40 space-y-3.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-display text-xs font-semibold uppercase tracking-wider text-[#8b93a7]">
                          Filters
                        </span>
                        {hasActiveFilter && (
                          <button
                            type="button"
                            onClick={resetAllFilters}
                            className="text-[11px] font-medium text-[#8b7bff] hover:underline cursor-pointer"
                          >
                            Clear all
                          </button>
                        )}
                      </div>

                      {/* Media Type Filter */}
                      <div>
                        <span className="block text-[11px] font-medium text-[#8b93a7] mb-1.5">
                          Type
                        </span>
                        <div
                          role="group"
                          aria-label="Filter by media type"
                          className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10"
                        >
                          {(['all', 'movie', 'tv'] as const).map((typeOpt) => {
                            const active = mediaTypeFilter === typeOpt;
                            const label =
                              typeOpt === 'all' ? 'Both' : typeOpt === 'movie' ? 'Movie' : 'TV';
                            return (
                              <button
                                key={typeOpt}
                                type="button"
                                onClick={() => setMediaTypeFilter(typeOpt)}
                                aria-pressed={active}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                                  active
                                    ? 'bg-[#8b7bff] text-white'
                                    : 'text-[#8b93a7] hover:text-[#eef0f6]'
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Multi-select Genre Groups (synced with Legend) */}
                      {manifest && (
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-medium text-[#8b93a7]">
                              Genre groups
                            </span>
                            {selectedGenreIds.length > 0 && (
                              <span className="text-[11px] text-[#c7bfff] tabular-nums">
                                {selectedGenreIds.length} selected
                              </span>
                            )}
                          </div>
                          <div
                            role="group"
                            aria-label="Filter by genre group"
                            className="flex flex-wrap gap-1.5"
                          >
                            {manifest.genre_groups.map((group) => {
                              const active = selectedGenreIds.includes(group.id);
                              const dimmed = selectedGenreIds.length > 0 && !active;

                              return (
                                <button
                                  key={group.id}
                                  type="button"
                                  onClick={() => toggleGenreId(group.id)}
                                  aria-pressed={active}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                                    active
                                      ? 'text-[#eef0f6]'
                                      : dimmed
                                        ? 'opacity-50 hover:opacity-90 text-[#8b93a7]'
                                        : 'text-[#eef0f6]/90 hover:bg-white/10'
                                  }`}
                                  style={{
                                    backgroundColor: active
                                      ? `${group.color}2e`
                                      : 'rgba(255, 255, 255, 0.05)',
                                    border: active
                                      ? `1px solid ${group.color}`
                                      : '1px solid rgba(255, 255, 255, 0.1)',
                                  }}
                                >
                                  <span
                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: group.color }}
                                    aria-hidden="true"
                                  />
                                  <span>{group.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Motion setting inside filters for discoverability */}
                      <div className="pt-2.5 border-t border-white/10 flex items-center justify-between">
                        <span className="text-xs text-[#8b93a7]">Reduce motion</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={reducedMotion}
                          onClick={toggleReducedMotion}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                            reducedMotion
                              ? 'bg-[#8b7bff] text-white'
                              : 'bg-white/8 text-[#8b93a7] hover:text-[#eef0f6]'
                          }`}
                        >
                          {reducedMotion ? 'On' : 'Off'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </header>

          {/* Poster Hover Card */}
          {loadPhase === 'ready' && viewMode === 'galaxy' && webglAvailable && <HoverCard />}

          {/* Title Details Drawer (Desktop) / Draggable Bottom Sheet (Mobile) */}
          {loadPhase === 'ready' && <DetailsPanel />}

          {/* Bottom Galaxy Overlay: Legend (Bottom-Left), FocusedControls (Bottom-Center), Controls (Bottom-Right) */}
          {loadPhase === 'ready' && viewMode === 'galaxy' && webglAvailable && (
            <div
              className={`pointer-events-none fixed left-0 right-0 z-20 px-4 md:px-6 flex flex-wrap lg:flex-nowrap items-end justify-between gap-3 transition-all duration-200 ${
                isDetailsShowing ? 'bottom-[108px] md:bottom-12 md:pr-[456px]' : 'bottom-12'
              }`}
            >
              <div className={selectedIdx !== null ? 'hidden md:block order-1' : 'order-1'}>
                <Legend />
              </div>

              <div className="w-full lg:w-auto flex justify-center order-3 lg:order-2">
                <FocusedControls />
              </div>

              <div className="order-2 lg:order-3 ml-auto lg:ml-0">
                <Controls />
              </div>
            </div>
          )}
        </main>

        <Footer />
        <LoadingScreen />
      </div>
    </MotionConfig>
  );
}
