import type { Doc } from '../../editor/types';
import type { DragOp } from '../../editor/drag';
import { selectionSpan } from '../../editor/timing';
import { msToPx } from './scale';

type Props = {
  /** The doc as committed (not the drag preview): ghosts sit where blocks were. */
  doc: Doc;
  /** The drag preview: the selection frame follows the blocks as they move. */
  preview: Doc;
  selectedIds: string[];
  op: DragOp | null;
  snapAt: number | null;
  zoom: number;
  viewLeft: number;
};

const box = (startMs: number, endMs: number, zoom: number) => ({
  transform: `translateX(${msToPx(startMs, zoom)}px)`,
  width: Math.max(4, msToPx(endMs - startMs, zoom)),
});

/**
 * What a drag or a selection will affect, drawn on the lane (after the
 * wireframe): a dashed "origin" where moved blocks started, a "snap" guide
 * through the waveform when an edge catches, and a frame around a multi-line
 * selection saying how many segments an edit applies to.
 */
export function LaneOverlays({ doc, preview, selectedIds, op, snapAt, zoom, viewLeft }: Props) {
  const timed = selectedIds.filter((id) => preview.segments[id]);
  const span = timed.length > 1 ? selectionSpan(preview, timed) : null;
  // When the frame starts left of the visible area, slide its label right so it
  // stays readable - but never past the frame's own right end.
  const labelLeft = span
    ? Math.max(
        0,
        Math.min(viewLeft - msToPx(span.startMs, zoom), msToPx(span.endMs - span.startMs, zoom) - 130),
      )
    : 0;
  const ghosts = op?.kind === 'move' && op.deltaMs !== 0 ? op.ids.filter((id) => doc.segments[id]) : [];

  return (
    <>
      {ghosts.map((id) => (
        <div
          key={id}
          // Same row as the block it came from (blocks alternate rows by line index).
          className={`lane__ghost${doc.lines.findIndex((l) => l.id === id) % 2 ? ' lane__ghost--odd' : ''}`}
          style={box(doc.segments[id].startMs, doc.segments[id].endMs, zoom)}
          data-testid="drag-origin"
        >
          origin
        </div>
      ))}
      {span && (
        <div
          className="lane__selection"
          style={box(span.startMs, span.endMs, zoom)}
          data-testid="selection-frame"
        >
          <span className="lane__selection-label" style={{ left: 8 + labelLeft }}>
            {selectedIds.length} lines selected
          </span>
        </div>
      )}
      {snapAt !== null && (
        <div
          className="lane__snap"
          style={{ transform: `translateX(${msToPx(snapAt, zoom)}px)` }}
          data-testid="snap-guide"
        >
          <span>snap</span>
        </div>
      )}
    </>
  );
}
