import { useCallback, useState } from 'react';

export type Pane = 'lyrics' | 'inspector';
export type PaneWidths = Record<Pane, number>;

export const PANE_LIMITS: Record<Pane, { min: number; max: number; initial: number }> = {
  lyrics: { min: 240, max: 600, initial: 340 },
  inspector: { min: 240, max: 520, initial: 290 },
};

const KEY = 'lyric-align:pane-widths';
const HANDLE = 6;
const MIN_STAGE = 360;
const clamp = (pane: Pane, px: number) =>
  Math.round(Math.min(PANE_LIMITS[pane].max, Math.max(PANE_LIMITS[pane].min, px)));
const initial = (): PaneWidths => ({
  lyrics: PANE_LIMITS.lyrics.initial,
  inspector: PANE_LIMITS.inspector.initial,
});

/** Remembered per browser; a convenience, so any storage failure just means the defaults. */
function read(): PaneWidths {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<PaneWidths> | null;
    const base = initial();
    return {
      lyrics: clamp('lyrics', Number(saved?.lyrics) || base.lyrics),
      inspector: clamp('inspector', Number(saved?.inspector) || base.inspector),
    };
  } catch {
    return initial();
  }
}

function write(widths: PaneWidths) {
  try {
    localStorage.setItem(KEY, JSON.stringify(widths));
  } catch {
    // Not remembered across reloads; the panes still resize.
  }
}

/** Widths of the two side panes, clamped to sensible limits and remembered in this browser. */
export function usePaneWidths() {
  const [widths, setWidths] = useState<PaneWidths>(read);

  const resize = useCallback((pane: Pane, px: number) => {
    setWidths((w) => {
      // Never squeeze the timeline below MIN_STAGE: it is what the panes are for.
      const other = pane === 'lyrics' ? w.inspector : w.lyrics;
      const room = window.innerWidth - other - 2 * HANDLE - MIN_STAGE;
      const next = { ...w, [pane]: clamp(pane, Math.min(px, Math.max(room, PANE_LIMITS[pane].min))) };
      write(next);
      return next;
    });
  }, []);

  const reset = useCallback((pane: Pane) => resize(pane, PANE_LIMITS[pane].initial), [resize]);

  return { widths, resize, reset };
}
