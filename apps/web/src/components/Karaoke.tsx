import { useMemo } from 'react';
import { useEditor } from '../app/EditorContext';
import { usePlayheadValue } from '../audio/usePlayer';
import type { TimedLine } from '../editor/playing';
import { playingIndex, timedLines, upcomingIndex } from '../editor/playing';

/** Where the playhead is relative to the timed lines. */
type Position = { kind: 'playing'; index: number } | { kind: 'gap'; nextIndex: number } | { kind: 'after' };

const samePosition = (a: Position, b: Position) =>
  a.kind === b.kind &&
  (a.kind !== 'playing' || a.index === (b as typeof a).index) &&
  (a.kind !== 'gap' || a.nextIndex === (b as typeof a).nextIndex);

function locate(timed: TimedLine[], ms: number): Position {
  const index = playingIndex(timed, ms);
  if (index >= 0) return { kind: 'playing', index };
  const nextIndex = upcomingIndex(timed, ms);
  return nextIndex >= 0 ? { kind: 'gap', nextIndex } : { kind: 'after' };
}

/**
 * The line playing now, with its neighbours in time. Re-renders only when the
 * position changes, not every frame.
 */
export function Karaoke() {
  const { editor, player } = useEditor();
  const timed = useMemo(() => timedLines(editor.doc), [editor.doc]);
  const pos = usePlayheadValue(player, (ms) => locate(timed, ms), samePosition);

  if (timed.length === 0) {
    return <div className="karaoke karaoke--empty">Timed lines will play back here.</div>;
  }
  const prevIndex =
    pos.kind === 'playing' ? pos.index - 1 : pos.kind === 'gap' ? pos.nextIndex - 1 : timed.length - 1;
  const now = pos.kind === 'playing' ? timed[pos.index] : null;
  const next =
    pos.kind === 'playing' ? timed[pos.index + 1] : pos.kind === 'gap' ? timed[pos.nextIndex] : undefined;

  return (
    <div className="karaoke" data-testid="karaoke">
      <p className="karaoke__side">{timed[prevIndex]?.text ?? ' '}</p>
      <p className={`karaoke__now${now ? '' : ' karaoke__now--idle'}`}>{now?.text ?? '♪'}</p>
      <p className="karaoke__side">{next?.text ?? ' '}</p>
    </div>
  );
}
