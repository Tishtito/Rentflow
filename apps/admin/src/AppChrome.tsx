import { useRegisterSW } from 'virtual:pwa-register/react';
import { useNativeShell, useOnline } from '@rentflow/native';
import { OfflineBanner, UpdatePrompt } from '@rentflow/ui';

/** App-wide extras: offline bar, "new version" prompt (PWA), Android back button + splash (apps). */
export function AppChrome() {
  useNativeShell();
  const online = useOnline();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  return (
    <>
      <OfflineBanner online={online} />
      <UpdatePrompt open={needRefresh} onReload={() => void updateServiceWorker(true)} onDismiss={() => setNeedRefresh(false)} />
    </>
  );
}
