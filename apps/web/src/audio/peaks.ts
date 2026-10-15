/**
 * Waveform peaks from the audio itself: decode once, reduce to min/max per
 * bucket, draw from the buckets. Drawing never touches raw samples.
 *
 * Each step is wrapped in performance.measure so the cost can be read off the
 * Performance panel or `performance.getEntriesByName(...)` rather than guessed.
 */
export type Peaks = { min: Float32Array; max: Float32Array; bucketsPerSecond: number };

/** 200 buckets/s = 5 ms each: finer than the deepest zoom draws (see Timeline). */
export const BUCKETS_PER_SECOND = 200;

export function computePeaks(buffer: AudioBuffer, bucketsPerSecond = BUCKETS_PER_SECOND): Peaks {
  const size = Math.max(1, Math.floor(buffer.sampleRate / bucketsPerSecond));
  const count = Math.ceil(buffer.length / size);
  const min = new Float32Array(count);
  const max = new Float32Array(count);
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c));
  for (let b = 0; b < count; b++) {
    let lo = 0;
    let hi = 0;
    const end = Math.min(buffer.length, (b + 1) * size);
    for (const data of channels) {
      for (let i = b * size; i < end; i++) {
        const v = data[i];
        if (v < lo) lo = v;
        else if (v > hi) hi = v;
      }
    }
    min[b] = lo;
    max[b] = hi;
  }
  return { min, max, bucketsPerSecond };
}

/** Runs `fn` inside a performance.measure named `name`, readable from the Performance panel. */
export function measure<T>(name: string, fn: () => T): T {
  performance.mark(`${name}:start`);
  const out = fn();
  performance.measure(name, `${name}:start`);
  return out;
}

export async function decodePeaks(url: string, signal: AbortSignal): Promise<Peaks> {
  performance.mark('waveform:fetch:start');
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`audio fetch failed (${res.status})`);
  const bytes = await res.arrayBuffer();
  performance.measure('waveform:fetch', 'waveform:fetch:start');

  const ctx = new AudioContext();
  try {
    performance.mark('waveform:decode:start');
    const buffer = await ctx.decodeAudioData(bytes);
    performance.measure('waveform:decode', 'waveform:decode:start');
    signal.throwIfAborted();
    return measure('waveform:peaks', () => computePeaks(buffer));
  } finally {
    void ctx.close();
  }
}
