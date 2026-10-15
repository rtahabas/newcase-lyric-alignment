import { useEffect, useRef } from 'react';
import type { Peaks } from '../../audio/peaks';
import type { Viewport } from './useViewport';
import type { Onsets } from '../../audio/onsets';
import { msToPx } from './scale';

type Props = { peaks: Peaks; onsets: Onsets | null; zoom: number; view: Viewport; height: number };

/**
 * Draws only the visible window: one min/max bar per device pixel column,
 * aggregated from precomputed buckets. Cost is O(viewport width), independent
 * of track length and zoom. The canvas is `position: sticky` inside the
 * scroller, so it never grows with the track either.
 */
export function WaveformCanvas({ peaks, onsets, zoom, view, height }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || view.width === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(view.width * dpr);
    canvas.height = Math.round(height * dpr);
    const g = canvas.getContext('2d');
    if (!g) return;

    performance.mark('waveform:draw:start');
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = getComputedStyle(canvas).getPropertyValue('--wave').trim() || '#888';
    const mid = canvas.height / 2;
    const bucketsPerPx = peaks.bucketsPerSecond / (zoom * dpr);
    const firstBucket = (view.left / zoom) * peaks.bucketsPerSecond;
    const count = peaks.min.length;

    for (let x = 0; x < canvas.width; x++) {
      const b0 = Math.floor(firstBucket + x * bucketsPerPx);
      if (b0 >= count) break;
      const b1 = Math.min(count, Math.max(b0 + 1, Math.floor(firstBucket + (x + 1) * bucketsPerPx)));
      let lo = 0;
      let hi = 0;
      for (let b = b0; b < b1; b++) {
        if (peaks.min[b] < lo) lo = peaks.min[b];
        if (peaks.max[b] > hi) hi = peaks.max[b];
      }
      const top = mid - hi * mid;
      g.fillRect(x, top, 1, Math.max(1, (hi - lo) * mid));
    }
    // Onsets as short ticks along the bottom: what a stamp can snap to.
    if (onsets) {
      g.fillStyle = getComputedStyle(canvas).getPropertyValue('--onset').trim() || '#d9771f';
      g.globalAlpha = 0.7;
      for (const t of onsets.times) {
        const x = Math.round((msToPx(t, zoom) - view.left) * dpr);
        if (x < 0) continue;
        if (x > canvas.width) break;
        g.fillRect(x, canvas.height - 8 * dpr, Math.max(1, dpr), 8 * dpr);
      }
    }
    g.globalAlpha = 1;
    performance.measure('waveform:draw', 'waveform:draw:start');
  }, [peaks, onsets, zoom, view, height]);

  return <canvas ref={ref} className="wave__canvas" style={{ width: view.width, height }} aria-hidden />;
}
