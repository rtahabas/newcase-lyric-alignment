import { useEffect } from 'react';
import type { RefObject } from 'react';
import { useEditor } from '../../app/EditorContext';
import { useLatest } from '../../lib/useLatest';
import { msToPx } from './scale';

/**
 * Picking a line (list, arrows, a stamp moving on) brings its block into view
 * if it is off screen. Not while playing: then the playhead owns the view.
 */
export function useRevealFocus(scroller: RefObject<HTMLElement>): void {
  const { editor, player, zoom } = useEditor();
  const { focus } = editor.selection;
  const latest = useLatest({ doc: editor.doc, zoom });

  useEffect(() => {
    const el = scroller.current;
    if (!el || !focus || player.getState().playing) return;
    const { doc, zoom: z } = latest.current;
    const seg = doc.segments[focus];
    if (!seg) return;
    const x0 = msToPx(seg.startMs, z);
    const x1 = msToPx(seg.endMs, z);
    if (x0 >= el.scrollLeft && x1 <= el.scrollLeft + el.clientWidth) return;
    el.scrollTo({ left: Math.max(0, x0 - el.clientWidth * 0.25), behavior: 'smooth' });
  }, [focus, scroller, player, latest]);
}
