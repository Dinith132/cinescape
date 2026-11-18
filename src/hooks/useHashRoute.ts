import { useEffect } from 'react';
import { useStore } from '../store/useStore';

const TITLE_HASH_PATTERN = /^#\/t\/((?:movie|tv)-\d+)$/;

export function parseRouteHash(hash: string): string | null {
  const match = TITLE_HASH_PATTERN.exec(hash);
  return match ? match[1] : null;
}

export function useHashRoute(): void {
  useEffect(() => {
    const applyCurrentHash = () => {
      const hash = window.location.hash;
      if (!hash || hash === '#') {
        window.history.replaceState(null, '', '#/');
        useStore.getState().setPendingRouteKey(null);
        return;
      }

      if (hash === '#/') {
        const state = useStore.getState();
        if (state.selectedIdx !== null) {
          state.selectTitleByIdx(null, { syncHash: false, flyCamera: true });
        } else {
          state.setPendingRouteKey(null);
        }
        return;
      }

      const routeKey = parseRouteHash(hash);
      if (routeKey) {
        useStore.getState().setPendingRouteKey(routeKey);
      } else {
        window.history.replaceState(null, '', '#/');
        useStore.getState().setPendingRouteKey(null);
      }
    };

    applyCurrentHash();
    window.addEventListener('hashchange', applyCurrentHash);
    return () => window.removeEventListener('hashchange', applyCurrentHash);
  }, []);
}
