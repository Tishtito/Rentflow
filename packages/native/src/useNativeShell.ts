import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { isNative, platform } from './platform';

/**
 * App-only behaviour, called once near the root (inside the router):
 *  - Android back button goes back in history, or leaves the app on the first screen
 *  - status bar text colour to match the page header (`dark` text on light pages)
 *  - hides the splash screen once React has rendered
 * Does nothing in a browser or PWA.
 */
export function useNativeShell({ statusBar = 'dark' }: { statusBar?: 'dark' | 'light' } = {}) {
  useEffect(() => {
    if (!isNative()) return;

    void StatusBar.setStyle({ style: statusBar === 'dark' ? Style.Light : Style.Dark }).catch(() => {});
    void SplashScreen.hide().catch(() => {});

    if (platform() !== 'android') return;
    const listener = App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) window.history.back();
      else void App.exitApp();
    });
    return () => {
      void listener.then((l) => l.remove());
    };
  }, [statusBar]);
}
