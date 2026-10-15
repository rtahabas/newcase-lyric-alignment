import type { Sync } from '../session/useSync';

function describe(sync: Sync): { text: string; tone: 'ok' | 'warn' | 'busy' } {
  const { status, dirty, isLocal } = sync;
  if (status.kind === 'saving') return { text: 'Saving…', tone: 'busy' };
  if (status.kind === 'conflict') return { text: 'Save rejected', tone: 'warn' };
  if (status.kind === 'error') return { text: 'Not saved', tone: 'warn' };
  if (dirty) return { text: isLocal ? 'Saving soon…' : 'Unsaved changes', tone: isLocal ? 'busy' : 'warn' };
  if (isLocal) return { text: 'Saved in this browser', tone: 'ok' };
  return {
    text: status.kind === 'saved' ? `Saved · v${sync.version}` : `Server v${sync.version}`,
    tone: 'ok',
  };
}

/** Server tracks: an explicit save button. Local tracks autosave, so only the state is shown. */
export function SaveControl({ sync }: { sync: Sync }) {
  const { text, tone } = describe(sync);
  return (
    <div className="save-control">
      <span className={`save-state save-state--${tone}`} role="status" data-testid="save-state">
        {text}
      </span>
      {!sync.isLocal && (
        <button
          className="btn-primary"
          onClick={sync.save}
          disabled={!sync.dirty || sync.status.kind === 'saving' || sync.status.kind === 'conflict'}
          title="Save to server (⌘S)"
        >
          Save
        </button>
      )}
    </div>
  );
}
