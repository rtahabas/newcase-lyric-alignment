/**
 * Reordering from the keyboard, so the list is not drag-only. Moves the
 * focused line; its timing travels with it, and so does the selection.
 */
import type { Command, CommandContext } from './types';
import { isMod } from './types';
import { moveLine } from '../editor/lines';

function move(c: CommandContext, dir: 1 | -1) {
  const id = c.editor.selection.focus;
  const { lines } = c.editor.doc;
  const from = lines.findIndex((l) => l.id === id);
  const to = from + dir;
  if (!id || from < 0 || to < 0 || to >= lines.length) return;
  c.dispatch({
    type: 'edit',
    label: `Move line ${from + 1} to ${to + 1}`,
    apply: (d) => moveLine(d, id, to),
  });
}

const altArrow = (k: string) => (e: KeyboardEvent) => e.key === k && e.altKey && !isMod(e) && !e.shiftKey;

export const LINE_COMMANDS: Command[] = [
  {
    group: 'Edit',
    keys: ['Alt', '↑'],
    label: 'Move focused line up',
    match: altArrow('ArrowUp'),
    run: (c) => move(c, -1),
  },
  {
    group: 'Edit',
    keys: ['Alt', '↓'],
    label: 'Move focused line down',
    match: altArrow('ArrowDown'),
    run: (c) => move(c, 1),
  },
];
