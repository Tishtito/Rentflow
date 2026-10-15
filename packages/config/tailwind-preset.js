import { colors, fonts, radii } from './tokens.js';

/** Shared Tailwind preset: both apps use it, so a token change restyles both portals. */
export default {
  theme: {
    extend: {
      colors,
      fontFamily: fonts,
      borderRadius: radii,
      // h-touch, w-touch, min-h-touch: 44px minimum touch target.
      spacing: { touch: '44px' },
      boxShadow: {
        sheet: '0 6px 24px rgba(20, 35, 28, 0.10)',
      },
    },
  },
  plugins: [],
};
