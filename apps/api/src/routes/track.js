import { send, notFound } from '../http.js';
import { getTrack, currentState, TRACK_ID } from '../store.js';

/** Everything a client needs in one payload. */
export function getTrackPayload(_req, res) {
  const track = getTrack(TRACK_ID);
  if (!track) throw notFound('no track is seeded; run `pnpm reset` in the repo root');

  const { version, lines, alignment } = currentState(TRACK_ID);

  send(res, 200, {
    id: String(track.id),
    title: track.title,
    artist: track.artist,
    duration_seconds: track.duration_seconds,
    audio_url: track.audio_url,
    lines,
    version,
    alignment,
  });
}
