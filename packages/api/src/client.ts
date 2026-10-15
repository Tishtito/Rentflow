/**
 * Fetch client for the Laravel API. Two auth modes:
 *
 *  - `cookie` (web + PWA): Sanctum SPA sessions. Every request sends cookies; before the first write
 *    it calls GET /sanctum/csrf-cookie and echoes XSRF-TOKEN back as X-XSRF-TOKEN. A 419 (expired
 *    CSRF token) refreshes it and retries once. In dev the apps proxy /api to Laravel, so baseUrl is ''.
 *  - `token` (Android/iOS apps via Capacitor): the web view's origin is https://localhost or
 *    capacitor://localhost, where the API's cookies don't work. Requests send
 *    `Authorization: Bearer <token>` from `tokenStore` instead, and baseUrl is the API's full URL.
 *
 * Errors become ApiError: 422 carries Laravel's field `errors`, 401 calls onUnauthorized (and
 * forgets the stored token).
 */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    /** Laravel validation errors: field → messages. */
    public readonly errors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** First message for a form field, for TextField's `error` prop. */
  field(name: string): string | undefined {
    return this.errors[name]?.[0];
  }
}

/** Where token mode keeps the API token (Keychain/Keystore in the apps). */
export interface TokenStore {
  get(): Promise<string | null>;
  set(token: string): Promise<void>;
  clear(): Promise<void>;
}

export type AuthMode = 'cookie' | 'token';

export interface ApiClientOptions {
  baseUrl?: string;
  /** Default `cookie`. `token` needs a `tokenStore`. */
  auth?: AuthMode;
  tokenStore?: TokenStore;
  /** Called on any 401: the session expired or was logged out elsewhere. */
  onUnauthorized?: () => void;
  fetch?: typeof fetch;
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ApiClient = ReturnType<typeof createApiClient>;

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export function createApiClient({ baseUrl = '', auth = 'cookie', tokenStore, onUnauthorized, fetch: fetchImpl }: ApiClientOptions = {}) {
  if (auth === 'token' && !tokenStore) throw new Error('Token auth needs a tokenStore.');
  const doFetch: typeof fetch = (...args) => (fetchImpl ?? globalThis.fetch)(...args);
  let csrfReady = false;
  let accountId: number | null = null;

  async function ensureCsrf(force = false): Promise<void> {
    if (csrfReady && !force && readCookie('XSRF-TOKEN')) return;
    await doFetch(`${baseUrl}/sanctum/csrf-cookie`, { credentials: 'include', headers: { Accept: 'application/json' } });
    csrfReady = true;
  }

  async function request<T>(method: Method, path: string, body?: unknown, retried = false): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (accountId !== null) headers['X-Account-Id'] = String(accountId);

    if (auth === 'cookie') {
      if (method !== 'GET') await ensureCsrf();
      const xsrf = readCookie('XSRF-TOKEN');
      if (xsrf) headers['X-XSRF-TOKEN'] = xsrf;
    } else {
      const token = await tokenStore!.get();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const res = await doFetch(`${baseUrl}${path}`, {
      method,
      headers,
      credentials: auth === 'cookie' ? 'include' : 'omit',
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (res.status === 419 && auth === 'cookie' && !retried) {
      await ensureCsrf(true);
      return request<T>(method, path, body, true);
    }

    if (res.status === 204) return undefined as T;

    const data = (await res.json().catch(() => null)) as { message?: string; errors?: Record<string, string[]> } | null;

    if (!res.ok) {
      if (res.status === 401) {
        if (auth === 'token') await tokenStore!.clear();
        onUnauthorized?.();
      }
      throw new ApiError(res.status, data?.message || res.statusText || `Request failed (${res.status})`, data?.errors ?? {});
    }

    return data as T;
  }

  return {
    auth,
    /** Token mode: remember / forget the API token after login / logout. */
    async setToken(token: string | null) {
      if (!tokenStore) return;
      await (token ? tokenStore.set(token) : tokenStore.clear());
    },
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
    put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body ?? {}),
    delete: <T>(path: string) => request<T>('DELETE', path),
    /** Super admins acting inside one landlord account send X-Account-Id on every request. */
    setAccountId(id: number | null) {
      accountId = id;
    },
  };
}

/** Build a query string, skipping empty values. */
export function query(params: Record<string, string | number | null | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== null && v !== undefined && v !== '') q.set(k, String(v));
  const s = q.toString();
  return s ? `?${s}` : '';
}
