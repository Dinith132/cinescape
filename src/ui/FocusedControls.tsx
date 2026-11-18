import { PanelRightOpen } from 'lucide-react';
import { CONFIG } from '../config';
import type { MediaTypeFilter } from '../data/types';
import { useFocusedLayout } from '../hooks/useFocusedLayout';
import { useStore } from '../store/useStore';

const TYPE_OPTIONS: ReadonlyArray<{ value: MediaTypeFilter; label: string }> = [
  { value: 'all', label: 'Both' },
  { value: 'movie', label: 'Movie' },
  { value: 'tv', label: 'TV' },
];

export function FocusedControls() {
  const selectedIdx = useStore((s) => s.selectedIdx);
  const neighborCount = useStore((s) => s.neighborCount);
  const mediaTypeFilter = useStore((s) => s.mediaTypeFilter);
  const neighborsLoading = useStore((s) => s.neighborsLoading);
  const neighborsError = useStore((s) => s.neighborsError);
  const detailsOpen = useStore((s) => s.detailsOpen);
  const setNeighborCount = useStore((s) => s.setNeighborCount);
  const setMediaTypeFilter = useStore((s) => s.setMediaTypeFilter);
  const resetAllFilters = useStore((s) => s.resetAllFilters);
  const openDetailsPanel = useStore((s) => s.openDetailsPanel);

  const focusedLayout = useFocusedLayout();

  if (selectedIdx === null) return null;

  const isFilteredEmpty =
    !neighborsLoading &&
    !neighborsError &&
    focusedLayout !== null &&
    focusedLayout.nodes.length === 0;

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-1.5 max-w-full">
      {neighborsError && (
        <div className="px-3 py-1 rounded-full bg-red-500/15 border border-red-400/30 text-[11px] text-red-200">
          {neighborsError}
        </div>
      )}

      {isFilteredEmpty && (
        <div className="glass-panel-elevated px-3.5 py-2 flex items-center gap-3 text-xs text-[#eef0f6]">
          <span className="text-[#8b93a7]">
            No neighbors match these filters.{' '}
            <strong className="font-medium text-[#eef0f6]">Try a different filter</strong>
          </span>
          <button
            type="button"
            onClick={resetAllFilters}
            className="px-2.5 py-1 rounded-lg bg-[#8b7bff]/20 border border-[#8b7bff]/40 text-[11px] font-semibold text-[#c7bfff] hover:bg-[#8b7bff]/30 transition-colors cursor-pointer whitespace-nowrap"
          >
            Reset filters
          </button>
        </div>
      )}

      <div className="glass-panel-elevated px-3.5 py-2 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        {/* Neighbor count slider */}
        <div className="flex items-center gap-2.5">
          <label
            htmlFor="neighbor-count-slider"
            className="text-[11px] font-semibold uppercase tracking-wider text-[#8b93a7] whitespace-nowrap"
          >
            Neighbors:{' '}
            <span className="text-[#eef0f6] tabular-nums">{neighborCount}</span>
          </label>
          <input
            id="neighbor-count-slider"
            type="range"
            min={CONFIG.NEIGHBOR_COUNT_MIN}
            max={CONFIG.NEIGHBOR_COUNT_MAX}
            step={1}
            value={neighborCount}
            onChange={(e) => setNeighborCount(Number(e.target.value))}
            disabled={neighborsLoading}
            className="w-24 sm:w-28 h-1.5 rounded-lg appearance-none bg-white/15 accent-[#8b7bff] cursor-pointer"
          />
        </div>

        <div className="hidden sm:block w-px h-5 bg-white/10" aria-hidden="true" />

        {/* Movie / TV / Both chips */}
        <div
          role="group"
          aria-label="Filter neighbors by media type"
          className="flex items-center gap-1 p-0.5 rounded-full bg-white/5 border border-white/10"
        >
          {TYPE_OPTIONS.map((opt) => {
            const active = mediaTypeFilter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMediaTypeFilter(opt.value)}
                aria-pressed={active}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#8b7bff] text-white shadow-[0_0_12px_rgba(139,123,255,0.45)]'
                    : 'text-[#8b93a7] hover:text-[#eef0f6]'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {!detailsOpen && (
          <>
            <div className="hidden sm:block w-px h-5 bg-white/10" aria-hidden="true" />
            <button
              type="button"
              onClick={openDetailsPanel}
              aria-label="Open title details"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/8 hover:bg-white/14 border border-white/12 text-xs font-medium text-[#eef0f6] transition-colors cursor-pointer whitespace-nowrap"
            >
              <PanelRightOpen className="w-3.5 h-3.5 text-[#8b7bff]" aria-hidden="true" />
              <span>Details</span>
            </button>
          </>
        )}
      </div>

      <span className="text-[11px] text-[#8b93a7]/90 tracking-wide">
        closer = more similar
      </span>
    </div>
  );
}
