import { useState } from 'react';
import { Modal } from '../../ui/Modal';
import type { LocalProject } from '../../sources/local';
import { deleteLocalTrack } from '../../sources/local';

type Props = { project: LocalProject; onCancel: () => void; onDone: () => void };

/** Deleting a local track removes its audio and timings from this browser; undo cannot bring it back. */
export function ConfirmDelete({ project, onCancel, onDone }: Props) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      title={`Delete “${project.title}”?`}
      onClose={onCancel}
      description="Its audio and every timing are removed from this browser. This cannot be undone — export an LRC first if you want to keep the timings."
    >
      <div className="row end">
        <button onClick={onCancel} autoFocus>
          Keep it
        </button>
        <button
          className="btn-danger"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void deleteLocalTrack(project.id).then(onDone);
          }}
        >
          Delete track
        </button>
      </div>
    </Modal>
  );
}
