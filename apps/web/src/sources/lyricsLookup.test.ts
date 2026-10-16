import { describe, expect, it } from 'vitest';
import type { LyricsCandidate } from './lyricsLookup';
import { dedupe, isConfident, pickTimedVersion, rankCandidates, searchPlan } from './lyricsLookup';

const c = (id: number, title: string, durationMs: number | null): LyricsCandidate => ({
  id,
  title,
  artist: 'A',
  album: '',
  durationMs,
  lyrics: `lyrics ${id}`,
  synced: null,
});

describe('rankCandidates', () => {
  it('puts the same title first, then the closest length, untimed last', () => {
    const ranked = rankCandidates(
      [c(1, 'Other', 210_000), c(2, 'Song', null), c(3, 'Song', 260_000), c(4, 'Song', 211_000)],
      'Song',
      210_000,
    );
    expect(ranked.map((r) => r.id)).toEqual([4, 3, 2, 1]);
  });
});

describe('dedupe', () => {
  it('keeps the first of several copies of the same lyrics', () => {
    const a = { ...c(1, 'Song', 1), lyrics: 'Hello, world' };
    const b = { ...c(2, 'Song', 2), lyrics: 'hello world' };
    expect(dedupe([a, b, c(3, 'Song', 3)]).map((x) => x.id)).toEqual([1, 3]);
  });
});

describe('isConfident', () => {
  it('trusts the same title at any length when the artist does not contradict it', () => {
    const neset = { ...c(1, 'Kendim Ettim Kendim Buldum', 347_000), artist: 'Neşet Ertaş' };
    expect(isConfident(neset, 'Kendim ettim kendim buldum(Taha (Baş)', '', 190_000)).toBe(true);
    expect(isConfident(neset, 'Kendim ettim kendim buldum', 'Neset Ertas', 190_000)).toBe(true);
  });

  it('does not trust the same title by a different artist (another song with that name)', () => {
    const adele = { ...c(1, 'Hello', 295_000), artist: 'Adele' };
    expect(isConfident(adele, 'Hello', 'Lionel Richy', 250_000)).toBe(false);
  });

  it('trusts a different title only at the same length', () => {
    expect(isConfident(c(1, 'Other', 212_000), 'Song', '', 210_000)).toBe(true);
    expect(isConfident(c(1, 'Other', 230_000), 'Song', '', 210_000)).toBe(false);
    expect(isConfident(undefined, 'Song', '', 210_000)).toBe(false);
  });
});

describe('searchPlan', () => {
  it('tries title+artist, then title, then free text — with the title cleaned', () => {
    expect(searchPlan('Kendim ettim kendim buldum(Taha (Baş)', 'Neşet Ertaş')).toEqual([
      { track_name: 'Kendim ettim kendim buldum', artist_name: 'Neşet Ertaş' },
      { track_name: 'Kendim ettim kendim buldum' },
      { q: 'Kendim ettim kendim buldum Neşet Ertaş' },
    ]);
    expect(searchPlan('Song', '')).toEqual([{ track_name: 'Song' }, { q: 'Song' }]);
  });
});

describe('pickTimedVersion', () => {
  const timed = (id: number, durationMs: number) => ({ ...c(id, 'Song', durationMs), synced: '[00:01.00]x' });

  it('takes the closest-length timed version of the same song', () => {
    const v = pickTimedVersion([timed(1, 240_000), timed(2, 195_000)], 'Song', 190_000);
    expect(v?.candidate.id).toBe(2);
    expect(v?.usable).toBe(true);
  });

  it('marks it unusable when every timed version is a different length', () => {
    expect(pickTimedVersion([timed(1, 238_000), timed(2, 347_000)], 'Song', 190_000)?.usable).toBe(false);
  });

  it('ignores versions without timings and other songs', () => {
    expect(
      pickTimedVersion([c(1, 'Song', 190_000), { ...timed(2, 190_000), title: 'Other' }], 'Song', 190_000),
    ).toBeNull();
  });
});
