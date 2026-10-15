/**
 * Shared test setup. Specs never write to the dev database: the track GET is
 * pinned to an untimed fixture and every PUT is answered by the test. The audio
 * itself is the real seeded mp3, served by the real API.
 */
import type { Page, Route } from '@playwright/test';

export const LINES = ['First line', 'Second line', 'Third line', 'Fourth line', 'Fifth line'];

export const fixtureTrack = (version = 0) => ({
  id: '1',
  title: 'You Verse You',
  artist: 'Fixture',
  duration_seconds: 124.96,
  audio_url: '/api/audio/you-verse-you.mp3',
  lines: LINES.map((text, index) => ({ id: String(index + 1), index, text })),
  version,
  alignment: null,
});

type PutHandler = (
  body: { version: number; lines: unknown[]; segments: unknown[] },
  route: Route,
) => Promise<void>;

/** Pins GET /track to the fixture; PUTs go to `onPut` (default: accept). */
export async function mockServer(page: Page, onPut?: PutHandler) {
  await page.route('**/api/v1/track', (route) => route.fulfill({ json: fixtureTrack() }));
  await page.route('**/api/v1/track/alignment', async (route) => {
    const body = route.request().postDataJSON() as Parameters<PutHandler>[0];
    if (onPut) return onPut(body, route);
    return route.fulfill({
      json: {
        version: body.version + 1,
        lines: body.lines,
        alignment: { segments: body.segments },
      },
    });
  });
}

/** Opens the editor on the fixture and waits until the audio is usable. */
export async function openEditor(page: Page) {
  await page.goto('/');
  await page.getByRole('heading', { name: 'You Verse You' }).waitFor();
  await page.waitForFunction(() => Number.isFinite(document.querySelector('audio')?.duration));
}

/** Waits for the waveform (and so the onsets) and switches stamp snapping off, for exact times. */
export async function snapOff(page: Page) {
  const toggle = page.getByTestId('snap-toggle');
  await page.waitForFunction(
    () => !document.querySelector<HTMLButtonElement>('[data-testid=snap-toggle]')?.disabled,
  );
  if ((await toggle.getAttribute('aria-pressed')) === 'true') await page.keyboard.press('o');
}

export const seek = (page: Page, seconds: number) =>
  page.evaluate((s) => {
    document.querySelector('audio')!.currentTime = s;
  }, seconds);

export const lyricTimes = (page: Page) => page.getByTestId('lyric-time').allTextContents();

/**
 * A mono 16-bit WAV: silence with 0.6 s tones starting at `notesAt` seconds.
 * Known onsets, any length - a track that is not the seeded song.
 */
export function toneWav(seconds: number, notesAt: number[] = [], rate = 8000): Buffer {
  const n = Math.floor(seconds * rate);
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const on = notesAt.some((s) => t >= s && t < s + 0.6);
    const v = on ? Math.sin(2 * Math.PI * 330 * t) * 14000 : (Math.random() - 0.5) * 60;
    buf.writeInt16LE(Math.round(v), 44 + i * 2);
  }
  return buf;
}
