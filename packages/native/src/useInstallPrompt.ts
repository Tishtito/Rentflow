import { useCallback, useEffect, useState } from 'react';
import { installMode, isIosDevice, type InstallMode } from '@rentflow/core';
import { isNative } from './platform';

/** Chrome's install event (not in the TS DOM types). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'rentflow.install.dismissed';
/** Let the first screen paint before the pop-up covers it. */
const SHOW_AFTER_MS = 2000;

const standalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

// sessionStorage can throw (private mode, blocked storage): then the pop-up just shows again next time.
const dismissedThisVisit = () => {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * "Install the app" pop-up state, browser only (see installMode in @rentflow/core). `mode` is
 * 'install' (our button opens the browser's install dialog), 'ios' (show the Share → Add to Home
 * Screen steps) or null. "Not now" hides it until the next visit (this tab's session).
 */
export function useInstallPrompt(): { mode: InstallMode; install: () => Promise<void>; dismiss: () => void } {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(dismissedThisVisit);
  const [installed, setInstalled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isNative()) return;
    const onPrompt = (e: Event) => {
      e.preventDefault(); // keep Chrome's own mini bar away; our pop-up asks instead
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    const timer = window.setTimeout(() => setReady(true), SHOW_AFTER_MS);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.clearTimeout(timer);
    };
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // storage unavailable: hidden for this page only
    }
  }, []);

  const install = useCallback(async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    setPromptEvent(null); // the event can only be used once
    if (outcome === 'accepted') setInstalled(true);
    else dismiss();
  }, [promptEvent, dismiss]);

  const mode =
    ready && typeof window !== 'undefined'
      ? installMode({
          native: isNative(),
          standalone: installed || standalone(),
          dismissed,
          hasPromptEvent: promptEvent !== null,
          ios: isIosDevice(navigator.userAgent, navigator.maxTouchPoints ?? 0),
        })
      : null;

  return { mode, install, dismiss };
}
