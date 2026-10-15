import type { SVGProps } from 'react';

/**
 * Stroke icons used on the canvas. All inherit `currentColor` and are
 * decorative (aria-hidden) — label the button or link that holds them.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 18, children, viewBox = '0 0 18 18', ...rest }: IconProps & { viewBox?: string }) {
  return (
    <svg width={size} height={size} viewBox={viewBox} fill="none" aria-hidden="true" focusable="false" {...rest}>
      {children}
    </svg>
  );
}

const s = { stroke: 'currentColor', strokeWidth: 1.6 } as const;

export const LogoMark = (p: IconProps) => (
  <Svg size={28} viewBox="0 0 28 28" {...p}>
    <rect x="1" y="1" width="26" height="26" rx="7" {...s} strokeWidth={2} />
    <path d="M8 19v-6l6-4 6 4v6" {...s} strokeWidth={2} strokeLinejoin="round" />
    <path d="M12 19v-4h4v4" {...s} strokeWidth={2} />
  </Svg>
);

export const DashboardIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2" y="2" width="6" height="6" rx="1.5" {...s} />
    <rect x="10" y="2" width="6" height="6" rx="1.5" {...s} />
    <rect x="2" y="10" width="6" height="6" rx="1.5" {...s} />
    <rect x="10" y="10" width="6" height="6" rx="1.5" {...s} />
  </Svg>
);

export const HomeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 16V6l6-4 6 4v10" {...s} strokeLinejoin="round" />
    <path d="M7 16v-5h4v5" {...s} />
  </Svg>
);

export const PersonIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="6" r="3" {...s} />
    <path d="M3 16c.8-3 3.2-4.5 6-4.5s5.2 1.5 6 4.5" {...s} />
  </Svg>
);

export const GaugeIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="9" r="7" {...s} />
    <path d="M9 9l3-3" {...s} strokeLinecap="round" />
  </Svg>
);

export const ReceiptIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 2h10v14l-2.5-1.5L9 16l-2.5-1.5L4 16V2z" {...s} strokeLinejoin="round" />
    <path d="M7 6h4M7 9h4" {...s} />
  </Svg>
);

export const CardIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2" y="4" width="14" height="10" rx="2" {...s} />
    <path d="M2 8h14" {...s} />
  </Svg>
);

export const SlidersIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 5h12M3 9h12M3 13h12" {...s} />
    <circle cx="6" cy="5" r="1.6" fill="var(--icon-bg, #14231C)" {...s} />
    <circle cx="12" cy="9" r="1.6" fill="var(--icon-bg, #14231C)" {...s} />
    <circle cx="8" cy="13" r="1.6" fill="var(--icon-bg, #14231C)" {...s} />
  </Svg>
);

export const TeamIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="6.5" cy="6" r="2.5" {...s} />
    <circle cx="12.5" cy="7" r="2" {...s} />
    <path d="M2 15c.6-2.4 2.3-3.6 4.5-3.6S10.4 12.6 11 15M12 11.5c1.8 0 3.3 1 3.8 3" {...s} />
  </Svg>
);

export const SearchIcon = (p: IconProps) => (
  <Svg size={16} viewBox="0 0 16 16" {...p}>
    <circle cx="7" cy="7" r="5" {...s} />
    <path d="M11 11l3 3" {...s} />
  </Svg>
);

export const CloseIcon = (p: IconProps) => (
  <Svg size={16} viewBox="0 0 16 16" {...p}>
    <path d="M4 4l8 8M12 4l-8 8" {...s} />
  </Svg>
);

export const CheckIcon = (p: IconProps) => (
  <Svg size={16} viewBox="0 0 16 16" {...p}>
    <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth={1.8} />
  </Svg>
);

export const ChevronDownIcon = (p: IconProps) => (
  <Svg size={16} viewBox="0 0 16 16" {...p}>
    <path d="M4 6l4 4 4-4" {...s} />
  </Svg>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Svg size={20} viewBox="0 0 20 20" {...p}>
    <path d="M8 4l6 6-6 6" stroke="currentColor" strokeWidth={1.8} />
  </Svg>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <Svg size={20} viewBox="0 0 20 20" {...p}>
    <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth={1.8} />
  </Svg>
);

export const BellIcon = (p: IconProps) => (
  <Svg size={20} viewBox="0 0 20 20" {...p}>
    <path d="M5 14V9a5 5 0 0110 0v5l1.5 2h-13L5 14z" {...s} strokeLinejoin="round" />
    <path d="M8 18h4" {...s} />
  </Svg>
);

export const CameraIcon = (p: IconProps) => (
  <Svg size={20} viewBox="0 0 20 20" {...p}>
    <rect x="2" y="5" width="16" height="12" rx="2" {...s} />
    <circle cx="10" cy="11" r="3" {...s} />
    <path d="M7 5l1.5-2h3L13 5" {...s} />
  </Svg>
);

export const MenuIcon = (p: IconProps) => (
  <Svg size={22} {...p}>
    <path d="M3 5h12M3 9h12M3 13h12" {...s} strokeLinecap="round" />
  </Svg>
);
