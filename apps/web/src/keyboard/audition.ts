/**
 * Boundary-local listening, after Aegisub: check a start or an end without
 * sitting through the whole line (decisions.md D3.2).
 */
import type { CommandContext } from './types';

const AROUND_BEFORE_MS = 1000;
const AROUND_AFTER_MS = 1200;

function selectionSpan(c: CommandContext): { start: number; end: number } | null {
  const segs = c.editor.selection.ids.map((id) => c.editor.doc.segments[id]).filter(Boolean);
  if (!segs.length) return null;
  return { start: Math.min(...segs.map((s) => s.startMs)), end: Math.max(...segs.map((s) => s.endMs)) };
}

export function auditionSelection(c: CommandContext) {
  const span = selectionSpan(c);
  if (span) c.player.playRange(span.start, span.end);
}

export function auditionAroundStart(c: CommandContext) {
  const span = selectionSpan(c);
  if (span) c.player.playRange(Math.max(0, span.start - AROUND_BEFORE_MS), span.start + AROUND_AFTER_MS);
}

export function auditionAroundEnd(c: CommandContext) {
  const span = selectionSpan(c);
  if (span) c.player.playRange(Math.max(0, span.end - AROUND_AFTER_MS), span.end + AROUND_BEFORE_MS);
}
