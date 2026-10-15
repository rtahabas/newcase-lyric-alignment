import { useCallback, useRef, useState } from 'react';
import { useTrackSession } from './session/useTrackSession';
import { Editor } from './app/Editor';
import { TrackMenu } from './components/tracks/TrackMenu';
import { NewTrackDialog } from './components/tracks/NewTrackDialog';
import { ConfirmDiscard } from './components/tracks/ConfirmDiscard';
import { useFileDrop } from './components/tracks/useFileDrop';
import { localKey } from './sources/local';

/**
 * Picks the track, loads it, and hands it to the editor. Also owns "bring your
 * own track": the dialog, and dropping an audio file anywhere on the page.
 */
export default function App() {
  const session = useTrackSession();
  const [dialog, setDialog] = useState<{ file: File | null } | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const unsaved = useRef(false);
  const onFile = useCallback((file: File) => setDialog({ file }), []);
  const dragging = useFileDrop(onFile);

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
      {state.status === 'loading' && <p className="splash">Loading track…</p>}
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
