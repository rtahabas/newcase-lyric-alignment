/**
 * "Which line is playing at time t?" Shared by the karaoke readout and the
 * lyrics list, so they always agree.
 */
import type { Doc, LineId } from './types';
import type { Ms } from '../lib/time';

export type TimedLine = { id: LineId; text: string; startMs: Ms; endMs: Ms };

/** Timed lines sorted by start; build once per Doc, query every frame. */
export function timedLines(doc: Doc): TimedLine[] {
  return doc.lines
    .filter((l) => doc.segments[l.id])
    .map((l) => ({ id: l.id, text: l.text, ...doc.segments[l.id] }))
    .sort((a, b) => a.startMs - b.startMs);
}

/**
 * Index into `timed` of the line playing at `ms`, or -1. With overlaps, the
 * line that started most recently wins - it is the one a singer just began.
 */
export function playingIndex(timed: TimedLine[], ms: Ms): number {
  for (let i = timed.length - 1; i >= 0; i--) {
    if (timed[i].startMs <= ms && ms < timed[i].endMs) return i;
  }
  return -1;
}

/** Index of the first line starting after `ms` (for "coming up"), or -1. */
export function upcomingIndex(timed: TimedLine[], ms: Ms): number {
  return timed.findIndex((t) => t.startMs > ms);
}
