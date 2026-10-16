import { useEffect, useMemo, useRef } from 'react';
import { useEditor } from '../../app/EditorContext';
import { usePlayheadValue } from '../../audio/usePlayer';
import { playingIndex, timedLines } from '../../editor/playing';
import { lineWarnings } from '../../editor/warnings';
import { LyricRow } from './LyricRow';
import { SheetInput } from './SheetInput';
import { useLyricHandlers } from './useLyricHandlers';
import { TimingPrompt } from './TimingPrompt';

function scrollRowIntoView(list: HTMLElement | null, id: string | null) {
  if (!list || !id) return;
  list.querySelector(`[data-line-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'nearest' });
}

/** The sheet: what is placed and what is not, at a glance; select, reorder, merge. */
export function LyricsPane() {
  const { editor, player, durationMs } = useEditor();
  const { doc, selection } = editor;
  const handlers = useLyricHandlers();
  const listRef = useRef<HTMLOListElement>(null);

  const warnings = useMemo(() => lineWarnings(doc, durationMs), [doc, durationMs]);
  const timed = useMemo(() => timedLines(doc), [doc]);
  const selected = useMemo(() => new Set(selection.ids), [selection.ids]);
  const playingId = usePlayheadValue(player, (ms) => timed[playingIndex(timed, ms)]?.id ?? null);
  const placed = timed.length;

  useEffect(() => scrollRowIntoView(listRef.current, selection.focus), [selection.focus]);
  useEffect(() => {
    if (player.getState().playing) scrollRowIntoView(listRef.current, playingId);
  }, [player, playingId]);

  return (
    <aside className="pane lyrics" aria-label="Lyrics">
      <header className="pane__header">
        <h2>Lyrics</h2>
      </header>
      <SheetInput />
      <div className="lines-head" data-testid="lines-head">
        <span>Lines · {doc.lines.length}</span>
        <span className={placed === doc.lines.length && placed > 0 ? 'save-state--ok' : ''}>
          {placed} placed
        </span>
      </div>
      <TimingPrompt />
      {doc.lines.length === 0 ? (
        <p className="muted empty">No lines yet. Paste a lyric sheet above.</p>
      ) : (
        <ol
          ref={listRef}
          className="lyrics__list"
          role="listbox"
          aria-multiselectable
          aria-label="Lyric lines"
          // Scrollable, so it must be reachable by keyboard; ↑/↓ then move between lines.
          tabIndex={0}
        >
          {doc.lines.map((line, i) => (
            <LyricRow
              key={line.id}
              line={line}
              index={i}
              segment={doc.segments[line.id]}
              selected={selected.has(line.id)}
              focused={selection.focus === line.id}
              playing={playingId === line.id}
              warnings={warnings.get(line.id)}
              {...handlers}
            />
          ))}
        </ol>
      )}
      <p className="muted small pane__hint">
        Drag a line onto the timeline to place it, onto a neighbouring line to merge. Double-click a line to
        jump to it.
      </p>
    </aside>
  );
}
