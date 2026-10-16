import { memo, useState } from 'react';
import type { DragEvent, MouseEvent } from 'react';
import { AlertTriangle, GripVertical } from 'lucide-react';
import type { Line, Segment } from '../../editor/types';
import type { Warning } from '../../editor/warnings';
import { WARNING_TEXT } from '../../editor/warnings';
import { formatMs } from '../../lib/time';
import type { DropZone } from './lineDrag';
import { dropZone, endLineDrag, isLineDrag, startLineDrag } from './lineDrag';

type Props = {
  line: Line;
  index: number;
  segment: Segment | undefined;
  selected: boolean;
  focused: boolean;
  playing: boolean;
  warnings: Warning[] | undefined;
  onClick: (id: string, e: MouseEvent) => void;
  /** Double-click: play the line, or jump to where an untimed line should start. */
  onJump: (id: string) => void;
  onDropLine: (target: string, zone: DropZone, e: DragEvent) => void;
};

export const LyricRow = memo(function LyricRow(p: Props) {
  const [zone, setZone] = useState<DropZone | null>(null);
  const cls = [
    'lyric',
    p.segment ? 'lyric--timed' : 'lyric--untimed',
    p.selected && 'is-selected',
    p.focused && 'is-focused',
    p.playing && 'is-playing',
    zone && `drop-${zone}`,
  ];

  return (
    <li
      className={cls.filter(Boolean).join(' ')}
      data-line-id={p.line.id}
      data-testid="lyric-row"
      aria-selected={p.selected}
      role="option"
      draggable
      onDragStart={(e) => startLineDrag(e, p.line.id, p.index)}
      onDragEnd={endLineDrag}
      onDragOver={(e) => {
        if (!isLineDrag(e)) return;
        e.preventDefault();
        setZone(dropZone(e, p.index));
      }}
      onDragLeave={() => setZone(null)}
      onDrop={(e) => {
        setZone(null);
        p.onDropLine(p.line.id, dropZone(e, p.index), e);
      }}
      onClick={(e) => p.onClick(p.line.id, e)}
      onDoubleClick={() => p.onJump(p.line.id)}
      title={
        p.segment
          ? 'Double-click to hear this line'
          : 'Double-click to play towards this line, then press Enter as it starts'
      }
    >
      <GripVertical className="lyric__grip" size={14} aria-hidden />
      <span className="lyric__index">{p.index + 1}</span>
      <span className="lyric__text">{p.line.text}</span>
      {p.warnings && (
        <span className="lyric__warn" title={p.warnings.map((w) => WARNING_TEXT[w]).join('\n')}>
          <AlertTriangle size={14} aria-label={p.warnings.map((w) => WARNING_TEXT[w]).join(', ')} />
        </span>
      )}
      <span
        className="lyric__time"
        data-testid="lyric-time"
        aria-label={p.segment ? undefined : 'not timed yet'}
      >
        {p.segment ? formatMs(p.segment.startMs) : p.focused ? <kbd>Enter</kbd> : '—'}
      </span>
    </li>
  );
});
