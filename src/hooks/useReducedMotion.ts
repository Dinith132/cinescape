import { useEffect } from 'react';
import { CONFIG } from '../config';
import { useStore } from '../store/useStore';

export function useReducedMotion(): {
  reducedMotion: boolean;
  toggleReducedMotion: () => void;
} {
  const reducedMotion = useStore((s) => s.reducedMotion);
  const setReducedMotion = useStore((s) => s.setReducedMotion);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(CONFIG.REDUCED_MOTION_STORAGE_KEY);
    } catch {
      saved = null;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (saved === 'true' || saved === 'false') {
      useStore.setState({ reducedMotion: saved === 'true' });
    } else {
      useStore.setState({ reducedMotion: mediaQuery.matches });
    }

    const handleMediaChange = (event: MediaQueryListEvent) => {
      let currentSaved: string | null = null;
      try {
        currentSaved = window.localStorage.getItem(CONFIG.REDUCED_MOTION_STORAGE_KEY);
      } catch {
        currentSaved = null;
      }
      if (currentSaved === null) {
        useStore.setState({ reducedMotion: event.matches });
      }
    };

    mediaQuery.addEventListener('change', handleMediaChange);
    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, []);

  const toggleReducedMotion = () => {
    setReducedMotion(!reducedMotion);
  };

  return { reducedMotion, toggleReducedMotion };
}
