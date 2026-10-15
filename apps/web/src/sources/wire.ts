/**
 * The API's wire shapes and the only translation to and from them. snake_case
 * and `index` fields stop here; the editor never sees them.
 */
import type { Doc, Segment } from '../editor/types';

export type WireLine = { id: string; index: number; text: string };
export type WireSegment = { line_id: string; start_ms: number; end_ms: number };

export type WireTrack = {
  id: string;
  title: string;
  artist: string;
  duration_seconds: number;
  audio_url: string;
  lines: WireLine[];
  version: number;
  alignment: { segments: WireSegment[] } | null;
};

export type WireState = Pick<WireTrack, 'version' | 'lines' | 'alignment'>;

export type WireConflict = WireState & {
  error: 'version_conflict';
  expected_version: number;
  received_version: number;
};

export function docFromWire(lines: WireLine[], alignment: WireState['alignment']): Doc {
  const ordered = [...lines].sort((a, b) => a.index - b.index);
  const known = new Set(ordered.map((l) => l.id));
  const segments: Record<string, Segment> = {};
  for (const s of alignment?.segments ?? []) {
    if (known.has(s.line_id)) segments[s.line_id] = { startMs: s.start_ms, endMs: s.end_ms };
  }
  return { lines: ordered.map(({ id, text }) => ({ id, text })), segments };
}

export function docToWire(doc: Doc, version: number) {
  return {
    version,
    lines: doc.lines.map((l, index) => ({ id: l.id, index, text: l.text })),
    segments: doc.lines.flatMap((l) => {
      const s = doc.segments[l.id];
      return s ? [{ line_id: l.id, start_ms: s.startMs, end_ms: s.endMs }] : [];
    }),
  };
}

export function isConflict(body: unknown): body is WireConflict {
  return (
    typeof body === 'object' && body !== null && (body as { error?: unknown }).error === 'version_conflict'
  );
}

/** 400s carry `{ error, hint }`; surface the hint, since that is the useful part. */
export function hintOf(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const { hint, error } = body as { hint?: unknown; error?: unknown };
  if (typeof hint === 'string') return typeof error === 'string' ? `${error}: ${hint}` : hint;
  return null;
}
