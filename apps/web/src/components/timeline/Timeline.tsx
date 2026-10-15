import { useRef } from 'react';
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

const WAVE_HEIGHT = 120;

/** Ruler, waveform, segment lane and playhead, in one horizontally scrolling strip. */
export function Timeline({ wave }: { wave: WaveformState }) {
  const { player, durationMs, zoom, setZoom, onsets, snapOn } = useEditor();
  const scroller = useRef<HTMLDivElement>(null);
  const view = useViewport(scroller);
  useZoomBehaviour(scroller, zoom, setZoom, player);
  useRevealFocus(scroller);

  /** Click (or press-and-drag) on the ruler or waveform scrubs the playhead. */
  const scrub = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const box = e.currentTarget.getBoundingClientRect();
    const seekTo = (clientX: number) => player.seek(pxToMs(clientX - box.left, zoom));
    seekTo(e.clientX);
    const move = (ev: globalThis.PointerEvent) => seekTo(ev.clientX);
    const up = () => {
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
      <div ref={scroller} className="timeline__scroller" data-testid="timeline">
        {durationMs === null && <p className="muted timeline__loading">Loading audio…</p>}
        {durationMs !== null && (
          <div className="timeline__content" style={{ width: msToPx(durationMs, zoom) }}>
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
                ) : (
                  <span className="wave__status muted small">
                    {wave.status === 'loading'
                      ? 'Drawing waveform…'
                      : `No waveform: ${wave.reason}. Playback still works.`}
                  </span>
                )}
              </div>
            </div>
            <SegmentLane />
            <Playhead player={player} zoom={zoom} scroller={scroller} follow />
          </div>
        )}
      </div>
    </div>
  );
}
