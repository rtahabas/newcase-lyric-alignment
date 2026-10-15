/**
 * A Doc built from someone else's line timings (LRCLIB), used only as a
 * starting draft the user opted into (decisions.md D9). Each line ends where
 * the next stamp starts; the last one gets the provisional length. Nothing is
 * placed past the end of the user's audio.
 */
import type { Doc, Segment } from './types';
import type { Ms } from '../lib/time';
import type { LrcEntry } from '../lib/lrcParse';
import { newLineId } from '../lib/ids';
import { MIN_SEGMENT_MS, PROVISIONAL_MS } from './timing';

export function draftFromEntries(entries: LrcEntry[], durationMs: Ms | null): Doc {
  const max = durationMs ?? Number.MAX_SAFE_INTEGER;
  const lines: Doc['lines'] = [];
  const segments: Record<string, Segment> = {};
  entries.forEach((e, i) => {
    if (!e.text) return; // an empty stamp only ends the line before it
    const id = newLineId();
    lines.push({ id, text: e.text });
    const next = entries[i + 1];
    const end = Math.min(next ? next.ms : e.ms + PROVISIONAL_MS, max);
    if (end - e.ms >= MIN_SEGMENT_MS) segments[id] = { startMs: e.ms, endMs: end };
  });
  return { lines, segments };
}
