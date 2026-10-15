import { expect, test } from '@playwright/test';
import { lyricTimes, mockServer, openEditor, seek, snapOff } from './support';

/**
 * "If eight lines that are all late by the same amount take eight separate
 * fixes, there is a tool missing." A run of lines moves as one, by key, by a
 * typed amount, or onto the playhead - and stays one undo step each.
 */
test('a selected run of lines shifts together and undoes in one step', async ({ page }) => {
  await mockServer(page);
  await openEditor(page);
  await snapOff(page);
  for (const s of [3, 6, 9, 12]) {
    await seek(page, s);
    await page.keyboard.press('Enter');
  }

  const rows = page.getByTestId('lyric-row');
  await rows.nth(1).click();
  await rows.nth(3).click({ modifiers: ['Shift'] });
  await expect(page.getByTestId('inspector-multi')).toContainText('3 lines selected');

  await page.keyboard.press('}'); // +500 ms
  expect((await lyricTimes(page)).slice(0, 4)).toEqual(['0:03.000', '0:06.500', '0:09.500', '0:12.500']);

  await page.getByLabel('Shift by milliseconds').fill('-320');
  await page.getByRole('button', { name: 'Shift ms' }).click();
  expect((await lyricTimes(page)).slice(1, 4)).toEqual(['0:06.180', '0:09.180', '0:12.180']);

  await seek(page, 20);
  await page.keyboard.press('m');
  expect((await lyricTimes(page)).slice(1, 4)).toEqual(['0:20.000', '0:23.000', '0:26.000']);
  expect((await lyricTimes(page))[0]).toBe('0:03.000'); // not selected, not moved

  await page.keyboard.press('Meta+z');
  expect((await lyricTimes(page)).slice(1, 4)).toEqual(['0:06.180', '0:09.180', '0:12.180']);
});
