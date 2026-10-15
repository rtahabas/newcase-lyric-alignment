import { describe, expect, it } from 'vitest';
import type { Doc } from './types';
import { applyDrag, snapMove, snapTime } from './drag';

const doc: Doc = {
  lines: ['a', 'b', 'c'].map((id) => ({ id, text: id })),
  segments: {
    a: { startMs: 1000, endMs: 2000 },
    b: { startMs: 2000, endMs: 3000 },
    c: { startMs: 5000, endMs: 6000 },
  },
};

describe('applyDrag trim', () => {
  it('moves a touching neighbour with the edge when linked', () => {
    const d = applyDrag(doc, { kind: 'trim', id: 'a', edge: 'end', t: 2300, linked: true }, 60_000);
    expect(d.segments.a).toEqual({ startMs: 1000, endMs: 2300 });
    expect(d.segments.b).toEqual({ startMs: 2300, endMs: 3000 });
  });

  it('leaves the neighbour alone when unlinked (Alt), allowing an overlap', () => {
    const d = applyDrag(doc, { kind: 'trim', id: 'a', edge: 'end', t: 2300, linked: false }, 60_000);
    expect(d.segments.b).toEqual({ startMs: 2000, endMs: 3000 });
  });

  it('never collapses the linked neighbour', () => {
    const d = applyDrag(doc, { kind: 'trim', id: 'b', edge: 'start', t: 500, linked: true }, 60_000);
    expect(d.segments.a.endMs - d.segments.a.startMs).toBeGreaterThan(0);
    expect(d.segments.a.endMs).toBe(d.segments.b.startMs);
  });
});

describe('snapping', () => {
  it('snaps to the nearest target within the threshold only', () => {
    expect(snapTime(1990, [2000, 5000], 50)).toBe(2000);
    expect(snapTime(1900, [2000, 5000], 50)).toBe(1900);
  });

  it('snaps a moved block by whichever outer edge is closer', () => {
    expect(snapMove(doc, ['c'], -1990, [3000], 50, 60_000)).toBe(-2000);
    expect(snapMove(doc, ['c'], -500, [3000], 50, 60_000)).toBe(-500);
  });
});
