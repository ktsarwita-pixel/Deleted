import type { PortraitId } from '../types/gameTypes';
import { useEffect, useRef, useState } from 'react';
import { portraitCanvas } from '../canvas/sprites';

export function PortraitPixelArt({ portrait = 'wira', size = 56, animated = false }: { portrait?: PortraitId; size?: number; animated?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!animated || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setTick(v => v + 1), 130);
    return () => clearInterval(id);
  }, [animated]);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const talking = animated && tick < 18;
    const blink = animated && tick % 30 > 27;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 24, 24);
    ctx.drawImage(portraitCanvas(portrait, talking && tick % 2 === 0, blink, tick), 0, 0);
  }, [portrait, tick, animated]);
  return <canvas ref={ref} width={24} height={24} className="portrait" style={{ width: size, height: size }} aria-hidden="true" />;
}

export function NormalBucketPixelIcon({ filled = false, size = 44 }: { filled?: boolean; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true">
    <path d="M6 5H8V3H16V5H18V10H16V6H8V10H6Z" fill="#bbd0c1" />
    <path d="M4 9H20V13H19V20H17V22H7V20H5V13H4Z" fill="#243f43" />
    <path d="M5 10H19V13H18V20H7V18H6V13H5Z" fill="#63939b" />
    <path d="M7 12H9V19H7ZM6 10H18V12H6Z" fill="#a2c9c5" />
    <path d="M16 13H18V20H16Z" fill="#3a6879" />
    {filled && <><path d="M6 10H18V12H6Z" fill="#70c6d6" /><path d="M8 10H12V11H8Z" fill="#d8f0df" /></>}
  </svg>;
}
export function BigBucketPixelIcon({ filled = false, size = 44 }: { filled?: boolean; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true">
    <path d="M4 4H6V2H18V4H20V9H18V5H6V9H4Z" fill="#d2b675" />
    <path d="M2 8H22V12H21V21H19V23H5V21H3V12H2Z" fill="#634627" />
    <path d="M3 9H21V12H20V21H5V19H4V12H3Z" fill="#c7934c" />
    <path d="M5 9H8V20H5ZM4 13H20V15H4ZM5 18H20V20H5Z" fill="#e9be71" />
    <path d="M18 15H20V18H18Z" fill="#9d6c36" />
    {filled && <path d="M4 9H20V11H4Z" fill="#75c9d0" />}
  </svg>;
}
export function NewShoesPixelIcon({ size = 44 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true">
    <path d="M3 11H9V10H13V12H16V14H20V15H22V20H2V12H3Z" fill="#2a1d17" />
    <path d="M4 12H9V11H12V13H15V15H19V16H21V18H3V13H4Z" fill="#c9412d" />
    <path d="M4 12H9V11H11V12H9V13H5V15H4Z" fill="#f07b50" />
    <path d="M10 14H12V13H13V15H11V16H9V15H10Z M14 15H16V16H14Z" fill="#f5c650" />
    <path d="M9 11H11V12H12V13H10V12H9Z" fill="#f3ead4" />
    <path d="M3 18H21V19H3Z" fill="#f3ead4" /><path d="M3 19H21V20H3Z" fill="#c9bfa5" />
    <path d="M19 4H20V6H22V7H20V9H19V7H17V6H19Z" fill="#fbe7a6" /><path d="M15 2H16V3H15Z M22 10H23V11H22Z" fill="#fbe7a6" />
  </svg>;
}
export function RupiahCoinIcon({ size = 24 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 20 20" shapeRendering="crispEdges" aria-hidden="true"><path d="M6 2H14V4H17V7H19V14H16V17H5V15H2V6H4V4H6Z" fill="#9e7438" /><path d="M6 2H13V3H16V6H17V12H15V15H5V13H3V6H5V4H6Z" fill="#dfb963" /><path d="M6 4H12V5H7V13H5V6H6Z" fill="#f6dfa0" /><path d="M9 6H12V8H10V9H12V12H9V10H11V9H9Z" fill="#9a713a" /></svg>;
}
export function FireFlameIcon({ size = 24 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true"><path d="M12 1H15V6H17V10H20V8H22V17H20V20H17V23H6V21H3V18H2V12H5V8H8V4H12Z" fill="#cd6b43" /><path d="M12 7H14V13H17V11H18V18H16V21H8V20H5V15H8V11H10V9H12Z" fill="#ecb365" /><path d="M11 14H14V17H16V20H13V22H9V19H10V17H11Z" fill="#f7df9e" /></svg>;
}