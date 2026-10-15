import { useEffect, useState } from 'react';
import { isAudioFile } from './useAudioProbe';
import { useLatest } from '../../lib/useLatest';

const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types.includes('Files');

/**
 * Drop an audio file anywhere on the page to start a new track. Only file
 * drags count - dragging a lyric line never triggers it. Returns whether a
 * file is being dragged over the window, for the drop hint.
 */
export function useFileDrop(onFile: (file: File) => void): boolean {
  const [over, setOver] = useState(false);
  const callback = useLatest(onFile);

  useEffect(() => {
    let depth = 0; // dragenter/leave fire for every child crossed; count to know when we truly left.
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth += 1;
      setOver(true);
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setOver(false);
    };
    const overFn = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault(); // otherwise the browser navigates to the file
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setOver(false);
      const file = Array.from(e.dataTransfer?.files ?? []).find(isAudioFile);
      if (file) callback.current(file);
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragleave', leave);
    window.addEventListener('dragover', overFn);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('dragover', overFn);
      window.removeEventListener('drop', drop);
    };
  }, [callback]);

  return over;
}
