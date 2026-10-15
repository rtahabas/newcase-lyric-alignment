/**
 * Pixels <-> time on the timeline. Zoom is pixels per *second*; the seconds
 * step goes through lib/time so the units boundary stays in one place.
 */
import type { Ms } from '../../lib/time';
import { msToSec, secToMs } from '../../lib/time';

export const msToPx = (ms: Ms, zoom: number): number => msToSec(ms) * zoom;
export const pxToMs = (px: number, zoom: number): Ms => secToMs(px / zoom);

/** Snap distance is fixed on screen (pixels), so it shrinks in ms as you zoom in. */
export const SNAP_PX = 8;

/** Ruler step that keeps labels at least ~70 px apart at the current zoom. */
const STEPS_S = [0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
export function rulerStepMs(zoom: number): Ms {
  const s = STEPS_S.find((step) => step * zoom >= 70) ?? STEPS_S[STEPS_S.length - 1];
  return secToMs(s);
}
