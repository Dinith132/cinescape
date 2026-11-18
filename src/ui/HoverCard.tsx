import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Star } from 'lucide-react';
import { getCachedDetailsSync } from '../data/loader';
import { useFocusedLayout } from '../hooks/useFocusedLayout';
import { useStore } from '../store/useStore';
import { PosterImage } from './PosterImage';

const CARD_WIDTH = 284;
const CARD_HEIGHT = 132;
const CURSOR_OFFSET = 18;

export function HoverCard() {
  const hoveredIdx = useStore((s) => s.hoveredIdx);
  const hoverScreenPos = useStore((s) => s.hoverScreenPos);
  const manifest = useStore((s) => s.manifest);
  const searchEngine = useStore((s) => s.searchEngine);
  const posters = useStore((s) => s.posters);
  const galaxyData = useStore((s) => s.galaxyData);
  const reducedMotion = useStore((s) => s.reducedMotion);
  const viewMode = useStore((s) => s.viewMode);

  const focusedLayout = useFocusedLayout();

  if (viewMode !== 'galaxy' || hoveredIdx === null || !hoverScreenPos || !searchEngine) {
    return null;
  }

  const entry = searchEngine.entries[hoveredIdx];
  if (!entry) return null;

  const neighborNode = focusedLayout?.nodes.find((n) => n.idx === hoveredIdx) ?? null;
  const genreId = galaxyData ? galaxyData.attributes[hoveredIdx * 4] : 0;
  const genreGroup = manifest?.genre_groups.find((g) => g.id === genreId) ?? null;

  // Rating is shown ONLY if the details shard for hoveredIdx is already cached
  const cachedDetails = getCachedDetailsSync(manifest, hoveredIdx);
  const rating = cachedDetails?.rating;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 720;

  let left = hoverScreenPos.x + CURSOR_OFFSET;
  if (left + CARD_WIDTH > vw - 16) {
    left = hoverScreenPos.x - CARD_WIDTH - CURSOR_OFFSET;
  }
  left = Math.max(16, Math.min(vw - CARD_WIDTH - 16, left));

  let top = hoverScreenPos.y - CARD_HEIGHT * 0.5;
  top = Math.max(76, Math.min(vh - CARD_HEIGHT - 84, top));

  return (
    <AnimatePresence>
      <motion.div
        key={hoveredIdx}
        initial={reducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.12 }}
        style={{ left: `${left}px`, top: `${top}px`, width: `${CARD_WIDTH}px` }}
        className="pointer-events-none fixed z-40 glass-panel-elevated p-3"
      >
        <div className="flex items-start gap-3">
          <PosterImage
            manifest={manifest}
            posterPath={posters?.[hoveredIdx] ?? ''}
            title={entry.title}
            type={entry.type}
            className="w-16 h-24"
          />

          <div className="min-w-0 flex-1 flex flex-col">
            {(neighborNode || rating !== undefined) && (
              <div className="flex items-center justify-between gap-2 mb-1">
                {neighborNode ? (
                  <span className="px-1.5 py-0.5 rounded bg-[#8b7bff] text-white text-[10px] font-bold tracking-wider uppercase tabular-nums shadow-[0_0_12px_rgba(139,123,255,0.45)]">
                    {neighborNode.matchPercent}% match
                  </span>
                ) : (
                  <span />
                )}

                {rating !== undefined && (
                  <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-[#4fdbcc] tabular-nums">
                    <Star className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                    {rating.toFixed(1)}
                  </span>
                )}
              </div>
            )}

            <h3 className="font-display text-sm font-bold text-[#eef0f6] leading-tight line-clamp-2">
              {entry.title}
            </h3>

            <div className="mt-1 flex items-center gap-1.5 text-xs text-[#8b93a7]">
              {entry.year > 0 && <span className="tabular-nums">{entry.year}</span>}
              {entry.year > 0 && <span aria-hidden="true">·</span>}
              <span className="uppercase tracking-wider text-[10px] font-semibold text-[#eef0f6]/80">
                {entry.type === 'tv' ? 'TV' : 'Movie'}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {genreGroup && (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-[#eef0f6]/85 truncate">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: genreGroup.color }}
                  />
                  <span className="truncate">{genreGroup.name}</span>
                </span>
              )}
              {neighborNode?.isSameFranchise && (
                <span className="px-1.5 py-px rounded bg-[#8b7bff]/20 border border-[#8b7bff]/40 text-[9px] font-semibold uppercase tracking-wider text-[#c7bfff]">
                  same franchise
                </span>
              )}
            </div>

            <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-[#8b7bff]">
              <span>Click to center</span>
              <ArrowRight className="w-3 h-3" aria-hidden="true" />
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
