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

/** Custom 24x24 pixel-art HUD trigger icon: cheerful pixel expression + radial star spark. */
export function EmoteWheelTriggerIcon({ size = 22 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true">
    <path d="M7 3H17V5H19V7H21V17H19V19H17V21H7V19H5V17H3V7H5V5H7Z" fill="#231a14" />
    <path d="M7 4H17V6H19V8H20V16H19V18H17V20H7V18H5V16H4V8H5V6H7Z" fill="#e8ba5a" />
    <path d="M8 5H16V7H8Z" fill="#fff0b8" />
    <path d="M8 9H10V11H8ZM14 9H16V11H14Z" fill="#261c15" />
    <path d="M8 14H10V15H14V14H16V16H14V17H10V16H8Z" fill="#261c15" />
    <path d="M6 12H8V13H6ZM16 12H18V13H16Z" fill="#e06b58" />
    <path d="M19 1H21V3H23V5H21V7H19V5H17V3H19Z" fill="#6ef5dc" />
    <path d="M19 3H21V5H19Z" fill="#ffffff" />
  </svg>;
}

/** Custom 24x24 pixel-art '67!' Emote icon: seesaw palms + bold gold '6', cyan '7' & '!' spark. */
export function Emote67PixelIcon({ size = 32 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true">
    {/* Dark pixel backing silhouette */}
    <path d="M2 4H10V16H2ZM10 2H19V14H10ZM19 3H23V14H19Z" fill="#171421" />
    {/* Bold Pixel '6' (solar gold + cream top shine) */}
    <path d="M4 5H9V7H5V9H9V15H3V6H4ZM5 11V13H7V11Z" fill="#ffbe3b" />
    <path d="M4 5H9V6H4Z" fill="#fff5bf" />
    {/* Bold Pixel '7' (elevated seesaw step, electric cyan-mint + white shine) */}
    <path d="M11 3H18V6H17V8H16V10H15V13H13V9H14V7H15V5H11Z" fill="#5ef5d8" />
    <path d="M11 3H18V4H11Z" fill="#ebfffb" />
    {/* Exclamation '!' */}
    <path d="M20 4H22V10H20ZM20 12H22V14H20Z" fill="#ff6b7a" />
    {/* Seesaw weighing palms underneath (left low, right high) */}
    <path d="M2 18H9V21H2Z" fill="#261911" />
    <path d="M3 19H8V20H3Z" fill="#f2c18d" />
    <path d="M2 17H9V18H2Z" fill="#ffbe3b" />
    <path d="M12 16H19V19H12Z" fill="#261911" />
    <path d="M13 17H18V18H13Z" fill="#f2c18d" />
    <path d="M12 15H19V16H12Z" fill="#5ef5d8" />
    {/* Tiny star glint */}
    <path d="M10 16H11V17H10ZM21 16H22V18H21ZM20 17H23V18H20Z" fill="#fff6cc" />
  </svg>;
}

/** Custom 24x24 pixel-art 'SMPN 7 Mataram Fireworks' icon: starburst fireworks + proud '7' crest! */
export function EmoteSmpn7FireworksPixelIcon({ size = 32 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true">
    {/* Multi-color pixel firework starburst in upper sky */}
    <path d="M11 1H13V4H11ZM11 8H13V11H11ZM6 5H9V7H6ZM15 5H18V7H15Z" fill="#ffe066" />
    <path d="M7 2H9V4H7ZM15 2H17V4H15ZM7 8H9V10H7ZM15 8H17V10H15Z" fill="#ff6b9d" />
    <path d="M3 3H5V5H3ZM19 3H21V5H19ZM2 9H4V11H2ZM20 9H22V11H20Z" fill="#5ed8ff" />
    <path d="M10 5H14V7H10ZM11 4H13V8H11Z" fill="#ffffff" />
    <path d="M4 12H6V14H4ZM18 12H20V14H18Z" fill="#5ef59b" />
    {/* Proud SMPN 7 Mataram shield badge at bottom */}
    <path d="M6 12H18V21H15V23H9V21H6Z" fill="#121826" />
    <path d="M7 13H17V20H14V22H10V20H7Z" fill="#214873" />
    <path d="M7 13H17V14H7Z" fill="#ffe066" />
    {/* Crisp pixel '7' inside shield */}
    <path d="M9 15H15V17H14V18H13V20H11V18H12V17H13V16H9Z" fill="#fff9d6" />
  </svg>;
}

/** Custom 24x24 pixel-art Kalimantan Wave ('Salam Rimba!') icon. */
export function EmoteWavePixelIcon({ size = 32 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true">
    <path d="M6 4H14V6H16V13H18V17H15V20H6V17H4V9H6Z" fill="#241811" />
    <path d="M7 5H9V11H7ZM10 4H12V11H10ZM13 6H15V12H13ZM5 9H7V15H5Z" fill="#f2c28d" />
    <path d="M7 11H15V18H7Z" fill="#eab37b" />
    <path d="M15 13H17V16H15Z" fill="#f2c28d" />
    {/* Motion wave arcs + Kalimantan emerald leaf */}
    <path d="M2 5H4V7H3V9H2ZM17 3H19V5H18V7H17Z" fill="#ffe082" />
    <path d="M16 14H22V19H20V21H15V16H16Z" fill="#2b5734" />
    <path d="M17 15H21V18H19V20H16V16H17Z" fill="#63bf6a" />
    <path d="M18 16H20V17H18Z" fill="#a8f09c" />
  </svg>;
}

/** Custom 24x24 pixel-art Spirit Cheer ('Semangat!') icon: golden star + water splash. */
export function EmoteSpiritPixelIcon({ size = 32 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true">
    <path d="M10 2H14V7H19V11H16V16H18V20H13V18H11V20H6V16H8V11H5V7H10Z" fill="#261b12" />
    <path d="M11 3H13V8H18V10H15V15H16V18H13V16H11V18H8V15H9V10H6V8H11Z" fill="#ffd24c" />
    <path d="M11 5H13V10H15V12H9V10H11Z" fill="#fff6bf" />
    {/* Water-droplet accents */}
    <path d="M3 14H5V16H6V19H2V16H3ZM19 14H21V16H22V19H18V16H19Z" fill="#5ed8ff" />
    <path d="M3 16H4V18H3ZM19 16H20V18H19Z" fill="#e0fbff" />
  </svg>;
}