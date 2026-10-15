/**
 * Which track is open, and loading it. The editor below this never knows
 * whether a track came from the API or from the user's own files.
 */
import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api';
import type { LoadedTrack } from '../sources/types';
import { loadServerTrack, SERVER_KEY } from '../sources/server';
import type { LocalProject } from '../sources/local';
import { listLocalProjects, loadLocalTrack } from '../sources/local';

export type SessionState =
  | { status: 'loading' }
  | { status: 'ready'; track: LoadedTrack }
  | { status: 'error'; message: string };

const LAST_KEY = 'lyric-align:last-track';

function readLastKey(): string {
  try {
    return localStorage.getItem(LAST_KEY) ?? SERVER_KEY;
  } catch {
    return SERVER_KEY;
  }
}

function describe(e: unknown): string {
  if (e instanceof ApiError) {
    const hint = (e.body as { hint?: unknown } | undefined)?.hint;
    return typeof hint === 'string' ? `${e.message}: ${hint}` : e.message;
  }
  return e instanceof Error ? e.message : String(e);
}

export function useTrackSession() {
  const [key, setKey] = useState(readLastKey);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<SessionState>({ status: 'loading' });
  const [projects, setProjects] = useState<LocalProject[]>(listLocalProjects);

  useEffect(() => {
    const ctrl = new AbortController();
    let blobUrl: string | null = null;
    setState({ status: 'loading' });
    const load = key.startsWith('local:') ? loadLocalTrack(key.slice(6)) : loadServerTrack(ctrl.signal);
    load
      .then((track) => {
        const isBlob = track.meta.audioUrl.startsWith('blob:');
        if (ctrl.signal.aborted) {
          // Switched away before this load finished: the cleanup already ran.
          if (isBlob) URL.revokeObjectURL(track.meta.audioUrl);
          return;
        }
        if (isBlob) blobUrl = track.meta.audioUrl;
        setState({ status: 'ready', track });
        try {
          localStorage.setItem(LAST_KEY, key);
        } catch {
          // Remembering the last track is a convenience; losing it is harmless.
        }
      })
      .catch((e: unknown) => {
        if (!ctrl.signal.aborted) setState({ status: 'error', message: describe(e) });
      });
    return () => {
      ctrl.abort();
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [key, attempt]);

  const open = useCallback((next: string) => {
    setProjects(listLocalProjects());
    setKey(next);
    setAttempt((n) => n + 1);
  }, []);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const refreshProjects = useCallback(() => setProjects(listLocalProjects()), []);

  return { key, state, projects, open, retry, refreshProjects };
}
