import { describe, expect, it } from 'vitest';
import type { Peaks } from './peaks';
import { detectOnsets, snapToOnset } from './onsets';

/** 10 s at 200 buckets/s: quiet noise floor, with loud notes starting at the given seconds. */
function peaksWithNotes(starts: number[]): Peaks {
  const bps = 200;
  const n = 10 * bps;
  const min = new Float32Array(n);
  const max = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / bps;
    const on = starts.some((s) => t >= s && t < s + 0.6);
    const amp = on ? 0.6 : 0.02 + 0.01 * Math.sin(i);
    min[i] = -amp;
    max[i] = amp;
  }
  return { min, max, bucketsPerSecond: bps };
}

describe('detectOnsets', () => {
  it('finds each note start within one bucket', () => {
    const { times } = detectOnsets(peaksWithNotes([1, 3.5, 7.2]));
    expect(times).toHaveLength(3);
    [1000, 3500, 7200].forEach((want, i) => expect(Math.abs(times[i] - want)).toBeLessThanOrEqual(10));
  });

  it('finds nothing in steady sound', () => {
    expect(detectOnsets(peaksWithNotes([])).times).toHaveLength(0);
  });
});

describe('snapToOnset', () => {
  const onsets = { times: [1000, 1250, 3500], strengths: [5, 1, 4] };

  it('pulls a late tap back to the attack it was reacting to', () => {
    expect(snapToOnset(onsets, 1200)).toBe(1000);
  });

  it('prefers the strongest onset in the window', () => {
    expect(snapToOnset(onsets, 1300)).toBe(1000);
  });

  it('leaves a stamp alone when no onset is near', () => {
    expect(snapToOnset(onsets, 2500)).toBeNull();
  });
});
