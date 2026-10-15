import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import type { TokenStore } from '@rentflow/api';
import { isNative } from './platform';

/**
 * Where the apps keep their API token: iOS Keychain / Android Keystore. In a browser (the
 * `VITE_AUTH_MODE=token` test build) it falls back to localStorage, which is fine for testing only.
 */
export function secureTokenStore(key: string): TokenStore {
  if (isNative()) {
    return {
      get: async () => {
        const value = await SecureStorage.get(key);
        return typeof value === 'string' ? value : null;
      },
      set: async (token) => {
        await SecureStorage.set(key, token);
      },
      clear: async () => {
        await SecureStorage.remove(key);
      },
    };
  }

  return {
    get: async () => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set: async (token) => {
      try {
        localStorage.setItem(key, token);
      } catch {
        // Private mode: the login lasts for this page only.
      }
    },
    clear: async () => {
      try {
        localStorage.removeItem(key);
      } catch {
        // nothing stored
      }
    },
  };
}
