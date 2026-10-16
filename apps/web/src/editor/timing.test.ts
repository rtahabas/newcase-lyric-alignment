import { describe, expect, it } from 'vitest';
import type { Doc } from './types';
import {
  clampShift,
  moveSelectionTo,
  PROVISIONAL_MS,
  selectionSpan,
  shiftSegments,
  stampStart,
  trimEdge,
} from './timing';

const doc = (n: number, segs: Record<string, [number, number]> = {}): Doc => ({
  lines: Array.from({ length: n }, (_, i) => ({ id: String(i + 1), text: `line ${i + 1}` })),
  segments: Object.fromEntries(Object.entries(segs).map(([k, [s, e]]) => [k, { startMs: s, endMs: e }])),
});

describe('stampStart', () => {
  it('gives a fresh stamp a provisional end', () => {
    const d = stampStart(doc(3), '1', 1000, null, 60_000);
    expect(d.segments['1']).toEqual({ startMs: 1000, endMs: 1000 + PROVISIONAL_MS });
  });

  it('closes the open line at the new stamp, giving back-to-back lines', () => {
    let d = stampStart(doc(3), '1', 1000, null, 60_000);
    d = stampStart(d, '2', 2500, '1', 60_000);
    expect(d.segments['1']).toEqual({ startMs: 1000, endMs: 2500 });
    expect(d.segments['2'].startMs).toBe(2500);
  });

  it('caps the provisional end at the next timed line and at the track end', () => {
    expect(stampStart(doc(3, { '2': [3000, 5000] }), '1', 1000, null, 60_000).segments['1'].endMs).toBe(3000);
    expect(stampStart(doc(1), '1', 58_000, null, 59_000).segments['1'].endMs).toBe(59_000);
  });

  it('keeps an existing end when re-stamping a fumbled start', () => {
    const d = stampStart(doc(2, { '1': [1000, 6000] }), '1', 1400, null, 60_000);
    expect(d.segments['1']).toEqual({ startMs: 1400, endMs: 6000 });
  });

  it('does not close an open line that started after the stamp (user seeked back)', () => {
    const d = stampStart(doc(2, { '1': [9000, 13_000] }), '2', 2000, '1', 60_000);
    expect(d.segments['1']).toEqual({ startMs: 9000, endMs: 13_000 });
  });
});

describe('shiftSegments', () => {
  const verse = doc(4, { '1': [1000, 2000], '2': [2000, 3000], '3': [3000, 4000] });

  it('moves every selected timed line by the same amount and ignores untimed ones', () => {
    const d = shiftSegments(verse, ['1', '2', '4'], 250, 60_000);
    expect(d.segments['1']).toEqual({ startMs: 1250, endMs: 2250 });
    expect(d.segments['2']).toEqual({ startMs: 2250, endMs: 3250 });
    expect(d.segments['3']).toEqual({ startMs: 3000, endMs: 4000 });
    expect(d.segments['4']).toBeUndefined();
  });

  it('clamps the block as a whole at both ends of the track', () => {
    expect(clampShift(verse, ['1', '2', '3'], -5000, 60_000)).toBe(-1000);
    expect(clampShift(verse, ['1', '2', '3'], 99_000, 5000)).toBe(1000);
  });

  it('moves the selection so its earliest start lands on the playhead', () => {
    const d = moveSelectionTo(verse, ['2', '3'], 2600, 60_000);
    expect(d.segments['2'].startMs).toBe(2600);
    expect(d.segments['3'].startMs).toBe(3600);
  });
});

describe('trimEdge', () => {
  it('never lets a trim invert or collapse the segment', () => {
    const d = trimEdge(doc(1, { '1': [1000, 2000] }), '1', 'start', 5000, 60_000);
    expect(d.segments['1'].startMs).toBeLessThan(d.segments['1'].endMs);
  });
});

describe('selectionSpan', () => {
  it('spans the timed lines only, or is null when none is timed', () => {
    const d = doc(3, { '1': [1000, 2000], '3': [5000, 9000] });
    expect(selectionSpan(d, ['1', '2', '3'])).toEqual({ startMs: 1000, endMs: 9000 });
    expect(selectionSpan(d, ['2'])).toBeNull();
  });
});
