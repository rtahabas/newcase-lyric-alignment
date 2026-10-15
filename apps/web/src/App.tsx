import { useEffect, useState } from 'react';
import { api, ApiError } from './api';

/**
 * Deliberately partial. These are the only fields this placeholder reads; the
 * payload has a good deal more in it. Type the rest as you need it.
 */
type Track = {
  title: string;
  audio_url: string;
  lines: unknown[];
};

export default function App() {
  const [track, setTrack] = useState<Track | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    api<Track>('/api/v1/track')
      .then((t) => { if (live) setTrack(t); })
      .catch((e: unknown) => {
        if (!live) return;
        setError(e instanceof ApiError ? `${e.message} ${JSON.stringify(e.body)}` : String(e));
      });
    return () => { live = false; };
  }, []);

  if (error) return <p>{error}</p>;
  if (!track) return <p>Loading…</p>;

  return (
    <>
      <h1>{track.title}</h1>
      <p>{track.lines.length} lines</p>
      <audio controls src={track.audio_url} />
    </>
  );
}
