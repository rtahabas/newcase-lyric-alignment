import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { Player } from '../../audio/player';
import { usePlayheadTick } from '../../audio/usePlayer';
import { msToPx } from './scale';

type Props = { player: Player; zoom: number; scroller: RefObject<HTMLElement>; follow: boolean };

/**
 * Positioned with a transform written straight to the DOM each frame. When the
 * playhead leaves the view - playing, or after a seek - the view pages to it.
 */
export function Playhead({ player, zoom, scroller, follow }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // Re-place on zoom even when paused (no ticks arrive then).
  useEffect(() => {
    if (ref.current) ref.current.style.transform = `translateX(${msToPx(player.timeMs(), zoom)}px)`;
  }, [player, zoom]);
  usePlayheadTick(player, (ms) => {
    const x = msToPx(ms, zoom);
    if (ref.current) ref.current.style.transform = `translateX(${x}px)`;
    const el = scroller.current;
    if (!el || !follow) return;
    const margin = el.clientWidth * 0.1;
    if (x > el.scrollLeft + el.clientWidth - margin || x < el.scrollLeft) {
      el.scrollLeft = Math.max(0, x - margin);
    }
  });
  return <div ref={ref} className="playhead" aria-hidden />;
}
