/**
 * The exports read back by independent tools, not by our own parser: ffmpeg's
 * LRC demuxer (converting to SRT) and xmllint. Skipped, with the reason shown,
 * when the tool is not installed - the README promises "Node and pnpm, nothing
 * else", so these are a bonus check on machines that have them.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Doc } from '../editor/types';
import { toLrc, toTtml } from './exporters';

const has = (tool: string, flag: string) => spawnSync(tool, [flag]).status === 0;

const doc: Doc = {
  lines: [
    { id: 'a', text: "You alone it's cold & raining" },
    { id: 'b', text: 'Put the headset on' },
    { id: 'c', text: 'Never timed' },
    { id: 'd', text: 'After a gap <here>' },
  ],
  segments: {
    a: { startMs: 13_600, endMs: 18_050 },
    b: { startMs: 18_050, endMs: 26_123 },
    d: { startMs: 31_200, endMs: 35_000 },
  },
};
const meta = { title: 'Song', artist: 'Someone', durationMs: 124_960 };
const dir = () => mkdtempSync(join(tmpdir(), 'lyric-export-'));

describe.skipIf(!has('ffmpeg', '-version'))('LRC read back by ffmpeg (skipped without ffmpeg)', () => {
  it('yields the same cues, with the gap closed and untimed lines left out', () => {
    const d = dir();
    writeFileSync(join(d, 'out.lrc'), toLrc(doc, meta).text);
    const run = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', join(d, 'out.lrc'), join(d, 'out.srt')]);
    expect(run.status, String(run.stderr)).toBe(0);
    const cues = readFileSync(join(d, 'out.srt'), 'utf8')
      .trim()
      .split(/\n\s*\n/)
      .map((block) => block.split('\n').slice(1).join(' | '));
    expect(cues).toEqual([
      "00:00:13,600 --> 00:00:18,050 | You alone it's cold & raining",
      '00:00:18,050 --> 00:00:26,120 | Put the headset on',
      '00:00:26,120 --> 00:00:31,200', // the blank stamp: an empty cue, nothing on screen in the gap
      '00:00:31,200 --> 00:00:35,000 | After a gap <here>',
      '00:00:35,000 --> 00:00:35,000',
    ]);
  });
});

describe.skipIf(!has('xmllint', '--version'))('TTML checked by xmllint (skipped without xmllint)', () => {
  it('is well-formed XML with namespaced metadata and escaped text', () => {
    const file = join(dir(), 'out.ttml');
    writeFileSync(file, toTtml(doc, meta).text);
    const wellFormed = spawnSync('xmllint', ['--noout', file]);
    expect(wellFormed.status, String(wellFormed.stderr)).toBe(0);
    const titles = spawnSync('xmllint', [
      '--xpath',
      "string(//*[local-name()='title'][namespace-uri()='http://www.w3.org/ns/ttml#metadata'])",
      file,
    ]);
    expect(String(titles.stdout).trim()).toBe('Song');
    const ps = spawnSync('xmllint', ['--xpath', "count(//*[local-name()='p'])", file]);
    expect(String(ps.stdout).trim()).toBe('3');
  });
});
