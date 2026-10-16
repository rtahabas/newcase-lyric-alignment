import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, ApiTimeoutError } from './api';

/** A fetch that never answers on its own, but honours aborts like the real one. */
function hangingFetch() {
  return vi.fn(
    (_url: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('api', () => {
  it('gives up on a server that never answers, with a timeout error', async () => {
    vi.stubGlobal('fetch', hangingFetch());
    await expect(api('/api/v1/track', { timeoutMs: 20 })).rejects.toBeInstanceOf(ApiTimeoutError);
  });

  it("reports the caller's own abort as an abort, not a timeout", async () => {
    vi.stubGlobal('fetch', hangingFetch());
    const ctrl = new AbortController();
    const call = api('/api/v1/track', { signal: ctrl.signal, timeoutMs: 5000 });
    ctrl.abort();
    const error: unknown = await call.catch((e: unknown) => e);
    expect(error).not.toBeInstanceOf(ApiTimeoutError);
    expect((error as Error).name).toBe('AbortError');
  });

  it('still returns parsed JSON and raises ApiError with the body on non-2xx', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('{"ok":1}', { status: 200 })));
    expect(await api('/x')).toEqual({ ok: 1 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('{"hint":"no"}', { status: 400 })));
    const error = (await api('/x').catch((e: unknown) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.body).toEqual({ hint: 'no' });
  });
});
