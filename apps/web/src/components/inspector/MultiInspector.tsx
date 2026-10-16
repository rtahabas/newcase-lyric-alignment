import { useState } from 'react';
import { Crosshair, Eraser, Play, Trash2 } from 'lucide-react';
import { useEditor } from '../../app/EditorContext';
import { clearTimings, moveSelectionTo, selectionSpan, shiftSegments } from '../../editor/timing';
import { formatMs } from '../../lib/time';
import { removeLines } from './lineEdits';

const STEPS = [-500, -50, 50, 500];

/** Bulk edits: everything here applies to every selected line, and says so. */
export function MultiInspector({ ids }: { ids: string[] }) {
  const ctx = useEditor();
  const { editor, dispatch, player } = ctx;
  const [amount, setAmount] = useState('');
  const timedCount = ids.filter((id) => editor.doc.segments[id]).length;
  const span = selectionSpan(editor.doc, ids);
  const start = span?.startMs ?? null;
  const end = span?.endMs ?? null;
  const n = `${ids.length} lines`;

  const shift = (delta: number) =>
    dispatch({
      type: 'edit',
      label: `Shift ${n} ${delta > 0 ? '+' : ''}${delta} ms`,
      apply: (d, dur) => shiftSegments(d, ids, delta, dur),
    });
  const parsed = Number(amount);
  const amountOk = amount.trim() !== '' && Number.isInteger(parsed) && parsed !== 0;

  return (
    <div className="inspector__body inspector__body--multi" data-testid="inspector-multi">
      <h2>{n} selected</h2>
      <p className="muted small">
        {timedCount} timed
        {start !== null && end !== null && (
          <>
            {' '}
            · {formatMs(start)} → {formatMs(end)}
          </>
        )}
      </p>
      <fieldset className="field" disabled={!timedCount}>
        <legend>Shift together</legend>
        <div className="row wrap">
          {STEPS.map((s) => (
            <button key={s} onClick={() => shift(s)}>
              {s > 0 ? '+' : ''}
              {s} ms
            </button>
          ))}
        </div>
        <form
          className="field__row"
          onSubmit={(e) => {
            e.preventDefault();
            if (amountOk) {
              shift(parsed);
              setAmount('');
            }
          }}
        >
          <input
            className="mono"
            aria-label="Shift by milliseconds"
            placeholder="e.g. -320"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="numeric"
          />
          <button type="submit" disabled={!amountOk}>
            Shift ms
          </button>
        </form>
        <button
          onClick={() => {
            const t = player.timeMs();
            dispatch({
              type: 'edit',
              label: `Move ${n} to ${formatMs(t)}`,
              apply: (d, dur) => moveSelectionTo(d, ids, t, dur),
            });
          }}
        >
          <Crosshair size={14} /> Start at playhead <kbd>M</kbd>
        </button>
      </fieldset>
      <div className="inspector__actions">
        <button
          disabled={start === null}
          onClick={() => start !== null && end !== null && player.playRange(start, end)}
        >
          <Play size={14} /> Play selection <kbd>P</kbd>
        </button>
        <button
          disabled={!timedCount}
          onClick={() =>
            dispatch({ type: 'edit', label: `Clear timing of ${n}`, apply: (d) => clearTimings(d, ids) })
          }
        >
          <Eraser size={14} /> Clear timings
        </button>
        <button className="btn-danger" onClick={() => removeLines(ctx, ids)}>
          <Trash2 size={14} /> Delete {n}
        </button>
      </div>
      {/* As in the wireframe: the scope of every edit, at the foot of the panel. */}
      <p className="inspector__footnote muted small" data-testid="selection-note">
        {n} selected — edits apply to {ids.length === 2 ? 'both' : `all ${ids.length}`}.
      </p>
    </div>
  );
}
