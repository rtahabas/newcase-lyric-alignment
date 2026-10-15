/**
 * Native drag-and-drop of a lyric line: within the list (reorder / merge) and
 * onto the timeline (place). The payload is the line id under a private MIME
 * type, so other drags (files, text) are never mistaken for a line.
 */
import type { DragEvent } from 'react';

export const LINE_MIME = 'application/x-lyric-line';

export function startLineDrag(e: DragEvent, id: string): void {
  e.dataTransfer.setData(LINE_MIME, id);
  e.dataTransfer.effectAllowed = 'move';
}

export const isLineDrag = (e: DragEvent) => e.dataTransfer.types.includes(LINE_MIME);

export const draggedLineId = (e: DragEvent) => e.dataTransfer.getData(LINE_MIME) || null;

export type DropZone = 'before' | 'merge' | 'after';

/** Top quarter inserts before, bottom quarter after, the middle merges. */
export function dropZone(e: DragEvent<HTMLElement>): DropZone {
  const r = e.currentTarget.getBoundingClientRect();
  const y = (e.clientY - r.top) / r.height;
  return y < 0.25 ? 'before' : y > 0.75 ? 'after' : 'merge';
}
