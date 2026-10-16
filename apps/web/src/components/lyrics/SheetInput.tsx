import { useState } from 'react';
import { useEditor } from '../../app/EditorContext';
import { parseLyricSheet } from '../../lib/lyrics';
import { insertLines, replaceSheet } from '../../editor/lines';
import { single } from '../../editor/selection';

/**
 * As in the wireframe: an always-open paste box, "Add all lines", and "+ Add
 * line" (one line after the focused one). "Replace all" starts the sheet over.
 * All are ordinary undoable edits, so none needs a confirm dialog.
 */
export function SheetInput() {
  const { editor, dispatch } = useEditor();
  const [adding, setAdding] = useState(false);
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
      label: `Add ${parsed.length} lines`,
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
    setAdding(false);
  };

  return (
    <div className="sheet-input">
      <label className="visually-hidden" htmlFor="sheet">
        Lyric sheet
      </label>
      <textarea
        id="sheet"
        rows={3}
        placeholder="Paste full lyrics… ([Chorus]-style labels are skipped)"
        value={sheet}
        onChange={(e) => setSheet(e.target.value)}
      />
      <div className="row">
        <button
          className="grow center"
          disabled={!parsed.length}
          onClick={append}
          data-testid="add-all-lines"
        >
          Add all lines{parsed.length ? ` (${parsed.length})` : ''}
        </button>
        {lines.length > 0 && (
          <button
            className="btn-ghost small"
            disabled={!parsed.length}
            onClick={replace}
            title="Replace the whole sheet (undoable)"
          >
            Replace all
          </button>
        )}
      </div>
      {adding ? (
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            addOne();
          }}
        >
          <input
            autoFocus
            aria-label="New line"
            placeholder="New line, added after the focused one"
            value={oneLine}
            onChange={(e) => setOneLine(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setAdding(false)}
          />
          <button type="submit" disabled={!oneLine.trim()}>
            Add
          </button>
        </form>
      ) : (
        <button className="center" onClick={() => setAdding(true)} data-testid="add-line">
          + Add line
        </button>
      )}
    </div>
  );
}
