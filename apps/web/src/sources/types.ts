import type { Doc } from '../editor/types';
import type { Ms } from '../lib/time';

/** Where a track lives. The editor only ever sees this shape, never the source. */
export type TrackMeta = {
  /** Stable key: "server" for the API track, "local:<id>" for a track the user brought. */
  key: string;
  origin: 'server' | 'local';
  title: string;
  artist: string;
  audioUrl: string;
  /** What the source claims. The audio element's own duration wins once it loads. */
  durationMs: Ms | null;
};

export type LoadedTrack = { meta: TrackMeta; doc: Doc; version: number };

export type SaveOutcome =
  | { kind: 'saved'; doc: Doc; version: number }
  /** Someone saved first. Carries their state so the user can reconcile without a refetch. */
  | { kind: 'conflict'; theirs: Doc; theirVersion: number }
  /** The request was malformed. `message` is the server's hint. */
  | { kind: 'rejected'; message: string }
  /** Never reached the server, or the server failed. Safe to retry. */
  | { kind: 'failed'; message: string };
