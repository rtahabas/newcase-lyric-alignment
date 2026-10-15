import { expect, test } from '@playwright/test';
import { mockServer, seek, toneWav } from './support';

/**
 * A late key press lands on the attack it was reacting to - and says so. Uses
 * generated audio whose note starts are known exactly (2 s and 6 s), so the
 * expected times are facts, not guesses.
 */
test('a late stamp snaps back onto the note start, visibly and undoably', async ({ page }) => {
  await mockServer(page);
  await page.route('https://lrclib.net/**', (route) =>
    route.fulfill({
      headers: { 'access-control-allow-origin': '*' },
      json: [],
    }),
  );
  await page.goto('/');
  await page.getByTestId('track-menu').click();
  await page.getByTestId('new-track').click();
  await page.getByTestId('new-audio-file').setInputFiles({
    name: 'Two Notes.wav',
    mimeType: 'audio/wav',
    buffer: toneWav(10, [2, 6]),
  });
  await page.getByTestId('new-lyrics').fill('first\nsecond');
  await page.getByRole('button', { name: /Create and open/ }).click();
  await expect(page.getByRole('heading', { name: 'Two Notes' })).toBeVisible();
  await expect(page.getByTestId('snap-toggle')).toBeEnabled(); // waveform decoded, onsets found
  await expect(page.getByTestId('snap-toggle')).toHaveAttribute('aria-pressed', 'true');

  await seek(page, 2.23); // 230 ms late
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('last-action')).toHaveText(
    /^Stamp line 1 at 0:02\.0\d\d · snapped −2\d\d ms/,
  );

  await seek(page, 4.0); // nothing starts near 4 s: stays put
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('last-action')).toHaveText('Stamp line 2 at 0:04.000');

  await page.keyboard.press('Meta+z');
  await page.keyboard.press('Meta+z');
  await page.keyboard.press('o'); // snapping off: exact key-press time
  await seek(page, 2.23);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('last-action')).toHaveText('Stamp line 1 at 0:02.230');
});
