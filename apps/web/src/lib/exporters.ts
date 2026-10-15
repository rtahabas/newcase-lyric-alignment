/**
 * Export formats. Pure: Doc in, text out.
 * - LRC: what most players and Musixmatch-style tooling read. Chronological,
 *   centisecond stamps; a blank stamp closes a line before a gap so players do
 *   not hold it on screen through an instrumental.
 * - TTML, line-level: the shape Apple Music ingests (decisions.md D3.5).
 * Untimed lines are skipped and counted, never invented.
 */
import type { Doc, Segment } from '../editor/types';
import type { Ms } from './time';
import { formatClock as clock } from './time';

export type ExportMeta = { title: string; artist: string; durationMs: Ms | null };
export type ExportResult = { text: string; skipped: number };

type Timed = { text: string; seg: Segment };

function timedInOrder(doc: Doc): { timed: Timed[]; skipped: number } {
  const timed = doc.lines
    .filter((l) => doc.segments[l.id])
    .map((l) => ({ text: l.text, seg: doc.segments[l.id] }))
    .sort((a, b) => a.seg.startMs - b.seg.startMs);
  return { timed, skipped: doc.lines.length - timed.length };
}

/** [mm:ss.xx] - LRC is centiseconds by convention. */
function lrcStamp(ms: Ms): string {
  const cs = Math.round(ms / 10);
  const m = Math.floor(cs / 6000);
  const s = Math.floor((cs % 6000) / 100);
  return `[${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs % 100).padStart(2, '0')}]`;
}

export function toLrc(doc: Doc, meta: ExportMeta): ExportResult {
  const { timed, skipped } = timedInOrder(doc);
  const out = [`[ti:${meta.title}]`, `[ar:${meta.artist}]`];
  if (meta.durationMs !== null) out.push(`[length:${lrcStamp(meta.durationMs).slice(1, 6)}]`);
  timed.forEach(({ text, seg }, i) => {
    out.push(`${lrcStamp(seg.startMs)}${text}`);
    const next = timed[i + 1];
    if (!next || next.seg.startMs > seg.endMs) out.push(lrcStamp(seg.endMs));
  });
  return { text: `${out.join('\n')}\n`, skipped };
}

const xml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function toTtml(doc: Doc, meta: ExportMeta): ExportResult {
  const { timed, skipped } = timedInOrder(doc);
  const ps = timed.map(
    ({ text, seg }) => `      <p begin="${clock(seg.startMs)}" end="${clock(seg.endMs)}">${xml(text)}</p>`,
  );
  const dur = meta.durationMs !== null ? ` dur="${clock(meta.durationMs)}"` : '';
  const text = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<tt xmlns="http://www.w3.org/ns/ttml" xmlns:itunes="http://itunes.apple.com/lyric-ttml-extensions" itunes:timing="Line">',
    `  <head><metadata><title>${xml(meta.title)}</title></metadata></head>`,
    `  <body${dur}>`,
    '    <div>',
    ...ps,
    '    </div>',
    '  </body>',
    '</tt>',
    '',
  ].join('\n');
  return { text, skipped };
}

/** Hands the text to the browser as a file download. */
export function download(filename: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export const safeFilename = (title: string) =>
  title
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '') || 'lyrics';
