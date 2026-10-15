import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Android/iOS app. Build with `pnpm cap:sync` (vite build --mode native + cap sync), then open
 * Android Studio / Xcode with `pnpm cap:android` / `pnpm cap:ios`.
 *
 * appId: placeholder until the company domain is decided. It can change freely until the app is
 * first uploaded to Google Play / the App Store; after that it is permanent.
 *
 * CAP_DEV=1 allows plain-http API calls (emulator → http://10.0.2.2:8000 on this computer). Never
 * ship a store build with it.
 */
const dev = process.env.CAP_DEV === '1';

const config: CapacitorConfig = {
  appId: 'com.codepasstech.rentflow.tenant',
  appName: 'Rentflow',
  webDir: 'dist',
  server: {
    androidScheme: 'https', // web view origin https://localhost (allowed in the API's CORS config)
    ...(dev ? { cleartext: true } : {}),
  },
  android: {
    allowMixedContent: dev,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false, // hidden by useNativeShell() once React has rendered
      backgroundColor: '#1D5A44',
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: true, // pages pad themselves with env(safe-area-inset-top)
    },
  },
};

export default config;
