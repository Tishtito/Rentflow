import { useRegisterSW } from 'virtual:pwa-register/react';
import { useInstallPrompt, useNativeShell, useOnline } from '@rentflow/native';
import { InstallPrompt, OfflineBanner, UpdatePrompt } from '@rentflow/ui';

/**
 * App-wide extras: offline bar, "new version" prompt and "install the app" pop-up (PWA, every visit until
 * installed; never in the Android/iOS apps), Android back button + splash (apps).
 */
export function AppChrome() {
  useNativeShell();
  const online = useOnline();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  const installPrompt = useInstallPrompt();

  return (
    <>
      <OfflineBanner online={online} />
      <UpdatePrompt open={needRefresh} onReload={() => void updateServiceWorker(true)} onDismiss={() => setNeedRefresh(false)} />
      <InstallPrompt
        mode={needRefresh ? null : installPrompt.mode}
        appName="Rentflow"
        iconSrc="/icon.svg"
        look="glass"
        onInstall={() => void installPrompt.install()}
        onDismiss={installPrompt.dismiss}
      />
    </>
  );
}
