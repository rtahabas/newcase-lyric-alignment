import { useCallback, useRef, useState } from 'react';
import { useTrackSession } from './session/useTrackSession';
import { Editor } from './app/Editor';
import { TrackMenu } from './components/tracks/TrackMenu';
import { NewTrackDialog } from './components/tracks/NewTrackDialog';
import { ConfirmDiscard } from './components/tracks/ConfirmDiscard';
import { useFileDrop } from './components/tracks/useFileDrop';
import { localKey } from './sources/local';
import { fetchSample, SAMPLE } from './sources/sample';
import { AppSkeleton } from './components/AppSkeleton';

/**
 * Picks the track, loads it, and hands it to the editor. Also owns "bring your
 * own track": the dialog, and dropping an audio file anywhere on the page.
 */
export default function App() {
  const session = useTrackSession();
  const [dialog, setDialog] = useState<{ file: File | null } | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const unsaved = useRef(false);
  const [sampleNote, setSampleNote] = useState<string | null>(null);
  const onFile = useCallback((file: File) => setDialog({ file }), []);
  const dragging = useFileDrop(onFile);

  /** The sample goes through the same dialog a dropped file does; the note covers the download. */
  const openSample = useCallback(() => {
    setSampleNote(`Loading “${SAMPLE.title}”…`);
    fetchSample().then(
      (file) => {
        setSampleNote(null);
        setDialog({ file });
      },
      (err: unknown) => {
        setSampleNote(`Could not load the sample track: ${err instanceof Error ? err.message : String(err)}`);
        setTimeout(() => setSampleNote(null), 4000);
      },
    );
  }, []);

  /** Every track switch goes through here, so unsaved server edits are never dropped silently. */
  const requestOpen = useCallback(
    (key: string) => (unsaved.current ? setPendingKey(key) : session.open(key)),
    [session],
  );
  const onDirtyChange = useCallback((dirty: boolean) => {
    unsaved.current = dirty;
  }, []);

  const menu = (
    <TrackMenu
      currentKey={session.key}
      projects={session.projects}
      onOpen={requestOpen}
      onNew={() => setDialog({ file: null })}
      onSample={openSample}
      onDeleted={session.refreshProjects}
    />
  );

  const { state } = session;
  return (
    <>
      {state.status === 'ready' && (
        <Editor
          key={state.track.meta.key}
          track={state.track}
          trackMenu={menu}
          modalOpen={!!dialog || !!pendingKey}
          onDirtyChange={onDirtyChange}
        />
      )}
      {state.status === 'loading' && <AppSkeleton />}
      {state.status === 'error' && (
        <div className="splash" role="alert">
          <h1>Could not load the track</h1>
          <p>{state.message}</p>
          <div className="row">
            <button onClick={session.retry}>Try again</button>
            {menu}
          </div>
        </div>
      )}
      {dragging && <div className="drop-hint">Drop the audio file to start a new track</div>}
      {sampleNote && (
        <div className="drop-hint" role="status" data-testid="sample-note">
          {sampleNote}
        </div>
      )}
      {dialog && (
        <NewTrackDialog
          initialFile={dialog.file}
          onCancel={() => setDialog(null)}
          onCreated={(id) => {
            setDialog(null);
            session.refreshProjects();
            requestOpen(localKey(id));
          }}
        />
      )}
      {pendingKey && (
        <ConfirmDiscard
          onKeep={() => setPendingKey(null)}
          onDiscard={() => {
            unsaved.current = false;
            setPendingKey(null);
            session.open(pendingKey);
          }}
        />
      )}
    </>
  );
}
