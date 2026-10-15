import { expect, test } from '@playwright/test';
import { fixtureTrack, mockServer, openEditor, seek, snapOff } from './support';

/**
 * A save made on a stale version is rejected with the server's current state.
 * The user sees it, loses nothing, and decides: take theirs (undoable - undo
 * brings theirs back out and the next save lands on their version) or keep
 * mine (re-sent on top of their version, without an extra GET).
 */
test('a rejected save surfaces, and both ways out reconcile with the server', async ({ page }) => {
  const theirs = fixtureTrack(7); // someone else's save: version 7, nothing timed
  const sent: number[] = [];
  await mockServer(page, async (body, route) => {
    sent.push(body.version);
    if (body.version === 7) {
      return route.fulfill({
        json: {
          version: 8,
          lines: body.lines,
          alignment: { segments: body.segments },
        },
      });
    }
    return route.fulfill({
      status: 409,
      json: {
        error: 'version_conflict',
        expected_version: 7,
        received_version: body.version,
        ...theirs,
      },
    });
  });
  await openEditor(page);
  await snapOff(page);
  await seek(page, 4);
  await page.keyboard.press('Enter');

  // 1. Stale save -> conflict, with nothing lost.
  await page.keyboard.press('Meta+s');
  await expect(page.getByTestId('conflict-banner')).toContainText('Someone else saved version 7');
  await expect(page.getByTestId('save-state')).toHaveText('Save rejected');
  await expect(page.getByTestId('placed-count')).toHaveText('1/5 placed');

  // 2. Take theirs, change your mind with undo, save: lands on their version.
  await page.getByRole('button', { name: /Load theirs/ }).click();
  await expect(page.getByTestId('placed-count')).toHaveText('0/5 placed');
  await page.keyboard.press('Meta+z');
  await expect(page.getByTestId('placed-count')).toHaveText('1/5 placed');
  await page.keyboard.press('Meta+s');
  await expect(page.getByTestId('save-state')).toHaveText('Saved · v8');

  // 3. Server answers 409 again (theirs is still v7 in this mock): keep mine re-sends on v7.
  await seek(page, 8);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Meta+s');
  await expect(page.getByTestId('conflict-banner')).toBeVisible();
  await page.getByRole('button', { name: /Keep mine/ }).click();
  await expect(page.getByTestId('save-state')).toHaveText('Saved · v8');
  await expect(page.getByTestId('conflict-banner')).toHaveCount(0);

  expect(sent).toEqual([0, 7, 8, 7]);
});
