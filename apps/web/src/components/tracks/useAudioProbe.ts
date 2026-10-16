import { useEffect, useState } from 'react';
import type { Ms } from '../../lib/time';
import { secToMs } from '../../lib/time';

export type Probe =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'ok'; durationMs: Ms }
  | { status: 'bad'; reason: string };

/**
 * Asks the browser whether it can actually play this audio, before a track is
 * created around it. Reads metadata only; nothing is decoded or uploaded.
 */
const URL_DEBOUNCE_MS = 500;

export function useAudioProbe(source: File | string | null): Probe {
  const [probe, setProbe] = useState<Probe>({ status: 'idle' });

  useEffect(() => {
    if (!source) {
      setProbe({ status: 'idle' });
      return;
    }
    const isUrl = typeof source === 'string';
    const url = isUrl ? source : URL.createObjectURL(source);
    const audio = new Audio();
    audio.preload = 'metadata';
    setProbe({ status: 'checking' });
    const ok = () =>
      Number.isFinite(audio.duration)
        ? setProbe({ status: 'ok', durationMs: secToMs(audio.duration) })
        : setProbe({ status: 'bad', reason: 'The audio has no readable duration.' });
    const bad = () =>
      setProbe({ status: 'bad', reason: 'This browser cannot play that audio (format or address).' });
    audio.addEventListener('loadedmetadata', ok);
    audio.addEventListener('error', bad);
    // A picked file is checked at once; a URL waits until typing pauses, so a
    // half-typed address does not fire a request (and an error) per keystroke.
    const timer = window.setTimeout(() => (audio.src = url), isUrl ? URL_DEBOUNCE_MS : 0);
    return () => {
      window.clearTimeout(timer);
      audio.removeEventListener('loadedmetadata', ok);
      audio.removeEventListener('error', bad);
      audio.removeAttribute('src');
      if (!isUrl) URL.revokeObjectURL(url);
    };
  }, [source]);

  return probe;
}

const AUDIO_EXT = /\.(mp3|wav|ogg|oga|m4a|aac|flac|webm|opus)$/i;

export const isAudioFile = (f: File) => f.type.startsWith('audio/') || AUDIO_EXT.test(f.name);
