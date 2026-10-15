import { describe, expect, it } from 'vitest';
import type { EditorState } from './reducer';
import { editorReducer, initialEditor, undoLabel } from './reducer';
import { shiftSegments } from './timing';

const loaded = (): EditorState => {
  const s = editorReducer(initialEditor, { type: 'duration', ms: 120_000 });
  return editorReducer(s, {
    type: 'load',
    doc: {
      lines: ['one', 'two', 'three'].map((text, i) => ({ id: String(i + 1), text })),
      segments: {},
    },
  });
};

describe('editorReducer', () => {
  it('stamps the focused line, advances focus, and chains the next stamp', () => {
    let s = loaded();
    s = editorReducer(s, { type: 'stamp', t: 1000 });
    expect(s.selection.focus).toBe('2');
    s = editorReducer(s, { type: 'stamp', t: 2200 });
    expect(s.doc.segments['1']).toEqual({ startMs: 1000, endMs: 2200 });
    expect(s.doc.segments['2'].startMs).toBe(2200);
    expect(s.lastAction).toBe('Stamp line 2 at 0:02.200');
  });

  it('undoes and redoes whole edits, with labels', () => {
    let s = editorReducer(loaded(), { type: 'stamp', t: 1000 });
    s = editorReducer(s, {
      type: 'edit',
      label: 'Shift +100 ms',
      apply: (d, dur) => shiftSegments(d, ['1'], 100, dur),
    });
    expect(undoLabel(s)).toBe('Shift +100 ms');
    s = editorReducer(s, { type: 'undo' });
    expect(s.doc.segments['1'].startMs).toBe(1000);
    expect(s.lastAction).toBe('Undid: Shift +100 ms');
    s = editorReducer(s, { type: 'redo' });
    expect(s.doc.segments['1'].startMs).toBe(1100);
  });

  it('undoing a stamp puts focus back on the stamped line', () => {
    let s = editorReducer(loaded(), { type: 'stamp', t: 1000 });
    expect(s.selection.focus).toBe('2');
    s = editorReducer(s, { type: 'undo' });
    expect(s.selection.focus).toBe('1');
    s = editorReducer(s, { type: 'redo' });
    expect(s.selection.focus).toBe('2');
  });

  it('records nothing for an edit that changes nothing', () => {
    const s = loaded();
    const next = editorReducer(s, { type: 'edit', label: 'noop', apply: (d) => d });
    expect(next.past).toHaveLength(0);
  });

  it('breaks the stamping chain when the user navigates explicitly', () => {
    let s = editorReducer(loaded(), { type: 'stamp', t: 1000 });
    s = editorReducer(s, { type: 'select', selection: { ids: ['3'], anchor: '3', focus: '3' } });
    s = editorReducer(s, { type: 'stamp', t: 9000 });
    expect(s.doc.segments['1'].endMs).toBe(5000);
  });
});
