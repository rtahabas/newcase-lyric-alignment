import { expect, test } from '@playwright/test';
import { mockServer, seek, snapOff, toneWav } from './support';

const SHEET = [
  'Lights come up on an empty stage',
  'Lights come up on an empty stage',
  'Nobody sings the second page',
];

/**
 * The pass/fail requirement: a track we bring. Not the seeded song - a 41.5 s
 * generated file, a 3-line sheet with a repeated line - picked from disk,
 * lyrics found automatically (LRCLIB mocked), timed, kept across a reload,
 * exported. Nothing here depends on 2:05, 28 lines or seeded ids.
 */
test('a track we bring is found, timed, kept and exported', async ({ page }) => {
  await mockServer(page);
  await page.route('https://lrclib.net/**', (route) =>
    route.fulfill({
      headers: { 'access-control-allow-origin': '*' },
      json: [
        {
          id: 1,
          trackName: 'Empty Stage',
          artistName: 'Test Band',
          albumName: 'Demo',
          duration: 41.5,
          instrumental: false,
          plainLyrics: `${SHEET.join('\n')}\n`,
          syncedLyrics: null,
        },
      ],
    }),
  );
  await page.goto('/');
  await page.getByTestId('track-menu').click();
  await page.getByTestId('new-track').click();
  await page.getByTestId('new-audio-file').setInputFiles({
    name: 'Test Band - Empty Stage.wav',
    mimeType: 'audio/wav',
    buffer: toneWav(41.5, [2, 6, 11]),
  });

  await expect(page.getByTestId('new-title')).toHaveValue('Empty Stage'); // from the file name
  await expect(page.getByTestId('lyrics-source')).toContainText('From LRCLIB: Empty Stage');
  await page.getByRole('button', { name: 'Create and open (0:41, 3 lines)' }).click();

  await expect(page.getByRole('heading', { name: 'Empty Stage' })).toBeVisible();
  await expect(page.getByTestId('placed-count')).toHaveText('0/3 placed');
  await snapOff(page);
  await page.getByTestId('start-timing').click();
  await page.keyboard.press('Space'); // pause: the test sets the clock itself
  for (const s of [2, 6, 11]) {
    await seek(page, s);
    await page.keyboard.press('Enter');
  }
  await seek(page, 14);
  await page.keyboard.press('Shift+Enter');
  await expect(page.getByTestId('save-state')).toHaveText('Saved in this browser');

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Empty Stage' })).toBeVisible();
  await expect(page.getByTestId('lyric-time')).toHaveText(['0:02.000', '0:06.000', '0:11.000']);

  const download = page.waitForEvent('download');
  await page.getByTestId('export-lrc').click();
  const lrc = await (await download).createReadStream().then(async (s) => {
    let text = '';
    for await (const chunk of s) text += String(chunk);
    return text;
  });
  expect(lrc).toContain('[00:02.00]Lights come up on an empty stage');
  expect(lrc).toContain('[00:06.00]Lights come up on an empty stage');
  expect(lrc).toContain('[00:11.00]Nobody sings the second page\n[00:14.00]');
});
