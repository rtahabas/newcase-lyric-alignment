/**
 * Where sound starts: sudden rises in loudness, found from the waveform peaks
 * already computed for drawing (no second decode). Used to make a stamp land
 * on the attack the user was reacting to, not on their reaction.
 *
 * Method (spectral-flux's poor relation, on amplitude only): log-energy per
 * 5 ms bucket, lightly smoothed; "flux" = how far a bucket rises above the
 * average of the 50 ms before it; onsets = local flux maxima above a global
 * threshold (mean + 1.5 sd, and never under a doubling), at least 80 ms apart. Crude for instruments, but
 * a sung line starting is usually exactly this kind of rise.
 */
import type { Peaks } from './peaks';
import type { Ms } from '../lib/time';
import { secToMs } from '../lib/time';

export type Onsets = { times: Ms[]; strengths: number[] };

const SMOOTH = 3; // buckets (15 ms)
const LOOKBACK = 10; // buckets (50 ms)
const MIN_GAP_MS = 80;
/** A rise must at least double the energy (~6 dB): a relative threshold alone finds "onsets" in steady noise. */
const MIN_RISE = Math.log(2);

export function detectOnsets(peaks: Peaks): Onsets {
  const n = peaks.min.length;
  const energy = new Float32Array(n);
  for (let i = 0; i < n; i++) energy[i] = Math.log(1e-4 + (peaks.max[i] - peaks.min[i]));
  const smooth = new Float32Array(n);
  for (let i = 0, acc = 0; i < n; i++) {
    acc += energy[i] - (i >= SMOOTH ? energy[i - SMOOTH] : 0);
    smooth[i] = acc / Math.min(i + 1, SMOOTH);
  }
  const flux = new Float32Array(n);
  for (let i = 0, acc = 0; i < n; i++) {
    const prior = i > 0 ? acc / Math.min(i, LOOKBACK) : smooth[0];
    flux[i] = Math.max(0, smooth[i] - prior);
    acc += smooth[i] - (i >= LOOKBACK ? smooth[i - LOOKBACK] : 0);
  }
  let sum = 0;
  let sq = 0;
  for (const f of flux) {
    sum += f;
    sq += f * f;
  }
  const mean = sum / Math.max(1, n);
  const spread = Math.sqrt(Math.max(0, sq / Math.max(1, n) - mean * mean));
  const threshold = Math.max(MIN_RISE, mean + 1.5 * spread);

  const times: Ms[] = [];
  const strengths: number[] = [];
  for (let i = 1; i < n - 1; i++) {
    if (flux[i] <= threshold || flux[i] < flux[i - 1] || flux[i] < flux[i + 1]) continue;
    const t = secToMs(i / peaks.bucketsPerSecond);
    const last = times.length - 1;
    if (last >= 0 && t - times[last] < MIN_GAP_MS) {
      if (flux[i] > strengths[last]) {
        times[last] = t;
        strengths[last] = flux[i];
      }
      continue;
    }
    times.push(t);
    strengths.push(flux[i]);
  }
  return { times, strengths };
}

/** People tap late more than early: look further back than forward. */
export const SNAP_BEFORE_MS = 400;
export const SNAP_AFTER_MS = 150;

/** The strongest onset in [t - before, t + after], or null when there is none. */
export function snapToOnset(onsets: Onsets, t: Ms): Ms | null {
  let best: Ms | null = null;
  let bestStrength = 0;
  for (let i = 0; i < onsets.times.length; i++) {
    const o = onsets.times[i];
    if (o < t - SNAP_BEFORE_MS) continue;
    if (o > t + SNAP_AFTER_MS) break;
    if (onsets.strengths[i] > bestStrength) {
      best = o;
      bestStrength = onsets.strengths[i];
    }
  }
  return best;
}
