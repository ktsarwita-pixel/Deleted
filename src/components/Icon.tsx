export type IconName = 'leaf' | 'map' | 'help' | 'sound' | 'muted' | 'pause' | 'expand' | 'home' | 'arrow' | 'close' | 'check' | 'sun' | 'pin' | 'drop' | 'save' | 'bag' | 'play' | 'reset' | 'shield' | 'chevron' | 'up' | 'down' | 'left' | 'right';
const paths: Record<IconName, string> = {
  leaf: 'M20 3c-9-1-16 4-15 11 1 6 9 8 13 1 2-4 2-8 2-12ZM4 21 15 10M9 15v-5m0 5h5',
  map: 'm3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16',
  help: 'M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  sound: 'm11 4-6 5H2v6h3l6 5V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
  muted: 'm11 4-6 5H2v6h3l6 5V4Zm5 5 6 6m0-6-6 6',
  pause: 'M7 4v16M17 4v16', expand: 'M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6',
  home: 'm3 10 9-7 9 7v11H3V10Zm6 11v-8h6v8', arrow: 'M4 12h16m-6-6 6 6-6 6',
  close: 'm6 6 12 12M6 18 18 6', check: 'm5 12 4 4L19 6',
  sun: 'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  pin: 'M19 9c0 6-7 12-7 12S5 15 5 9a7 7 0 1 1 14 0ZM14 9a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z',
  drop: 'M12 3S5 11 5 15a7 7 0 0 0 14 0c0-4-7-12-7-12ZM9 16l2 2',
  save: 'M5 3h12l4 4v14H3V3h2Zm2 0v6h10V3M7 21v-8h10v8',
  bag: 'M5 7h14l2 14H3L5 7Zm3 1V6a4 4 0 0 1 8 0v2',
  play: 'm8 4 12 8-12 8V4Z', reset: 'M3 10a9 9 0 1 1 1 8M3 3v7h7',
  shield: 'm12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6l8-4Zm-4 9 3 3 5-6',
  chevron: 'm9 5 7 7-7 7', up: 'm6 15 6-6 6 6', down: 'm6 9 6 6 6-6', left: 'm15 6-6 6 6 6', right: 'm9 6 6 6-6 6',
};
export function Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d={paths[name]} /></svg>;
}