import { describe, expect, it } from 'vitest';
import { parseLrc } from '../lib/lrcParse';
import { draftFromEntries } from './draft';

const lrc = `[ar:Someone]
[00:01.50]First line
[00:04.00][00:20.000]Chorus line
[00:07.25]
[00:09.00]After a gap
[02:10.00]Past the end of a short file`;

describe('parseLrc', () => {
  it('reads every stamp, repeats included, in time order', () => {
    expect(parseLrc(lrc).map((e) => [e.ms, e.text])).toEqual([
      [1500, 'First line'],
      [4000, 'Chorus line'],
      [7250, ''],
      [9000, 'After a gap'],
      [20000, 'Chorus line'],
      [130000, 'Past the end of a short file'],
    ]);
  });
});

describe('draftFromEntries', () => {
  it('ends each line at the next stamp, honours gaps, never runs past the audio', () => {
    const doc = draftFromEntries(parseLrc(lrc), 60_000);
    expect(doc.lines.map((l) => l.text)).toEqual([
      'First line',
      'Chorus line',
      'After a gap',
      'Chorus line',
      'Past the end of a short file',
    ]);
    const segs = doc.lines.map((l) => doc.segments[l.id] ?? null);
    expect(segs[0]).toEqual({ startMs: 1500, endMs: 4000 });
    expect(segs[1]).toEqual({ startMs: 4000, endMs: 7250 });
    expect(segs[2]).toEqual({ startMs: 9000, endMs: 20000 });
    expect(segs[4]).toBeNull(); // starts after the 60 s file ends: left untimed
  });
});
