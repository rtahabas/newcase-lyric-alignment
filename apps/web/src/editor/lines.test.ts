import { describe, expect, it } from 'vitest';
import type { Doc } from './types';
import { mergeLines, moveLine, splitLine } from './lines';
import { parseLyricSheet } from '../lib/lyrics';

const base: Doc = {
  lines: [
    { id: 'a', text: 'You verse you' },
    { id: 'b', text: 'in the rain' },
    { id: 'c', text: 'You verse you' },
  ],
  segments: { a: { startMs: 1000, endMs: 2000 }, b: { startMs: 2000, endMs: 3500 } },
};

describe('mergeLines', () => {
  it('keeps the earlier id, joins text in list order, spans both timings', () => {
    const d = mergeLines(base, 'b', 'a');
    expect(d.lines.map((l) => l.id)).toEqual(['a', 'c']);
    expect(d.lines[0].text).toBe('You verse you in the rain');
    expect(d.segments.a).toEqual({ startMs: 1000, endMs: 3500 });
    expect(d.segments.b).toBeUndefined();
  });

  it('keeps the timing when only one side was timed', () => {
    expect(mergeLines(base, 'b', 'c').segments.b).toEqual({ startMs: 2000, endMs: 3500 });
  });
});

describe('splitLine', () => {
  it('splits time at the playhead when the playhead is inside the segment', () => {
    const { doc, newId } = splitLine(base, 'a', 4, 1300);
    expect(doc.lines.map((l) => l.text)).toEqual(['You', 'verse you', 'in the rain', 'You verse you']);
    expect(doc.segments.a).toEqual({ startMs: 1000, endMs: 1300 });
    expect(doc.segments[newId!]).toEqual({ startMs: 1300, endMs: 2000 });
  });

  it('splits time in proportion to the text otherwise', () => {
    const { doc, newId } = splitLine(base, 'b', 6, null);
    expect(doc.segments.b.endMs).toBe(doc.segments[newId!].startMs);
    expect(doc.segments.b.endMs).toBeGreaterThan(2000);
  });

  it('refuses to split into an empty half', () => {
    expect(splitLine(base, 'a', 0, null).newId).toBeNull();
  });
});

describe('moveLine', () => {
  it('reorders without touching timings', () => {
    const d = moveLine(base, 'c', 0);
    expect(d.lines.map((l) => l.id)).toEqual(['c', 'a', 'b']);
    expect(d.segments).toBe(base.segments);
  });
});

describe('parseLyricSheet', () => {
  it('drops blanks and section labels, keeps duplicates and inline brackets', () => {
    const sheet = '[Chorus]\nYou verse you\n\n(Verse 2)\n# verse\nYou verse you\nHold on (hold on)\n';
    expect(parseLyricSheet(sheet)).toEqual(['You verse you', 'You verse you', 'Hold on (hold on)']);
  });

  it('keeps a sung line in parentheses, drops only label-like ones', () => {
    const sheet = '(Ooh, baby, baby)\n(Chorus x2)\n(x2)\n(Hold me closer)\n(Pre-Chorus)';
    expect(parseLyricSheet(sheet)).toEqual(['(Ooh, baby, baby)', '(Hold me closer)']);
  });
});
