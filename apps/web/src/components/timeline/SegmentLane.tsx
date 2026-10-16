import { useCallback, useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import { useEditor } from '../../app/EditorContext';
import { lineWarnings } from '../../editor/warnings';
import { shiftSegments, stampStart } from '../../editor/timing';
import { single } from '../../editor/selection';
import { formatMs } from '../../lib/time';
import { useLatest } from '../../lib/useLatest';
import { draggedLineId, isLineDrag } from '../lyrics/lineDrag';
import { SegmentBlock } from './SegmentBlock';
import { useSegmentDrag } from './useSegmentDrag';
import { LaneOverlays } from './LaneOverlays';
import { msToPx, pxToMs } from './scale';

/** Time under the pointer, from the lane's own box (already offset by scroll). */
const timeAt = (e: DragEvent<HTMLElement>, zoom: number) =>
  pxToMs(e.clientX - e.currentTarget.getBoundingClientRect().left, zoom);

/** `viewLeft`: the scroller's visible left edge, so labels can stay on screen. */
export function SegmentLane({ viewLeft }: { viewLeft: number }) {
  const { editor, dispatch, player, zoom, durationMs } = useEditor();
  const { preview, op, snapAt, onPointerDown } = useSegmentDrag();
  const [dropAt, setDropAt] = useState<number | null>(null);
  const warnings = useMemo(() => lineWarnings(preview, durationMs), [preview, durationMs]);
  const selected = useMemo(() => new Set(editor.selection.ids), [editor.selection.ids]);
  const latest = useLatest(editor.doc);

  const onAudition = useCallback(
    (id: string) => {
      const seg = latest.current.segments[id];
      if (seg) player.playRange(seg.startMs, seg.endMs);
    },
    [player, latest],
  );

  /** Dropping a line places it: a timed line keeps its length, an untimed one is stamped. */
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    setDropAt(null);
    const id = draggedLineId(e);
    if (!id) return;
    const t = timeAt(e, zoom);
    const n = editor.doc.lines.findIndex((l) => l.id === id) + 1;
    dispatch({
      type: 'edit',
      label: `Place line ${n} at ${formatMs(t)}`,
      select: single(id),
      apply: (d, dur) => {
        const seg = d.segments[id];
        return seg ? shiftSegments(d, [id], t - seg.startMs, dur) : stampStart(d, id, t, null, dur);
      },
    });
  };

  return (
    <div
      className="lane"
      data-testid="segment-lane"
      onDragOver={(e) => {
        if (!isLineDrag(e)) return;
        e.preventDefault();
        setDropAt(timeAt(e, zoom));
      }}
      onDragLeave={() => setDropAt(null)}
      onDrop={onDrop}
    >
      {preview.lines.map((line, index) => {
        const seg = preview.segments[line.id];
        if (!seg) return null;
        return (
          <SegmentBlock
            key={line.id}
            id={line.id}
            index={index}
            text={line.text}
            seg={seg}
            zoom={zoom}
            selected={selected.has(line.id)}
            focused={editor.selection.focus === line.id}
            warn={warnings.has(line.id)}
            onPointerDown={onPointerDown}
            onAudition={onAudition}
          />
        );
      })}
      <LaneOverlays
        doc={editor.doc}
        preview={preview}
        selectedIds={editor.selection.ids}
        op={op}
        snapAt={snapAt}
        zoom={zoom}
        viewLeft={viewLeft}
      />
      {dropAt !== null && (
        <div className="lane__drop" style={{ transform: `translateX(${msToPx(dropAt, zoom)}px)` }} />
      )}
    </div>
  );
}
