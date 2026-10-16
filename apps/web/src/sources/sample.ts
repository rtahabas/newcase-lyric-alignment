/**
 * A track of the candidate's own, offered in the track menu so bringing a track
 * can be tried in one click. It takes exactly the path a dropped file does:
 * fetched into a File, then the New track dialog (tags, lyrics lookup).
 * The recording is not under any licence: see public/samples/NOTICE.md.
 */
export const SAMPLE = {
  title: 'Kendim Ettim Kendim Buldum',
  artist: 'Taha Baş',
  url: '/samples/kendim-ettim-kendim-buldum.mp3',
};

const TIMEOUT_MS = 30_000;

export async function fetchSample(): Promise<File> {
  const res = await fetch(SAMPLE.url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`the server answered ${res.status}`);
  const blob = await res.blob();
  return new File([blob], 'kendim-ettim-kendim-buldum.mp3', { type: 'audio/mpeg' });
}
