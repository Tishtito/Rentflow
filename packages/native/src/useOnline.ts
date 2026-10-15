import { useEffect, useState } from 'react';
import { Network } from '@capacitor/network';
import { isNative } from './platform';

/** Online/offline status: Capacitor Network in the apps, navigator.onLine in browsers. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  useEffect(() => {
    if (isNative()) {
      void Network.getStatus().then((s) => setOnline(s.connected));
      const listener = Network.addListener('networkStatusChange', (s) => setOnline(s.connected));
      return () => {
        void listener.then((l) => l.remove());
      };
    }

    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return online;
}
