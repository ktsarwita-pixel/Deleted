/* Grounded Kalimantan character emotes + Full-Screen 'SMPN 7 MATARAM' Pyrotechnic Sky Show (zero canvas allocations). */
import { R } from './backgrounds';
import { soundEngine } from '../audio/soundEngine';

export type EmoteId = 'six_seven' | 'smpn7_fireworks' | 'wave' | 'cheer';

export interface ActiveEmote {
  id: EmoteId;
  age: number;
  duration: number;
  originX: number;
  originY: number;
  stageMask: number;
}

const snap = (v: number) => Math.round(v / 2) * 2;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export const EMOTE_DURATIONS: Record<EmoteId, number> = {
  six_seven: 2.5,
  smpn7_fireworks: 5.4,
  wave: 2.0,
  cheer: 2.2,
};

/* ---------------- Precomputed Firework Text Star Matrix ('SMPN 7' / 'MATARAM') ---------------- */
const FONT_5X7: Record<string, string[]> = {
  S: [
    ' 1111',
    '1    ',
    '1    ',
    ' 111 ',
    '    1',
    '    1',
    '1111 ',
  ],
  M: [
    '1   1',
    '11 11',
    '1 1 1',
    '1 1 1',
    '1   1',
    '1   1',
    '1   1',
  ],
  P: [
    '1111 ',
    '1   1',
    '1   1',
    '1111 ',
    '1    ',
    '1    ',
    '1    ',
  ],
  N: [
    '1   1',
    '11  1',
    '1 1 1',
    '1  11',
    '1   1',
    '1   1',
    '1   1',
  ],
  '7': [
    '11111',
    '    1',
    '   1 ',
    '  1  ',
    '  1  ',
    ' 1   ',
    ' 1   ',
  ],
  A: [
    ' 111 ',
    '1   1',
    '1   1',
    '11111',
    '1   1',
    '1   1',
    '1   1',
  ],
  T: [
    '11111',
    '  1  ',
    '  1  ',
    '  1  ',
    '  1  ',
    '  1  ',
    '  1  ',
  ],
  R: [
    '1111 ',
    '1   1',
    '1   1',
    '1111 ',
    '1 1  ',
    '1  1 ',
    '1   1',
  ],
  ' ': [
    '   ',
    '   ',
    '   ',
    '   ',
    '   ',
    '   ',
    '   ',
  ],
};

interface TextFireworkStar {
  /** Normalized offset (-0.5 .. +0.5) across the text block width */
  ux: number;
  /** Row-normalized offset */
  uy: number;
  /** 0 = top row ('SMPN 7'), 1 = bottom row ('MATARAM') */
  row: 0 | 1;
  /** Which of the 3 sky-writing shells (0=left, 1=center, 2=right) spawns this star */
  zone: 0 | 1 | 2;
  /** Deterministic phase seed (0..1) for shimmer, crackle & ember droop variance */
  seed: number;
  /** Slight radial scatter from burst origin */
  jitterX: number;
  jitterY: number;
}

function buildRowStars(word: string, row: 0 | 1, out: TextFireworkStar[]) {
  const glyphs = Array.from(word).map(ch => FONT_5X7[ch] ?? FONT_5X7[' ']);
  const totalCols = glyphs.reduce((acc, g, idx) => acc + g[0].length + (idx < glyphs.length - 1 ? 2 : 0), 0);
  let cursor = 0;
  let idxSeed = row * 97 + 13;
  for (const g of glyphs) {
    const gw = g[0].length;
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < gw; c++) {
        if (g[r][c] !== '1') continue;
        idxSeed = (idxSeed * 1664525 + 1013904223) >>> 0;
        const s1 = (idxSeed & 0xffff) / 0xffff;
        const s2 = ((idxSeed >>> 16) & 0xffff) / 0xffff;
        const nx = (cursor + c) / Math.max(1, totalCols - 1) - 0.5;
        const ny = r / 6 - 0.5;
        const zone: 0 | 1 | 2 = nx < -0.17 ? 0 : nx > 0.17 ? 2 : 1;
        out.push({
          ux: nx,
          uy: ny,
          row,
          zone,
          seed: s1,
          jitterX: (s1 - 0.5) * 18,
          jitterY: (s2 - 0.5) * 18,
        });
      }
    }
    cursor += gw + 2;
  }
}

export const SMPN7_TEXT_STARS: readonly TextFireworkStar[] = (() => {
  const arr: TextFireworkStar[] = [];
  buildRowStars('SMPN 7', 0, arr);
  buildRowStars('MATARAM', 1, arr);
  return arr;
})();

interface ShowShell {
  launchX: number; // normalized screen x (0..1)
  burstX: number;  // normalized screen x (0..1)
  burstY: number;  // normalized screen y (0..1)
  tLaunch: number;
  flight: number;
  cMain: string;
  cSub: string;
  cCore: string;
  pitch: number;
  kind: 'peony' | 'text' | 'crown';
  rays: number;
  radiusFrac: number;
}

const SHOW_SHELLS: ShowShell[] = [
  // Opening flanking chrysanthemum & willow shells
  { launchX: 0.20, burstX: 0.18, burstY: 0.28, tLaunch: 0.06, flight: 0.46, cMain: '#ffd66b', cSub: '#ff884d', cCore: '#ffffff', pitch: 1.02, kind: 'peony', rays: 18, radiusFrac: 0.13 },
  { launchX: 0.80, burstX: 0.82, burstY: 0.26, tLaunch: 0.26, flight: 0.48, cMain: '#6ef2b8', cSub: '#5ed4ff', cCore: '#ffffff', pitch: 1.12, kind: 'peony', rays: 18, radiusFrac: 0.13 },
  // 3 Synchronized Sky-Writing Shells that explode directly into 'SMPN 7' & 'MATARAM'!
  { launchX: 0.34, burstX: 0.28, burstY: 0.40, tLaunch: 0.64, flight: 0.48, cMain: '#ffe07d', cSub: '#7ce8ff', cCore: '#ffffff', pitch: 0.96, kind: 'text', rays: 14, radiusFrac: 0.09 },
  { launchX: 0.50, burstX: 0.50, burstY: 0.40, tLaunch: 0.72, flight: 0.48, cMain: '#fff0a6', cSub: '#6ef2b8', cCore: '#ffffff', pitch: 1.05, kind: 'text', rays: 14, radiusFrac: 0.09 },
  { launchX: 0.66, burstX: 0.72, burstY: 0.40, tLaunch: 0.80, flight: 0.48, cMain: '#ffe07d', cSub: '#ff8e6e', cCore: '#ffffff', pitch: 1.00, kind: 'text', rays: 14, radiusFrac: 0.09 },
  // High celebratory crown shells above the glowing firework text
  { launchX: 0.28, burstX: 0.24, burstY: 0.17, tLaunch: 2.05, flight: 0.46, cMain: '#ff7a90', cSub: '#ffd66b', cCore: '#ffffff', pitch: 1.15, kind: 'crown', rays: 20, radiusFrac: 0.12 },
  { launchX: 0.72, burstX: 0.76, burstY: 0.17, tLaunch: 2.38, flight: 0.46, cMain: '#7ce8ff', cSub: '#ffd66b', cCore: '#ffffff', pitch: 0.92, kind: 'crown', rays: 20, radiusFrac: 0.12 },
];

export function createActiveEmote(id: EmoteId, x: number, y: number): ActiveEmote {
  if (id === 'six_seven') soundEngine.playEmote67();
  else if (id === 'wave') soundEngine.playEmoteCheer(true);
  else if (id === 'cheer') soundEngine.playEmoteCheer(false);
  return { id, age: 0, duration: EMOTE_DURATIONS[id], originX: x, originY: y, stageMask: 0 };
}

export function stepActiveEmote(emote: ActiveEmote | null, dt: number): ActiveEmote | null {
  if (!emote) return null;
  emote.age += dt;
  if (emote.id === 'smpn7_fireworks') {
    SHOW_SHELLS.forEach((sh, idx) => {
      const launchBit = 1 << (idx * 2);
      const burstBit = 1 << (idx * 2 + 1);
      if (emote.age >= sh.tLaunch && !(emote.stageMask & launchBit)) {
        emote.stageMask |= launchBit;
        soundEngine.playFireworkLaunch(sh.pitch);
      }
      if (emote.age >= sh.tLaunch + sh.flight && !(emote.stageMask & burstBit)) {
        emote.stageMask |= burstBit;
        if (idx === 2) {
          // First sky-writing shell triggers the full triple-salute finale + crackle cascade!
          soundEngine.playFireworkTextFinale();
        } else if (sh.kind !== 'text') {
          soundEngine.playFireworkBurst(sh.pitch);
        }
      }
    });
  }
  return emote.age < emote.duration ? emote : null;
}

export function emoteHopOffset(_emote: ActiveEmote | null, _reducedMotion: boolean): number {
  return 0;
}

/** Crisp 5x6 pixel glyphs scaled at 2px, outlined in #1b1612 to match Wira's sprite outline. */
const GLYPH_6 = [' 111 ', '1    ', '1111 ', '1   1', '1   1', ' 111 '];
const GLYPH_7 = ['11111', '    1', '   1 ', '  1  ', '  1  ', '  1  '];
const GLYPH_BANG = ['1', '1', '1', '1', ' ', '1'];

function drawSmallGlyph(c: CanvasRenderingContext2D, rows: string[], x: number, y: number, fill: string, hi: string) {
  const px = 2;
  c.fillStyle = '#1b1612';
  for (let r = 0; r < rows.length; r++) {
    for (let col = 0; col < rows[r].length; col++) {
      if (rows[r][col] !== '1') continue;
      c.fillRect(x + col * px - px, y + r * px, px * 3, px);
      c.fillRect(x + col * px, y + r * px - px, px, px * 3);
    }
  }
  for (let r = 0; r < rows.length; r++) {
    for (let col = 0; col < rows[r].length; col++) {
      if (rows[r][col] !== '1') continue;
      c.fillStyle = r === 0 ? hi : fill;
      c.fillRect(x + col * px, y + r * px, px, px);
    }
  }
}

/** Ground-level boot dust puffs for world-space emotes. */
export function drawEmoteGround(
  c: CanvasRenderingContext2D,
  emote: ActiveEmote | null,
  px: number,
  py: number,
  reducedMotion: boolean,
) {
  if (!emote || emote.id === 'smpn7_fireworks') return;
  const age = emote.age;
  const k = clamp01(age / emote.duration);
  const fade = k > 0.85 ? (1 - k) / 0.15 : 1;

  if ((emote.id === 'six_seven' || emote.id === 'cheer') && !reducedMotion) {
    const beat = (age * (emote.id === 'six_seven' ? 3.5 : 3.0)) % 1;
    if (beat < 0.45) {
      const u = beat / 0.45;
      c.globalAlpha = (1 - u) * 0.34 * fade;
      R(c, snap(px - 14 - u * 8), snap(py - 2 - u * 2), 4, 2, '#cbbda0');
      R(c, snap(px + 10 + u * 8), snap(py - 2 - u * 2), 4, 2, '#cbbda0');
      c.globalAlpha = 1;
    }
  }
}

/** World-space overlays for 'six_seven', 'wave', and 'cheer' ('smpn7_fireworks' renders on its dedicated night-sky screen!). */
export function drawEmoteOverlay(
  c: CanvasRenderingContext2D,
  emote: ActiveEmote | null,
  px: number,
  py: number,
  _hopY: number,
  reducedMotion: boolean,
) {
  if (!emote || emote.id === 'smpn7_fireworks') return;
  const age = emote.age;
  const k = clamp01(age / emote.duration);
  const fade = k < 0.08 ? k / 0.08 : k > 0.84 ? (1 - k) / 0.16 : 1;

  if (emote.id === 'six_seven') {
    const phase = age * 7 * (Math.PI / 2);
    const lift = reducedMotion ? 0 : Math.cos(phase);
    const leftY = snap(py - 54 + lift * 5);
    const rightY = snap(py - 54 - lift * 5);

    c.globalAlpha = fade;
    drawSmallGlyph(c, GLYPH_6, snap(px - 24), leftY, '#eab85c', '#fff2be');
    drawSmallGlyph(c, GLYPH_7, snap(px + 14), rightY, '#da674b', '#ffd8c2');
    if (age > 0.35) {
      drawSmallGlyph(c, GLYPH_BANG, snap(px + 28), rightY - 2, '#f0e2bf', '#ffffff');
    }
    if (!reducedMotion) {
      const mY = snap(py - 60 - ((age * 18) % 10));
      R(c, snap(px - 20), mY, 2, 2, lift < 0 ? '#fff2be' : '#cbb88f');
      R(c, snap(px + 18), mY, 2, 2, lift > 0 ? '#ffd8c2' : '#cbb88f');
    }
    c.globalAlpha = 1;
    return;
  }

  c.globalAlpha = fade;
  const bx = snap(px + (emote.id === 'wave' ? 14 : 0));
  const by = snap(py - 88);
  if (emote.id === 'wave') {
    const pulse = reducedMotion ? 0 : Math.floor(age * 6) % 2;
    R(c, bx + 4 + pulse * 2, by + 6, 2, 4, '#e5cf95');
    R(c, bx + 6 + pulse * 2, by + 4, 2, 2, '#e5cf95');
    R(c, bx + 8 + pulse * 2, by + 8, 2, 4, '#cbb88f');
  } else if (!reducedMotion) {
    for (let i = 0; i < 4; i++) {
      const u = (age * 1.5 + i * 0.25) % 1;
      const sx = px + [-18, 16, -10, 10][i] + Math.sin(age * 5 + i) * 3;
      const sy = py - 48 - u * 26;
      c.globalAlpha = (1 - u) * 0.85 * fade;
      R(c, snap(sx), snap(sy), 2, 2, i % 2 === 0 ? '#e5cf95' : '#8bbf7a');
    }
  }
  c.globalAlpha = 1;
}

/**
 * Full-Stage Kalimantan Night-Sky Pyrotechnic Screen for 'SMPN 7 Mataram':
 * Displays a dedicated night-sky showcase screen where skyrockets launch from the horizon
 * and explode directly into glowing firework star particles spelling 'SMPN 7' & 'MATARAM'!
 */
export function drawEmoteScreen(
  c: CanvasRenderingContext2D,
  emote: ActiveEmote | null,
  width: number,
  height: number,
  reducedMotion: boolean,
) {
  if (!emote || emote.id !== 'smpn7_fireworks') return;
  const age = emote.age;
  const dur = emote.duration;
  const screenFade = age < 0.30 ? age / 0.30 : age > dur - 0.55 ? Math.max(0, (dur - age) / 0.55) : 1;
  if (screenFade <= 0.005) return;

  const horizonY = Math.round(height * 0.86);

  // Compute live sky flash intensity from detonating shells
  let skyFlash = 0;
  for (const sh of SHOW_SHELLS) {
    const bAge = age - (sh.tLaunch + sh.flight);
    if (bAge >= 0 && bAge < 0.36) {
      skyFlash = Math.max(skyFlash, (1 - bAge / 0.36) * (sh.kind === 'text' ? 0.26 : 0.16));
    }
  }

  c.save();
  // 1) Deep Twilight / Night-Sky Showcase Backdrop (layered pixel sky bands)
  c.globalAlpha = screenFade * 0.94;
  const band1 = Math.round(height * 0.30);
  const band2 = Math.round(height * 0.58);
  R(c, 0, 0, width, band1, '#060a14');
  R(c, 0, band1, width, band2 - band1, '#0b1426');
  R(c, 0, band2, width, horizonY - band2, '#132238');
  R(c, 0, horizonY, width, height - horizonY, '#080d14');

  // Subtle horizon glow + explosion sky-flash illumination
  if (skyFlash > 0.01 && !reducedMotion) {
    c.globalAlpha = screenFade * skyFlash;
    R(c, 0, 0, width, horizonY, '#3a3550');
  }
  c.globalAlpha = screenFade * 0.38;
  R(c, 0, horizonY - 18, width, 18, '#1e334a');

  // Distant twinkling night stars
  c.globalAlpha = screenFade;
  for (let i = 0; i < 28; i++) {
    const sx = snap(((i * 173 + 41) % 997) / 997 * width);
    const sy = snap(((i * 311 + 19) % 991) / 991 * (horizonY * 0.72));
    const tw = reducedMotion ? 0.55 : 0.3 + 0.5 * Math.max(0, Math.sin(age * 4.5 + i * 1.7));
    c.globalAlpha = screenFade * tw;
    R(c, sx, sy, 2, 2, i % 3 === 0 ? '#ffe9b8' : '#cfe4ff');
  }

  // 2) Rising Smoke Plumes & Detonation Smoke Clouds (drawn before additive 'lighter' sparks)
  if (!reducedMotion) {
    for (const sh of SHOW_SHELLS) {
      const bAge = age - (sh.tLaunch + sh.flight);
      if (bAge > 0 && bAge < 2.2) {
        const bx = sh.burstX * width;
        const by = sh.burstY * height;
        const su = bAge / 2.2;
        c.globalAlpha = screenFade * (1 - su) * 0.14;
        R(c, snap(bx - 28 - su * 18), snap(by - 10 + su * 8), snap(56 + su * 36), 16, '#8fa0b8');
      }
    }
  }

  // 3) Additive Pyrotechnic Layer: Rockets, Chrysanthemum Shells & 'SMPN 7 MATARAM' Firework Stars!
  c.globalCompositeOperation = 'lighter';

  // 3a) Launch trajectories & spherical peony/crown starbursts
  SHOW_SHELLS.forEach((sh, idx) => {
    if (age < sh.tLaunch) return;
    const tRel = age - sh.tLaunch;
    const x0 = sh.launchX * width;
    const y0 = horizonY - 4;
    const x1 = sh.burstX * width;
    const y1 = sh.burstY * height;

    if (tRel < sh.flight) {
      // Ascending skyrocket + golden ember tail!
      const u = clamp01(tRel / sh.flight);
      const easeY = 1 - Math.pow(1 - u, 2.1);
      const cx = x0 + (x1 - x0) * u;
      const cy = y0 + (y1 - y0) * easeY;

      c.globalAlpha = screenFade * 0.95;
      R(c, snap(cx) - 2, snap(cy) - 4, 4, 6, sh.cMain);
      R(c, snap(cx) - 1, snap(cy) - 4, 2, 4, '#ffffff');

      if (!reducedMotion) {
        const tailDots = 9;
        for (let s = 1; s <= tailDots; s++) {
          const su = Math.max(0, u - s * 0.032);
          const tx = x0 + (x1 - x0) * su + Math.sin(age * 34 + s * 1.9 + idx) * 2;
          const ty = y0 + (y1 - y0) * (1 - Math.pow(1 - su, 2.1));
          c.globalAlpha = screenFade * (1 - s / (tailDots + 1)) * 0.72;
          R(c, snap(tx), snap(ty), 2, 2, s < 4 ? '#ffe49c' : '#d97538');
        }
      }
    } else {
      // Spherical burst ring (smaller accent burst for 'text' shells, full grand willow/peony for flanking/crown shells)
      const bAge = tRel - sh.flight;
      const bLife = sh.kind === 'text' ? 0.95 : 1.95;
      if (bAge > bLife) return;
      const bu = clamp01(bAge / bLife);
      const expand = 1 - Math.pow(1 - bu, 3.1);
      const grav = bu * bu * (height * 0.085);
      const maxR = Math.min(width, height) * sh.radiusFrac;
      const alpha = (1 - bu * bu) * screenFade;

      // White-hot core ignition flash
      if (bAge < 0.11) {
        const fu = 1 - bAge / 0.11;
        c.globalAlpha = fu * 0.85 * screenFade;
        const fr = sh.kind === 'text' ? 18 : 14;
        R(c, snap(x1 - fr), snap(y1 - fr), fr * 2, fr * 2, '#fffef2');
      }

      const rays = reducedMotion ? Math.max(8, Math.floor(sh.rays / 2)) : sh.rays;
      for (let r = 0; r < rays; r++) {
        const ang = (r / rays) * Math.PI * 2 + idx * 0.37;
        const tier = (r % 2 === 0 ? 1.0 : 0.68) * maxR * expand;
        const sx = x1 + Math.cos(ang) * tier;
        const sy = y1 + Math.sin(ang) * tier * 0.88 + grav * (r % 2 === 0 ? 1 : 0.72);

        // Glowing willow trail behind each falling star
        if (!reducedMotion && sh.kind !== 'text' && bu > 0.10 && bu < 0.90) {
          for (let tr = 1; tr <= 2; tr++) {
            const kBack = 1 - tr * 0.13;
            const tx = x1 + Math.cos(ang) * (tier * kBack);
            const ty = y1 + Math.sin(ang) * (tier * kBack) * 0.88 + grav * (kBack * kBack);
            c.globalAlpha = alpha * (0.38 / tr);
            R(c, snap(tx), snap(ty), 2, 2, sh.cSub);
          }
        }

        const twinkle = reducedMotion || bu < 0.55 || ((Math.floor(age * 24) + r + idx) % 3 !== 0);
        if (twinkle) {
          c.globalAlpha = alpha * 0.45;
          R(c, snap(sx) - 2, snap(sy) - 2, 6, 6, r % 2 === 0 ? sh.cMain : sh.cSub);
          c.globalAlpha = alpha;
          R(c, snap(sx), snap(sy), 2, 2, bu < 0.35 ? sh.cCore : sh.cMain);
        }
      }
    }
  });

  // 3b) THE 'SMPN 7 MATARAM' SKY-WRITING FIREWORK STARS!
  // Responsive layout across the center night sky so every letter is bold, crisp & unmistakable
  const textSpanW = Math.min(width * 0.80, 620);
  const row1SpanW = textSpanW * 0.78; // 'SMPN 7' slightly narrower & taller above 'MATARAM'
  const row2SpanW = textSpanW;        // 'MATARAM' full width below
  const rowH = Math.max(24, Math.min(height * 0.115, 56));
  const row1CenterY = height * 0.36;
  const row2CenterY = row1CenterY + rowH * 1.52;
  const starSize = width >= 640 ? 4 : 3;

  const zoneOrigins = [
    { x: SHOW_SHELLS[2].burstX * width, y: SHOW_SHELLS[2].burstY * height, tBurst: SHOW_SHELLS[2].tLaunch + SHOW_SHELLS[2].flight },
    { x: SHOW_SHELLS[3].burstX * width, y: SHOW_SHELLS[3].burstY * height, tBurst: SHOW_SHELLS[3].tLaunch + SHOW_SHELLS[3].flight },
    { x: SHOW_SHELLS[4].burstX * width, y: SHOW_SHELLS[4].burstY * height, tBurst: SHOW_SHELLS[4].tLaunch + SHOW_SHELLS[4].flight },
  ];

  for (let i = 0; i < SMPN7_TEXT_STARS.length; i++) {
    const st = SMPN7_TEXT_STARS[i];
    const origin = zoneOrigins[st.zone];
    const sAge = age - origin.tBurst;
    if (sAge < 0) continue;

    const life = 3.85;
    if (sAge > life) continue;

    // Target position in the 'SMPN 7' / 'MATARAM' firework constellation
    const targetX = width * 0.5 + st.ux * (st.row === 0 ? row1SpanW : row2SpanW);
    const targetY = (st.row === 0 ? row1CenterY : row2CenterY) + st.uy * rowH;

    // Ballistic expansion from the exploding mortar shell (0..0.32s) -> glowing hover -> gravity ember droop
    const bloom = sAge < 0.32 ? 1 - Math.pow(1 - sAge / 0.32, 3.3) : 1;
    const holdAge = Math.max(0, sAge - 0.32);
    const droop = sAge > 2.45 ? Math.pow((sAge - 2.45) / 1.40, 2.1) * (24 + st.seed * 22) : 0;
    const driftX = reducedMotion ? 0 : holdAge * (3.2 + (st.seed - 0.5) * 4.0) + Math.sin(age * 3.1 + st.seed * 12) * 0.9;
    const driftY = reducedMotion ? 0 : Math.cos(age * 2.7 + st.seed * 10) * 0.8 + droop;

    const sx = origin.x + st.jitterX * (1 - bloom) + (targetX - origin.x) * bloom + driftX;
    const sy = origin.y + st.jitterY * (1 - bloom) + (targetY - origin.y) * bloom + driftY;

    const burnFade = sAge > 2.75 ? Math.max(0, 1 - (sAge - 2.75) / 1.10) : 1;
    const strobe = reducedMotion
      ? 0.95
      : 0.72 + 0.28 * Math.sin(age * (18 + st.seed * 14) + i * 1.7);
    const alpha = screenFade * burnFade * strobe;
    if (alpha <= 0.02) continue;

    // Color temperature evolution: white-hot ignition -> brilliant gold ('SMPN 7') / cyan-emerald ('MATARAM') -> warm ember cooling
    const cooling = sAge > 2.65;
    const haloColor = cooling
      ? (sAge > 3.25 ? '#b83b28' : '#f0853a')
      : st.row === 0
        ? (st.seed > 0.5 ? '#ffd45c' : '#ffaa4c')
        : (st.seed > 0.45 ? '#66e3ff' : '#6cf2b4');
    const coreColor = sAge < 0.25 ? '#ffffff' : cooling ? '#ffd29e' : '#fffdf0';

    // Soft additive pyrotechnic glow halo
    c.globalAlpha = alpha * 0.36;
    R(c, snap(sx) - starSize, snap(sy) - starSize, starSize * 3, starSize * 3, haloColor);

    // Incandescent star core
    c.globalAlpha = Math.min(1, alpha * 1.05);
    R(c, snap(sx), snap(sy), starSize, starSize, haloColor);
    if (!cooling) {
      R(c, Math.round(sx) + 1, Math.round(sy) + 1, Math.max(2, starSize - 2), Math.max(2, starSize - 2), coreColor);
    }

    // Live crackling titanium daughter sparks popping off individual letters!
    if (!reducedMotion && sAge > 0.34 && sAge < 2.95 && ((Math.floor(age * 16 + i * 7) % 29) === 0)) {
      const cAng = st.seed * Math.PI * 2 + age * 5;
      const cDist = 5 + ((age * 40 + i) % 7);
      c.globalAlpha = alpha * 0.8;
      R(c, snap(sx + Math.cos(cAng) * cDist), snap(sy + Math.sin(cAng) * cDist), 2, 2, '#fffbe0');
    }
  }

  // 4) Silhouetted Kalimantan Horizon, Rainforest Canopy & Rim-Lit Cheering Wira Silhouette!
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = screenFade;
  // Rolling distant Kalimantan hills + rainforest tree crowns along horizonY
  for (let hx = 0; hx < width; hx += 18) {
    const crownH = 10 + ((hx * 37) % 18) + ((hx * 13) % 9);
    R(c, hx, horizonY - crownH, 20, crownH + 6, '#080e17');
    if (skyFlash > 0.02) {
      c.globalAlpha = screenFade * skyFlash * 1.4;
      R(c, hx + 2, horizonY - crownH, 14, 2, '#5a6f8c');
      c.globalAlpha = screenFade;
    }
  }
  // Traditional Kalimantan stilt-house (rumah panggung) gable silhouette on the left
  const roofX = Math.round(width * 0.11);
  R(c, roofX - 24, horizonY - 26, 48, 10, '#070c14');
  R(c, roofX - 18, horizonY - 32, 36, 6, '#070c14');
  R(c, roofX - 6, horizonY - 20, 4, 6, '#e8b968'); // warm lantern window glow!

  // Small rim-lit silhouette of Wira cheering in the center-bottom foreground watching the sky!
  const wx = snap(width * 0.5);
  const wy = horizonY + 4;
  const cheerRaise = reducedMotion ? 1 : (Math.floor(age * 5) % 2);
  R(c, wx - 6, wy - 20, 12, 12, '#070b12'); // torso
  R(c, wx - 5, wy - 28, 10, 8, '#070b12');  // head + kerchief
  R(c, wx + 5, wy - 26, 3, 4, '#c7432d');   // Wira's signature red kerchief tail!
  R(c, wx - 5, wy - 8, 4, 8, '#070b12');    // left leg
  R(c, wx + 1, wy - 8, 4, 8, '#070b12');    // right leg
  // Both arms raised high toward 'SMPN 7 MATARAM' fireworks + golden rim-light on head/shoulders!
  R(c, wx - 10, wy - 26 - cheerRaise * 2, 4, 9, '#070b12');
  R(c, wx + 6, wy - 26 - (1 - cheerRaise) * 2, 4, 9, '#070b12');
  c.globalAlpha = screenFade * (0.45 + skyFlash * 1.5);
  R(c, wx - 5, wy - 29, 10, 2, '#ffd984');
  R(c, wx - 10, wy - 27 - cheerRaise * 2, 3, 2, '#ffd984');
  R(c, wx + 7, wy - 27 - (1 - cheerRaise) * 2, 3, 2, '#ffd984');

  c.restore();
}
