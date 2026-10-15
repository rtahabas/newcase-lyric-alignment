/**
 * The lyric list's event handlers, kept stable across renders (via useLatest)
 * so memoised rows only re-render when their own props change.
 */
import { useCallback } from 'react';
import type { DragEvent, MouseEvent } from 'react';
import { useEditor } from '../../app/EditorContext';
import { click } from '../../editor/selection';
import { jumpTarget, untimedSeek } from '../../editor/navigation';
import { mergeLines, moveLine } from '../../editor/lines';
import { useLatest } from '../../lib/useLatest';
import type { DropZone } from './lineDrag';
import { draggedLineId } from './lineDrag';

export function useLyricHandlers() {
  const { editor, dispatch, player } = useEditor();
  const latest = useLatest(editor);

  const onClick = useCallback(
    (id: string, e: MouseEvent) => {
      const { selection, doc } = latest.current;
      const mods = { shift: e.shiftKey, toggle: e.metaKey || e.ctrlKey };
      dispatch({ type: 'select', selection: click(selection, doc.lines, id, mods) });
    },
    [dispatch, latest],
  );

  /**
   * Double-click: hear a timed line. For an untimed one, go to where it should start
   * when that is known, and keep playing - never restart what is already playing.
   */
  const onJump = useCallback(
    (id: string) => {
      const target = jumpTarget(latest.current.doc, id);
      if (!target) return;
      if (target.kind === 'timed') {
        player.playRange(target.startMs, target.endMs);
        return;
      }
      const playing = player.getState().playing;
      const to = untimedSeek(target, player.timeMs(), playing);
      if (to !== null) player.seek(to);
      if (!playing) player.play();
    },
    [player, latest],
  );

  const onDropLine = useCallback(
    (target: string, zone: DropZone, e: DragEvent) => {
      const src = draggedLineId(e);
      const { lines } = latest.current.doc;
      if (!src || src === target) return;
      const from = lines.findIndex((l) => l.id === src);
      const at = lines.findIndex((l) => l.id === target);
      if (zone === 'merge') {
        dispatch({
          type: 'edit',
          label: `Merge lines ${from + 1} and ${at + 1}`,
          apply: (d) => mergeLines(d, src, target),
        });
        return;
      }
      // Index in the list *after* the dragged line has been taken out.
      const base = from < at ? at - 1 : at;
      const to = zone === 'before' ? base : base + 1;
      dispatch({
        type: 'edit',
        label: `Move line ${from + 1} to ${to + 1}`,
        apply: (d) => moveLine(d, src, to),
      });
    },
    [dispatch, latest],
  );

  return { onClick, onJump, onDropLine };
}
