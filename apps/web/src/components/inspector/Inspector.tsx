import { useEditor } from '../../app/EditorContext';
import { SingleInspector } from './SingleInspector';
import { MultiInspector } from './MultiInspector';

export function Inspector() {
  const { editor } = useEditor();
  const { ids, focus } = editor.selection;
  return (
    <aside className="pane inspector" aria-label="Inspector">
      {ids.length > 1 ? (
        <MultiInspector ids={ids} />
      ) : focus && ids.length === 1 ? (
        <SingleInspector key={focus} id={focus} />
      ) : (
        <div className="inspector__body muted">
          <h2>Nothing selected</h2>
          <p className="small">
            Click a line or a block. Shift-click to select a run of lines and move them together.
          </p>
        </div>
      )}
    </aside>
  );
}
