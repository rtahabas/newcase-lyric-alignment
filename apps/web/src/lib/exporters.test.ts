import { describe, expect, it } from 'vitest';
import type { Doc } from '../editor/types';
import { toLrc, toTtml } from './exporters';

const doc: Doc = {
  lines: [
    { id: '2', text: 'second' },
    { id: '1', text: 'first & <best>' },
    { id: '3', text: 'never timed' },
  ],
  segments: {
    '1': { startMs: 1234, endMs: 3000 },
    '2': { startMs: 3000, endMs: 4500 },
  },
};
const meta = { title: 'Song', artist: 'Someone', durationMs: 125_000 };

describe('toLrc', () => {
  it('writes chronological centisecond stamps, closes gaps, skips untimed lines', () => {
    const { text, skipped } = toLrc(doc, meta);
    expect(skipped).toBe(1);
    expect(text.split('\n')).toEqual([
      '[ti:Song]',
      '[ar:Someone]',
      '[length:02:05]',
      '[00:01.23]first & <best>',
      '[00:03.00]second',
      '[00:04.50]',
      '',
    ]);
  });
});

describe('toTtml', () => {
  it('writes line-level TTML with escaped text and W3C clock times', () => {
    const { text } = toTtml(doc, meta);
    expect(text).toContain('itunes:timing="Line"');
    expect(text).toContain('<p begin="00:00:01.234" end="00:00:03.000">first &amp; &lt;best&gt;</p>');
    expect(text).toContain('<body dur="00:02:05.000">');
    expect(text).not.toContain('never timed');
  });
});
