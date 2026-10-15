import { useEffect, useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { Player } from '../../audio/player';
import { clampZoom } from '../../app/EditorContext';
import { useLatest } from '../../lib/useLatest';
import { msToPx } from './scale';

/**
 * - Ctrl/Cmd + wheel (and trackpad pinch, which browsers report the same way)
 *   zooms. Needs a non-passive listener to stop the page zooming instead.
 * - On any zoom change the playhead keeps its on-screen position, so zooming
 *   in to fine-tune a boundary does not throw the user somewhere else.
 */
export function useZoomBehaviour(
  scroller: RefObject<HTMLElement>,
  zoom: number,
  setZoom: (z: number) => void,
  player: Player,
) {
  const latestZoom = useLatest(zoom);
  const prevZoom = useRef(zoom);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom(clampZoom(latestZoom.current * Math.exp(-e.deltaY * 0.01)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [scroller, setZoom, latestZoom]);

  useLayoutEffect(() => {
    const el = scroller.current;
    const before = prevZoom.current;
    prevZoom.current = zoom;
    if (!el || before === zoom) return;
    const t = player.timeMs();
    const onScreen = msToPx(t, before) - el.scrollLeft;
    el.scrollLeft = Math.max(0, msToPx(t, zoom) - onScreen);
  }, [scroller, zoom, player]);
}
