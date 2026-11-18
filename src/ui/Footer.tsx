import { useStore } from '../store/useStore';

export function Footer() {
  const manifest = useStore((s) => s.manifest);
  const attribution =
    manifest?.attribution ??
    'This product uses the TMDB API but is not endorsed or certified by TMDB.';

  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;

  return (
    <footer className="relative z-20 w-full px-4 md:px-6 py-2.5 bg-[#07080f]/85 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#8b93a7]">
      <div className="flex items-center gap-2.5">
        <img
          src={`${base}tmdb-logo.svg`}
          alt="TMDB"
          className="h-5 w-auto opacity-85 flex-shrink-0"
        />
        <p className="text-[11px] text-[#8b93a7]/90 leading-snug">{attribution}</p>
      </div>
      <span className="text-[11px] text-[#8b93a7]/70 whitespace-nowrap">Cinescape</span>
    </footer>
  );
}
