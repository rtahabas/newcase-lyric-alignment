import { useRef } from 'react';
import { Combine, Play, Scissors, Trash2, Eraser } from 'lucide-react';
import { useEditor } from '../../app/EditorContext';
import { editText } from '../../editor/lines';
import { clearTimings } from '../../editor/timing';
import { WARNING_TEXT, lineWarnings } from '../../editor/warnings';
import { formatMs } from '../../lib/time';
import { TimeField } from './TimeField';
import { mergeWithNext, removeLines, setEnd, setStart, split } from './lineEdits';

/** Exact values and the operations that do not fit naturally into dragging. */
export function SingleInspector({ id }: { id: string }) {
  const ctx = useEditor();
  const { editor, dispatch, player, durationMs } = ctx;
  const caret = useRef(0);
  const { lines, segments } = editor.doc;
  const index = lines.findIndex((l) => l.id === id);
  const line = lines[index];
  const seg = segments[id] ?? null;
  const next = lines[index + 1];
  const warnings = lineWarnings(editor.doc, durationMs).get(id) ?? [];

  const commitText = (text: string) => {
    if (text.trim() && text !== line.text) {
      dispatch({
        type: 'edit',
        label: `Edit text of line ${index + 1}`,
        apply: (d) => editText(d, id, text.trim()),
      });
    }
  };

  return (
    <div className="inspector__body" data-testid="inspector-single">
      <h2>
        Segment <span className="muted small">· line {index + 1}</span>
      </h2>
      <textarea
        key={`${id}:${line.text}`}
        aria-label="Line text"
        rows={3}
        defaultValue={line.text}
        onSelect={(e) => (caret.current = e.currentTarget.selectionStart)}
        onBlur={(e) => commitText(e.currentTarget.value)}
        onKeyDown={(e) => {
          // A lyric line is one line: Enter commits instead of inserting a newline.
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
      />
      <TimeField
        label="Start"
        testId="field-start"
        value={seg?.startMs ?? null}
        onCommit={(t) => setStart(ctx, id, t)}
        onUsePlayhead={() => setStart(ctx, id, player.timeMs())}
      />
      <TimeField
        label="End"
        testId="field-end"
        value={seg?.endMs ?? null}
        disabled={!seg}
        onCommit={(t) => setEnd(ctx, id, t)}
        onUsePlayhead={() => setEnd(ctx, id, player.timeMs())}
      />
      <div className="field">
        <span className="field__label">Duration</span>
        <output className="readonly-box mono" data-testid="field-duration">
          {seg ? formatMs(seg.endMs - seg.startMs) : '—'}
        </output>
      </div>
      {warnings.map((w) => (
        <p key={w} className="field__error">
          {WARNING_TEXT[w]}
        </p>
      ))}
      {/* Wireframe order first; listening and clearing are additions, below the rule. */}
      <div className="inspector__actions">
        <button disabled={!next} onClick={() => next && mergeWithNext(ctx, id, next.id)}>
          <Combine size={14} /> Merge with next
        </button>
        <button
          onClick={() => split(ctx, id, caret.current, player.timeMs())}
          title="Split the text at the cursor; time splits at the playhead if it is inside the line"
        >
          <Scissors size={14} /> Split at cursor
        </button>
        <button className="btn-danger" onClick={() => removeLines(ctx, [id])}>
          <Trash2 size={14} /> Delete
        </button>
        <hr className="rule" />
        <button disabled={!seg} onClick={() => seg && player.playRange(seg.startMs, seg.endMs)}>
          <Play size={14} /> Play <kbd>P</kbd>
        </button>
        <button
          disabled={!seg}
          onClick={() =>
            dispatch({
              type: 'edit',
              label: `Clear timing of line ${index + 1}`,
              apply: (d) => clearTimings(d, [id]),
            })
          }
        >
          <Eraser size={14} /> Clear timing
        </button>
      </div>
    </div>
  );
}
