import { describe, expect, it } from 'vitest';
import type { Doc } from './types';
import { lineWarnings } from './warnings';

const make = (segs: Record<string, [number, number]>): Doc => ({
  lines: ['a', 'b', 'c'].map((id) => ({ id, text: id })),
  segments: Object.fromEntries(Object.entries(segs).map(([k, [s, e]]) => [k, { startMs: s, endMs: e }])),
});

describe('lineWarnings', () => {
  it('flags both sides of an overlap', () => {
    const w = lineWarnings(make({ a: [0, 2000], b: [1500, 3000] }), null);
    expect(w.get('a')).toEqual(['overlap']);
    expect(w.get('b')).toEqual(['overlap']);
  });

  it('treats touching lines as fine', () => {
    expect(lineWarnings(make({ a: [0, 2000], b: [2000, 3000] }), null).size).toBe(0);
  });

  it('flags timing that runs against the list order, and past the end', () => {
    const w = lineWarnings(make({ a: [5000, 6000], b: [1000, 2000], c: [7000, 9000] }), 8000);
    expect(w.get('b')).toEqual(['order']);
    expect(w.get('c')).toEqual(['past-end']);
  });
});
