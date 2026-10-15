/**
 * Measures the claims made in decisions.md §12, so they can be re-checked:
 *   pnpm dev            (in another terminal)
 *   pnpm measure
 *
 * For the seeded track and a synthetic one 10x its size (20+ minutes, 280
 * lines, all timed), it reads the app's own performance.measure entries
 * (waveform fetch/decode/peaks, onset detection, waveform draws) and records
 * animation-frame intervals and long tasks (>50 ms) during 5 s of playback -
 * at normal speed and with the CPU throttled 4x via the DevTools protocol.
 *
 * Headless Chromium on the machine it runs on: numbers are indicative, not a
 * lab benchmark. Nothing is written to the server: saves are not triggered and
 * the synthetic track lives in a throwaway browser profile.
 */
import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';

function wav(seconds, rate = 8000) {
  const n = Math.floor(seconds * rate);
  const b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28);
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const env = (t % 4.4) < 3 ? 1 : 0.05; // a "line" every 4.4 s
    b.writeInt16LE(Math.round(Math.sin(2 * Math.PI * 220 * t) * env * 9000), 44 + i * 2);
  }
  return b;
}

const stats = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const q = (p) => +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(1);
  return { frames: s.length, p50: q(0.5), p95: q(0.95), max: q(1) };
};

async function playbackSample(page, cdp, throttle) {
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  const r = await page.evaluate(async () => {
    const audio = document.querySelector('audio');
    audio.currentTime = 30;
    const longTasks = [];
    const obs = new PerformanceObserver((l) => l.getEntries().forEach((e) => longTasks.push(Math.round(e.duration))));
    obs.observe({ type: 'longtask' });
    await audio.play();
    const deltas = [];
    let last = performance.now();
    await new Promise((done) => {
      const end = last + 5000;
      const tick = (now) => {
        deltas.push(now - last);
        last = now;
        if (now < end) requestAnimationFrame(tick); else done();
      };
      requestAnimationFrame(tick);
    });
    audio.pause();
    obs.disconnect();
    return { deltas, longTasks };
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  return { cpu: `${throttle}x`, frameMs: stats(r.deltas.slice(1)), longTasksMs: r.longTasks };
}

/** Key press -> next painted frame, for the heaviest edits: nudge every line at once, and one stamp. */
async function interactions(page) {
  const press = (key, meta = false) =>
    page.evaluate(
      ([k, m]) =>
        new Promise((done) => {
          const t0 = performance.now();
          window.dispatchEvent(new KeyboardEvent('keydown', { key: k, metaKey: m, bubbles: true }));
          requestAnimationFrame(() => requestAnimationFrame(() => done(+(performance.now() - t0).toFixed(1))));
        }),
      [key, meta],
    );
  await press('a', true); // select all
  const nudgeAll = [];
  for (let i = 0; i < 5; i++) nudgeAll.push(await press(']'));
  await page.getByTestId('lyric-row').first().click();
  const stamp = [];
  for (let i = 0; i < 5; i++) stamp.push(await press('Enter'));
  return { nudgeAllLines: nudgeAll, stampOneLine: stamp };
}

const measures = (page) =>
  page.evaluate(() =>
    Object.fromEntries(
      ['waveform:fetch', 'waveform:decode', 'waveform:peaks', 'onsets:detect'].map((n) => [
        n,
        +(performance.getEntriesByName(n).at(-1)?.duration ?? NaN).toFixed(1),
      ]),
    ),
  );

async function run(label, open) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const cdp = await page.context().newCDPSession(page);
  await open(page);
  await page.waitForFunction(() => !document.querySelector('[data-testid=snap-toggle]')?.disabled, null, { timeout: 120000 });
  const load = await measures(page);
  const draws = await page.evaluate(() => performance.getEntriesByName('waveform:draw').map((e) => e.duration));
  const result = { track: label, loadMs: load, waveformDrawMs: stats(draws), interactionMs: await interactions(page), playback: [] };
  for (const t of [1, 4]) result.playback.push(await playbackSample(page, cdp, t));
  await browser.close();
  return result;
}

const seeded = await run('seeded (2:05, 28 lines)', async (page) => {
  await page.route('**/api/v1/track/alignment', (r) => r.abort()); // never save
  await page.goto(BASE);
  await page.getByRole('heading', { name: 'You Verse You' }).waitFor();
});

const big = await run('synthetic 10x (20:50, 280 lines, all timed)', async (page) => {
  await page.route('https://lrclib.net/**', (r) => r.fulfill({ headers: { 'access-control-allow-origin': '*' }, json: [] }));
  await page.goto(BASE);
  await page.getByTestId('track-menu').click();
  await page.getByTestId('new-track').click();
  await page.getByTestId('new-audio-file').setInputFiles({ name: 'Ten Times.wav', mimeType: 'audio/wav', buffer: wav(1250) });
  await page.getByTestId('new-lyrics').fill(Array.from({ length: 280 }, (_, i) => `Synthetic line number ${i + 1}`).join('\n'));
  await page.getByRole('button', { name: /Create and open/ }).click();
  await page.getByRole('heading', { name: 'Ten Times' }).waitFor();
  await page.waitForFunction(() => Number.isFinite(document.querySelector('audio').duration));
  await page.keyboard.press('o'); // exact stamps
  for (let i = 0; i < 280; i++) {
    await page.evaluate((s) => { document.querySelector('audio').currentTime = s; }, 1 + i * 4.4);
    await page.keyboard.press('Enter');
  }
});

console.log(JSON.stringify([seeded, big], null, 2));
