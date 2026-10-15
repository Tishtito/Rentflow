import { QueryClient } from '@tanstack/react-query';
import { portalKeys, createApiClient } from '@rentflow/api';
import { isNative, secureTokenStore } from '@rentflow/native';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

/**
 * Web + PWA: Sanctum cookie session, same-origin (Vite proxy in dev).
 * Android/iOS app (or a VITE_AUTH_MODE=token test build): bearer token in the Keychain/Keystore,
 * calling the API at VITE_API_URL directly. See packages/api/src/client.ts.
 */
const tokenMode = isNative() || import.meta.env.VITE_AUTH_MODE === 'token';

export const api = createApiClient({
  auth: tokenMode ? 'token' : 'cookie',
  baseUrl: tokenMode ? (import.meta.env.VITE_API_URL ?? '') : '',
  tokenStore: tokenMode ? secureTokenStore('rentflow.tenant.token') : undefined,
  // Session/token expired or logged out elsewhere: forget who's logged in; RequireAuth redirects to login.
  onUnauthorized: () => queryClient.setQueryData(portalKeys.tenant, null),
});
