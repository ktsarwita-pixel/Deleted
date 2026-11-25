import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { EmoteId } from '../canvas/emotes';
import { soundEngine } from '../audio/soundEngine';
import {
  Emote67PixelIcon,
  EmoteSmpn7FireworksPixelIcon,
  EmoteSpiritPixelIcon,
  EmoteWavePixelIcon,
  EmoteWheelTriggerIcon,
} from './PixelIcons';

export interface EmoteOption {
  id: EmoteId;
  slot: 'top' | 'right' | 'bottom' | 'left';
  hotkey: '1' | '2' | '3' | '4';
  label: string;
  shortLabel: string;
  subtitle: string;
  accent: string;
  renderIcon: (size: number) => ReactNode;
}

export const EMOTE_OPTIONS: EmoteOption[] = [
  {
    id: 'six_seven',
    slot: 'top',
    hotkey: '1',
    label: '67!',
    shortLabel: '67!',
    subtitle: 'Gaya ayun tangan 6-7!',
    accent: '#ffcf5c',
    renderIcon: size => <Emote67PixelIcon size={size} />,
  },
  {
    id: 'smpn7_fireworks',
    slot: 'right',
    hotkey: '2',
    label: 'SMPN 7 Mataram',
    shortLabel: 'SMPN 7',
    subtitle: 'Pesta kembang api SMPN 7 Mataram!',
    accent: '#5ed8ff',
    renderIcon: size => <EmoteSmpn7FireworksPixelIcon size={size} />,
  },
  {
    id: 'wave',
    slot: 'bottom',
    hotkey: '3',
    label: 'Salam Rimba!',
    shortLabel: 'Salam!',
    subtitle: 'Sapa warga Desa Rantau',
    accent: '#78d984',
    renderIcon: size => <EmoteWavePixelIcon size={size} />,
  },
  {
    id: 'cheer',
    slot: 'left',
    hotkey: '4',
    label: 'Semangat!',
    shortLabel: 'Semangat',
    subtitle: 'Sorak penjaga hutan!',
    accent: '#ffd24c',
    renderIcon: size => <EmoteSpiritPixelIcon size={size} />,
  },
];

interface EmoteWheelProps {
  open: boolean;
  disabled: boolean;
  activeEmote: EmoteId | null;
  onToggle: () => void;
  onClose: () => void;
  onSelect: (id: EmoteId) => void;
}

/** Polar SVG wedge path for a 90-degree radial sector centered at `centerDeg`. */
function sectorPath(cx: number, cy: number, rInner: number, rOuter: number, centerDeg: number): string {
  const halfSpan = 41; // leaves crisp 8-degree radial gaps between slices
  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const a0 = toRad(centerDeg - halfSpan);
  const a1 = toRad(centerDeg + halfSpan);
  const x0o = cx + Math.cos(a0) * rOuter;
  const y0o = cy + Math.sin(a0) * rOuter;
  const x1o = cx + Math.cos(a1) * rOuter;
  const y1o = cy + Math.sin(a1) * rOuter;
  const x1i = cx + Math.cos(a1) * rInner;
  const y1i = cy + Math.sin(a1) * rInner;
  const x0i = cx + Math.cos(a0) * rInner;
  const y0i = cy + Math.sin(a0) * rInner;
  return `M ${x0o.toFixed(2)} ${y0o.toFixed(2)} A ${rOuter} ${rOuter} 0 0 1 ${x1o.toFixed(2)} ${y1o.toFixed(2)} L ${x1i.toFixed(2)} ${y1i.toFixed(2)} A ${rInner} ${rInner} 0 0 0 ${x0i.toFixed(2)} ${y0i.toFixed(2)} Z`;
}

const SLOT_ANGLES: Record<EmoteOption['slot'], number> = {
  top: 0,
  right: 90,
  bottom: 180,
  left: 270,
};

export function EmoteWheel({ open, disabled, activeEmote, onToggle, onClose, onSelect }: EmoteWheelProps) {
  const [hovered, setHovered] = useState<EmoteId | null>('six_seven');
  const wheelRef = useRef<HTMLDivElement>(null);
  const dragMovedRef = useRef(false);

  useEffect(() => {
    if (open) {
      setHovered(activeEmote ?? 'six_seven');
      dragMovedRef.current = false;
    }
  }, [open, activeEmote]);

  if (disabled) return null;

  const focusedOption = EMOTE_OPTIONS.find(o => o.id === hovered) ?? EMOTE_OPTIONS[0];

  const pickByPointer = (clientX: number, clientY: number): EmoteId | null => {
    const el = wheelRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    const dist = Math.hypot(dx, dy);
    if (dist < rect.width * 0.14) return null; // inside deadzone hub
    const deg = ((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360;
    if (deg >= 315 || deg < 45) return 'six_seven';
    if (deg >= 45 && deg < 135) return 'smpn7_fireworks';
    if (deg >= 135 && deg < 225) return 'wave';
    return 'cheer';
  };

  const triggerChoice = (id: EmoteId) => {
    onSelect(id);
    onClose();
  };

  return (
    <>
      <button
        type="button"
        className={`emote-trigger ${open ? 'is-open' : ''} ${activeEmote ? 'is-playing' : ''}`}
        aria-label="Roda emote"
        aria-expanded={open}
        title="Buka roda emote (G)"
        onPointerDown={e => e.stopPropagation()}
        onClick={e => {
          e.stopPropagation();
          soundEngine.playBlip(open ? 360 : 520);
          onToggle();
        }}
      >
        <EmoteWheelTriggerIcon size={20} />
        <span className="emote-trigger-label">Emote</span>
        <kbd>G</kbd>
      </button>

      {open && (
        <div
          className="emote-wheel-backdrop"
          role="group"
          aria-label="Roda Emote Wira"
          onPointerDown={e => {
            e.stopPropagation();
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div
            ref={wheelRef}
            className="emote-wheel"
            onPointerMove={e => {
              const hit = pickByPointer(e.clientX, e.clientY);
              if (hit && hit !== hovered) {
                dragMovedRef.current = true;
                setHovered(hit);
                soundEngine.playBlip(580);
              }
            }}
            onPointerUp={e => {
              if (!dragMovedRef.current) return;
              const hit = pickByPointer(e.clientX, e.clientY);
              if (hit) triggerChoice(hit);
            }}
          >
            {/* Radial wheel SVG sector ring */}
            <svg className="emote-wheel-svg" viewBox="0 0 280 280" aria-hidden="true">
              <circle cx="140" cy="140" r="134" className="emote-wheel-outer-ring" />
              {EMOTE_OPTIONS.map(opt => {
                const isHot = hovered === opt.id;
                const isCurrent = activeEmote === opt.id;
                return (
                  <path
                    key={opt.id}
                    d={sectorPath(140, 140, 48, 128, SLOT_ANGLES[opt.slot])}
                    className={`emote-wheel-wedge ${isHot ? 'is-hovered' : ''} ${isCurrent ? 'is-current' : ''}`}
                    style={{ '--emote-accent': opt.accent } as React.CSSProperties}
                  />
                );
              })}
              <circle cx="140" cy="140" r="44" className="emote-wheel-inner-ring" />
            </svg>

            {/* 4 Interactive Emote Buttons positioned on the radial quadrants */}
            {EMOTE_OPTIONS.map(opt => {
              const isHot = hovered === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`emote-slice emote-slice-${opt.slot} ${isHot ? 'is-hovered' : ''}`}
                  style={{ '--emote-accent': opt.accent } as React.CSSProperties}
                  aria-label={`Emote ${opt.label}`}
                  onMouseEnter={() => {
                    if (hovered !== opt.id) {
                      setHovered(opt.id);
                      soundEngine.playBlip(580);
                    }
                  }}
                  onFocus={() => setHovered(opt.id)}
                  onClick={e => {
                    e.stopPropagation();
                    triggerChoice(opt.id);
                  }}
                >
                  <span className="emote-slice-key">{opt.hotkey}</span>
                  <span className="emote-slice-icon">{opt.renderIcon(32)}</span>
                  <span className="emote-slice-name">{opt.shortLabel}</span>
                </button>
              );
            })}

            {/* Center Hub showing active/hovered Emote title, description & quick close */}
            <button
              type="button"
              className="emote-wheel-hub"
              aria-label="Tutup roda emote"
              onClick={e => {
                e.stopPropagation();
                onClose();
              }}
            >
              <strong style={{ color: focusedOption.accent }}>{focusedOption.label}</strong>
              <span>{focusedOption.subtitle}</span>
              <small>ESC / G TUTUP</small>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
