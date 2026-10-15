import type { Ms } from '../lib/time';

/** Client-owned and opaque. Never derived from text: lyrics repeat verbatim. */
export type LineId = string;

/** A line's position is its index in `Doc.lines`; there is no separate field. */
export type Line = { id: LineId; text: string };

export type Segment = { startMs: Ms; endMs: Ms };

/**
 * The thing being edited, and the only thing undo/redo snapshots.
 * A line carries at most one segment (the API enforces the same).
 */
export type Doc = {
  lines: Line[];
  segments: Record<LineId, Segment>;
};

export const emptyDoc = (): Doc => ({ lines: [], segments: {} });
