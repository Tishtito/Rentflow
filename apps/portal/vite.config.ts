import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Laravel (php artisan serve). Proxying keeps the SPA same-origin, so Sanctum's session and
  // XSRF-TOKEN cookies just work in dev without CORS. localhost:5174 is in SANCTUM_STATEFUL_DOMAINS.
  const api = env.VITE_API_URL || 'http://localhost:8000';

  return {
    plugins: [
      react(),
      VitePWA({
        // The Capacitor build (`--mode native`) bundles every file in the app, so no service worker:
        // one in the web view would only serve stale versions. The virtual module becomes a no-op.
        disable: mode === 'native',
        registerType: 'prompt', // UpdatePrompt asks before reloading onto a new version
        pwaAssets: { config: true, overrideManifestIcons: true }, // icons from public/icon.svg (pwa-assets.config.ts)
        manifest: {
          name: 'Rentflow',
          short_name: 'Rentflow',
          description: 'See your rent bill, balance and payments.',
          lang: 'en-KE',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          theme_color: '#1D5A44',
          background_color: '#F4F5F1',
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          navigateFallback: '/index.html',
          // API calls always go to the network: bills and payments are personal and change often,
          // and phones are often shared. Never cache them.
          navigateFallbackDenylist: [/^\/api\//, /^\/sanctum\//],
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts',
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: 5174,
      strictPort: true,
      proxy: {
        '/api': api,
        '/sanctum': api,
      },
    },
    preview: { port: 5174, strictPort: true, proxy: { '/api': api, '/sanctum': api } },
  };
});
