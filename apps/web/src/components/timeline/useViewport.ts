import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

export type Viewport = { left: number; width: number };

/**
 * The visible horizontal window of the scroller, updated at most once per
 * frame. The ruler and the waveform draw only this window, so their cost does
 * not grow with the length of the track.
 */
export function useViewport(ref: RefObject<HTMLElement>): Viewport {
  const [view, setView] = useState<Viewport>({ left: 0, width: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const read = () => {
      raf = 0;
      setView((v) =>
        v.left === el.scrollLeft && v.width === el.clientWidth
          ? v
          : { left: el.scrollLeft, width: el.clientWidth },
      );
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    el.addEventListener('scroll', schedule, { passive: true });
    read();
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', schedule);
      cancelAnimationFrame(raf);
    };
  }, [ref]);
  return view;
}
