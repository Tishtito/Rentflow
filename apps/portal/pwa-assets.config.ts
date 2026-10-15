import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// PWA icons (favicon, 64/192/512, maskable, apple-touch) generated at build time from public/icon.svg.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, padding: 0 },
    apple: { ...minimal2023Preset.apple, padding: 0 },
  },
  images: ['public/icon.svg'],
});
