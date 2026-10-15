import { memo } from 'react';
import type { PointerEvent } from 'react';
import type { Segment } from '../../editor/types';
import { formatMs } from '../../lib/time';
import type { BlockPart } from './useSegmentDrag';
import { msToPx } from './scale';

type Props = {
  id: string;
  index: number;
  text: string;
  seg: Segment;
  zoom: number;
  selected: boolean;
  focused: boolean;
  warn: boolean;
  onPointerDown: (e: PointerEvent, id: string, part: BlockPart) => void;
  onAudition: (id: string) => void;
};

/**
 * One timed line. Alternate lines sit on alternate rows so back-to-back and
 * overlapping lines stay visually distinct.
 */
export const SegmentBlock = memo(function SegmentBlock(p: Props) {
  const left = msToPx(p.seg.startMs, p.zoom);
  const width = Math.max(4, msToPx(p.seg.endMs - p.seg.startMs, p.zoom));
  const cls = [
    'block',
    p.index % 2 ? 'block--odd' : 'block--even',
    p.selected && 'is-selected',
    p.focused && 'is-focused',
    p.warn && 'is-warn',
  ];
  return (
    <div
      className={cls.filter(Boolean).join(' ')}
      style={{ transform: `translateX(${left}px)`, width }}
      data-testid="segment-block"
      data-line-id={p.id}
      title={`${p.index + 1}. ${p.text}\n${formatMs(p.seg.startMs)} → ${formatMs(p.seg.endMs)}`}
      onPointerDown={(e) => p.onPointerDown(e, p.id, 'body')}
      onDoubleClick={() => p.onAudition(p.id)}
    >
      <span
        className="block__handle block__handle--start"
        onPointerDown={(e) => p.onPointerDown(e, p.id, 'start')}
      />
      <span className="block__label">
        <b>{p.index + 1}</b> {p.text}
      </span>
      <span
        className="block__handle block__handle--end"
        onPointerDown={(e) => p.onPointerDown(e, p.id, 'end')}
      />
    </div>
  );
});
