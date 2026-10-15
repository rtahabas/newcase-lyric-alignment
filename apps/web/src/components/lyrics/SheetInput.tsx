import { useState } from 'react';
import { useEditor } from '../../app/EditorContext';
import { parseLyricSheet } from '../../lib/lyrics';
import { insertLines, replaceSheet } from '../../editor/lines';
import { single } from '../../editor/selection';

/**
 * Paste a whole sheet (replace or append) or add one line after the focused
 * one. Both are ordinary undoable edits, so "Replace" needs no confirm dialog.
 */
export function SheetInput({ startOpen }: { startOpen: boolean }) {
  const { editor, dispatch } = useEditor();
  const [open, setOpen] = useState(startOpen);
  const [sheet, setSheet] = useState('');
  const [oneLine, setOneLine] = useState('');
  const parsed = parseLyricSheet(sheet);
  const { lines } = editor.doc;

  const replace = () => {
    const doc = replaceSheet(parsed);
    dispatch({
      type: 'edit',
      label: `Replace sheet (${parsed.length} lines)`,
      apply: () => doc,
      select: single(doc.lines[0]?.id ?? null),
    });
    setSheet('');
  };
  const append = () => {
    const { doc, ids } = insertLines(editor.doc, lines.length - 1, parsed);
    dispatch({
      type: 'edit',
      label: `Append ${parsed.length} lines`,
      apply: () => doc,
      select: single(ids[0]),
    });
    setSheet('');
  };
  const addOne = () => {
    const text = oneLine.trim();
    if (!text) return;
    const at = lines.findIndex((l) => l.id === editor.selection.focus);
    const after = at >= 0 ? at : lines.length - 1;
    dispatch({
      type: 'edit',
      label: `Add line ${after + 2}`,
      apply: (d) => insertLines(d, after, [text]).doc,
    });
    setOneLine('');
  };

  if (!open) {
    return (
      <button className="btn-ghost small" onClick={() => setOpen(true)}>
        Paste lyrics / add a line…
      </button>
    );
  }
  return (
    <div className="sheet-input">
      <label className="visually-hidden" htmlFor="sheet">
        Lyric sheet
      </label>
      <textarea
        id="sheet"
        rows={5}
        placeholder="Paste a full lyric sheet — one line per row. [Chorus]-style labels are skipped."
        value={sheet}
        onChange={(e) => setSheet(e.target.value)}
      />
      <div className="row">
        <button className="btn-primary" disabled={!parsed.length} onClick={replace}>
          Replace sheet{parsed.length ? ` (${parsed.length})` : ''}
        </button>
        <button disabled={!parsed.length || !lines.length} onClick={append}>
          Append
        </button>
        {lines.length > 0 && (
          <button className="btn-ghost" onClick={() => setOpen(false)}>
            Hide
          </button>
        )}
      </div>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          addOne();
        }}
      >
        <input
          aria-label="New line"
          placeholder="Add one line after the focused line"
          value={oneLine}
          onChange={(e) => setOneLine(e.target.value)}
        />
        <button type="submit" disabled={!oneLine.trim()}>
          Add
        </button>
      </form>
    </div>
  );
}
