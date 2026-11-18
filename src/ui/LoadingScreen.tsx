import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { CONFIG } from '../config';
import { useStore } from '../store/useStore';

export function LoadingScreen() {
  const loadPhase = useStore((s) => s.loadPhase);
  const loadProgress = useStore((s) => s.loadProgress);
  const loadError = useStore((s) => s.loadError);
  const reducedMotion = useStore((s) => s.reducedMotion);
  const initializeData = useStore((s) => s.initializeData);

  const percent = Math.round(Math.min(100, Math.max(0, loadProgress * 100)));
  const visible = loadPhase !== 'ready';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="loading-screen"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0.05 : CONFIG.LOADING_FADE_MS / 1000 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#07080f] px-6 select-none"
          role="status"
          aria-live="polite"
        >
          {/* Ambient radial nebula glow */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[640px] rounded-full blur-[140px]"
              style={{
                background: 'radial-gradient(circle, rgba(139, 123, 255, 0.16) 0%, transparent 70%)',
              }}
            />
          </div>

          <div className="relative flex flex-col items-center max-w-sm w-full text-center">
            {/* Orbit Ring + Cinescape Mark */}
            <div className="relative w-24 h-24 flex items-center justify-center mb-6">
              <svg
                className={`absolute inset-0 w-full h-full ${reducedMotion ? '' : 'animate-orbit'}`}
                viewBox="0 0 96 96"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="48"
                  cy="48"
                  r="44"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="1"
                />
                <path
                  d="M48 4 A44 44 0 0 1 92 48"
                  stroke="url(#cinescape-orbit-grad)"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
                <circle cx="92" cy="48" r="2.5" fill="#8b7bff" />
                <defs>
                  <linearGradient id="cinescape-orbit-grad" x1="48" y1="4" x2="92" y2="48">
                    <stop offset="0%" stopColor="#8b7bff" stopOpacity="0" />
                    <stop offset="100%" stopColor="#8b7bff" stopOpacity="1" />
                  </linearGradient>
                </defs>
              </svg>

              <div className="w-12 h-12 rounded-2xl bg-[#0d101c]/90 border border-white/10 flex items-center justify-center shadow-[0_0_28px_rgba(139,123,255,0.22)]">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="3.2" fill="#eef0f6" />
                  <ellipse
                    cx="12"
                    cy="12"
                    rx="9.5"
                    ry="4.2"
                    transform="rotate(-24 12 12)"
                    stroke="#8b7bff"
                    strokeWidth="1.5"
                  />
                  <circle cx="18.5" cy="9" r="1.4" fill="#4fdbcc" />
                </svg>
              </div>
            </div>

            <h1 className="font-display text-2xl font-semibold tracking-tight text-[#eef0f6]">
              Cinescape
            </h1>

            {loadPhase === 'error' ? (
              <div className="mt-4 w-full glass-panel p-5">
                <p className="text-sm text-[#eef0f6] font-medium">
                  Unable to load galaxy data
                </p>
                <p className="mt-1.5 text-xs text-[#8b93a7] leading-relaxed">
                  {loadError ?? 'Please check your connection and try again.'}
                </p>
                <button
                  type="button"
                  onClick={() => void initializeData()}
                  className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#8b7bff] text-white text-xs font-semibold hover:shadow-[0_0_24px_rgba(139,123,255,0.45)] transition-shadow cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry
                </button>
              </div>
            ) : (
              <>
                <p className="mt-2 text-sm text-[#8b93a7]">Mapping the galaxy...</p>

                <div className="mt-5 w-full">
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#8b7bff] transition-[width] duration-150 ease-out shadow-[0_0_12px_rgba(139,123,255,0.7)]"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-[#8b93a7] tabular-nums">
                    <span>Loading star coordinates</span>
                    <span>{percent}%</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
