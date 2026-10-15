/**
 * Selection over lines, list-style: click selects one, shift extends a range
 * from the anchor, cmd/ctrl toggles. `focus` is the line the keyboard and the
 * stamp key act on; `ids` is what bulk edits (shift, clear, delete) act on.
 */
import type { Line, LineId } from './types';

export type Selection = { ids: LineId[]; anchor: LineId | null; focus: LineId | null };

export const emptySelection: Selection = { ids: [], anchor: null, focus: null };

export type ClickMods = { shift: boolean; toggle: boolean };

export function single(id: LineId | null): Selection {
  return id ? { ids: [id], anchor: id, focus: id } : emptySelection;
}

function range(lines: Line[], a: LineId, b: LineId): LineId[] {
  const ia = lines.findIndex((l) => l.id === a);
  const ib = lines.findIndex((l) => l.id === b);
  if (ia < 0 || ib < 0) return [b];
  const [lo, hi] = ia < ib ? [ia, ib] : [ib, ia];
  return lines.slice(lo, hi + 1).map((l) => l.id);
}

export function click(sel: Selection, lines: Line[], id: LineId, mods: ClickMods): Selection {
  if (mods.shift && sel.anchor) {
    return { ids: range(lines, sel.anchor, id), anchor: sel.anchor, focus: id };
  }
  if (mods.toggle) {
    const has = sel.ids.includes(id);
    const ids = has ? sel.ids.filter((x) => x !== id) : [...sel.ids, id];
    return { ids: inListOrder(lines, ids), anchor: id, focus: has ? (ids[0] ?? null) : id };
  }
  return single(id);
}

/** Arrow keys: move focus by `dir`; with `extend`, grow the range from the anchor. */
export function step(sel: Selection, lines: Line[], dir: 1 | -1, extend: boolean): Selection {
  if (lines.length === 0) return emptySelection;
  const at = lines.findIndex((l) => l.id === sel.focus);
  const nextIndex =
    at < 0 ? (dir > 0 ? 0 : lines.length - 1) : Math.max(0, Math.min(lines.length - 1, at + dir));
  const id = lines[nextIndex].id;
  if (extend && sel.anchor) return { ids: range(lines, sel.anchor, id), anchor: sel.anchor, focus: id };
  return single(id);
}

export function all(lines: Line[]): Selection {
  if (lines.length === 0) return emptySelection;
  return { ids: lines.map((l) => l.id), anchor: lines[0].id, focus: lines[lines.length - 1].id };
}

export function inListOrder(lines: Line[], ids: LineId[]): LineId[] {
  const want = new Set(ids);
  return lines.filter((l) => want.has(l.id)).map((l) => l.id);
}

/** Drop ids that no longer exist (after undo, delete, merge, a server reload). */
export function prune(sel: Selection, lines: Line[]): Selection {
  const exists = new Set(lines.map((l) => l.id));
  const ids = sel.ids.filter((id) => exists.has(id));
  const keep = (id: LineId | null) => (id && exists.has(id) ? id : null);
  if (ids.length === sel.ids.length && keep(sel.focus) === sel.focus) return sel;
  return { ids, anchor: keep(sel.anchor), focus: keep(sel.focus) ?? ids[0] ?? null };
}

/** The line after `id`, for "stamp, then move on". */
export function nextLineId(lines: Line[], id: LineId): LineId | null {
  const i = lines.findIndex((l) => l.id === id);
  return i >= 0 && i + 1 < lines.length ? lines[i + 1].id : null;
}
