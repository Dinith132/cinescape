import { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { useStore } from '../store/useStore';

export function Legend() {
  const manifest = useStore((s) => s.manifest);
  const selectedGenreIds = useStore((s) => s.selectedGenreIds);
  const toggleGenreId = useStore((s) => s.toggleGenreId);
  const clearGenreFilters = useStore((s) => s.clearGenreFilters);
  const [collapsed, setCollapsed] = useState(false);

  if (!manifest) return null;

  const hasSelection = selectedGenreIds.length > 0;

  return (
    <aside
      aria-label="Genre color legend and filter"
      className="glass-panel p-3.5 w-full max-w-[300px] sm:max-w-[320px] pointer-events-auto"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#8b7bff]" aria-hidden="true" />
          <h2 className="font-display text-xs font-semibold tracking-wider uppercase text-[#8b93a7]">
            Genres
          </h2>
          {hasSelection && (
            <button
              type="button"
              onClick={clearGenreFilters}
              className="text-[11px] font-medium text-[#8b7bff] hover:underline cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#8b93a7] tabular-nums">
            {manifest.count.toLocaleString()} titles
          </span>
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand genre legend' : 'Collapse genre legend'}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-[#8b93a7] hover:text-[#eef0f6] hover:bg-white/10 transition-colors cursor-pointer"
          >
            {collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="mt-2.5 grid grid-cols-2 gap-x-2.5 gap-y-1.5">
          {manifest.genre_groups.map((group) => {
            const isSelected = selectedGenreIds.includes(group.id);
            const isDimmed = hasSelection && !isSelected;

            return (
              <button
                key={group.id}
                type="button"
                onClick={() => toggleGenreId(group.id)}
                aria-pressed={isSelected}
                className={`flex items-center gap-2 py-1 px-1.5 rounded-lg text-left transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-white/12 border-white/25 text-[#eef0f6]'
                    : isDimmed
                      ? 'border-transparent opacity-45 hover:opacity-85 text-[#8b93a7]'
                      : 'border-transparent hover:bg-white/5 text-[#eef0f6]/90'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: group.color,
                    boxShadow: `0 0 8px ${group.color}88`,
                  }}
                  aria-hidden="true"
                />
                <span className="text-xs truncate">{group.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </aside>
  );
}
