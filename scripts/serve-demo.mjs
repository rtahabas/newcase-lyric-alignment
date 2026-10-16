/**
 * Runs the app as one service for a hosted demo (see render.yaml):
 *   pnpm build && pnpm demo
 *
 * Starts the unchanged API as a child process on a private port, serves the
 * built frontend from apps/web/dist, and forwards /api to the API - the same
 * single-origin setup the Vite proxy gives in development. No dependencies.
 */
import { spawn } from 'node:child_process';
import { createReadStream, statSync } from 'node:fs';
import { createServer, request } from 'node:http';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'apps/web/dist');
const PORT = Number(process.env.PORT || 8080);
const API_PORT = Number(process.env.API_PORT || 4100);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};

const api = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', 'src/server.js'], {
  cwd: join(ROOT, 'apps/api'),
  env: { ...process.env, PORT: String(API_PORT), HOST: '127.0.0.1' },
  stdio: 'inherit',
});
// If the API dies, the demo is broken: exit so the host restarts the whole service.
api.on('exit', (code) => process.exit(code ?? 1));

function proxy(req, res) {
  const upstream = request(
    { host: '127.0.0.1', port: API_PORT, path: req.url, method: req.method, headers: req.headers },
    (up) => {
      res.writeHead(up.statusCode ?? 502, up.headers);
      up.pipe(res);
    },
  );
  upstream.on('error', () => {
    if (res.headersSent) return res.destroy();
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'api_unavailable', hint: 'the API is still starting; retry' }));
  });
  req.pipe(upstream);
}

/** The file under dist for a URL path, or null - including for malformed escapes like `%E0`. */
function fileFor(pathname) {
  try {
    const safe = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
    const file = join(DIST, safe);
    if (!file.startsWith(DIST)) return null;
    return statSync(file).isFile() ? file : null;
  } catch {
    return null;
  }
}

function serveStatic(req, res) {
  const { pathname } = new URL(req.url, 'http://localhost');
  // Unknown paths fall back to the app shell.
  const file = fileFor(pathname) ?? join(DIST, 'index.html');
  res.writeHead(200, {
    'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    // Vite fingerprints everything under /assets; the shell must always be fresh.
    'cache-control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  createReadStream(file).pipe(res);
}

const server = createServer((req, res) => {
  if (req.url.startsWith('/api')) return proxy(req, res);
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { allow: 'GET, HEAD' });
    return res.end();
  }
  serveStatic(req, res);
});

server.listen(PORT, () => console.log(`demo listening on http://localhost:${PORT}`));

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    api.kill(sig);
    server.close(() => process.exit(0));
  });
}
