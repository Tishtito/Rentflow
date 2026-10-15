/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Laravel API. Dev: proxy target. Apps / token builds: called directly (e.g. https://api.example.co.ke). */
  readonly VITE_API_URL?: string;
  /** `token` forces API-token auth in a browser (to test the app login flow). Apps always use tokens. */
  readonly VITE_AUTH_MODE?: 'cookie' | 'token';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
