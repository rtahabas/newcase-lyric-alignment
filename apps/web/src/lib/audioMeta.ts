/**
 * Title and artist for a dropped/picked audio file: from its ID3v2 tag when it
 * has one (most MP3s do), otherwise guessed from the file name. Used only to
 * pre-fill the new-track form and to look lyrics up; the user can edit both.
 */
export type AudioMeta = { title: string; artist: string };

const decoders: Record<number, string> = { 0: 'latin1', 1: 'utf-16', 2: 'utf-16be', 3: 'utf-8' };

const syncsafe = (b: Uint8Array, o: number) => (b[o] << 21) | (b[o + 1] << 14) | (b[o + 2] << 7) | b[o + 3];
const plain = (b: Uint8Array, o: number) =>
  ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;

function frameText(body: Uint8Array): string {
  let label = decoders[body[0]] ?? 'latin1';
  let text = body.subarray(1);
  // Encoding 1 is "UTF-16 with BOM": the BOM, not a fixed default, decides the byte order.
  if (body[0] === 1 && text.length >= 2 && text[0] === 0xfe && text[1] === 0xff) {
    label = 'utf-16be';
    text = text.subarray(2);
  }
  return new TextDecoder(label).decode(text).replace(/\0+$/g, '').split('\0')[0].trim();
}

/** Reads TIT2 (title) and TPE1 (artist) from an ID3v2.3/2.4 tag. Returns null without a tag. */
export function parseId3(bytes: Uint8Array): Partial<AudioMeta> | null {
  if (bytes.length < 10 || String.fromCharCode(bytes[0], bytes[1], bytes[2]) !== 'ID3') return null;
  const major = bytes[3];
  if (major !== 3 && major !== 4) return null;
  const end = Math.min(bytes.length, 10 + syncsafe(bytes, 6));
  const out: Partial<AudioMeta> = {};
  for (let o = 10; o + 10 <= end; ) {
    const id = String.fromCharCode(bytes[o], bytes[o + 1], bytes[o + 2], bytes[o + 3]);
    if (!/^[A-Z0-9]{4}$/.test(id)) break; // padding
    const size = major === 4 ? syncsafe(bytes, o + 4) : plain(bytes, o + 4);
    const body = bytes.subarray(o + 10, o + 10 + size);
    if (id === 'TIT2') out.title = frameText(body);
    if (id === 'TPE1') out.artist = frameText(body);
    o += 10 + size;
  }
  return out;
}

/** "03 - Artist - Song (Official Audio).mp3" -> { artist: "Artist", title: "Song" }. */
export function metaFromFilename(name: string): AudioMeta {
  const base = name
    .replace(/\.[^.]+$/, '')
    .replace(/[_]+/g, ' ')
    .replace(/^\s*\d{1,3}\s*[-.)]\s*/, '')
    .replace(/\s*[[(](official|lyrics?|audio|video|hq|hd)[^\])]*[\])]\s*/gi, ' ')
    .trim();
  const parts = base.split(/\s+-\s+/);
  return parts.length >= 2
    ? { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim() }
    : { artist: '', title: base };
}

const TAG_PROBE_BYTES = 256 * 1024;

export async function readAudioMeta(file: File): Promise<AudioMeta> {
  const fallback = metaFromFilename(file.name);
  try {
    const head = new Uint8Array(await file.slice(0, TAG_PROBE_BYTES).arrayBuffer());
    const tag = parseId3(head);
    return { title: tag?.title || fallback.title, artist: tag?.artist || fallback.artist };
  } catch {
    return fallback;
  }
}
