/**
 * Pointer drags on segment blocks. Produces a DragOp for live preview and
 * commits it as one undoable edit on release. Snapping is on unless Alt is
 * held; Alt also unlinks touching edges (decisions.md D3.3). Escape cancels.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useEditor } from '../../app/EditorContext';
import type { DragOp } from '../../editor/drag';
import { applyDrag, snapMove, snapTargets, snapTime, touchingNeighbour } from '../../editor/drag';
import { click } from '../../editor/selection';
import { formatMs } from '../../lib/time';
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

function label(op: DragOp, lineNo: (id: string) => number): string {
  if (op.kind === 'move') {
    const what = op.ids.length === 1 ? `line ${lineNo(op.ids[0])}` : `${op.ids.length} lines`;
    return `Move ${what} ${op.deltaMs >= 0 ? '+' : '−'}${formatMs(Math.abs(op.deltaMs))}`;
  }
  return `Trim line ${lineNo(op.id)} ${op.edge} to ${formatMs(op.t)}`;
}

export function useSegmentDrag() {
  const { editor, dispatch, player, zoom, durationMs } = useEditor();
  const [op, setOp] = useState<DragOp | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const latest = useLatest({ editor, zoom, durationMs });

  const onPointerDown = useCallback(
    (e: ReactPointerEvent, id: string, part: BlockPart) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();
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
    const show = (g: Gesture, next: DragOp | null) => {
      g.op = next;
      setOp(next);
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
        const delta = snapMove(doc, g.ids, pxToMs(dx, z), snapTargets(doc, g.ids, playhead), threshold, dur);
        show(g, { kind: 'move', ids: g.ids, deltaMs: delta });
        return;
      }
      const seg = doc.segments[g.id];
      if (!seg) return;
      const edge = g.part;
      const neighbour = touchingNeighbour(doc, g.id, edge);
      const raw = (edge === 'start' ? seg.startMs : seg.endMs) + pxToMs(dx, z);
      const t = snapTime(raw, snapTargets(doc, neighbour ? [g.id, neighbour] : [g.id], playhead), threshold);
      show(g, { kind: 'trim', id: g.id, edge, t, linked: !free });
    };
    const up = () => {
      const current = gesture.current?.op;
      const ed = latest.current.editor;
      gesture.current = null;
      if (!current) return;
      const lineNo = (id: string) => ed.doc.lines.findIndex((l) => l.id === id) + 1;
      dispatch({
        type: 'edit',
        label: label(current, lineNo),
        apply: (d, dur) => applyDrag(d, current, dur),
      });
      setOp(null);
    };
    const abort = () => {
      gesture.current = null;
      setOp(null);
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
  return { preview, dragging: op !== null, onPointerDown };
}
