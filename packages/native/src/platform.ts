import { Capacitor } from '@capacitor/core';

/** True inside the Android/iOS app (Capacitor web view), false in a browser or installed PWA. */
export const isNative = () => Capacitor.isNativePlatform();

export const platform = () => Capacitor.getPlatform() as 'android' | 'ios' | 'web';
