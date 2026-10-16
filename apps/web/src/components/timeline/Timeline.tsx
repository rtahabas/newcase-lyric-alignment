import { useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { useEditor } from '../../app/EditorContext';
import type { WaveformState } from '../../audio/useWaveform';
import { Ruler } from './Ruler';
import { WaveformCanvas } from './WaveformCanvas';
import { SegmentLane } from './SegmentLane';
import { Playhead } from './Playhead';
import { useViewport } from './useViewport';
import { useZoomBehaviour } from './useZoomBehaviour';
import { useRevealFocus } from './useRevealFocus';
import { msToPx, pxToMs } from './scale';
import { Skeleton } from '../../ui/Skeleton';
import { WaveSkeleton } from '../AppSkeleton';

const WAVE_HEIGHT = 120;

/** Ruler, waveform, segment lane and playhead, in one horizontally scrolling strip. */
export function Timeline({ wave }: { wave: WaveformState }) {
  const { player, durationMs, zoom, setZoom, onsets, snapOn } = useEditor();
  const scroller = useRef<HTMLDivElement>(null);
  const view = useViewport(scroller);
  // While scrubbing, the view holds still so the time under the pointer stays put.
  const [scrubbing, setScrubbing] = useState(false);
  useZoomBehaviour(scroller, zoom, setZoom, player);
  useRevealFocus(scroller);

  /** Click (or press-and-drag) on the ruler or waveform scrubs the playhead. */
  const scrub = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    // No text selection while scrubbing (the ruler's numbers were getting selected);
    // preventing it also keeps focus where it is, so commit any half-typed field first.
    e.preventDefault();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    const area = e.currentTarget;
    setScrubbing(true);
    document.body.classList.add('is-scrubbing');
    // Measured on every move: the view may scroll under the pointer (playhead follow).
    const seekTo = (clientX: number) =>
      player.seek(pxToMs(clientX - area.getBoundingClientRect().left, zoom));
    seekTo(e.clientX);
    const move = (ev: globalThis.PointerEvent) => seekTo(ev.clientX);
    const up = () => {
      setScrubbing(false);
      document.body.classList.remove('is-scrubbing');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  // The scroller is always mounted so the viewport is measured from the first frame.
  return (
    <div className="timeline">
      <div
        ref={scroller}
        className="timeline__scroller"
        data-testid="timeline"
        // Scrollable, so reachable by keyboard (axe: scrollable-region-focusable).
        tabIndex={0}
        role="region"
        aria-label="Timeline: waveform and timed lines"
      >
        {durationMs === null && (
          <div className="timeline__skeleton" role="status">
            <Skeleton h={24} />
            <WaveSkeleton />
            <span className="visually-hidden">Loading audio…</span>
          </div>
        )}
        {durationMs !== null && (
          <div
            className="timeline__content"
            // The snap guide reaches up through the ruler and waveform above the lane.
            style={{ width: msToPx(durationMs, zoom), ['--wave-h' as string]: `${WAVE_HEIGHT}px` }}
          >
            <div
              className="timeline__scrub"
              onPointerDown={scrub}
              data-testid="scrub-area"
              title="Click to seek"
            >
              <Ruler zoom={zoom} durationMs={durationMs} view={view} />
              <div className="wave" style={{ height: WAVE_HEIGHT }}>
                {wave.status === 'ready' ? (
                  <WaveformCanvas
                    peaks={wave.peaks}
                    onsets={snapOn ? onsets : null}
                    zoom={zoom}
                    view={view}
                    height={WAVE_HEIGHT}
                  />
                ) : wave.status === 'loading' ? (
                  <span className="wave__loading" role="status">
                    <WaveSkeleton />
                    <span className="visually-hidden">Drawing waveform…</span>
                  </span>
                ) : (
                  <span className="wave__status muted small">
                    No waveform: {wave.reason}. Playback still works.
                  </span>
                )}
              </div>
            </div>
            <SegmentLane viewLeft={view.left} />
            <Playhead player={player} zoom={zoom} scroller={scroller} follow={!scrubbing} />
          </div>
        )}
      </div>
    </div>
  );
}
