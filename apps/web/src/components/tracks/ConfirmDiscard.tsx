import { Modal } from '../../ui/Modal';

type Props = { onKeep: () => void; onDiscard: () => void };

/**
 * Switching away from a server track with unsaved edits would drop them: the
 * editor (and its undo history) is per track. Ask before that happens.
 */
export function ConfirmDiscard({ onKeep, onDiscard }: Props) {
  return (
    <Modal
      title="Leave without saving?"
      onClose={onKeep}
      description="This track has edits that are not saved to the server. Switching tracks drops them and their undo history."
    >
      <div className="row end">
        <button className="btn-primary" onClick={onKeep} autoFocus>
          Keep editing
        </button>
        <button className="btn-danger" onClick={onDiscard} data-testid="discard-and-switch">
          Discard and switch
        </button>
      </div>
    </Modal>
  );
}
