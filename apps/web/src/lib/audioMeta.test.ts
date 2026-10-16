import { describe, expect, it } from 'vitest';
import { metaFromFilename, parseId3 } from './audioMeta';

/** Builds a minimal ID3v2.3 tag with UTF-8 text frames. */
function id3(frames: Record<string, string>): Uint8Array {
  const enc = new TextEncoder();
  const bodies = Object.entries(frames).map(([id, text]) => {
    const body = new Uint8Array([3, ...enc.encode(text)]);
    const head = new Uint8Array(10);
    head.set(enc.encode(id), 0);
    new DataView(head.buffer).setUint32(4, body.length);
    return new Uint8Array([...head, ...body]);
  });
  const size = bodies.reduce((n, b) => n + b.length, 0) + 32; // + padding
  const s = [(size >> 21) & 127, (size >> 14) & 127, (size >> 7) & 127, size & 127];
  return new Uint8Array([
    ...enc.encode('ID3'),
    3,
    0,
    0,
    ...s,
    ...bodies.flatMap((b) => [...b]),
    ...new Uint8Array(32),
  ]);
}

describe('parseId3', () => {
  it('reads title and artist, including non-ASCII text', () => {
    expect(parseId3(id3({ TIT2: 'Gül Pembe', TPE1: 'Barış Manço' }))).toEqual({
      title: 'Gül Pembe',
      artist: 'Barış Manço',
    });
  });

  it('honours a big-endian BOM in UTF-16 text (encoding 1)', () => {
    const be = (t: string) => [...t].flatMap((ch) => [ch.charCodeAt(0) >> 8, ch.charCodeAt(0) & 255]);
    const body = new Uint8Array([1, 0xfe, 0xff, ...be('Gül')]);
    const frame = new Uint8Array(10 + body.length);
    frame.set(new TextEncoder().encode('TIT2'), 0);
    new DataView(frame.buffer).setUint32(4, body.length);
    frame.set(body, 10);
    const size = frame.length;
    const tag = new Uint8Array([0x49, 0x44, 0x33, 3, 0, 0, 0, 0, (size >> 7) & 127, size & 127, ...frame]);
    expect(parseId3(tag)?.title).toBe('Gül');
  });

  it('returns null when there is no tag', () => {
    expect(parseId3(new Uint8Array([0xff, 0xfb, 0x90, 0, 0, 0, 0, 0, 0, 0]))).toBeNull();
  });
});

describe('metaFromFilename', () => {
  it('splits "Artist - Title" and drops track numbers and video junk', () => {
    expect(metaFromFilename('03 - Queen - Bohemian Rhapsody (Official Video).mp3')).toEqual({
      artist: 'Queen',
      title: 'Bohemian Rhapsody',
    });
  });

  it('falls back to the whole name as the title', () => {
    expect(metaFromFilename('you_verse_you.mp3')).toEqual({ artist: '', title: 'you verse you' });
  });
});
