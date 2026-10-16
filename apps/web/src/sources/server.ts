/**
 * The API-backed track. Loads with one GET; saves with one PUT and turns every
 * way that PUT can go wrong into a typed SaveOutcome instead of a throw, so the
 * UI has to handle each case rather than catching "an error".
 */
import { api, ApiError, ApiTimeoutError } from '../api';
import { secToMs } from '../lib/time';
import type { Doc } from '../editor/types';
import type { LoadedTrack, SaveOutcome } from './types';
import {
  docFromWire,
  docToWire,
  hintOf,
  isConflict,
  isWireState,
  isWireTrack,
  UNEXPECTED_RESPONSE,
} from './wire';

export const SERVER_KEY = 'server';

export async function loadServerTrack(signal?: AbortSignal): Promise<LoadedTrack> {
  const t = await api<unknown>('/api/v1/track', { signal });
  if (!isWireTrack(t)) throw new Error(`${UNEXPECTED_RESPONSE} for GET /api/v1/track.`);
  return {
    meta: {
      key: SERVER_KEY,
      origin: 'server',
      title: t.title,
      artist: t.artist,
      audioUrl: t.audio_url,
      durationMs: secToMs(t.duration_seconds),
    },
    doc: docFromWire(t.lines, t.alignment),
    version: t.version,
  };
}

export async function saveServerTrack(doc: Doc, version: number): Promise<SaveOutcome> {
  try {
    const saved = await api<unknown>('/api/v1/track/alignment', {
      method: 'PUT',
      body: JSON.stringify(docToWire(doc, version)),
    });
    if (!isWireState(saved)) {
      // The save probably landed, but we cannot read back what was stored.
      return {
        kind: 'failed',
        message: `${UNEXPECTED_RESPONSE} after saving; reload to see what was stored.`,
      };
    }
    return { kind: 'saved', doc: docFromWire(saved.lines, saved.alignment), version: saved.version };
  } catch (e) {
    if (e instanceof ApiTimeoutError) {
      return { kind: 'failed', message: `${e.message} Your edits are still here; try again.` };
    }
    if (e instanceof ApiError) {
      if (e.status === 409 && isConflict(e.body)) {
        return {
          kind: 'conflict',
          theirs: docFromWire(e.body.lines, e.body.alignment),
          theirVersion: e.body.version,
        };
      }
      if (e.status >= 400 && e.status < 500) {
        return { kind: 'rejected', message: hintOf(e.body) ?? `The server refused the save (${e.status}).` };
      }
      return {
        kind: 'failed',
        message: hintOf(e.body) ?? `The server failed (${e.status}). Your edits are still here.`,
      };
    }
    const detail = e instanceof Error ? e.message : String(e);
    return { kind: 'failed', message: `Could not reach the server (${detail}). Your edits are still here.` };
  }
}
