import type { Ms } from '../../lib/time';
import { formatTick } from '../../lib/time';
import type { Viewport } from './useViewport';
import { msToPx, pxToMs, rulerStepMs } from './scale';

type Props = { zoom: number; durationMs: Ms; view: Viewport };

/** Tick labels for the visible window only (plus one step either side). */
export function Ruler({ zoom, durationMs, view }: Props) {
  const step = rulerStepMs(zoom);
  const from = Math.max(0, Math.floor(pxToMs(view.left, zoom) / step) - 1) * step;
  const to = Math.min(durationMs, pxToMs(view.left + view.width, zoom) + step);
  const ticks: Ms[] = [];
  for (let t = from; t <= to; t += step) ticks.push(t);

  return (
    <div className="ruler" aria-hidden>
      {ticks.map((t) => (
        <span key={t} className="ruler__tick" style={{ transform: `translateX(${msToPx(t, zoom)}px)` }}>
          {formatTick(t, step)}
        </span>
      ))}
    </div>
  );
}
