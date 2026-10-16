/**
 * Native drag-and-drop of a lyric line: within the list (reorder / merge) and
 * onto the timeline (place). The payload is the line id under a private MIME
 * type, so other drags (files, text) are never mistaken for a line.
 */
import type { DragEvent } from 'react';

export const LINE_MIME = 'application/x-lyric-line';

/**
 * The row being dragged. dataTransfer cannot be read during dragover (only on
 * drop), so the source's position is kept here for the drop-zone preview.
 */
let dragged: { id: string; index: number } | null = null;

export function startLineDrag(e: DragEvent, id: string, index: number): void {
  e.dataTransfer.setData(LINE_MIME, id);
  e.dataTransfer.effectAllowed = 'move';
  dragged = { id, index };
}

export function endLineDrag(): void {
  dragged = null;
}

export const isLineDrag = (e: DragEvent) => e.dataTransfer.types.includes(LINE_MIME);

export const draggedLineId = (e: DragEvent) => e.dataTransfer.getData(LINE_MIME) || null;

export type DropZone = 'before' | 'merge' | 'after';

/**
 * Top quarter inserts before, bottom quarter after, the middle merges - but only
 * with a neighbour. Dropping on the middle of a distant row moves the line there
 * instead: merging line 3 into line 10 would scramble the text order and span
 * everything in between.
 */
export function dropZone(e: DragEvent<HTMLElement>, targetIndex: number): DropZone {
  const r = e.currentTarget.getBoundingClientRect();
  const y = (e.clientY - r.top) / r.height;
  const zone: DropZone = y < 0.25 ? 'before' : y > 0.75 ? 'after' : 'merge';
  if (zone !== 'merge' || !dragged || Math.abs(dragged.index - targetIndex) === 1) return zone;
  return dragged.index < targetIndex ? 'after' : 'before';
}
