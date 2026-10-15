/**
 * Saving. Server tracks save explicitly (button / Cmd+S) so a rejected save is
 * something the user sees and decides on; local tracks autosave, since nothing
 * else can write to them. Every failure keeps the user's edits in memory.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Doc } from '../editor/types';
import type { EditorAction } from '../editor/reducer';
import type { LoadedTrack, SaveOutcome } from '../sources/types';
import { saveServerTrack } from '../sources/server';
import { saveLocalTrack } from '../sources/local';

export type SyncStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: Date }
  | { kind: 'conflict'; theirs: Doc; theirVersion: number }
  | { kind: 'error'; message: string; retryable: boolean };

const AUTOSAVE_MS = 400;

export type Sync = ReturnType<typeof useSync>;

export function useSync(track: LoadedTrack, doc: Doc, dispatch: (a: EditorAction) => void) {
  const [version, setVersion] = useState(track.version);
  const [savedDoc, setSavedDoc] = useState(track.doc);
  const [status, setStatus] = useState<SyncStatus>({ kind: 'idle' });
  const inFlight = useRef(false);
  const isLocal = track.meta.origin === 'local';
  const dirty = doc !== savedDoc;

  const send = useCallback(
    async (toSave: Doc, onVersion: number) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setStatus({ kind: 'saving' });
      const outcome: SaveOutcome = isLocal
        ? saveLocalTrack(track.meta.key.slice(6), toSave, onVersion)
        : await saveServerTrack(toSave, onVersion);
      inFlight.current = false;
      switch (outcome.kind) {
        case 'saved':
          // Keep our reference, not the server's echo: `dirty` is identity-based,
          // and edits made while the request was in flight must stay dirty.
          setSavedDoc(toSave);
          setVersion(outcome.version);
          setStatus({ kind: 'saved', at: new Date() });
          break;
        case 'conflict':
          setStatus({ kind: 'conflict', theirs: outcome.theirs, theirVersion: outcome.theirVersion });
          break;
        case 'rejected':
          setStatus({ kind: 'error', message: outcome.message, retryable: false });
          break;
        case 'failed':
          setStatus({ kind: 'error', message: outcome.message, retryable: true });
          break;
      }
    },
    [isLocal, track.meta.key],
  );

  const save = useCallback(() => void send(doc, version), [send, doc, version]);

  /** Conflict: overwrite the server with ours, on top of the version they hold now. */
  const keepMine = useCallback(() => {
    if (status.kind === 'conflict') void send(doc, status.theirVersion);
  }, [send, doc, status]);

  /** Conflict: adopt the server's state. Goes through undo, so it can be taken back. */
  const takeTheirs = useCallback(() => {
    if (status.kind !== 'conflict') return;
    const { theirs, theirVersion } = status;
    dispatch({ type: 'edit', label: `Load server version ${theirVersion}`, apply: () => theirs });
    setSavedDoc(theirs);
    setVersion(theirVersion);
    setStatus({ kind: 'idle' });
  }, [dispatch, status]);

  useEffect(() => {
    if (!isLocal || !dirty) return;
    const t = window.setTimeout(() => void send(doc, version), AUTOSAVE_MS);
    return () => window.clearTimeout(t);
  }, [isLocal, dirty, doc, version, send]);

  useEffect(() => {
    if (!dirty || isLocal) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Chromium still keys the prompt off the legacy returnValue in some versions.
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, isLocal]);

  return { status, dirty, version, isLocal, save, keepMine, takeTheirs };
}
