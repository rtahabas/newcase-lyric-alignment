/**
 * Inspector edits as plain functions of the command context: validate, then
 * dispatch one labelled, undoable edit. Returning a message (instead of
 * clamping) lets the field show why a value was refused.
 */
import type { Dispatch } from 'react';
import type { EditorAction, EditorState } from '../../editor/reducer';
import type { Ms } from '../../lib/time';
import { formatMs } from '../../lib/time';
import { MIN_SEGMENT_MS, setSegment, stampStart } from '../../editor/timing';
import { deleteLines, mergeLines, splitLine } from '../../editor/lines';
import { single } from '../../editor/selection';

type Ctx = { editor: EditorState; dispatch: Dispatch<EditorAction>; durationMs: Ms | null };

const lineNo = (c: Ctx, id: string) => c.editor.doc.lines.findIndex((l) => l.id === id) + 1;

export function setStart(c: Ctx, id: string, t: Ms): string | null {
  const seg = c.editor.doc.segments[id];
  if (c.durationMs !== null && t >= c.durationMs) return 'Start is past the end of the audio';
  if (seg && t > seg.endMs - MIN_SEGMENT_MS) return `Start must be before the end (${formatMs(seg.endMs)})`;
  const label = `Set line ${lineNo(c, id)} start to ${formatMs(t)}`;
  c.dispatch({
    type: 'edit',
    label,
    apply: (d, dur) =>
      seg ? setSegment(d, id, { startMs: t, endMs: seg.endMs }) : stampStart(d, id, t, null, dur),
  });
  return null;
}

export function setEnd(c: Ctx, id: string, t: Ms): string | null {
  const seg = c.editor.doc.segments[id];
  if (!seg) return 'Set a start first';
  if (t < seg.startMs + MIN_SEGMENT_MS) return `End must be after the start (${formatMs(seg.startMs)})`;
  const label = `Set line ${lineNo(c, id)} end to ${formatMs(t)}`;
  c.dispatch({ type: 'edit', label, apply: (d) => setSegment(d, id, { startMs: seg.startMs, endMs: t }) });
  return null;
}

export function split(c: Ctx, id: string, at: number, playheadMs: Ms) {
  c.dispatch({
    type: 'edit',
    label: `Split line ${lineNo(c, id)}`,
    apply: (d) => splitLine(d, id, at, playheadMs).doc,
  });
}

export function mergeWithNext(c: Ctx, id: string, nextId: string) {
  const n = lineNo(c, id);
  c.dispatch({
    type: 'edit',
    label: `Merge lines ${n} and ${n + 1}`,
    apply: (d) => mergeLines(d, id, nextId),
  });
}

/** Deletes lines; focus moves to the line after the last deleted one, or before the first. */
export function removeLines(c: Ctx, ids: string[]) {
  const { lines } = c.editor.doc;
  const gone = new Set(ids);
  const last = Math.max(...ids.map((id) => lines.findIndex((l) => l.id === id)));
  const after = lines.slice(last + 1).find((l) => !gone.has(l.id));
  const before = [...lines.slice(0, last)].reverse().find((l) => !gone.has(l.id));
  const label = ids.length === 1 ? `Delete line ${lineNo(c, ids[0])}` : `Delete ${ids.length} lines`;
  c.dispatch({
    type: 'edit',
    label,
    apply: (d) => deleteLines(d, ids),
    select: single(after?.id ?? before?.id ?? null),
  });
}
