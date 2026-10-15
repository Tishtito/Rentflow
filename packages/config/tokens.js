/**
 * Design tokens from the "Kims Properties Portals" design canvas. Single source of truth:
 * the Tailwind preset reads these, so components use classes like `bg-brand text-ink border-line`
 * rather than raw hex values. Text colours pass WCAG AA (4.5:1) on their paired soft background.
 */
export const colors = {
  // Neutrals
  canvas: '#F4F5F1', // page background
  surface: '#FFFFFF', // cards, tables, panels
  sunken: '#F7F8F5', // rows inside cards
  ink: '#17201B', // primary text
  subtle: '#3E4944', // secondary text on tinted backgrounds
  muted: '#5A6660', // captions, labels, table headers
  line: {
    DEFAULT: '#E2E5DF', // card borders
    soft: '#EEF0EB', // table row dividers
    strong: '#C9CFC6', // input & secondary button borders
  },

  // Brand (deep green)
  brand: {
    DEFAULT: '#1D5A44', // primary buttons, links, progress
    hover: '#123B2C',
    ink: '#164A37', // text on brand-soft
    soft: '#E3EEE8', // selected chips, success badge fill
    mint: '#8FD1B0', // accents on dark nav / tenant pay button
  },

  // Admin sidebar
  nav: {
    DEFAULT: '#14231C',
    deep: '#0F1A15', // super admin variant
    active: '#2A4A3B',
    line: '#2C4237',
    raised: '#1B2E25',
    text: '#C9D4CE',
    muted: '#9DB0A6',
    fg: '#E7ECE8',
  },

  // Status families: { fill, ink (text on fill), strong (text on white), line }
  warn: { soft: '#FBEBDD', ink: '#6B3207', strong: '#9A4A0B', line: '#F0D2B6' }, // arrears, missing readings
  caution: { soft: '#FFF4D6', ink: '#6B4A00' }, // part-paid, notice
  danger: { soft: '#F9E3E0', ink: '#7A1D17', strong: '#A3271F', line: '#E8B4AE' }, // failed, reversed, void
  info: { soft: '#DCE8F7', ink: '#163E6B' }, // issued, sent, onboarding
  gold: { soft: '#F2D58A', ink: '#3D2E00' }, // due-date pill, super admin tag, counts
};

export const fonts = {
  display: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
};

export const radii = {
  sm: '8px', // inline notes
  md: '10px', // buttons, inputs, rows
  lg: '14px', // cards
  xl: '18px', // tenant portal cards
  '2xl': '22px', // bottom sheets, hero card
};
