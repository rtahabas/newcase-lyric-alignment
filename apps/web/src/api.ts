/**
 * Minimal fetch wrapper: attaches the bearer token, parses JSON, and throws on
 * any non-2xx response.
 *
 * The thrown ApiError keeps `status` and the parsed `body`, because the useful
 * part of a failure is in the body rather than the message. Some failures
 * explain themselves and some do not - worth knowing which is which.
 *
 * Every request also has a time limit (fetch has none): a server that never
 * answers would otherwise leave a save "in flight" forever. Running out of time
 * throws ApiTimeoutError, distinct from a caller's own abort.
 */
const TOKEN = import.meta.env.VITE_API_TOKEN ?? 'lyric-align-dev-token-7f3a91';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const DEFAULT_TIMEOUT_MS = 15_000;

export class ApiTimeoutError extends Error {
  constructor(
    readonly path: string,
    readonly ms: number,
  ) {
    super(`The server did not answer within ${Math.round(ms / 1000)} s (${path}).`);
    this.name = 'ApiTimeoutError';
  }
}

/** One signal that fires on the caller's abort or when the time limit passes. */
function withTimeout(caller: AbortSignal | null | undefined, ms: number) {
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ctrl.abort();
  }, ms);
  const forward = () => ctrl.abort();
  if (caller?.aborted) ctrl.abort();
  caller?.addEventListener('abort', forward, { once: true });
  const done = () => {
    clearTimeout(timer);
    caller?.removeEventListener('abort', forward);
  };
  return { signal: ctrl.signal, timedOut: () => timedOut, done };
}

export async function api<T>(path: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = init;
  const limit = withTimeout(rest.signal, timeoutMs);
  try {
    return await request<T>(path, { ...rest, signal: limit.signal });
  } catch (e) {
    if (limit.timedOut()) throw new ApiTimeoutError(path, timeoutMs);
    throw e;
  } finally {
    limit.done();
  }
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(init.body != null ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });

  const raw = await res.text();
  let body: unknown = undefined;
  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch {
      body = raw;
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, body, `${init.method ?? 'GET'} ${path} -> ${res.status}`);
  }

  return body as T;
}
