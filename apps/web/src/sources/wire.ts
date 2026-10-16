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

/** A 409 we can reconcile from: the right error *and* a usable server state. */
export function isConflict(body: unknown): body is WireConflict {
  return (
    typeof body === 'object' &&
    body !== null &&
    (body as { error?: unknown }).error === 'version_conflict' &&
    isWireState(body)
  );
}

/** 400s carry `{ error, hint }`; surface the hint, since that is the useful part. */
export function hintOf(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const { hint, error } = body as { hint?: unknown; error?: unknown };
  if (typeof hint === 'string') return typeof error === 'string' ? `${error}: ${hint}` : hint;
  return null;
}

/*
 * Runtime checks at the boundary. The types above are only a promise; these
 * make sure the server kept it before anything downstream relies on it, so a
 * reshaped or broken response fails here, with a clear message, not three
 * components later.
 */
type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNatural = (v: unknown) => Number.isInteger(v) && (v as number) >= 0;

const isWireLine = (v: unknown): v is WireLine =>
  isObj(v) && typeof v.id === 'string' && isNatural(v.index) && typeof v.text === 'string';

const isWireSegment = (v: unknown): v is WireSegment =>
  isObj(v) && typeof v.line_id === 'string' && isNatural(v.start_ms) && isNatural(v.end_ms);

export function isWireState(v: unknown): v is WireState {
  if (!isObj(v) || !isNatural(v.version) || !Array.isArray(v.lines) || !v.lines.every(isWireLine)) {
    return false;
  }
  const a = v.alignment;
  return a === null || (isObj(a) && Array.isArray(a.segments) && a.segments.every(isWireSegment));
}

export function isWireTrack(v: unknown): v is WireTrack {
  if (!isObj(v)) return false;
  const fieldsOk =
    typeof v.id === 'string' &&
    typeof v.title === 'string' &&
    typeof v.artist === 'string' &&
    typeof v.audio_url === 'string' &&
    typeof v.duration_seconds === 'number' &&
    Number.isFinite(v.duration_seconds) &&
    v.duration_seconds > 0;
  return fieldsOk && isWireState(v);
}

export const UNEXPECTED_RESPONSE = 'The server answered in an unexpected shape';
