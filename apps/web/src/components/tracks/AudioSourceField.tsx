import { useId } from 'react';
import { FileAudio } from 'lucide-react';
import type { Probe } from './useAudioProbe';
import { formatShort } from '../../lib/time';

type Props = {
  file: File | null;
  url: string;
  onFile: (f: File | null) => void;
  onUrl: (u: string) => void;
  probe: Probe;
};

function ProbeLine({ probe }: { probe: Probe }) {
  if (probe.status === 'checking') return <span className="muted small">Checking the audio…</span>;
  if (probe.status === 'ok')
    return <span className="small save-state--ok">Playable · {formatShort(probe.durationMs)}</span>;
  if (probe.status === 'bad') return <span className="field__error">{probe.reason}</span>;
  return null;
}

/** A file picker, or a URL when there is no file. One source at a time. */
export function AudioSourceField({ file, url, onFile, onUrl, probe }: Props) {
  const id = useId();
  return (
    <fieldset className="field">
      <legend>Audio</legend>
      <div className="row">
        <label htmlFor={id} className="btn">
          <FileAudio size={16} /> {file ? 'Change file' : 'Choose file'}
        </label>
        <input
          id={id}
          type="file"
          accept="audio/*"
          className="visually-hidden"
          data-testid="new-audio-file"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <span className="small grow ellipsis">
            {file.name}{' '}
            <button type="button" className="btn-ghost small" onClick={() => onFile(null)}>
              Remove
            </button>
          </span>
        ) : (
          <input
            className="grow"
            type="url"
            aria-label="Audio URL"
            placeholder="…or paste an audio URL"
            value={url}
            onChange={(e) => onUrl(e.target.value)}
          />
        )}
      </div>
      <ProbeLine probe={probe} />
      {!file && !url && (
        <span className="muted small">Tip: you can also drop an audio file anywhere on the page.</span>
      )}
    </fieldset>
  );
}
