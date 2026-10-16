/**
 * Tracks the user brings: never touch the API. Metadata and the Doc live in
 * localStorage; the audio file lives in IndexedDB (see audioStore). Nothing
 * here knows about any particular song - duration comes from the audio itself.
 */
import type { Doc } from '../editor/types';
import { replaceSheet } from '../editor/lines';
import { shortId } from '../lib/ids';
import type { LoadedTrack, SaveOutcome, TrackMeta } from './types';
import { deleteAudio, getAudio, putAudio } from './audioStore';

type AudioRef = { kind: 'file'; name: string } | { kind: 'url'; url: string };
export type LocalProject = { id: string; title: string; artist: string; audio: AudioRef; createdAt: string };

const INDEX_KEY = 'lyric-align:projects';
const docKey = (id: string) => `lyric-align:doc:${id}`;
export const localKey = (id: string) => `local:${id}`;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): string | null {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

export const listLocalProjects = (): LocalProject[] => readJson<LocalProject[]>(INDEX_KEY, []);

export type NewLocalTrack = {
  title: string;
  artist: string;
  audio: File | string;
  lines: string[];
  /** An opt-in timed draft (LRCLIB timings); replaces `lines` when given. */
  draft?: Doc;
};

export async function createLocalTrack(input: NewLocalTrack): Promise<LocalProject> {
  const id = shortId();
  const audio: AudioRef =
    typeof input.audio === 'string'
      ? { kind: 'url', url: input.audio }
      : { kind: 'file', name: input.audio.name };
  if (typeof input.audio !== 'string') await putAudio(id, input.audio);
  const project: LocalProject = {
    id,
    title: input.title,
    artist: input.artist,
    audio,
    createdAt: new Date().toISOString(),
  };
  // Doc before index: if the doc cannot be written, no index entry points at nothing.
  const err =
    writeJson(docKey(id), input.draft ?? replaceSheet(input.lines)) ??
    writeJson(INDEX_KEY, [...listLocalProjects(), project]);
  if (err) throw new Error(`Could not store the track in this browser: ${err}`);
  return project;
}

/** Loads a local track. A blob: URL is created for file audio; the caller revokes it. */
/** Stored data can be stale or hand-edited; only a well-formed Doc is trusted. */
function readDoc(id: string): Doc {
  const raw = readJson<unknown>(docKey(id), null);
  const d = raw as Partial<Doc> | null;
  const ok =
    !!d &&
    Array.isArray(d.lines) &&
    d.lines.every((l) => typeof l?.id === 'string' && typeof l?.text === 'string') &&
    typeof d.segments === 'object' &&
    d.segments !== null;
  if (!ok) throw new Error('The saved lines for this track are unreadable; delete it and add it again.');
  return d as Doc;
}

export async function loadLocalTrack(id: string): Promise<LoadedTrack> {
  const project = listLocalProjects().find((p) => p.id === id);
  if (!project) throw new Error('That track is no longer stored in this browser.');
  let audioUrl: string;
  if (project.audio.kind === 'url') {
    audioUrl = project.audio.url;
  } else {
    const blob = await getAudio(id);
    if (!blob) throw new Error(`The audio for "${project.title}" is missing from this browser's storage.`);
    audioUrl = URL.createObjectURL(blob);
  }
  const meta: TrackMeta = {
    key: localKey(id),
    origin: 'local',
    title: project.title,
    artist: project.artist,
    audioUrl,
    durationMs: null,
  };
  return { meta, doc: readDoc(id), version: 0 };
}

export function saveLocalTrack(id: string, doc: Doc, version: number): SaveOutcome {
  const err = writeJson(docKey(id), doc);
  return err
    ? { kind: 'failed', message: `Browser storage refused the save: ${err}` }
    : { kind: 'saved', doc, version: version + 1 };
}

export async function deleteLocalTrack(id: string): Promise<void> {
  writeJson(
    INDEX_KEY,
    listLocalProjects().filter((p) => p.id !== id),
  );
  try {
    localStorage.removeItem(docKey(id));
  } catch {
    // Storage unavailable: nothing left to remove.
  }
  await deleteAudio(id).catch(() => undefined);
}
