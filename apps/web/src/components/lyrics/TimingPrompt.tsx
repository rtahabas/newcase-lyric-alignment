import { Play } from 'lucide-react';
import { useEditor } from '../../app/EditorContext';
import { single } from '../../editor/selection';
import { jumpTarget } from '../../editor/navigation';

/**
 * One button that starts (or resumes) a timing pass: focus the first untimed
 * line, put the playhead where it should come round, and play. Then it is just
 * Enter, line after line. Gone once every line is placed.
 */
export function TimingPrompt() {
  const { editor, dispatch, player } = useEditor();
  const { lines, segments } = editor.doc;
  const index = lines.findIndex((l) => !segments[l.id]);
  if (index < 0) return null;
  const fresh = lines.every((l) => !segments[l.id]);

  const start = () => {
    const id = lines[index].id;
    const target = jumpTarget(editor.doc, id);
    dispatch({ type: 'select', selection: single(id) });
    // From the top on a fresh sheet - an explicit choice, not a guess about where line 1 is.
    player.seek(target?.kind === 'untimed' && target.fromMs !== null ? target.fromMs : 0);
    player.play();
  };

  // Once a pass is under way the how-to has done its job: keep just the button,
  // so the list gets the room.
  if (!fresh) {
    return (
      <button className="btn-primary small" onClick={start} data-testid="start-timing">
        <Play size={14} /> {`Continue from line ${index + 1}`}
      </button>
    );
  }
  return (
    <div className="pane__intro" data-testid="timing-prompt">
      <button className="btn-primary" onClick={start} data-testid="start-timing">
        <Play size={14} /> Start timing
      </button>
      <span className="small">
        Press <kbd>Enter</kbd> as each line starts — the lyrics flow as soon as they are placed. Double-click
        a timed line to hear it.
      </span>
    </div>
  );
}
