import type { KeyboardEvent, PointerEvent } from 'react';

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  /** +1 when dragging right widens the pane (it sits left of the handle), -1 otherwise. */
  direction: 1 | -1;
  onResize: (px: number) => void;
  onReset: () => void;
  testId: string;
};

const STEP = 16;

/**
 * A draggable divider between two panes. Also a keyboard control (Tab to it,
 * ←/→ resize, Shift for bigger steps); double-click restores the default width.
 * Arrow keys are consumed here, so they do not also seek the track.
 */
export function ResizeHandle({ label, value, min, max, direction, onResize, onReset, testId }: Props) {
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const handle = e.currentTarget;
    const startX = e.clientX;
    const startValue = value;
    handle.setPointerCapture(e.pointerId);
    document.body.classList.add('is-resizing');
    const move = (ev: globalThis.PointerEvent) => onResize(startValue + direction * (ev.clientX - startX));
    const up = () => {
      document.body.classList.remove('is-resizing');
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const sign = e.key === 'ArrowRight' ? 1 : -1;
    onResize(value + sign * direction * (e.shiftKey ? STEP * 4 : STEP));
  };

  return (
    <div
      className="resize-handle"
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      title={`${label} — drag, or ←/→; double-click to reset`}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onDoubleClick={onReset}
      data-testid={testId}
    />
  );
}
