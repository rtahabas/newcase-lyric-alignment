import { expect, test } from '@playwright/test';
import { mockServer } from './support';

/**
 * The sample in the track menu is a real file served by the app, and it opens
 * the same New track dialog a dropped file does: title and artist come from
 * its ID3 tag, the duration from probing the audio. LRCLIB is mocked empty, so
 * nothing here depends on the network.
 */
test('the sample track opens the new-track dialog with its own tags', async ({ page }) => {
  await mockServer(page);
  await page.route('https://lrclib.net/**', (route) =>
    route.fulfill({ headers: { 'access-control-allow-origin': '*' }, json: [] }),
  );
  await page.goto('/');
  await page.getByTestId('track-menu').click();
  await page.getByTestId('sample-track').click();

  await expect(page.getByTestId('new-title')).toHaveValue('Kendim Ettim Kendim Buldum');
  await expect(page.getByLabel('Artist')).toHaveValue('Taha Baş');
  await expect(page.getByTestId('sample-note')).toBeHidden();
});
