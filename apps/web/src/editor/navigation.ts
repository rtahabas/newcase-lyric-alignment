/**
 * "Take me to this line." A timed line plays itself. An untimed line has no
 * time, so the best the editor can do is a window where it should fall: after
 * the previous timed line, before the next one. Nothing is invented beyond
 * that - with no timed line before it, there is nowhere honest to jump to.
 */
import type { Doc, LineId } from './types';
import type { Ms } from '../lib/time';

/** Lead-in before an untimed line's likely start, so its first word is not missed. */
export const LEAD_IN_MS = 1500;

export type JumpTarget =
  | { kind: 'timed'; startMs: Ms; endMs: Ms }
  /** `fromMs` null: nothing before it is timed, so its position is unknown. */
  | { kind: 'untimed'; fromMs: Ms | null; untilMs: Ms | null };

export function jumpTarget(doc: Doc, id: LineId): JumpTarget | null {
  const index = doc.lines.findIndex((l) => l.id === id);
  if (index < 0) return null;
  const seg = doc.segments[id];
  if (seg) return { kind: 'timed', startMs: seg.startMs, endMs: seg.endMs };
  const before = doc.lines
    .slice(0, index)
    .reverse()
    .find((l) => doc.segments[l.id]);
  const after = doc.lines.slice(index + 1).find((l) => doc.segments[l.id]);
  return {
    kind: 'untimed',
    fromMs: before ? Math.max(0, doc.segments[before.id].endMs - LEAD_IN_MS) : null,
    untilMs: after ? doc.segments[after.id].startMs : null,
  };
}

/**
 * Where to put the playhead for an untimed line, or null to leave it alone.
 * Leaves it alone when the position is unknown, or when playback is already
 * inside the line's window - double-clicking must not restart what is playing.
 */
export function untimedSeek(
  target: { fromMs: Ms | null; untilMs: Ms | null },
  nowMs: Ms,
  playing: boolean,
): Ms | null {
  if (target.fromMs === null) return null;
  const inside = nowMs >= target.fromMs && (target.untilMs === null || nowMs < target.untilMs);
  return playing && inside ? null : target.fromMs;
}
