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
        'auth-card': '0 30px 80px rgba(0, 0, 0, 0.55)',
        'auth-button': '0 8px 20px rgba(30, 142, 90, 0.35)',
      },
      // Auth screens: the panels' slide (slight overshoot) and the content swap.
      transitionTimingFunction: { swap: 'cubic-bezier(0.68, -0.15, 0.27, 1.15)' },
      transitionDuration: { swap: '700ms' },
      keyframes: {
        'auth-sweep': {
          '0%': { opacity: '0', transform: 'scaleX(.4)' },
          '40%': { opacity: '1' },
          '100%': { opacity: '0', transform: 'scaleX(1.6)' },
        },
        'auth-in-right': { from: { opacity: '0', transform: 'translateX(20px)' }, to: { opacity: '1', transform: 'none' } },
        'auth-in-left': { from: { opacity: '0', transform: 'translateX(-20px)' }, to: { opacity: '1', transform: 'none' } },
        'auth-in-up': { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'none' } },
        'auth-fade': { from: { opacity: '0' }, to: { opacity: '1' } },
      },
      animation: {
        'auth-sweep': 'auth-sweep 700ms ease-out',
        'auth-in-right': 'auth-in-right .5s ease both',
        'auth-in-left': 'auth-in-left .5s ease both',
        'auth-in-up': 'auth-in-up .5s ease both',
        'auth-fade': 'auth-fade .2s ease both',
      },
    },
  },
  plugins: [],
};
