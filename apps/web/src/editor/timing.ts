/**
 * Pure timing edits on a Doc. No DOM, audio or network: the reducer calls these
 * and undo snapshots the result. Times are integer ms (see lib/time.ts).
 * `durationMs` is the audio length when known; time-moving edits clamp to it.
 */
import type { Doc, LineId, Segment } from './types';
import type { Ms } from '../lib/time';
import { clampMs } from '../lib/time';

/** Shortest segment the editor will create. Avoids zero-length blocks. */
export const MIN_SEGMENT_MS = 50;
/** How long a freshly stamped line is, until the next stamp closes it. */
export const PROVISIONAL_MS = 4000;

export function indexOfLine(doc: Doc, id: LineId): number {
  return doc.lines.findIndex((l) => l.id === id);
}

export function setSegment(doc: Doc, id: LineId, seg: Segment | null): Doc {
  const segments = { ...doc.segments };
  if (seg) segments[id] = { startMs: Math.round(seg.startMs), endMs: Math.round(seg.endMs) };
  else delete segments[id];
  return { ...doc, segments };
}

function nextTimedStart(doc: Doc, id: LineId): Ms | null {
  const lines = doc.lines.slice(indexOfLine(doc, id) + 1);
  const hit = lines.find((l) => doc.segments[l.id]);
  return hit ? doc.segments[hit.id].startMs : null;
}

/**
 * Stamp: line `id` starts at `t`.
 * - `openId`, the previous stamp whose end is still provisional, is closed at
 *   `t`, so one tap per line yields back-to-back segments.
 * - An existing end after `t` is kept: re-stamping a fumbled start should not
 *   discard a good end. Otherwise the end is provisional (PROVISIONAL_MS),
 *   capped by the next timed line's start and the end of the audio.
 */
export function stampStart(doc: Doc, id: LineId, t: Ms, openId: LineId | null, durationMs: Ms | null): Doc {
  const max = durationMs ?? Number.MAX_SAFE_INTEGER;
  const start = clampMs(t, 0, Math.max(0, max - MIN_SEGMENT_MS));
  let next = doc;

  const open = openId && openId !== id ? next.segments[openId] : undefined;
  if (openId && open && open.startMs + MIN_SEGMENT_MS <= start) {
    next = setSegment(next, openId, { startMs: open.startMs, endMs: start });
  }

  const existing = next.segments[id];
  let end = start + PROVISIONAL_MS;
  if (existing && existing.endMs > start + MIN_SEGMENT_MS) {
    end = existing.endMs;
  } else {
    const following = nextTimedStart(next, id);
    if (following !== null && following > start + MIN_SEGMENT_MS) end = Math.min(end, following);
    end = Math.min(end, max);
  }
  return setSegment(next, id, { startMs: start, endMs: Math.max(end, start + MIN_SEGMENT_MS) });
}

/** Stamp the end of a line. No-op if it is untimed or `t` is not after its start. */
export function stampEnd(doc: Doc, id: LineId, t: Ms): Doc {
  const seg = doc.segments[id];
  if (!seg || t < seg.startMs + MIN_SEGMENT_MS) return doc;
  return setSegment(doc, id, { startMs: seg.startMs, endMs: Math.round(t) });
}

/**
 * Clamp a shift so the segments in `ids` stay inside [0, durationMs] together:
 * a verse moves as a block instead of squashing at the edge of the track.
 */
export function clampShift(doc: Doc, ids: LineId[], deltaMs: Ms, durationMs: Ms | null): Ms {
  const span = selectionSpan(doc, ids);
  if (!span) return 0;
  const { startMs: minStart, endMs: maxEnd } = span;
  let d = Math.round(deltaMs);
  if (minStart + d < 0) d = -minStart;
  if (durationMs !== null && maxEnd + d > durationMs) d = Math.max(durationMs - maxEnd, -minStart);
  return d;
}

/** Move every timed line in `ids` by the same amount. Untimed lines are ignored. */
export function shiftSegments(doc: Doc, ids: LineId[], deltaMs: Ms, durationMs: Ms | null): Doc {
  const d = clampShift(doc, ids, deltaMs, durationMs);
  if (d === 0) return doc;
  const segments = { ...doc.segments };
  for (const id of ids) {
    const s = segments[id];
    if (s) segments[id] = { startMs: s.startMs + d, endMs: s.endMs + d };
  }
  return { ...doc, segments };
}

/** Earliest start and latest end among the timed lines in `ids`; null if none is timed. */
export function selectionSpan(doc: Doc, ids: LineId[]): Segment | null {
  let span: Segment | null = null;
  for (const id of ids) {
    const s = doc.segments[id];
    if (!s) continue;
    span = span
      ? { startMs: Math.min(span.startMs, s.startMs), endMs: Math.max(span.endMs, s.endMs) }
      : { ...s };
  }
  return span;
}

/** Earliest start among the timed lines in `ids`, or null if none are timed. */
export const selectionStart = (doc: Doc, ids: LineId[]): Ms | null =>
  selectionSpan(doc, ids)?.startMs ?? null;

/** Move the selection as a block so its earliest start lands on `t`. */
export function moveSelectionTo(doc: Doc, ids: LineId[], t: Ms, durationMs: Ms | null): Doc {
  const start = selectionStart(doc, ids);
  return start === null ? doc : shiftSegments(doc, ids, t - start, durationMs);
}

/** Drag one edge; the other stays fixed and the result is never under MIN_SEGMENT_MS. */
export function trimEdge(doc: Doc, id: LineId, edge: 'start' | 'end', t: Ms, durationMs: Ms | null): Doc {
  const seg = doc.segments[id];
  if (!seg) return doc;
  if (edge === 'start') {
    return setSegment(doc, id, { startMs: clampMs(t, 0, seg.endMs - MIN_SEGMENT_MS), endMs: seg.endMs });
  }
  const max = durationMs ?? Number.MAX_SAFE_INTEGER;
  return setSegment(doc, id, { startMs: seg.startMs, endMs: clampMs(t, seg.startMs + MIN_SEGMENT_MS, max) });
}

export function clearTimings(doc: Doc, ids: LineId[]): Doc {
  if (!ids.some((id) => doc.segments[id])) return doc;
  const segments = { ...doc.segments };
  for (const id of ids) delete segments[id];
  return { ...doc, segments };
}
