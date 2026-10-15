import { createReadStream, statSync } from 'node:fs';
import { join, normalize, extname } from 'node:path';
import { PUBLIC_DIR } from './config.js';
import { notFound } from './http.js';

const TYPES = { '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg' };

/**
 * Serves the fixture audio. Unauthenticated on purpose: an <audio> element
 * cannot attach an Authorization header, so gating this would make the track
 * unplayable. Not part of the /api/v1 surface - it is an asset, not an endpoint.
 * Range requests are honoured so seeking around the file actually works.
 */
export function serveAudio(req, res, relPath) {
  const safe = normalize(relPath).replace(/^(\.\.[/\\])+/, '');
  const file = join(PUBLIC_DIR, 'audio', safe);
  if (!file.startsWith(join(PUBLIC_DIR, 'audio'))) throw notFound('no such asset');

  let stat;
  try {
    stat = statSync(file);
    if (!stat.isFile()) throw new Error('not a file');
  } catch {
    throw notFound(`no such audio asset: ${safe}`);
  }

  const type = TYPES[extname(file)] || 'application/octet-stream';
  const range = req.headers.range;

  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (m) {
      const start = m[1] ? Number(m[1]) : 0;
      const end = m[2] ? Math.min(Number(m[2]), stat.size - 1) : stat.size - 1;
      if (start > end || start >= stat.size) {
        res.writeHead(416, { 'content-range': `bytes */${stat.size}` });
        return res.end();
      }
      res.writeHead(206, {
        'content-type': type,
        'content-length': end - start + 1,
        'content-range': `bytes ${start}-${end}/${stat.size}`,
        'accept-ranges': 'bytes',
        'cache-control': 'public, max-age=3600',
      });
      return createReadStream(file, { start, end }).pipe(res);
    }
  }

  res.writeHead(200, {
    'content-type': type,
    'content-length': stat.size,
    'accept-ranges': 'bytes',
    'cache-control': 'public, max-age=3600',
  });
  createReadStream(file).pipe(res);
}
