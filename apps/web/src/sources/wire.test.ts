import { afterEach, describe, expect, it, vi } from 'vitest';
import { isConflict, isWireState, isWireTrack } from './wire';
import { saveServerTrack } from './server';

const state = {
  version: 3,
  lines: [{ id: '1', index: 0, text: 'line' }],
  alignment: { segments: [{ line_id: '1', start_ms: 1000, end_ms: 2000 }] },
};
const track = { id: '1', title: 'T', artist: 'A', duration_seconds: 124.96, audio_url: '/a.mp3', ...state };

describe('boundary validators', () => {
  it('accept what the API actually sends', () => {
    expect(isWireTrack(track)).toBe(true);
    expect(isWireTrack({ ...track, alignment: null, version: 0 })).toBe(true);
    expect(isWireState(state)).toBe(true);
  });

  it('reject missing fields, wrong types and seconds where milliseconds belong', () => {
    expect(isWireTrack({ ...track, title: undefined })).toBe(false);
    expect(isWireTrack({ ...track, duration_seconds: '124' })).toBe(false);
    expect(isWireState({ ...state, lines: [{ id: 1, index: 0, text: 'x' }] })).toBe(false);
    expect(
      isWireState({ ...state, alignment: { segments: [{ line_id: '1', start_ms: 1.5, end_ms: 2 }] } }),
    ).toBe(false);
    expect(isWireState(null)).toBe(false);
  });

  it('only treat a 409 as reconcilable when it carries a usable state', () => {
    expect(isConflict({ error: 'version_conflict', ...state })).toBe(true);
    expect(isConflict({ error: 'version_conflict' })).toBe(false);
  });
});

describe('saveServerTrack', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('turns a malformed success into a failed save the user is told about', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('{"version":"x"}', { status: 200 })));
    const out = await saveServerTrack({ lines: [{ id: '1', text: 'line' }], segments: {} }, 0);
    expect(out.kind).toBe('failed');
  });
});
