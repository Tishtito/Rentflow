/**
 * "Install the app" pop-up rules (the hook is useInstallPrompt in @rentflow/native).
 *
 * - `install`: the browser gave us `beforeinstallprompt` (Chrome, Edge, Samsung Internet, Android): our
 *   button opens the browser's own install dialog.
 * - `ios`: iPhone / iPad have no install API, so we show the Share → "Add to Home Screen" steps.
 * - null: nothing to offer (inside the Android/iOS app, already installed, dismissed this visit, or a
 *   browser that can't install from a button, e.g. Firefox desktop).
 */
export type InstallMode = 'install' | 'ios' | null;

export function installMode(state: {
  native: boolean; // Capacitor app
  standalone: boolean; // already running as the installed app
  dismissed: boolean; // "Not now" during this visit
  hasPromptEvent: boolean; // beforeinstallprompt received
  ios: boolean;
}): InstallMode {
  if (state.native || state.standalone || state.dismissed) return null;
  if (state.hasPromptEvent) return 'install';
  return state.ios ? 'ios' : null;
}

/** iPhone, iPod or iPad (iPadOS reports a Mac user agent but has a touch screen). */
export function isIosDevice(userAgent: string, maxTouchPoints: number): boolean {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return true;
  return /Macintosh/i.test(userAgent) && maxTouchPoints > 1;
}
