import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }

const base = ({ size = 22, ...p }: P) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...p,
})

export const IconHome = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 11.5 12 4l8 7.5" />
    <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
  </svg>
)
export const IconList = (p: P) => (
  <svg {...base(p)}>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <path d="M8.5 9.5h7M8.5 14.5h4.5" />
  </svg>
)
export const IconChart = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 19V11M12 19V5M19 19v-6" />
  </svg>
)
export const IconGear = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" />
  </svg>
)
export const IconPlus = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)
export const IconMinus = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 12h14" />
  </svg>
)
export const IconCheck = (p: P) => (
  <svg {...base(p)}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
)
export const IconChevronDown = (p: P) => (
  <svg {...base(p)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
)
export const IconChevronRight = (p: P) => (
  <svg {...base(p)}>
    <path d="m9 6 6 6-6 6" />
  </svg>
)
export const IconChevronLeft = (p: P) => (
  <svg {...base(p)}>
    <path d="m15 6-6 6 6 6" />
  </svg>
)
export const IconClose = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)
export const IconTrash = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" />
  </svg>
)
export const IconCopy = (p: P) => (
  <svg {...base(p)}>
    <rect x="8" y="8" width="12" height="12" rx="3" />
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
  </svg>
)
export const IconNote = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 5h14v10l-4 4H5z" />
    <path d="M15 19v-4h4M9 9.5h6M9 13h3" />
  </svg>
)
export const IconClock = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
)
export const IconFlame = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.2 2-4.2.3 1.6 1 2.4 2 2.7C10.5 8.5 11 5.5 12 3Z" />
  </svg>
)
export const IconBolt = (p: P) => (
  <svg {...base(p)}>
    <path d="M13 3 5 13.5h6L10 21l9-11h-6.5z" />
  </svg>
)
export const IconTrophy = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4" />
  </svg>
)
export const IconGrip = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" strokeWidth={3} />
  </svg>
)
export const IconArrowUp = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </svg>
)
export const IconPlay = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
  </svg>
)
export const IconSearch = (p: P) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </svg>
)
export const IconDumbbell = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 10v4M6 7v10M18 7v10M21 10v4M6 12h12" />
  </svg>
)
