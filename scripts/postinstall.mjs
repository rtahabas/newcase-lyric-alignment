/**
 * Fetches the one browser Playwright needs, so `pnpm test` works straight after
 * `pnpm install`. Never fails the install: offline clones and container builds
 * skip it (set SKIP_PLAYWRIGHT_BROWSERS=1 to skip deliberately) and the tests
 * then print their own instructions.
 */
import { spawnSync } from 'node:child_process';

if (process.env.SKIP_PLAYWRIGHT_BROWSERS === '1') {
  console.log('postinstall: skipping playwright browser download');
  process.exit(0);
}

// `playwright` resolves from node_modules/.bin, which pnpm puts on PATH here.
const r = spawnSync('playwright', ['install', 'chromium'], { stdio: 'inherit' });
if (r.status !== 0) {
  console.log('postinstall: could not download the playwright browser; run `pnpm exec playwright install chromium` before `pnpm test`');
}
