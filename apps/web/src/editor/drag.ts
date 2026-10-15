/**
 * Timeline drags as pure functions. The lane renders `applyDrag(doc, op)` as a
 * live preview and commits the very same call on pointer-up, so what the user
 * sees while dragging is exactly what gets saved.
 */
import type { Doc, LineId } from './types';
import type { Ms } from '../lib/time';
import { clampShift, MIN_SEGMENT_MS, setSegment, shiftSegments, trimEdge } from './timing';

export type DragOp =
  | { kind: 'move'; ids: LineId[]; deltaMs: Ms }
  | { kind: 'trim'; id: LineId; edge: 'start' | 'end'; t: Ms; linked: boolean };

/** Boundaries closer than this count as touching (stamping makes them exactly equal). */
const TOUCH_MS = 1;

/** The line whose opposite edge touches `id`'s `edge`, if any. */
export function touchingNeighbour(doc: Doc, id: LineId, edge: 'start' | 'end'): LineId | null {
  const seg = doc.segments[id];
  if (!seg) return null;
  const at = edge === 'start' ? seg.startMs : seg.endMs;
  for (const [other, s] of Object.entries(doc.segments)) {
    if (other === id) continue;
    const opposite = edge === 'start' ? s.endMs : s.startMs;
    if (Math.abs(opposite - at) <= TOUCH_MS) return other;
  }
  return null;
}

export function applyDrag(doc: Doc, op: DragOp, durationMs: Ms | null): Doc {
  if (op.kind === 'move') return shiftSegments(doc, op.ids, op.deltaMs, durationMs);

  const neighbour = op.linked ? touchingNeighbour(doc, op.id, op.edge) : null;
  const n = neighbour ? doc.segments[neighbour] : null;
  let t = op.t;
  // A linked trim must not collapse the neighbour either.
  if (n && op.edge === 'end') t = Math.min(t, n.endMs - MIN_SEGMENT_MS);
  if (n && op.edge === 'start') t = Math.max(t, n.startMs + MIN_SEGMENT_MS);

  const next = trimEdge(doc, op.id, op.edge, t, durationMs);
  if (!neighbour || !n) return next;
  const moved = next.segments[op.id];
  return op.edge === 'end'
    ? setSegment(next, neighbour, { startMs: moved.endMs, endMs: n.endMs })
    : setSegment(next, neighbour, { startMs: n.startMs, endMs: moved.startMs });
}

/** Every boundary in the doc except those of `exclude`, plus the playhead. */
export function snapTargets(doc: Doc, exclude: LineId[], playheadMs: Ms): Ms[] {
  const skip = new Set(exclude);
  const out = [playheadMs];
  for (const [id, s] of Object.entries(doc.segments)) {
    if (!skip.has(id)) out.push(s.startMs, s.endMs);
  }
  return out;
}

/** Nearest target within `threshold` of `t`, else `t`. */
export function snapTime(t: Ms, targets: Ms[], threshold: Ms): Ms {
  let best = t;
  let bestDist = threshold;
  for (const target of targets) {
    const d = Math.abs(target - t);
    if (d <= bestDist) {
      best = target;
      bestDist = d;
    }
  }
  return best;
}

/** Snap a block move: whichever of the block's two outer edges lands closer to a target wins. */
export function snapMove(
  doc: Doc,
  ids: LineId[],
  deltaMs: Ms,
  targets: Ms[],
  threshold: Ms,
  dur: Ms | null,
): Ms {
  const segs = ids.map((id) => doc.segments[id]).filter(Boolean);
  if (!segs.length) return deltaMs;
  const start = Math.min(...segs.map((s) => s.startMs)) + deltaMs;
  const end = Math.max(...segs.map((s) => s.endMs)) + deltaMs;
  const byStart = snapTime(start, targets, threshold) - start;
  const byEnd = snapTime(end, targets, threshold) - end;
  const adjust =
    byStart === 0 ? byEnd : byEnd === 0 ? byStart : Math.abs(byStart) <= Math.abs(byEnd) ? byStart : byEnd;
  return clampShift(doc, ids, deltaMs + adjust, dur);
}
