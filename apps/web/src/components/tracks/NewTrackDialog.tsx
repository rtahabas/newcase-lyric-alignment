import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Modal } from '../../ui/Modal';
import { createLocalTrack } from '../../sources/local';
import { parseLyricSheet } from '../../lib/lyrics';
import { formatShort } from '../../lib/time';
import { readAudioMeta } from '../../lib/audioMeta';
import { isAudioFile, useAudioProbe } from './useAudioProbe';
import { AudioSourceField } from './AudioSourceField';
import { LyricsField } from './LyricsField';
import { DraftTimingsOption } from './DraftTimingsOption';
import { pickTimedVersion } from '../../sources/lyricsLookup';
import { useLyricsLookup } from './useLyricsLookup';
import { parseLrc } from '../../lib/lrcParse';
import { draftFromEntries } from '../../editor/draft';

type Props = { initialFile: File | null; onCancel: () => void; onCreated: (id: string) => void };

/**
 * Bring your own track: pick the audio and the rest follows — title and artist
 * from its tags (or file name), lyrics looked up on LRCLIB. Every field stays
 * editable, and pasting a sheet by hand always works.
 */
export function NewTrackDialog({ initialFile, onCancel, onCreated }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [sheet, setSheet] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [useTimings, setUseTimings] = useState(false);

  const source = file ?? (url.trim() || null);
  const probe = useAudioProbe(source);
  const lines = parseLyricSheet(sheet);
  const durationMs = probe.status === 'ok' ? probe.durationMs : null;
  const canCreate = probe.status === 'ok' && title.trim() !== '' && lines.length > 0 && !busy;
  const { state: lookup, retry } = useLyricsLookup(title, artist, durationMs, probe.status === 'ok');
  const version = lookup.status === 'done' ? pickTimedVersion(lookup.timed, title, durationMs) : null;
  const synced = version?.usable ? version.candidate : null;
  const usingDraft = useTimings && synced !== null;

  /** Takes a file and fills title/artist from it, without overwriting what the user typed. */
  const pickFile = useCallback((f: File | null) => {
    if (f && !isAudioFile(f)) return setError(`"${f.name}" does not look like an audio file.`);
    setError(null);
    setFile(f);
    if (!f) return;
    void readAudioMeta(f).then((meta) => {
      setTitle((t) => t.trim() || meta.title);
      setArtist((a) => a.trim() || meta.artist);
    });
  }, []);

  // The file that opened the dialog, and any file dropped on the page while it is open.
  useEffect(() => {
    pickFile(initialFile);
  }, [initialFile, pickFile]);

  /** Built only on submit: a draft gets fresh line ids, so it is made exactly once. */
  const buildDraft = () =>
    usingDraft && synced ? draftFromEntries(parseLrc(synced.synced), durationMs) : undefined;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canCreate || !source) return;
    setBusy(true);
    try {
      const p = await createLocalTrack({
        title: title.trim(),
        artist: artist.trim(),
        audio: source,
        lines,
        draft: buildDraft(),
      });
      onCreated(p.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <Modal
      title="New track"
      onClose={onCancel}
      description="Pick your audio; title, artist and lyrics are filled in for you when they can be found. Stored in this browser only."
      wide
    >
      <form className="new-track" onSubmit={(e) => void submit(e)}>
        <AudioSourceField file={file} url={url} onFile={pickFile} onUrl={setUrl} probe={probe} />
        <div className="row">
          <label className="field grow">
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              data-testid="new-title"
            />
          </label>
          <label className="field grow">
            Artist
            <input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="optional" />
          </label>
        </div>
        <LyricsField
          sheet={sheet}
          onSheet={setSheet}
          title={title}
          artist={artist}
          durationMs={durationMs}
          lookup={lookup}
          onRetry={retry}
        />
        {version && (
          <DraftTimingsOption
            version={version}
            durationMs={durationMs}
            checked={useTimings}
            onChange={setUseTimings}
          />
        )}
        {error && (
          <p className="field__error" role="alert">
            {error}
          </p>
        )}
        <div className="row end">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-primary" type="submit" disabled={!canCreate}>
            {busy ? 'Creating…' : 'Create and open'}
            {probe.status === 'ok' &&
              ` (${formatShort(probe.durationMs)}, ${usingDraft ? 'timed draft' : `${lines.length} lines`})`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
