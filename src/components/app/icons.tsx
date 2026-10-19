// One outline set, 16px, 1.5px stroke (FRONTEND.md §4).
const base = { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

export const IconGames = () => (
  <svg {...base}><path d="M4.5 2.5h7L15 8l-3.5 5.5h-7L1 8z" /></svg>
);
export const IconRanks = () => (
  <svg {...base}><path d="M2.5 13.5v-4M8 13.5v-11M13.5 13.5v-7" /></svg>
);
export const IconRewards = () => (
  <svg {...base}><rect x="2" y="5.5" width="12" height="8" rx="1" /><path d="M2 8.5h12M5.5 5.5V3.8a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7" /></svg>
);
export const IconProfile = () => (
  <svg {...base}><circle cx="8" cy="5.5" r="3" /><path d="M2.5 14c.7-2.6 2.9-4 5.5-4s4.8 1.4 5.5 4" /></svg>
);
export const IconSubmit = () => (
  <svg {...base}><path d="M8 10.5V2.5M4.5 6 8 2.5 11.5 6M2.5 10.5v2a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2" /></svg>
);
export const IconAdmin = () => (
  <svg {...base}><path d="M8 1.8 13.5 4v4c0 3.3-2.4 5.6-5.5 6.2C4.9 13.6 2.5 11.3 2.5 8V4z" /></svg>
);
export const IconMore = () => (
  <svg {...base}><path d="M2.5 4h11M2.5 8h11M2.5 12h11" /></svg>
);
export const IconBack = () => (
  <svg {...base}><path d="M10 3 5 8l5 5" /></svg>
);
export const IconChevron = () => (
  <svg {...base}><path d="m6 3 5 5-5 5" /></svg>
);
export const IconCopy = () => (
  <svg {...base} width={14} height={14}><rect x="5.5" y="5.5" width="8" height="8" rx="1" /><path d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" /></svg>
);
export const IconSearch = () => (
  <svg {...base} width={14} height={14}><circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3 3" /></svg>
);
export const IconExternal = () => (
  <svg {...base} width={12} height={12}><path d="M9.5 2.5h4v4M13.5 2.5 7 9M6 3.5H3.5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V10" /></svg>
);
