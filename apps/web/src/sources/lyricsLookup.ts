/**
 * Finding the right lyrics for a track: which searches to try, how to rank
 * what comes back, and when a match is sure enough to fill in unasked.
 */
import type { Ms } from '../lib/time';
import { searchTitle } from '../lib/searchTitle';
import type { LyricsCandidate } from './lrclib';
import { lrclibSearch } from './lrclib';

export type { LyricsCandidate } from './lrclib';

/** Close enough in length to be the same recording, whatever the title says. */
export const SAME_LENGTH_MS = 3000;
/** A length gap worth pointing out: probably a different version or a cover. */
export const VERSION_GAP_MS = 10_000;

const norm = (s: string) =>
  s
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '') // combining marks: "Neşet" and "Neset" compare equal
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

export const sameTitle = (a: string, b: string) => norm(searchTitle(a)) === norm(searchTitle(b));

/** Exact title first, then closest length; records without a length last. */
export function rankCandidates(
  list: LyricsCandidate[],
  title: string,
  durationMs: Ms | null,
): LyricsCandidate[] {
  const diff = (c: LyricsCandidate) =>
    durationMs === null || c.durationMs === null
      ? Number.MAX_SAFE_INTEGER
      : Math.abs(c.durationMs - durationMs);
  const exact = (c: LyricsCandidate) => (sameTitle(c.title, title) ? 0 : 1);
  return [...list].sort((a, b) => exact(a) - exact(b) || diff(a) - diff(b));
}

/** LRCLIB often holds the same lyrics several times (one per album); keep the best-ranked copy. */
export function dedupe(list: LyricsCandidate[]): LyricsCandidate[] {
  const seen = new Set<string>();
  return list.filter((c) => {
    const key = norm(c.lyrics);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Whether to fill the sheet without asking: the same song title (a cover or a
 * different master has the same words), or the same length. Anything less is
 * offered as a choice.
 */
export function isConfident(c: LyricsCandidate | undefined, title: string, durationMs: Ms | null): boolean {
  if (!c) return false;
  if (sameTitle(c.title, title)) return true;
  return (
    durationMs !== null && c.durationMs !== null && Math.abs(c.durationMs - durationMs) <= SAME_LENGTH_MS
  );
}

/** The searches to try, most specific first; the first one with results wins. */
export function searchPlan(title: string, artist: string): Record<string, string>[] {
  const t = searchTitle(title) || title.trim();
  const a = artist.trim();
  const plan: Record<string, string>[] = [];
  if (a) plan.push({ track_name: t, artist_name: a });
  plan.push({ track_name: t });
  plan.push({ q: a ? `${t} ${a}` : t });
  return plan;
}

/** The result of a lookup: lyrics to choose from, and every version that has line timings. */
export type LookupResult = { candidates: LyricsCandidate[]; timed: LyricsCandidate[] };

/**
 * Which timed version could serve as a draft: same title, closest length. Usable
 * only within VERSION_GAP_MS of the audio - further off, the lines would not
 * land anywhere near the words (decisions.md D9.2).
 */
export function pickTimedVersion(
  timed: LyricsCandidate[],
  title: string,
  durationMs: Ms | null,
): { candidate: LyricsCandidate & { synced: string }; usable: boolean } | null {
  const gap = (c: LyricsCandidate) =>
    durationMs === null || c.durationMs === null
      ? Number.MAX_SAFE_INTEGER
      : Math.abs(c.durationMs - durationMs);
  const best = timed
    .filter((c): c is LyricsCandidate & { synced: string } => !!c.synced && sameTitle(c.title, title))
    .sort((a, b) => gap(a) - gap(b))[0];
  return best ? { candidate: best, usable: gap(best) <= VERSION_GAP_MS } : null;
}

export async function searchLyrics(
  q: { title: string; artist: string; durationMs: Ms | null },
  signal: AbortSignal,
): Promise<LookupResult> {
  for (const params of searchPlan(q.title, q.artist)) {
    const found = await lrclibSearch(params, signal);
    if (found.length) {
      return {
        candidates: dedupe(rankCandidates(found, q.title, q.durationMs)).slice(0, 6),
        timed: found.filter((c) => c.synced),
      };
    }
  }
  return { candidates: [], timed: [] };
}
