/**
 * Editorial checks. The server allows all of these on purpose; the editor
 * points them out and lets the user decide. Nothing here blocks a save.
 */
import type { Doc, LineId } from './types';
import type { Ms } from '../lib/time';

export type Warning = 'overlap' | 'order' | 'past-end';

export const WARNING_TEXT: Record<Warning, string> = {
  overlap: 'Overlaps another line',
  order: 'Starts before an earlier line in the list',
  'past-end': 'Runs past the end of the audio',
};

export function lineWarnings(doc: Doc, durationMs: Ms | null): Map<LineId, Warning[]> {
  const out = new Map<LineId, Warning[]>();
  const add = (id: LineId, w: Warning) => {
    const list = out.get(id) ?? [];
    if (!list.includes(w)) out.set(id, [...list, w]);
  };

  let latestStart = -1;
  for (const line of doc.lines) {
    const s = doc.segments[line.id];
    if (!s) continue;
    if (s.startMs < latestStart) add(line.id, 'order');
    latestStart = Math.max(latestStart, s.startMs);
    if (durationMs !== null && s.endMs > durationMs) add(line.id, 'past-end');
  }

  const byStart = doc.lines
    .filter((l) => doc.segments[l.id])
    .map((l) => ({ id: l.id, ...doc.segments[l.id] }))
    .sort((a, b) => a.startMs - b.startMs);
  let reach = { id: '', endMs: -1 };
  for (const s of byStart) {
    if (s.startMs < reach.endMs) {
      add(s.id, 'overlap');
      add(reach.id, 'overlap');
    }
    if (s.endMs > reach.endMs) reach = { id: s.id, endMs: s.endMs };
  }
  return out;
}
