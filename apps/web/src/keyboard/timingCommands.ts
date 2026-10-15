import type { Command, CommandContext } from './types';
import { countLabel, isMod, key } from './types';
import type { Ms } from '../lib/time';
import { formatMs } from '../lib/time';
import { clearTimings, moveSelectionTo, shiftSegments } from '../editor/timing';
import { snapToOnset } from '../audio/onsets';

/** Stamp at the key press, pulled onto the nearest sound onset when snapping is on. */
function stamp(c: CommandContext) {
  const raw = c.player.timeMs();
  const snapped = c.snapOn && c.onsets ? snapToOnset(c.onsets, raw) : null;
  c.dispatch({ type: 'stamp', t: snapped ?? raw, rawMs: raw });
}

function nudge(c: CommandContext, delta: Ms) {
  const ids = c.editor.selection.ids;
  if (!ids.length) return;
  const label = `Nudge ${countLabel(c)} ${delta > 0 ? '+' : ''}${delta} ms`;
  c.dispatch({ type: 'edit', label, apply: (d, dur) => shiftSegments(d, ids, delta, dur) });
}

function moveToPlayhead(c: CommandContext) {
  const ids = c.editor.selection.ids;
  const t = c.player.timeMs();
  const label = `Move ${countLabel(c)} to ${formatMs(t)}`;
  c.dispatch({ type: 'edit', label, apply: (d, dur) => moveSelectionTo(d, ids, t, dur) });
}

function clear(c: CommandContext) {
  const ids = c.editor.selection.ids;
  c.dispatch({ type: 'edit', label: `Clear timing of ${countLabel(c)}`, apply: (d) => clearTimings(d, ids) });
}

export const TIMING_COMMANDS: Command[] = [
  {
    group: 'Timing',
    keys: ['Enter'],
    label: 'Stamp focused line at playhead, move to next',
    match: key('Enter', { shift: false }),
    run: stamp,
    once: true,
  },
  {
    group: 'Timing',
    keys: ['Shift', 'Enter'],
    label: 'Stamp the end of the line just stamped',
    match: key('Enter', { shift: true }),
    run: (c) => c.dispatch({ type: 'stampEnd', t: c.player.timeMs() }),
    once: true,
  },
  {
    group: 'Timing',
    keys: ['['],
    label: 'Nudge selection −50 ms',
    match: key('['),
    run: (c) => nudge(c, -50),
  },
  {
    group: 'Timing',
    keys: [']'],
    label: 'Nudge selection +50 ms',
    match: key(']'),
    run: (c) => nudge(c, 50),
  },
  {
    group: 'Timing',
    keys: ['Shift', '['],
    label: 'Nudge selection −500 ms',
    match: key('{'),
    run: (c) => nudge(c, -500),
  },
  {
    group: 'Timing',
    keys: ['Shift', ']'],
    label: 'Nudge selection +500 ms',
    match: key('}'),
    run: (c) => nudge(c, 500),
  },
  {
    group: 'Timing',
    keys: ['M'],
    label: 'Move selection so it starts at the playhead',
    match: key('m'),
    run: moveToPlayhead,
  },
  {
    group: 'Timing',
    keys: ['Delete'],
    label: 'Clear timing of selection (Backspace too)',
    match: (e) => (e.key === 'Delete' || e.key === 'Backspace') && !isMod(e),
    run: clear,
  },
];
