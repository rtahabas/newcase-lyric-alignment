import type { Command, CommandContext } from './types';
import { isMod, key } from './types';
import { all, step } from '../editor/selection';
import { clampZoom } from '../app/EditorContext';
import { auditionAroundEnd, auditionAroundStart, auditionSelection } from './audition';

const seekBy = (c: CommandContext, e: KeyboardEvent, dir: 1 | -1) =>
  c.player.seek(c.player.timeMs() + dir * (e.shiftKey ? 5000 : 2000));

const move = (c: CommandContext, e: KeyboardEvent, dir: 1 | -1) =>
  c.dispatch({ type: 'select', selection: step(c.editor.selection, c.editor.doc.lines, dir, e.shiftKey) });

const plain = (k: string) => (e: KeyboardEvent) => e.key === k && !isMod(e) && !e.altKey;

export const LISTEN_COMMANDS: Command[] = [
  {
    group: 'Listen',
    keys: ['Space'],
    label: 'Play / pause',
    match: key(' '),
    run: (c) => c.player.toggle(),
    once: true,
  },
  {
    group: 'Listen',
    keys: ['P'],
    label: 'Play the selection',
    match: key('p'),
    run: auditionSelection,
    once: true,
  },
  {
    group: 'Listen',
    keys: ['B'],
    label: 'Play around the selection start',
    match: key('b'),
    run: auditionAroundStart,
    once: true,
  },
  {
    group: 'Listen',
    keys: ['E'],
    label: 'Play around the selection end',
    match: key('e'),
    run: auditionAroundEnd,
    once: true,
  },
  {
    group: 'Listen',
    keys: ['←'],
    label: 'Back 2 s (Shift: 5 s)',
    match: plain('ArrowLeft'),
    run: (c, e) => seekBy(c, e, -1),
  },
  {
    group: 'Listen',
    keys: ['→'],
    label: 'Forward 2 s (Shift: 5 s)',
    match: plain('ArrowRight'),
    run: (c, e) => seekBy(c, e, 1),
  },
];

export const SELECT_EDIT_COMMANDS: Command[] = [
  {
    group: 'Select',
    keys: ['↑'],
    label: 'Previous line (Shift: extend)',
    match: plain('ArrowUp'),
    run: (c, e) => move(c, e, -1),
  },
  {
    group: 'Select',
    keys: ['↓'],
    label: 'Next line (Shift: extend)',
    match: plain('ArrowDown'),
    run: (c, e) => move(c, e, 1),
  },
  {
    group: 'Select',
    keys: ['⌘', 'A'],
    label: 'Select all lines',
    match: key('a', { mod: true }),
    run: (c) => c.dispatch({ type: 'select', selection: all(c.editor.doc.lines) }),
    once: true,
  },
  {
    group: 'Edit',
    keys: ['⌘', 'Z'],
    label: 'Undo',
    match: key('z', { mod: true, shift: false }),
    run: (c) => c.dispatch({ type: 'undo' }),
  },
  {
    group: 'Edit',
    keys: ['⌘', 'Shift', 'Z'],
    label: 'Redo (⌘Y too)',
    match: (e) => isMod(e) && ((e.shiftKey && e.key.toLowerCase() === 'z') || e.key === 'y'),
    run: (c) => c.dispatch({ type: 'redo' }),
  },
  {
    group: 'Edit',
    keys: ['⌘', 'S'],
    label: 'Save',
    match: key('s', { mod: true }),
    run: (c) => c.save(),
    once: true,
  },
];

export const VIEW_COMMANDS: Command[] = [
  {
    group: 'Timing',
    keys: ['O'],
    label: 'Snap stamps to sound onsets on / off',
    match: key('o'),
    run: (c) => c.setSnapOn(!c.snapOn),
    once: true,
  },
  {
    group: 'View',
    keys: ['+'],
    label: 'Zoom in',
    match: (e) => (e.key === '+' || e.key === '=') && !isMod(e),
    run: (c) => c.setZoom(clampZoom(c.zoom * 1.5)),
  },
  {
    group: 'View',
    keys: ['−'],
    label: 'Zoom out',
    match: plain('-'),
    run: (c) => c.setZoom(clampZoom(c.zoom / 1.5)),
  },
  {
    group: 'View',
    keys: ['?'],
    label: 'Show / hide shortcuts',
    match: (e) => e.key === '?',
    run: (c) => c.toggleHelp(),
    once: true,
  },
];
