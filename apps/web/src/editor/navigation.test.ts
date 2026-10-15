import { describe, expect, it } from 'vitest';
import type { Doc } from './types';
import { jumpTarget, LEAD_IN_MS, untimedSeek } from './navigation';

const doc: Doc = {
  lines: ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, text: id })),
  segments: { b: { startMs: 5000, endMs: 9000 }, e: { startMs: 20_000, endMs: 24_000 } },
};

describe('jumpTarget', () => {
  it('plays a timed line', () => {
    expect(jumpTarget(doc, 'b')).toEqual({ kind: 'timed', startMs: 5000, endMs: 9000 });
  });

  it('gives an untimed line the window between its timed neighbours', () => {
    expect(jumpTarget(doc, 'd')).toEqual({ kind: 'untimed', fromMs: 9000 - LEAD_IN_MS, untilMs: 20_000 });
  });

  it('has no position for an untimed line with nothing timed before it', () => {
    expect(jumpTarget(doc, 'a')).toEqual({ kind: 'untimed', fromMs: null, untilMs: 5000 });
    expect(jumpTarget(doc, 'missing')).toBeNull();
  });
});

describe('untimedSeek', () => {
  const window = { fromMs: 7500, untilMs: 20_000 };

  it('never restarts from the top when the position is unknown', () => {
    expect(untimedSeek({ fromMs: null, untilMs: null }, 42_000, true)).toBeNull();
    expect(untimedSeek({ fromMs: null, untilMs: null }, 0, false)).toBeNull();
  });

  it('leaves playback alone when it is already inside the window', () => {
    expect(untimedSeek(window, 12_000, true)).toBeNull();
  });

  it('jumps when paused, or when playing outside the window', () => {
    expect(untimedSeek(window, 12_000, false)).toBe(7500);
    expect(untimedSeek(window, 30_000, true)).toBe(7500);
  });
});
