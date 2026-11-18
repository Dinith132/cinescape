import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Compass, Move, Search, X } from 'lucide-react';
import { querySearchSuggestions } from '../data/loader';
import type { SearchSuggestion } from '../data/types';
import { useStore } from '../store/useStore';
import { PosterImage } from './PosterImage';

export function SearchBar() {
  const manifest = useStore((s) => s.manifest);
  const searchEngine = useStore((s) => s.searchEngine);
  const posters = useStore((s) => s.posters);
  const galaxyData = useStore((s) => s.galaxyData);
  const mediaTypeFilter = useStore((s) => s.mediaTypeFilter);
  const reducedMotion = useStore((s) => s.reducedMotion);
  const viewMode = useStore((s) => s.viewMode);
  const selectedIdx = useStore((s) => s.selectedIdx);
  const selectTitleByIdx = useStore((s) => s.selectTitleByIdx);

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const suggestions: SearchSuggestion[] = useMemo(() => {
    if (!searchEngine || !query.trim()) return [];
    return querySearchSuggestions(
      searchEngine,
      query,
      posters,
      galaxyData?.attributes ?? null,
      mediaTypeFilter,
    );
  }, [searchEngine, query, posters, galaxyData, mediaTypeFilter]);

  const showDropdown = isOpen && query.trim().length > 0;

  useEffect(() => {
    setActiveIndex(0);
  }, [query, suggestions.length]);

  useEffect(() => {
    const handleGlobalKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: SearchSuggestion) => {
    setQuery(item.title);
    setIsOpen(false);
    selectTitleByIdx(item.idx, { syncHash: true, flyCamera: true });
    inputRef.current?.blur();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const target = suggestions[activeIndex] ?? suggestions[0];
      if (target) handleSelect(target);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-[560px] flex flex-col items-center">
      {/* Search Combobox Input */}
      <div className="w-full relative group">
        <div
          className="pointer-events-none absolute -inset-0.5 rounded-2xl bg-[#8b7bff]/15 blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-200"
          aria-hidden="true"
        />
        <div
          className="relative flex items-center gap-3 w-full h-12 px-4 rounded-2xl border border-white/10 focus-within:border-[#8b7bff] focus-within:shadow-[0_0_16px_rgba(139,123,255,0.28)] transition-all"
          style={{
            background: 'rgba(13, 16, 28, 0.72)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          <Search className="w-4 h-4 text-[#8b7bff] flex-shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-label="Search movies and TV shows"
            aria-expanded={showDropdown}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={
              showDropdown && suggestions[activeIndex]
                ? `${listboxId}-opt-${suggestions[activeIndex].idx}`
                : undefined
            }
            value={query}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              searchEngine ? 'Search movies and TV shows...' : 'Indexing titles...'
            }
            className="w-full bg-transparent text-sm text-[#eef0f6] placeholder:text-[#8b93a7] outline-none"
          />

          {query.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="w-7 h-7 rounded-full flex items-center justify-center text-[#8b93a7] hover:text-[#eef0f6] hover:bg-white/10 transition-colors cursor-pointer flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] font-mono text-[#8b93a7] flex-shrink-0">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* Sub-line Hint below search bar */}
      {!showDropdown && viewMode === 'galaxy' && (
        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0d101c]/55 border border-white/5 text-xs text-[#8b93a7] pointer-events-none">
          <Move className="w-3.5 h-3.5 text-[#8b7bff]" aria-hidden="true" />
          <span>
            {selectedIdx !== null
              ? 'Distance from center indicates similarity · closer = more similar'
              : 'or drag to explore the galaxy'}
          </span>
        </div>
      )}

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="absolute top-[56px] left-0 right-0 z-40 glass-panel-elevated p-2 overflow-hidden"
          >
            {!searchEngine ? (
              <div className="px-3 py-4 text-center text-xs text-[#8b93a7]">
                Preparing search index...
              </div>
            ) : suggestions.length === 0 ? (
              <div className="px-3 py-5 text-center text-xs text-[#8b93a7]">
                No matching movies or TV shows for &ldquo;{query}&rdquo;
              </div>
            ) : (
              <>
                <ul
                  id={listboxId}
                  role="listbox"
                  aria-label="Title suggestions"
                  className="max-h-[380px] overflow-y-auto cinescape-scroll flex flex-col gap-1"
                >
                  {suggestions.map((item, index) => {
                    const isActive = index === activeIndex;
                    const genreGroup = manifest?.genre_groups.find((g) => g.id === item.genreId);

                    return (
                      <li
                        key={item.routeKey}
                        id={`${listboxId}-opt-${item.idx}`}
                        role="option"
                        aria-selected={isActive}
                        tabIndex={-1}
                        onMouseEnter={() => setActiveIndex(index)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelect(item);
                        }}
                        className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-[#8b7bff]/15 border border-[#8b7bff]/40 shadow-[0_0_20px_rgba(139,123,255,0.14)]'
                            : 'border border-transparent hover:bg-white/5'
                        }`}
                      >
                        <PosterImage
                          manifest={manifest}
                          posterPath={item.posterPath}
                          title={item.title}
                          type={item.type}
                          className="w-10 h-14"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-medium truncate ${
                                isActive ? 'text-[#eef0f6]' : 'text-[#eef0f6]/90'
                              }`}
                            >
                              {item.title}
                            </span>
                            {item.year > 0 && (
                              <span className="text-xs text-[#8b93a7] tabular-nums flex-shrink-0">
                                {item.year}
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex items-center gap-2 text-[11px] text-[#8b93a7]">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-semibold tracking-wide uppercase text-[#eef0f6]/85">
                              {item.type === 'tv' ? 'TV' : 'Movie'}
                            </span>
                            {genreGroup && (
                              <span className="inline-flex items-center gap-1.5 truncate">
                                <span
                                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: genreGroup.color }}
                                />
                                <span className="truncate">{genreGroup.name}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <Compass
                          className={`w-4 h-4 flex-shrink-0 transition-opacity ${
                            isActive ? 'text-[#8b7bff] opacity-100' : 'opacity-0'
                          }`}
                          aria-hidden="true"
                        />
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-1.5 pt-2 px-2 border-t border-white/10 flex items-center justify-between text-[11px] text-[#8b93a7]">
                  <div className="flex items-center gap-3">
                    <span>↑↓ navigate</span>
                    <span>↵ select</span>
                    <span>ESC close</span>
                  </div>
                  <span className="tabular-nums">{suggestions.length} results</span>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
