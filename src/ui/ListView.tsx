import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Compass, PanelRightOpen, Sparkles } from 'lucide-react';
import { useFocusedLayout } from '../hooks/useFocusedLayout';
import { useStore } from '../store/useStore';
import { PosterImage } from './PosterImage';

const PAGE_SIZE = 60;

export function ListView() {
  const manifest = useStore((s) => s.manifest);
  const searchEngine = useStore((s) => s.searchEngine);
  const posters = useStore((s) => s.posters);
  const galaxyData = useStore((s) => s.galaxyData);
  const mediaTypeFilter = useStore((s) => s.mediaTypeFilter);
  const selectedGenreIds = useStore((s) => s.selectedGenreIds);
  const selectedIdx = useStore((s) => s.selectedIdx);
  const webglAvailable = useStore((s) => s.webglAvailable);
  const neighborsLoading = useStore((s) => s.neighborsLoading);
  const detailsOpen = useStore((s) => s.detailsOpen);

  const selectTitleByIdx = useStore((s) => s.selectTitleByIdx);
  const setViewMode = useStore((s) => s.setViewMode);
  const resetAllFilters = useStore((s) => s.resetAllFilters);
  const triggerResetCamera = useStore((s) => s.triggerResetCamera);
  const openDetailsPanel = useStore((s) => s.openDetailsPanel);

  const focusedLayout = useFocusedLayout();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const genreSet = useMemo(
    () => (selectedGenreIds.length > 0 ? new Set(selectedGenreIds) : null),
    [selectedGenreIds],
  );

  const filteredEntries = useMemo(() => {
    if (!searchEngine || selectedIdx !== null) return [];
    return searchEngine.entries.filter((entry) => {
      if (mediaTypeFilter !== 'all' && entry.type !== mediaTypeFilter) return false;
      if (genreSet !== null && galaxyData) {
        const gId = galaxyData.attributes[entry.idx * 4];
        if (!genreSet.has(gId)) return false;
      }
      return true;
    });
  }, [searchEngine, selectedIdx, mediaTypeFilter, genreSet, galaxyData]);

  const visibleEntries = useMemo(
    () => filteredEntries.slice(0, visibleCount),
    [filteredEntries, visibleCount],
  );

  const centeredEntry = selectedIdx !== null ? searchEngine?.entries[selectedIdx] ?? null : null;
  const centeredGenreId =
    selectedIdx !== null && galaxyData ? galaxyData.attributes[selectedIdx * 4] : 0;
  const centeredGenreGroup = manifest?.genre_groups.find((g) => g.id === centeredGenreId);

  return (
    <div
      className={`relative z-10 w-full h-full overflow-y-auto cinescape-scroll pt-36 pb-16 px-4 md:px-8 transition-[padding] duration-200 ${
        detailsOpen && selectedIdx !== null ? 'md:pr-[460px]' : ''
      }`}
    >
      <div className="max-w-6xl mx-auto">
        {!webglAvailable && (
          <div className="mb-5 glass-panel p-4 flex items-start gap-3 border-[#8b7bff]/30">
            <AlertTriangle className="w-5 h-5 text-[#8b7bff] flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-[#eef0f6]">
                3D WebGL view is unavailable on this device
              </p>
              <p className="text-xs text-[#8b93a7] mt-0.5">
                Switched to accessible list mode automatically. You can still search, filter, and inspect every title.
              </p>
            </div>
          </div>
        )}

        {/* Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            {centeredEntry ? (
              <>
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-semibold text-[#c7bfff]">
                  <Sparkles className="w-3.5 h-3.5 text-[#8b7bff]" aria-hidden="true" />
                  <span>Similar to</span>
                </div>
                <h1 className="font-display text-xl font-bold text-[#eef0f6] mt-0.5 flex flex-wrap items-center gap-2">
                  <span>{centeredEntry.title}</span>
                  {centeredEntry.year > 0 && (
                    <span className="text-sm font-normal text-[#8b93a7] tabular-nums">
                      ({centeredEntry.year})
                    </span>
                  )}
                  {centeredGenreGroup && (
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                      style={{
                        backgroundColor: `${centeredGenreGroup.color}20`,
                        border: `1px solid ${centeredGenreGroup.color}55`,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: centeredGenreGroup.color }}
                        aria-hidden="true"
                      />
                      {centeredGenreGroup.name}
                    </span>
                  )}
                </h1>
                <p className="text-xs text-[#8b93a7] mt-1 tabular-nums">
                  {neighborsLoading
                    ? 'Loading recommendations...'
                    : `${focusedLayout?.nodes.length ?? 0} recommendations shown · closer = more similar`}
                </p>
              </>
            ) : (
              <>
                <h1 className="font-display text-lg font-semibold text-[#eef0f6]">
                  Catalog Explorer
                </h1>
                <p className="text-xs text-[#8b93a7] tabular-nums">
                  Showing {visibleEntries.length.toLocaleString()} of{' '}
                  {filteredEntries.length.toLocaleString()} titles sorted by popularity
                </p>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {centeredEntry && !detailsOpen && (
              <button
                type="button"
                onClick={openDetailsPanel}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-[#eef0f6] transition-colors cursor-pointer"
              >
                <PanelRightOpen className="w-3.5 h-3.5 text-[#8b7bff]" aria-hidden="true" />
                Title details
              </button>
            )}

            {centeredEntry && (
              <button
                type="button"
                onClick={triggerResetCamera}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-[#eef0f6] transition-colors cursor-pointer"
              >
                Browse all titles
              </button>
            )}

            {webglAvailable && (
              <button
                type="button"
                onClick={() => setViewMode('galaxy')}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#8b7bff]/15 hover:bg-[#8b7bff]/25 border border-[#8b7bff]/40 text-xs font-semibold text-[#eef0f6] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#c7bfff]" aria-hidden="true" />
                Back to 3D view
              </button>
            )}
          </div>
        </div>

        {/* Content: Recommendations List (when centered) OR Popularity Catalog */}
        {selectedIdx !== null ? (
          neighborsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="glass-panel p-3 flex items-center gap-3 animate-pulse">
                  <div className="w-12 h-16 rounded-lg bg-white/10 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-white/10" />
                    <div className="h-3 w-1/2 rounded bg-white/10" />
                  </div>
                </div>
              ))}
            </div>
          ) : !focusedLayout || focusedLayout.nodes.length === 0 ? (
            <div className="glass-panel p-8 text-center space-y-3">
              <p className="font-display text-base font-semibold text-[#eef0f6]">
                No similar titles match these filters
              </p>
              <p className="text-xs text-[#8b93a7]">
                Try a different filter or reset your active Movie/TV and genre selections.
              </p>
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8b7bff] hover:bg-[#7a68ff] text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                Try a different filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {focusedLayout.nodes.map((node) => {
                const entry = searchEngine?.entries[node.idx];
                if (!entry) return null;
                const genreGroup = manifest?.genre_groups.find((g) => g.id === node.genreId);

                return (
                  <button
                    key={entry.routeKey}
                    type="button"
                    onClick={() =>
                      selectTitleByIdx(entry.idx, {
                        syncHash: true,
                        flyCamera: webglAvailable,
                      })
                    }
                    className="glass-panel p-3 flex items-center gap-3 text-left transition-all cursor-pointer hover:border-[#8b7bff]/45 hover:bg-[#0d101c]/85"
                  >
                    <PosterImage
                      manifest={manifest}
                      posterPath={posters?.[entry.idx] ?? ''}
                      title={entry.title}
                      type={entry.type}
                      className="w-12 h-16"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-display text-sm font-semibold text-[#eef0f6] truncate">
                          {entry.title}
                        </p>
                        <span className="px-2 py-0.5 rounded-md bg-[#8b7bff]/15 border border-[#8b7bff]/35 text-[11px] font-semibold text-[#c7bfff] tabular-nums flex-shrink-0">
                          {node.matchPercent}%
                        </span>
                      </div>

                      <div className="mt-1 flex items-center gap-2 text-xs text-[#8b93a7]">
                        <span className="uppercase tracking-wider text-[10px] font-semibold text-[#eef0f6]/80">
                          {entry.type === 'tv' ? 'TV' : 'Movie'}
                        </span>
                        {entry.year > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{entry.year}</span>
                          </>
                        )}
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {genreGroup && (
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] text-[#eef0f6]/90"
                            style={{
                              backgroundColor: `${genreGroup.color}1e`,
                              border: `1px solid ${genreGroup.color}4d`,
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: genreGroup.color }}
                              aria-hidden="true"
                            />
                            <span className="truncate">{genreGroup.name}</span>
                          </span>
                        )}
                        {node.isSameFranchise && (
                          <span className="px-1.5 py-0.5 rounded bg-[#8b7bff]/20 border border-[#8b7bff]/40 text-[9px] font-semibold uppercase tracking-wider text-[#c7bfff]">
                            same franchise
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )
        ) : !searchEngine ? (
          <div className="glass-panel p-8 text-center text-sm text-[#8b93a7]">
            Loading catalog index...
          </div>
        ) : visibleEntries.length === 0 ? (
          <div className="glass-panel p-8 text-center space-y-3">
            <p className="font-display text-base font-semibold text-[#eef0f6]">
              No titles match the active filters
            </p>
            <p className="text-xs text-[#8b93a7]">
              Try a different filter or reset your active Movie/TV and genre selections.
            </p>
            <button
              type="button"
              onClick={resetAllFilters}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8b7bff] hover:bg-[#7a68ff] text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleEntries.map((entry) => {
              const genreId = galaxyData ? galaxyData.attributes[entry.idx * 4] : 0;
              const genreGroup = manifest?.genre_groups.find((g) => g.id === genreId);

              return (
                <button
                  key={entry.routeKey}
                  type="button"
                  onClick={() => {
                    selectTitleByIdx(entry.idx, {
                      syncHash: true,
                      flyCamera: webglAvailable,
                    });
                  }}
                  className="glass-panel p-3 flex items-center gap-3 text-left transition-all cursor-pointer hover:border-white/20 hover:bg-[#0d101c]/80"
                >
                  <PosterImage
                    manifest={manifest}
                    posterPath={posters?.[entry.idx] ?? ''}
                    title={entry.title}
                    type={entry.type}
                    className="w-12 h-16"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm font-semibold text-[#eef0f6] truncate">
                      {entry.title}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-[#8b93a7]">
                      <span className="uppercase tracking-wider text-[10px] font-semibold text-[#eef0f6]/80">
                        {entry.type === 'tv' ? 'TV' : 'Movie'}
                      </span>
                      {entry.year > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{entry.year}</span>
                        </>
                      )}
                    </div>
                    {genreGroup && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#8b93a7]">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: genreGroup.color }}
                          aria-hidden="true"
                        />
                        <span className="truncate">{genreGroup.name}</span>
                      </div>
                    )}
                  </div>

                  {webglAvailable && (
                    <Compass className="w-4 h-4 text-[#8b7bff]/70 flex-shrink-0" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {selectedIdx === null && visibleCount < filteredEntries.length && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-[#eef0f6] transition-colors cursor-pointer"
            >
              Load more ({(filteredEntries.length - visibleCount).toLocaleString()} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
