// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient } from './client';

function json(status: number, body: unknown) {
  return new Response(body === null ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('api client (Sanctum SPA auth)', () => {
  beforeEach(() => {
    document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  });

  it('fetches the CSRF cookie before the first write and sends it back', async () => {
    const fetch = vi.fn(async (url: RequestInfo | URL, _init?: RequestInit) => {
      if (String(url).endsWith('/sanctum/csrf-cookie')) {
        document.cookie = 'XSRF-TOKEN=abc%3D123';
        return new Response(null, { status: 204 });
      }
      return json(200, { user: { id: 1 } });
    });
    const api = createApiClient({ fetch });

    await api.post('/api/admin/auth/login', { email: 'a@b.c', password: 'x' });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(String(fetch.mock.calls[0]![0])).toBe('/sanctum/csrf-cookie');
    const init = fetch.mock.calls[1]![1] as RequestInit;
    expect(init.credentials).toBe('include');
    expect((init.headers as Record<string, string>)['X-XSRF-TOKEN']).toBe('abc=123');
  });

  it('does not fetch the CSRF cookie for reads', async () => {
    const fetch = vi.fn(async () => json(200, { data: [] }));
    await createApiClient({ fetch }).get('/api/admin/payments');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('refreshes the CSRF token and retries once on 419', async () => {
    let writes = 0;
    const fetch = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).endsWith('/sanctum/csrf-cookie')) {
        document.cookie = 'XSRF-TOKEN=fresh';
        return new Response(null, { status: 204 });
      }
      return ++writes === 1 ? json(419, { message: 'CSRF token mismatch.' }) : json(202, { message: 'ok' });
    });

    await expect(createApiClient({ fetch }).post('/api/admin/payments', {})).resolves.toEqual({ message: 'ok' });
    expect(writes).toBe(2);
  });

  it('turns 422 into an ApiError with field errors', async () => {
    document.cookie = 'XSRF-TOKEN=t';
    const fetch = vi.fn(async () => json(422, { message: 'Invalid.', errors: { email: ['These credentials do not match our records.'] } }));

    const error = await createApiClient({ fetch })
      .post('/api/admin/auth/login', {})
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(422);
    expect((error as ApiError).field('email')).toBe('These credentials do not match our records.');
  });

  it('calls onUnauthorized on 401', async () => {
    const onUnauthorized = vi.fn();
    const fetch = vi.fn(async () => json(401, { message: 'Unauthenticated.' }));

    await expect(createApiClient({ fetch, onUnauthorized }).get('/api/admin/user')).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('sends X-Account-Id while a super admin acts inside an account', async () => {
    const fetch = vi.fn(async () => json(200, {}));
    const api = createApiClient({ fetch });
    api.setAccountId(7);

    await api.get('/api/admin/payments');

    expect(((fetch.mock.calls[0] as unknown[])[1] as RequestInit).headers).toMatchObject({ 'X-Account-Id': '7' });
  });

  describe('token mode (Capacitor apps)', () => {
    const memoryStore = (initial: string | null) => {
      let token = initial;
      return {
        get: vi.fn(async () => token),
        set: vi.fn(async (t: string) => {
          token = t;
        }),
        clear: vi.fn(async () => {
          token = null;
        }),
      };
    };

    it('sends the bearer token, never cookies, and skips CSRF', async () => {
      const fetch = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => json(202, { message: 'ok' }));
      const api = createApiClient({ baseUrl: 'https://api.example', auth: 'token', tokenStore: memoryStore('1|abc'), fetch });

      await api.post('/api/admin/payments', { amount: '1' });

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(String(fetch.mock.calls[0]![0])).toBe('https://api.example/api/admin/payments');
      const init = fetch.mock.calls[0]![1]!;
      expect(init.credentials).toBe('omit');
      expect(init.headers).toMatchObject({ Authorization: 'Bearer 1|abc' });
      expect(init.headers).not.toHaveProperty('X-XSRF-TOKEN');
    });

    it('forgets the token on 401', async () => {
      const store = memoryStore('1|expired');
      const onUnauthorized = vi.fn();
      const fetch = vi.fn(async () => json(401, { message: 'Unauthenticated.' }));

      await expect(createApiClient({ auth: 'token', tokenStore: store, fetch, onUnauthorized }).get('/api/portal/user')).rejects.toBeInstanceOf(ApiError);

      expect(store.clear).toHaveBeenCalledOnce();
      expect(await store.get()).toBeNull();
      expect(onUnauthorized).toHaveBeenCalledOnce();
    });

    it('stores and clears the token after login / logout', async () => {
      const store = memoryStore(null);
      const api = createApiClient({ auth: 'token', tokenStore: store, fetch: vi.fn() });

      await api.setToken('2|new');
      expect(await store.get()).toBe('2|new');
      await api.setToken(null);
      expect(await store.get()).toBeNull();
    });

    it('needs a token store', () => {
      expect(() => createApiClient({ auth: 'token' })).toThrow(/tokenStore/);
    });
  });

  it('downloads files with the token and account headers, and turns errors into ApiError', async () => {
    const fetch = vi.fn(async (url: RequestInfo | URL, _init?: RequestInit) =>
      String(url).includes('/404/') ? json(404, { message: 'Not found.' }) : new Response('%PDF-1.7', { status: 200, headers: { 'Content-Type': 'application/pdf' } }),
    );
    const store = { get: async () => 'tok-1', set: async () => {}, clear: async () => {} };
    const api = createApiClient({ fetch, auth: 'token', tokenStore: store });
    api.setAccountId(7);

    const blob = await api.download('/api/admin/invoices/1/pdf');
    expect(blob.size).toBe(8);
    const headers = (fetch.mock.calls[0]![1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer tok-1');
    expect(headers['X-Account-Id']).toBe('7');

    await expect(api.download('/api/admin/invoices/404/pdf')).rejects.toBeInstanceOf(ApiError);
  });
});
