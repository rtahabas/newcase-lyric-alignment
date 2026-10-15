/**
 * Pure edits on the lyric sheet itself: add, delete, reorder, merge, split.
 * Each keeps timings sane - nothing here invents a time, and nothing silently
 * drops one that could be kept.
 */
import type { Doc, Line, LineId, Segment } from './types';
import type { Ms } from '../lib/time';
import { newLineId } from '../lib/ids';
import { indexOfLine, MIN_SEGMENT_MS } from './timing';

export function deleteLines(doc: Doc, ids: LineId[]): Doc {
  const drop = new Set(ids);
  const segments = { ...doc.segments };
  for (const id of ids) delete segments[id];
  return { lines: doc.lines.filter((l) => !drop.has(l.id)), segments };
}

export function editText(doc: Doc, id: LineId, text: string): Doc {
  return { ...doc, lines: doc.lines.map((l) => (l.id === id ? { ...l, text } : l)) };
}

/** Insert lines after index `after` (-1 = at the top). Returns the new ids too. */
export function insertLines(doc: Doc, after: number, texts: string[]): { doc: Doc; ids: LineId[] } {
  const created: Line[] = texts.map((text) => ({ id: newLineId(), text }));
  const lines = [...doc.lines];
  lines.splice(after + 1, 0, ...created);
  return { doc: { ...doc, lines }, ids: created.map((l) => l.id) };
}

/** Replace the whole sheet. Timings for the old lines go with them. */
export function replaceSheet(texts: string[]): Doc {
  return { lines: texts.map((text) => ({ id: newLineId(), text })), segments: {} };
}

/** Move line `id` so it ends up at index `to`. */
export function moveLine(doc: Doc, id: LineId, to: number): Doc {
  const from = indexOfLine(doc, id);
  const target = Math.max(0, Math.min(doc.lines.length - 1, to));
  if (from < 0 || target === from) return doc;
  const lines = [...doc.lines];
  const [line] = lines.splice(from, 1);
  lines.splice(target, 0, line);
  return { ...doc, lines };
}

/**
 * Merge two lines. The result keeps the earlier line's id and place; text joins
 * in list order; timing is the span of whichever halves were timed, so a merge
 * never loses a placed time.
 */
export function mergeLines(doc: Doc, aId: LineId, bId: LineId): Doc {
  const ia = indexOfLine(doc, aId);
  const ib = indexOfLine(doc, bId);
  if (ia < 0 || ib < 0 || ia === ib) return doc;
  const first = doc.lines[Math.min(ia, ib)];
  const second = doc.lines[Math.max(ia, ib)];
  const timed = [doc.segments[first.id], doc.segments[second.id]].filter((s): s is Segment => !!s);
  const segments = { ...doc.segments };
  delete segments[second.id];
  if (timed.length) {
    segments[first.id] = {
      startMs: Math.min(...timed.map((s) => s.startMs)),
      endMs: Math.max(...timed.map((s) => s.endMs)),
    };
  }
  const text = `${first.text} ${second.text}`.replace(/\s+/g, ' ').trim();
  const lines = doc.lines
    .filter((l) => l.id !== second.id)
    .map((l) => (l.id === first.id ? { ...l, text } : l));
  return { lines, segments };
}

/**
 * Split a line's text at character `at`. A timed line splits its time too: at
 * `atMs` when that falls inside the segment (the playhead - "split where I hear
 * the break"), otherwise in proportion to the text. A half shorter than
 * MIN_SEGMENT_MS is left untimed rather than given an invented time.
 */
export function splitLine(
  doc: Doc,
  id: LineId,
  at: number,
  atMs: Ms | null,
): { doc: Doc; newId: LineId | null } {
  const i = indexOfLine(doc, id);
  if (i < 0) return { doc, newId: null };
  const line = doc.lines[i];
  const left = line.text.slice(0, at).trim();
  const right = line.text.slice(at).trim();
  if (!left || !right) return { doc, newId: null };

  const newId = newLineId();
  const lines = [...doc.lines];
  lines.splice(i, 1, { id: line.id, text: left }, { id: newId, text: right });
  const segments = { ...doc.segments };
  const seg = doc.segments[id];
  if (seg) {
    const inside = atMs !== null && atMs > seg.startMs && atMs < seg.endMs;
    const ratio = left.length / (left.length + right.length);
    const cut = Math.round(inside ? atMs : seg.startMs + (seg.endMs - seg.startMs) * ratio);
    if (cut - seg.startMs >= MIN_SEGMENT_MS) segments[id] = { startMs: seg.startMs, endMs: cut };
    else delete segments[id];
    if (seg.endMs - cut >= MIN_SEGMENT_MS) segments[newId] = { startMs: cut, endMs: seg.endMs };
  }
  return { doc: { lines, segments }, newId };
}
