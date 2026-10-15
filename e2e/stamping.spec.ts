import { expect, test } from '@playwright/test';
import { lyricTimes, mockServer, openEditor, seek, snapOff } from './support';

/**
 * The core loop: listen, press Enter as each line starts. Each stamp closes
 * the previous line, an undo says what it reverts, and reordering a line
 * carries its timing with it.
 */
test('a keyboard pass times lines back to back, and undo names what it reverts', async ({ page }) => {
  await mockServer(page);
  await openEditor(page);
  await snapOff(page);

  for (const s of [2, 5.25, 9]) {
    await seek(page, s);
    await page.keyboard.press('Enter');
  }
  await page.keyboard.press('Shift+Enter'); // still at 9 s: too early to end line 3, so nothing happens
  await seek(page, 12.5);
  await page.keyboard.press('Shift+Enter');

  expect((await lyricTimes(page)).slice(0, 4)).toEqual(['0:02.000', '0:05.250', '0:09.000', 'Enter']); // line 4 is next: its slot shows the stamp key
  await page.getByTestId('lyric-row').nth(0).click();
  await expect(page.getByTestId('field-end')).toHaveValue('0:05.250'); // closed by the next stamp
  await page.getByTestId('lyric-row').nth(2).click();
  await expect(page.getByTestId('field-end')).toHaveValue('0:12.500'); // explicit end
  await expect(page.getByTestId('placed-count')).toHaveText('3/5 placed');

  await expect(page.getByRole('button', { name: 'Undo: End line 3 at 0:12.500' })).toBeVisible();
  await page.keyboard.press('Meta+z');
  await expect(page.getByTestId('last-action')).toHaveText('Undid: End line 3 at 0:12.500');

  // Alt+↓ moves the focused line; its time goes with it.
  await page.getByTestId('lyric-row').nth(0).click();
  await page.keyboard.press('Alt+ArrowDown');
  await expect(page.getByTestId('lyric-row').nth(1)).toContainText('First line');
  expect((await lyricTimes(page))[1]).toBe('0:02.000');
});
