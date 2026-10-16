/**
 * Pointer drags on segment blocks. Produces a DragOp for live preview and
 * commits it as one undoable edit on release. Snapping is on unless Alt is
 * held; Alt also unlinks touching edges (decisions.md D3.3). Escape cancels.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useEditor } from '../../app/EditorContext';
import type { DragOp } from '../../editor/drag';
import { applyDrag, dragLabel, snapMove, snapTargets, snapTime, touchingNeighbour } from '../../editor/drag';
import { click } from '../../editor/selection';
import { useLatest } from '../../lib/useLatest';
import { pxToMs, SNAP_PX } from './scale';

export type BlockPart = 'body' | 'start' | 'end';
/** `op` mirrors the preview state synchronously, so release never commits a stale frame. */
type Gesture = {
  startX: number;
  part: BlockPart;
  id: string;
  ids: string[];
  moved: boolean;
  op: DragOp | null;
};

const DRAG_THRESHOLD_PX = 3;

export function useSegmentDrag() {
  const { editor, dispatch, player, zoom, durationMs } = useEditor();
  const [op, setOp] = useState<DragOp | null>(null);
  /** Where the dragged edge snapped, for the guide line; null when it did not. */
  const [snapAt, setSnapAt] = useState<number | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const latest = useLatest({ editor, zoom, durationMs });

  const onPointerDown = useCallback(
    (e: ReactPointerEvent, id: string, part: BlockPart) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault(); // no text selection while dragging - but that also stops focus moving, so:
      // commit a half-typed Inspector field (they commit on blur) before the selection
      // change unmounts it.
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      const { selection, doc } = latest.current.editor;
      const mods = { shift: e.shiftKey, toggle: e.metaKey || e.ctrlKey };
      const keep = part === 'body' && selection.ids.includes(id) && !mods.shift && !mods.toggle;
      const next = keep ? selection : click(selection, doc.lines, id, mods);
      if (!keep) dispatch({ type: 'select', selection: next });
      gesture.current = {
        startX: e.clientX,
        part,
        id,
        ids: next.ids.includes(id) ? next.ids : [id],
        moved: false,
        op: null,
      };
    },
    [dispatch, latest],
  );

  useEffect(() => {
    const show = (g: Gesture, next: DragOp | null, at: number | null = null) => {
      g.op = next;
      setOp(next);
      setSnapAt(at);
    };
    const move = (e: PointerEvent) => {
      const g = gesture.current;
      if (!g) return;
      const dx = e.clientX - g.startX;
      if (!g.moved && Math.abs(dx) < DRAG_THRESHOLD_PX) return;
      g.moved = true;
      const { editor: ed, zoom: z, durationMs: dur } = latest.current;
      const doc = ed.doc;
      const free = e.altKey;
      const threshold = free ? 0 : pxToMs(SNAP_PX, z);
      const playhead = player.timeMs();
      if (g.part === 'body') {
        const snap = snapMove(doc, g.ids, pxToMs(dx, z), snapTargets(doc, g.ids, playhead), threshold, dur);
        show(g, { kind: 'move', ids: g.ids, deltaMs: snap.deltaMs }, snap.snapAt);
        return;
      }
      const seg = doc.segments[g.id];
      if (!seg) return;
      const edge = g.part;
      const neighbour = touchingNeighbour(doc, g.id, edge);
      const raw = (edge === 'start' ? seg.startMs : seg.endMs) + pxToMs(dx, z);
      const t = snapTime(raw, snapTargets(doc, neighbour ? [g.id, neighbour] : [g.id], playhead), threshold);
      show(g, { kind: 'trim', id: g.id, edge, t, linked: !free }, t !== raw ? t : null);
    };
    const up = () => {
      const current = gesture.current?.op;
      const ed = latest.current.editor;
      gesture.current = null;
      if (!current) return;
      const lineNo = (id: string) => ed.doc.lines.findIndex((l) => l.id === id) + 1;
      dispatch({
        type: 'edit',
        label: dragLabel(current, lineNo),
        apply: (d, dur) => applyDrag(d, current, dur),
      });
      setOp(null);
      setSnapAt(null);
    };
    const abort = () => {
      gesture.current = null;
      setOp(null);
      setSnapAt(null);
    };
    const cancel = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && gesture.current) abort();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('keydown', cancel);
    window.addEventListener('pointercancel', abort);
    return () => {
      window.removeEventListener('pointercancel', abort);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('keydown', cancel);
    };
  }, [dispatch, player, latest]);

  const preview = op ? applyDrag(editor.doc, op, durationMs) : editor.doc;
  return { preview, op, snapAt, onPointerDown };
}
