/**
 * Editor state: the Doc, its undo history, the selection, and the one piece of
 * transient stamping state (`openId`). Every Doc change goes through `edit`
 * (or the stamp actions), so every Doc change is undoable and labelled - the
 * label is what the UI shows as "what just happened" and on the undo button.
 */
import type { Doc, LineId } from './types';
import { emptyDoc } from './types';
import type { Ms } from '../lib/time';
import { formatMs } from '../lib/time';
import { stampEnd, stampStart } from './timing';
import type { Selection } from './selection';
import { emptySelection, nextLineId, prune, single } from './selection';

const HISTORY_LIMIT = 300;

/** A history step: the Doc and selection *before* the edit, and what the edit was. */
type Entry = { doc: Doc; label: string; selection: Selection };

export type EditorState = {
  doc: Doc;
  past: Entry[];
  future: Entry[];
  selection: Selection;
  /** Last stamped line whose end is still provisional; the next stamp closes it. */
  openId: LineId | null;
  /** Human-readable description of the last change, including undo/redo. */
  lastAction: string | null;
  durationMs: Ms | null;
};

export type EditFn = (doc: Doc, durationMs: Ms | null) => Doc;

export type EditorAction =
  | { type: 'load'; doc: Doc }
  | { type: 'duration'; ms: Ms | null }
  | { type: 'edit'; label: string; apply: EditFn; select?: Selection }
  /** `rawMs`: where the key press actually was, when the stamp was snapped to an onset. */
  | { type: 'stamp'; t: Ms; rawMs?: Ms }
  | { type: 'stampEnd'; t: Ms }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'select'; selection: Selection };

export const initialEditor: EditorState = {
  doc: emptyDoc(),
  past: [],
  future: [],
  selection: emptySelection,
  openId: null,
  lastAction: null,
  durationMs: null,
};

/** Push `doc` as the new present, recording the old one under `label`. */
function commit(s: EditorState, doc: Doc, label: string, selection = s.selection): EditorState {
  if (doc === s.doc) return selection === s.selection ? s : { ...s, selection };
  const past = [...s.past, { doc: s.doc, label, selection: s.selection }].slice(-HISTORY_LIMIT);
  return { ...s, doc, past, future: [], lastAction: label, selection: prune(selection, doc.lines) };
}

const lineLabel = (doc: Doc, id: LineId) => `line ${doc.lines.findIndex((l) => l.id === id) + 1}`;

function stamp(s: EditorState, t: Ms, rawMs?: Ms): EditorState {
  const id = s.selection.focus ?? s.doc.lines.find((l) => !s.doc.segments[l.id])?.id;
  if (!id) return s;
  const doc = stampStart(s.doc, id, t, s.openId, s.durationMs);
  const at = doc.segments[id]?.startMs ?? t;
  const moved = rawMs === undefined ? 0 : at - rawMs;
  const snapped = moved ? ` · snapped ${moved > 0 ? '+' : '−'}${Math.abs(moved)} ms to the onset` : '';
  const label = `Stamp ${lineLabel(doc, id)} at ${formatMs(at)}${snapped}`;
  const next = commit(s, doc, label, single(nextLineId(doc.lines, id) ?? id));
  // Re-stamping a start keeps a good end (stampStart); a kept end is not
  // provisional, so the next stamp must not pull it.
  const before = s.doc.segments[id];
  const keptEnd = !!before && before.endMs === doc.segments[id]?.endMs;
  return { ...next, openId: keptEnd ? null : id };
}

function stampLineEnd(s: EditorState, t: Ms): EditorState {
  const id = s.openId ?? s.selection.focus;
  if (!id) return s;
  const doc = stampEnd(s.doc, id, t);
  if (doc === s.doc) return s;
  return { ...commit(s, doc, `End ${lineLabel(doc, id)} at ${formatMs(t)}`), openId: null };
}

function travel(s: EditorState, dir: 'undo' | 'redo'): EditorState {
  const from = dir === 'undo' ? s.past : s.future;
  const entry = from[from.length - 1];
  if (!entry) return s;
  const rest = from.slice(0, -1);
  const moved = { doc: s.doc, label: entry.label, selection: s.selection };
  const past = dir === 'undo' ? rest : [...s.past, moved];
  const future = dir === 'undo' ? [...s.future, moved] : rest;
  const verb = dir === 'undo' ? 'Undid' : 'Redid';
  return {
    ...s,
    doc: entry.doc,
    past,
    future,
    openId: null,
    lastAction: `${verb}: ${entry.label}`,
    // Undoing a stamp puts focus back on that line, so Enter re-stamps it.
    selection: prune(entry.selection, entry.doc.lines),
  };
}

export function editorReducer(s: EditorState, a: EditorAction): EditorState {
  switch (a.type) {
    case 'load':
      return {
        ...initialEditor,
        durationMs: s.durationMs,
        doc: a.doc,
        selection: single(a.doc.lines[0]?.id ?? null),
      };
    case 'duration':
      return { ...s, durationMs: a.ms };
    case 'edit':
      return commit(s, a.apply(s.doc, s.durationMs), a.label, a.select ?? s.selection);
    case 'stamp':
      return stamp(s, a.t, a.rawMs);
    case 'stampEnd':
      return stampLineEnd(s, a.t);
    case 'undo':
    case 'redo':
      return travel(s, a.type);
    case 'select':
      return { ...s, selection: prune(a.selection, s.doc.lines), openId: null };
  }
}

export const undoLabel = (s: EditorState) => s.past[s.past.length - 1]?.label ?? null;
export const redoLabel = (s: EditorState) => s.future[s.future.length - 1]?.label ?? null;
