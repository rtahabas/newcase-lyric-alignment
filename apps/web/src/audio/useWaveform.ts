import { useEffect, useState } from 'react';
import type { Peaks } from './peaks';
import { decodePeaks } from './peaks';

export type WaveformState =
  | { status: 'loading' }
  | { status: 'ready'; peaks: Peaks }
  /** Playback can still work (e.g. a cross-origin URL without CORS); only the drawing is lost. */
  | { status: 'unavailable'; reason: string };

export function useWaveform(url: string | null): WaveformState {
  const [state, setState] = useState<WaveformState>({ status: 'loading' });
  useEffect(() => {
    if (!url) return;
    const ctrl = new AbortController();
    setState({ status: 'loading' });
    decodePeaks(url, ctrl.signal)
      .then((peaks) => setState({ status: 'ready', peaks }))
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        setState({ status: 'unavailable', reason: e instanceof Error ? e.message : String(e) });
      });
    return () => ctrl.abort();
  }, [url]);
  return state;
}
