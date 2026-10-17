import type { GoogleClientIds } from '@rentflow/native';

/** "Continue with Google" client IDs (see backend docs/SETUP.md). Unset → the Google button is hidden. */
export const googleClientIds: GoogleClientIds | null = import.meta.env.VITE_GOOGLE_CLIENT_ID
  ? { web: import.meta.env.VITE_GOOGLE_CLIENT_ID, ios: import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID || undefined }
  : null;
