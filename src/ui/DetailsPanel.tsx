import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  RotateCcw,
  Share2,
  Sparkles,
  Star,
  Tv,
  X,
} from 'lucide-react';
import { CONFIG } from '../config';
import { buildImageUrl } from '../data/loader';
import type { CastMember, GenreGroup, Manifest } from '../data/types';
import { useStore } from '../store/useStore';
import { PosterImage } from './PosterImage';

type MobileSnap = 'collapsed' | 'half' | 'full';

function formatRuntime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatVotes(votes: number): string {
  if (votes >= 1000) {
    return `${(votes / 1000).toFixed(votes >= 10000 ? 0 : 1)}k votes`;
  }
  return `${votes} votes`;
}

function resolveGenreChipColor(
  genreName: string,
  genreGroups: GenreGroup[],
  fallbackColor: string,
): string {
  const lower = genreName.toLowerCase();
  for (const group of genreGroups) {
    const tokens = group.name
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 3);
    if (tokens.some((token) => lower.includes(token))) {
      return group.color;
    }
  }
  return fallbackColor;
}

function formatCastMember(member: string | CastMember): { name: string; character?: string } {
  if (typeof member === 'string') return { name: member };
  return member;
}

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < CONFIG.MOBILE_BREAKPOINT_PX : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${CONFIG.MOBILE_BREAKPOINT_PX - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return isMobile;
}

function DetailsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Loading title details">
      <div className="flex gap-4">
        <div className="w-24 h-36 rounded-xl bg-white/10 flex-shrink-0" />
        <div className="flex-1 space-y-2.5 py-1">
          <div className="h-5 w-3/4 rounded-md bg-white/10" />
          <div className="h-3.5 w-1/2 rounded-md bg-white/10" />
          <div className="flex gap-2 pt-1">
            <div className="h-5 w-16 rounded-full bg-white/10" />
            <div className="h-5 w-20 rounded-full bg-white/10" />
          </div>
        </div>
      </div>
      <div className="space-y-2 pt-2">
        <div className="h-3 w-full rounded bg-white/10" />
        <div className="h-3 w-11/12 rounded bg-white/10" />
        <div className="h-3 w-4/5 rounded bg-white/10" />
      </div>
      <div className="grid grid-cols-2 gap-2 pt-1">
        <div className="h-9 rounded-xl bg-white/10" />
        <div className="h-9 rounded-xl bg-white/10" />
      </div>
    </div>
  );
}

export function DetailsPanel() {
  const manifest = useStore((s) => s.manifest);
  const searchEngine = useStore((s) => s.searchEngine);
  const galaxyData = useStore((s) => s.galaxyData);
  const posters = useStore((s) => s.posters);
  const selectedIdx = useStore((s) => s.selectedIdx);
  const detailsOpen = useStore((s) => s.detailsOpen);
  const titleDetails = useStore((s) => s.titleDetails);
  const detailsLoading = useStore((s) => s.detailsLoading);
  const detailsError = useStore((s) => s.detailsError);
  const focusedNeighbors = useStore((s) => s.focusedNeighbors);
  const reducedMotion = useStore((s) => s.reducedMotion);

  const closeDetailsPanel = useStore((s) => s.closeDetailsPanel);
  const retryDetailsFetch = useStore((s) => s.retryDetailsFetch);
  const selectTitleByIdx = useStore((s) => s.selectTitleByIdx);

  const isMobile = useIsMobile();
  const [mobileSnap, setMobileSnap] = useState<MobileSnap>('collapsed');
  const [copied, setCopied] = useState(false);
  const [failedBackdrop, setFailedBackdrop] = useState<string | null>(null);

  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const copyTimerRef = useRef<number | null>(null);

  const isVisible = detailsOpen && selectedIdx !== null;

  // Reset mobile sheet to collapsed when selecting a new title so 3D view stays clear
  useEffect(() => {
    setMobileSnap('collapsed');
    setCopied(false);
  }, [selectedIdx]);

  // Focus management: focus close button on open, restore previous element on close
  useEffect(() => {
    if (isVisible) {
      if (!previousFocusRef.current && document.activeElement instanceof HTMLElement) {
        previousFocusRef.current = document.activeElement;
      }
      const raf = window.requestAnimationFrame(() => {
        closeBtnRef.current?.focus();
      });
      return () => window.cancelAnimationFrame(raf);
    }

    if (previousFocusRef.current && previousFocusRef.current.isConnected) {
      previousFocusRef.current.focus();
    }
    previousFocusRef.current = null;
  }, [isVisible]);

  // Esc closes the details panel
  useEffect(() => {
    if (!isVisible) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        event.preventDefault();
        closeDetailsPanel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, closeDetailsPanel]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const entry = selectedIdx !== null ? searchEngine?.entries[selectedIdx] ?? null : null;
  const details =
    titleDetails && selectedIdx !== null && titleDetails.i === selectedIdx ? titleDetails : null;

  const primaryGenreGroup = useMemo(() => {
    if (!manifest || !galaxyData || selectedIdx === null) return null;
    const gId = galaxyData.attributes[selectedIdx * 4];
    return manifest.genre_groups.find((g) => g.id === gId) ?? null;
  }, [manifest, galaxyData, selectedIdx]);

  const similarNeighbors = useMemo(() => {
    if (!focusedNeighbors || !manifest || !searchEngine) return [];
    const franchiseSet = new Set(focusedNeighbors.f ?? []);
    const list: Array<{
      idx: number;
      title: string;
      year: number;
      type: 'movie' | 'tv';
      posterPath: string;
      matchPercent: number;
      isSameFranchise: boolean;
    }> = [];

    const maxCount = Math.min(CONFIG.DETAILS_SIMILAR_COUNT, focusedNeighbors.n.length);
    for (let rank = 0; rank < maxCount; rank++) {
      const nIdx = focusedNeighbors.n[rank];
      const nEntry = searchEngine.entries[nIdx];
      if (!nEntry) continue;
      const rawScore = focusedNeighbors.s[rank] ?? 0;
      const matchPercent = Math.max(
        1,
        Math.min(99, Math.round((rawScore / manifest.score_scale) * 100)),
      );
      list.push({
        idx: nIdx,
        title: nEntry.title,
        year: nEntry.year,
        type: nEntry.type,
        posterPath: posters?.[nIdx] ?? '',
        matchPercent,
        isSameFranchise: franchiseSet.has(rank),
      });
    }
    return list;
  }, [focusedNeighbors, manifest, searchEngine, posters]);

  const handleShareLink = useCallback(async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked in restricted context
    }
  }, []);

  const handleMobileDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const { offset, velocity } = info;
      if (velocity.y < -350 || offset.y < -70) {
        setMobileSnap((prev) => (prev === 'collapsed' ? 'half' : 'full'));
      } else if (velocity.y > 350 || offset.y > 70) {
        setMobileSnap((prev) => (prev === 'full' ? 'half' : 'collapsed'));
      }
    },
    [],
  );

  const cycleMobileSnap = useCallback(() => {
    setMobileSnap((prev) =>
      prev === 'collapsed' ? 'half' : prev === 'half' ? 'full' : 'collapsed',
    );
  }, []);

  const title = details?.title ?? entry?.title ?? 'Selected Title';
  const year = details?.year ?? entry?.year ?? 0;
  const mediaType = details?.type ?? entry?.type ?? 'movie';
  const tmdbId = details?.id ?? entry?.tmdbId ?? 0;
  const posterPath = details?.poster ?? (selectedIdx !== null ? posters?.[selectedIdx] : '') ?? '';
  const backdropUrl = buildImageUrl(manifest, details?.backdrop, 'backdrop');
  const showBackdrop = Boolean(backdropUrl && failedBackdrop !== backdropUrl);

  const tmdbHref =
    manifest && tmdbId > 0 ? `${manifest.tmdb_url[mediaType]}${tmdbId}` : undefined;

  const fallbackGenreColor = primaryGenreGroup?.color ?? '#8b7bff';
  const genreChips = useMemo(() => {
    if (details?.genres && details.genres.length > 0) {
      return details.genres.map((name) => ({
        name,
        color: resolveGenreChipColor(name, manifest?.genre_groups ?? [], fallbackGenreColor),
      }));
    }
    if (primaryGenreGroup) {
      return [{ name: primaryGenreGroup.name, color: primaryGenreGroup.color }];
    }
    return [];
  }, [details?.genres, manifest?.genre_groups, primaryGenreGroup, fallbackGenreColor]);

  const panelBody = (
    <div className="space-y-5">
      {detailsLoading && !details ? (
        <DetailsSkeleton />
      ) : detailsError && !details ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-400/25 text-center space-y-3">
          <p className="text-xs text-red-200">{detailsError}</p>
          <button
            type="button"
            onClick={retryDetailsFetch}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-medium text-[#eef0f6] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Hero: Poster + Title + Metadata */}
          <div className="flex gap-4 items-start">
            <PosterImage
              manifest={manifest}
              posterPath={posterPath}
              title={title}
              type={mediaType}
              sizeKey="poster_panel"
              className="w-24 h-36 sm:w-28 sm:h-40 rounded-xl shadow-lg"
            />

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-[#8b93a7] font-semibold">
                <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[#eef0f6]/90">
                  {mediaType === 'tv' ? 'TV Series' : 'Movie'}
                </span>
                {details?.status && (
                  <span className="truncate text-[#8b93a7]">{details.status}</span>
                )}
              </div>

              <h2 className="font-display text-lg font-bold leading-snug text-[#eef0f6]">
                {title}
                {year > 0 && (
                  <span className="ml-1.5 font-normal text-sm text-[#8b93a7] tabular-nums">
                    ({year})
                  </span>
                )}
              </h2>

              {/* Runtime / Seasons & Rating row */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-[#8b93a7]">
                {typeof details?.rating === 'number' && details.rating > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#ffd166]/15 border border-[#ffd166]/35 text-[#ffd166] font-semibold tabular-nums">
                    <Star className="w-3 h-3 fill-current" aria-hidden="true" />
                    {details.rating.toFixed(1)}
                    {typeof details.votes === 'number' && details.votes > 0 && (
                      <span className="text-[10px] font-normal text-[#eef0f6]/70 ml-0.5">
                        ({formatVotes(details.votes)})
                      </span>
                    )}
                  </span>
                )}

                {typeof details?.runtime === 'number' && details.runtime > 0 && (
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Clock className="w-3.5 h-3.5 text-[#8b93a7]" aria-hidden="true" />
                    {formatRuntime(details.runtime)}
                  </span>
                )}

                {(typeof details?.seasons === 'number' || typeof details?.episodes === 'number') && (
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Tv className="w-3.5 h-3.5 text-[#8b93a7]" aria-hidden="true" />
                    {[
                      typeof details.seasons === 'number' && details.seasons > 0
                        ? `${details.seasons} season${details.seasons === 1 ? '' : 's'}`
                        : null,
                      typeof details.episodes === 'number' && details.episodes > 0
                        ? `${details.episodes} ep`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                )}
              </div>

              {/* Genre chips in group colors */}
              {genreChips.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {genreChips.map((chip) => (
                    <span
                      key={chip.name}
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium text-[#eef0f6]"
                      style={{
                        backgroundColor: `${chip.color}20`,
                        border: `1px solid ${chip.color}55`,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: chip.color }}
                        aria-hidden="true"
                      />
                      {chip.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tagline */}
          {details?.tagline && (
            <p className="text-xs italic text-[#c7bfff]/90 border-l-2 border-[#8b7bff]/50 pl-3">
              &ldquo;{details.tagline}&rdquo;
            </p>
          )}

          {/* Overview */}
          {details?.overview && (
            <p className="text-xs sm:text-[13px] leading-relaxed text-[#eef0f6]/85">
              {details.overview}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            {tmdbHref && (
              <a
                href={tmdbHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#8b7bff] hover:bg-[#7a68ff] text-xs font-semibold text-white transition-colors shadow-[0_0_20px_rgba(139,123,255,0.28)]"
              >
                <span>Open on TMDB</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            )}

            <button
              type="button"
              onClick={handleShareLink}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/12 text-xs font-medium text-[#eef0f6] transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#4fdbcc]" aria-hidden="true" />
                  <span className="text-[#4fdbcc]">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-[#8b93a7]" aria-hidden="true" />
                  <span>Share link</span>
                </>
              )}
            </button>
          </div>

          {/* Creators & Collection */}
          {((details?.creators && details.creators.length > 0) || details?.collection) && (
            <div className="pt-3 border-t border-white/10 space-y-2 text-xs">
              {details?.creators && details.creators.length > 0 && (
                <div>
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-[#8b93a7]">
                    {mediaType === 'tv' ? 'Creators' : 'Director / Creators'}
                  </span>
                  <p className="mt-0.5 text-[#eef0f6]/90">{details.creators.join(', ')}</p>
                </div>
              )}

              {details?.collection && (
                <div>
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-[#8b93a7]">
                    Franchise / Collection
                  </span>
                  <p className="mt-0.5 text-[#c7bfff]">{details.collection}</p>
                </div>
              )}
            </div>
          )}

          {/* Top Cast */}
          {details?.cast && details.cast.length > 0 && (
            <div className="pt-3 border-t border-white/10">
              <h3 className="text-[11px] uppercase tracking-wider font-semibold text-[#8b93a7] mb-2">
                Top Cast
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {details.cast.slice(0, 8).map((member, index) => {
                  const formatted = formatCastMember(member);
                  return (
                    <span
                      key={`${formatted.name}-${index}`}
                      className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/8 text-[11px] text-[#eef0f6]/90"
                    >
                      {formatted.name}
                      {formatted.character && (
                        <span className="text-[#8b93a7]"> · {formatted.character}</span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Keywords */}
          {details?.keywords && details.keywords.length > 0 && (
            <div className="pt-3 border-t border-white/10">
              <h3 className="text-[11px] uppercase tracking-wider font-semibold text-[#8b93a7] mb-2">
                Keywords
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {details.keywords.slice(0, 12).map((kw) => (
                  <span
                    key={kw}
                    className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] text-[#8b93a7]"
                  >
                    #{kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Most Similar (5 neighbors) */}
          {similarNeighbors.length > 0 && (
            <div className="pt-3 border-t border-white/10">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-[#8b93a7]">
                  <Sparkles className="w-3.5 h-3.5 text-[#8b7bff]" aria-hidden="true" />
                  Most similar
                </h3>
                <span className="text-[11px] text-[#8b93a7]">Click to recenter</span>
              </div>

              <div className="space-y-1.5">
                {similarNeighbors.map((item) => (
                  <button
                    key={item.idx}
                    type="button"
                    onClick={() =>
                      selectTitleByIdx(item.idx, { syncHash: true, flyCamera: true })
                    }
                    className="w-full flex items-center gap-3 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 hover:border-[#8b7bff]/45 text-left transition-colors cursor-pointer group"
                  >
                    <PosterImage
                      manifest={manifest}
                      posterPath={item.posterPath}
                      title={item.title}
                      type={item.type}
                      sizeKey="poster_card"
                      className="w-9 h-13 rounded-md"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[#eef0f6] group-hover:text-white truncate">
                        {item.title}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#8b93a7]">
                        <span>{item.type === 'tv' ? 'TV' : 'Movie'}</span>
                        {item.year > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{item.year}</span>
                          </>
                        )}
                        {item.isSameFranchise && (
                          <span className="ml-1 px-1.5 py-px rounded bg-[#8b7bff]/20 border border-[#8b7bff]/40 text-[9px] font-semibold uppercase tracking-wider text-[#c7bfff]">
                            same franchise
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="px-2 py-1 rounded-lg bg-[#8b7bff]/15 border border-[#8b7bff]/35 text-[11px] font-semibold text-[#c7bfff] tabular-nums flex-shrink-0">
                      {item.matchPercent}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  const mobileHeightPx =
    mobileSnap === 'collapsed'
      ? `${CONFIG.MOBILE_SHEET_COLLAPSED_PX}px`
      : mobileSnap === 'half'
        ? '52vh'
        : '86vh';

  return (
    <AnimatePresence>
      {isVisible && (
        isMobile ? (
          <motion.aside
            key="details-mobile-sheet"
            role="dialog"
            aria-modal="false"
            aria-label={`${title} details`}
            initial={reducedMotion ? { opacity: 0 } : { y: 120, opacity: 0 }}
            animate={{
              y: 0,
              opacity: 1,
              height: mobileHeightPx,
            }}
            exit={reducedMotion ? { opacity: 0 } : { y: 120, opacity: 0 }}
            transition={{
              duration: reducedMotion ? 0.12 : 0.24,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="pointer-events-auto fixed inset-x-0 bottom-0 z-40 glass-panel-elevated rounded-b-none rounded-t-2xl border-b-0 flex flex-col overflow-hidden"
          >
            {/* Mobile Drag Handle & Collapsed Peek Header (~96px) */}
            <motion.div
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.18}
              onDragEnd={handleMobileDragEnd}
              className="flex-shrink-0 px-4 pt-2 pb-3 border-b border-white/10 select-none touch-none"
            >
              <div className="flex justify-center mb-2">
                <span className="w-10 h-1 rounded-full bg-white/25" aria-hidden="true" />
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={cycleMobileSnap}
                  aria-expanded={mobileSnap !== 'collapsed'}
                  aria-label={
                    mobileSnap === 'collapsed'
                      ? `Expand details for ${title}`
                      : `Resize details sheet for ${title}`
                  }
                  className="min-w-0 flex-1 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-sm font-bold text-[#eef0f6] truncate">
                      {title}
                    </h2>
                    {year > 0 && (
                      <span className="text-xs text-[#8b93a7] tabular-nums flex-shrink-0">
                        {year}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-[#8b93a7]">
                    <span className="uppercase tracking-wider font-semibold text-[#eef0f6]/80">
                      {mediaType === 'tv' ? 'TV' : 'Movie'}
                    </span>
                    {typeof details?.rating === 'number' && details.rating > 0 && (
                      <span className="inline-flex items-center gap-1 text-[#ffd166] font-semibold tabular-nums">
                        <Star className="w-3 h-3 fill-current" aria-hidden="true" />
                        {details.rating.toFixed(1)}
                      </span>
                    )}
                    <span className="text-[#8b7bff]">
                      {mobileSnap === 'collapsed' ? 'Drag or tap for details' : 'Drag to resize'}
                    </span>
                  </div>
                </button>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={cycleMobileSnap}
                    aria-label={
                      mobileSnap === 'full' ? 'Collapse details sheet' : 'Expand details sheet'
                    }
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8b93a7] hover:text-[#eef0f6] hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    {mobileSnap === 'full' ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronUp className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    ref={closeBtnRef}
                    type="button"
                    onClick={closeDetailsPanel}
                    aria-label="Close details panel"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8b93a7] hover:text-[#eef0f6] hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Mobile Scrollable Content */}
            <div className="flex-1 overflow-y-auto cinescape-scroll px-4 py-4 pb-8">
              {panelBody}
            </div>
          </motion.aside>
        ) : (
          <motion.aside
            key="details-desktop-panel"
            role="dialog"
            aria-modal="false"
            aria-label={`${title} details`}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 28 }}
            transition={{ duration: reducedMotion ? 0.1 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto fixed right-4 md:right-6 top-[76px] bottom-12 z-30 w-[420px] max-w-[calc(100vw-2rem)] glass-panel-elevated flex flex-col overflow-hidden"
          >
            {/* Optional Backdrop Header */}
            <div className="relative flex-shrink-0">
              {showBackdrop && backdropUrl && (
                <div className="relative h-28 w-full overflow-hidden">
                  <img
                    src={backdropUrl}
                    alt=""
                    aria-hidden="true"
                    referrerPolicy="no-referrer"
                    onError={() => setFailedBackdrop(backdropUrl)}
                    className="w-full h-full object-cover opacity-45"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-b from-[#07080f]/30 via-[#0d101c]/60 to-[#0d101c]"
                    aria-hidden="true"
                  />
                </div>
              )}

              <div
                className={`${
                  showBackdrop
                    ? 'absolute top-3 left-4 right-3'
                    : 'px-4 pt-3.5 pb-2.5 border-b border-white/10'
                } flex items-center justify-between gap-2`}
              >
                <span className="font-display text-[11px] font-semibold uppercase tracking-wider text-[#c7bfff] bg-[#07080f]/60 px-2.5 py-1 rounded-full border border-white/10">
                  Title Details
                </span>

                <button
                  ref={closeBtnRef}
                  type="button"
                  onClick={closeDetailsPanel}
                  aria-label="Close details panel"
                  title="Close (Esc)"
                  className="w-8 h-8 rounded-lg bg-[#07080f]/65 border border-white/10 flex items-center justify-center text-[#8b93a7] hover:text-[#eef0f6] hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto cinescape-scroll p-4 pt-3">
              {panelBody}
            </div>
          </motion.aside>
        )
      )}
    </AnimatePresence>
  );
}
