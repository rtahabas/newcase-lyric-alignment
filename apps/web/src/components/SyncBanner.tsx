import type { Sync } from '../session/useSync';
import { useEditor } from '../app/EditorContext';

const timedCount = (segments: Record<string, unknown>) => Object.keys(segments).length;

/**
 * Anything the user must decide on or know about: a rejected save, a failed
 * save, unplayable audio. Never auto-dismissed; edits are kept in every case.
 */
export function SyncBanner({ sync, playerError }: { sync: Sync; playerError: string | null }) {
  const { editor } = useEditor();
  const { status } = sync;

  if (status.kind === 'conflict') {
    const theirs = status.theirs;
    return (
      <div className="banner banner--warn" role="alert" data-testid="conflict-banner">
        <div>
          <strong>Someone else saved version {status.theirVersion} while you were editing.</strong> Theirs has{' '}
          {theirs.lines.length} lines ({timedCount(theirs.segments)} timed); yours has{' '}
          {editor.doc.lines.length} ({timedCount(editor.doc.segments)} timed).
        </div>
        <div className="row">
          <button onClick={sync.keepMine}>Keep mine (overwrite theirs)</button>
          <button onClick={sync.takeTheirs}>Load theirs (undo brings yours back)</button>
        </div>
      </div>
    );
  }

  if (status.kind === 'error') {
    return (
      <div className="banner banner--error" role="alert">
        <div>
          <strong>Not saved.</strong> {status.message}
        </div>
        {status.retryable && <button onClick={sync.save}>Retry</button>}
      </div>
    );
  }

  if (playerError) {
    return (
      <div className="banner banner--error" role="alert">
        {playerError}
      </div>
    );
  }
  return null;
}
