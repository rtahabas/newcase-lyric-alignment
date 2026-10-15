import { useEditor } from '../app/EditorContext';
import { redoLabel, undoLabel } from '../editor/reducer';

/**
 * "What just happened, and what will undo do?" Always visible, so every edit -
 * including one made by a key press - is acknowledged on screen.
 */
export function StatusLine() {
  const { editor, dispatch } = useEditor();
  const undo = undoLabel(editor);
  const redo = redoLabel(editor);
  const { focus } = editor.selection;
  const focusIndex = editor.doc.lines.findIndex((l) => l.id === focus);

  return (
    <footer className="statusline">
      <span className="statusline__last" role="status" data-testid="last-action">
        {editor.lastAction ?? 'Play the track and press Enter as each line starts.'}
      </span>
      <span className="statusline__hint muted">
        {focusIndex >= 0 ? (
          <>
            <kbd>Enter</kbd> stamps line {focusIndex + 1}
          </>
        ) : (
          'Select a line to stamp it'
        )}
      </span>
      <span className="row">
        <button onClick={() => dispatch({ type: 'undo' })} disabled={!undo} title="⌘Z">
          Undo{undo ? `: ${undo}` : ''}
        </button>
        <button onClick={() => dispatch({ type: 'redo' })} disabled={!redo} title="⌘⇧Z">
          Redo
        </button>
      </span>
    </footer>
  );
}
