import { useRef } from 'react';
import { useEditor } from '../app/EditorContext';
import { usePlayheadTick } from '../audio/usePlayer';
import { formatMs } from '../lib/time';

/** Current time, written straight to the DOM every frame - no React render per tick. */
export function TimeReadout() {
  const { player } = useEditor();
  const ref = useRef<HTMLOutputElement>(null);
  usePlayheadTick(player, (ms) => {
    if (ref.current) ref.current.textContent = formatMs(ms);
  });
  return (
    <output ref={ref} className="time-readout" aria-label="Playback position" data-testid="playhead-time">
      {formatMs(0)}
    </output>
  );
}
