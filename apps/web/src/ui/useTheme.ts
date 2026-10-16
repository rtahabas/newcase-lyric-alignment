import { useCallback, useEffect, useState } from 'react';

export type ThemeChoice = 'system' | 'light' | 'dark';

/** Same key the inline script in index.html reads before first paint. */
const KEY = 'lyric-align:theme';
const ORDER: ThemeChoice[] = ['system', 'light', 'dark'];

function readChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

/**
 * Light / dark / follow the OS. The choice is a `data-theme` attribute on
 * <html> (absent = system), remembered in this browser; storage failures only
 * mean it is not remembered.
 */
export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(readChoice);

  useEffect(() => {
    const root = document.documentElement;
    if (choice === 'system') delete root.dataset.theme;
    else root.dataset.theme = choice;
    try {
      if (choice === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, choice);
    } catch {
      // Not remembered across reloads; the theme still applies now.
    }
  }, [choice]);

  const cycle = useCallback(() => setChoice((c) => ORDER[(ORDER.indexOf(c) + 1) % ORDER.length]), []);
  return { choice, cycle };
}

/**
 * Bumps whenever the colours on screen may have changed - a theme choice or
 * the OS switching - so canvas drawing (which reads CSS variables once per
 * draw) can redraw.
 */
export function useThemeVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    const observer = new MutationObserver(bump);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', bump);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', bump);
    };
  }, []);
  return version;
}
