import { send } from '../http.js';

/** Paths, and nothing else: no methods, no params, no bodies. */
export function getIndex(_req, res) {
  send(res, 200, {
    version: 'v1',
    endpoints: [
      '/api/v1',
      '/api/v1/track',
      '/api/v1/track/alignment',
    ],
  });
}
