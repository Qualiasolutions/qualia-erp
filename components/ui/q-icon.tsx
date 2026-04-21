import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';

export type QIconName =
  | 'home'
  | 'tasks'
  | 'projects'
  | 'clients'
  | 'agent'
  | 'calendar'
  | 'activity'
  | 'payments'
  | 'knowledge'
  | 'team'
  | 'admin'
  | 'settings'
  | 'search'
  | 'plus'
  | 'arrow-right'
  | 'arrow-up'
  | 'arrow-down'
  | 'check'
  | 'x'
  | 'more'
  | 'sun'
  | 'moon'
  | 'filter'
  | 'bell'
  | 'sparkle'
  | 'drag'
  | 'globe'
  | 'clock'
  | 'git'
  | 'server'
  | 'research';

type QIconProps = Omit<SVGProps<SVGSVGElement>, 'name'> & {
  name: QIconName;
  size?: number;
};

export function QIcon({ name, size = 16, className, ...rest }: QIconProps) {
  const base = {
    width: size,
    height: size,
    viewBox: '0 0 20 20',
    strokeWidth: 1.5,
    stroke: 'currentColor',
    fill: 'none',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: cn('inline-block shrink-0', className),
    'aria-hidden': true,
    focusable: false,
    ...rest,
  };

  switch (name) {
    case 'home':
      return (
        <svg {...base}>
          <path d="M3 9l7-6 7 6v8a1 1 0 0 1-1 1h-3v-5H7v5H4a1 1 0 0 1-1-1V9z" />
        </svg>
      );
    case 'tasks':
      return (
        <svg {...base}>
          <path d="M6 5h10M6 10h10M6 15h10" />
          <circle cx="3.5" cy="5" r="1" />
          <circle cx="3.5" cy="10" r="1" />
          <circle cx="3.5" cy="15" r="1" />
        </svg>
      );
    case 'projects':
      return (
        <svg {...base}>
          <rect x="3" y="4" width="14" height="12" rx="1.5" />
          <path d="M3 8h14M8 4v12" />
        </svg>
      );
    case 'clients':
      return (
        <svg {...base}>
          <circle cx="10" cy="7" r="3" />
          <path d="M4 17c0-3 3-5 6-5s6 2 6 5" />
        </svg>
      );
    case 'agent':
      return (
        <svg {...base}>
          <path d="M10 3v2M4 10H2M18 10h-2M10 17v-2" />
          <rect x="5" y="5" width="10" height="10" rx="3" />
          <circle cx="8" cy="10" r="0.8" fill="currentColor" />
          <circle cx="12" cy="10" r="0.8" fill="currentColor" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...base}>
          <rect x="3" y="5" width="14" height="12" rx="1.5" />
          <path d="M3 9h14M7 3v4M13 3v4" />
        </svg>
      );
    case 'activity':
      return (
        <svg {...base}>
          <path d="M2 10h3l2-5 3 10 2-7 2 5h4" />
        </svg>
      );
    case 'payments':
      return (
        <svg {...base}>
          <rect x="2" y="5" width="16" height="11" rx="1.5" />
          <path d="M2 9h16" />
          <path d="M5 13h3" />
        </svg>
      );
    case 'knowledge':
      return (
        <svg {...base}>
          <path d="M4 4h10a2 2 0 0 1 2 2v10H6a2 2 0 0 1-2-2V4z" />
          <path d="M4 14a2 2 0 0 1 2-2h10" />
        </svg>
      );
    case 'team':
      return (
        <svg {...base}>
          <circle cx="7" cy="8" r="2.5" />
          <circle cx="14" cy="8" r="2" />
          <path d="M2 16c0-2 2-4 5-4s5 2 5 4M12 16c0-1.5 1.2-3 3.5-3s3.5 1.5 3.5 3" />
        </svg>
      );
    case 'admin':
      return (
        <svg {...base}>
          <path d="M10 2l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V5l7-3z" />
        </svg>
      );
    case 'settings':
    case 'sun':
      return (
        <svg {...base}>
          <circle cx="10" cy="10" r={name === 'sun' ? 3.5 : 2.5} />
          <path d="M10 2v2M10 16v2M18 10h-2M4 10H2M15.5 4.5l-1.4 1.4M5.9 14.1l-1.4 1.4M15.5 15.5l-1.4-1.4M5.9 5.9L4.5 4.5" />
        </svg>
      );
    case 'search':
      return (
        <svg {...base}>
          <circle cx="9" cy="9" r="5" />
          <path d="M13 13l4 4" />
        </svg>
      );
    case 'plus':
      return (
        <svg {...base}>
          <path d="M10 4v12M4 10h12" />
        </svg>
      );
    case 'arrow-right':
      return (
        <svg {...base}>
          <path d="M4 10h12M12 5l5 5-5 5" />
        </svg>
      );
    case 'arrow-up':
      return (
        <svg {...base}>
          <path d="M10 16V4M5 9l5-5 5 5" />
        </svg>
      );
    case 'arrow-down':
      return (
        <svg {...base}>
          <path d="M10 4v12M5 11l5 5 5-5" />
        </svg>
      );
    case 'check':
      return (
        <svg {...base}>
          <path d="M4 10l4 4 8-8" />
        </svg>
      );
    case 'x':
      return (
        <svg {...base}>
          <path d="M5 5l10 10M15 5L5 15" />
        </svg>
      );
    case 'more':
      return (
        <svg {...base}>
          <circle cx="5" cy="10" r="1.3" fill="currentColor" />
          <circle cx="10" cy="10" r="1.3" fill="currentColor" />
          <circle cx="15" cy="10" r="1.3" fill="currentColor" />
        </svg>
      );
    case 'moon':
      return (
        <svg {...base}>
          <path d="M16 11A7 7 0 0 1 9 4c0-.7.1-1.4.3-2A7 7 0 1 0 18 11.7 7 7 0 0 1 16 11z" />
        </svg>
      );
    case 'filter':
      return (
        <svg {...base}>
          <path d="M3 5h14l-5 7v5l-4-2v-3L3 5z" />
        </svg>
      );
    case 'bell':
      return (
        <svg {...base}>
          <path d="M5 9a5 5 0 0 1 10 0v3l2 3H3l2-3V9z" />
          <path d="M8 17a2 2 0 0 0 4 0" />
        </svg>
      );
    case 'sparkle':
      return (
        <svg {...base}>
          <path d="M10 3l1.5 4.5L16 9l-4.5 1.5L10 15l-1.5-4.5L4 9l4.5-1.5L10 3z" />
        </svg>
      );
    case 'drag':
      return (
        <svg {...base}>
          <circle cx="8" cy="5" r="1" fill="currentColor" />
          <circle cx="12" cy="5" r="1" fill="currentColor" />
          <circle cx="8" cy="10" r="1" fill="currentColor" />
          <circle cx="12" cy="10" r="1" fill="currentColor" />
          <circle cx="8" cy="15" r="1" fill="currentColor" />
          <circle cx="12" cy="15" r="1" fill="currentColor" />
        </svg>
      );
    case 'globe':
      return (
        <svg {...base}>
          <circle cx="10" cy="10" r="7" />
          <path d="M3 10h14M10 3a10 10 0 0 1 0 14 10 10 0 0 1 0-14z" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...base}>
          <circle cx="10" cy="10" r="7" />
          <path d="M10 6v4l3 2" />
        </svg>
      );
    case 'git':
      return (
        <svg {...base}>
          <circle cx="5" cy="5" r="2" />
          <circle cx="5" cy="15" r="2" />
          <circle cx="15" cy="10" r="2" />
          <path d="M5 7v6M7 5c4 0 6 2 6 4" />
        </svg>
      );
    case 'server':
      return (
        <svg {...base}>
          <rect x="3" y="3" width="14" height="5" rx="1.5" />
          <rect x="3" y="12" width="14" height="5" rx="1.5" />
          <circle cx="6" cy="5.5" r="0.7" fill="currentColor" />
          <circle cx="6" cy="14.5" r="0.7" fill="currentColor" />
          <path d="M12 5.5h2M12 14.5h2" />
        </svg>
      );
    case 'research':
      return (
        <svg {...base}>
          <path d="M8 3h4v4l3 7a2 2 0 0 1-2 3H7a2 2 0 0 1-2-3l3-7V3z" />
          <path d="M8 3h4" />
          <circle cx="9" cy="13" r="0.7" fill="currentColor" />
          <circle cx="11" cy="15" r="0.7" fill="currentColor" />
        </svg>
      );
    default:
      return null;
  }
}
