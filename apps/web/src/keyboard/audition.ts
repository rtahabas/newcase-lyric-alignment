/**
 * Boundary-local listening, after Aegisub: check a start or an end without
 * sitting through the whole line (decisions.md D3.2).
 */
import type { CommandContext } from './types';
import { selectionSpan } from '../editor/timing';

const AROUND_BEFORE_MS = 1000;
const AROUND_AFTER_MS = 1200;

const span = (c: CommandContext) => selectionSpan(c.editor.doc, c.editor.selection.ids);

export function auditionSelection(c: CommandContext) {
  const s = span(c);
  if (s) c.player.playRange(s.startMs, s.endMs);
}

export function auditionAroundStart(c: CommandContext) {
  const s = span(c);
  if (s) c.player.playRange(Math.max(0, s.startMs - AROUND_BEFORE_MS), s.startMs + AROUND_AFTER_MS);
}

export function auditionAroundEnd(c: CommandContext) {
  const s = span(c);
  if (s) c.player.playRange(Math.max(0, s.endMs - AROUND_AFTER_MS), s.endMs + AROUND_BEFORE_MS);
}
