/* In-world Kalimantan character emotes & 'SMPN 7 MATARAM' sky-writing fireworks right above Wira (zero canvas allocations). */
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
  smpn7_fireworks: 4.8,
  wave: 2.0,
  cheer: 2.2,
};

/* Crisp 5x7 dot-matrix glyphs so the fireworks themselves spell 'SMPN 7' & 'MATARAM' right above Wira! */
const FONT_5X7: Record<string, string[]> = {
  S: [' 1111', '1    ', '1    ', ' 111 ', '    1', '    1', '1111 '],
  M: ['1   1', '11 11', '1 1 1', '1 1 1', '1   1', '1   1', '1   1'],
  P: ['1111 ', '1   1', '1   1', '1111 ', '1    ', '1    ', '1    '],
  N: ['1   1', '11  1', '1 1 1', '1  11', '1   1', '1   1', '1   1'],
  '7': ['11111', '    1', '   1 ', '  1  ', '  1  ', ' 1   ', ' 1   '],
  A: [' 111 ', '1   1', '1   1', '11111', '1   1', '1   1', '1   1'],
  T: ['11111', '  1  ', '  1  ', '  1  ', '  1  ', '  1  ', '  1  '],
  R: ['1111 ', '1   1', '1   1', '1111 ', '1 1  ', '1  1 ', '1   1'],
  ' ': ['   ', '   ', '   ', '   ', '   ', '   ', '   '],
};

interface WorldTextStar {
  dx: number;
  dy: number;
  row: 0 | 1;
  zone: 0 | 1 | 2;
  seed: number;
  jx: number;
  jy: number;
}

function buildWorldRow(word: string, row: 0 | 1, spanW: number, baseY: number, rowH: number, out: WorldTextStar[]) {
  const glyphs = Array.from(word).map(ch => FONT_5X7[ch] ?? FONT_5X7[' ']);
  const cols = glyphs.reduce((a, g, i) => a + g[0].length + (i < glyphs.length - 1 ? 2 : 0), 0);
  let cur = 0;
  let rng = row * 131 + 17;
  for (const g of glyphs) {
    const gw = g[0].length;
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < gw; c++) {
        if (g[r][c] !== '1') continue;
        rng = (rng * 1664525 + 1013904223) >>> 0;
        const s1 = (rng & 0xffff) / 0xffff;
        const s2 = ((rng >>> 16) & 0xffff) / 0xffff;
        const ux = (cur + c) / Math.max(1, cols - 1) - 0.5;
        const uy = r / 6 - 0.5;
        const zone: 0 | 1 | 2 = ux < -0.17 ? 0 : ux > 0.17 ? 2 : 1;
        out.push({
          dx: ux * spanW,
          dy: baseY + uy * rowH,
          row,
          zone,
          seed: s1,
          jx: (s1 - 0.5) * 12,
          jy: (s2 - 0.5) * 12,
        });
      }
    }
    cur += gw + 2;
  }
}

export const WORLD_SMPN7_STARS: readonly WorldTextStar[] = (() => {
  const arr: WorldTextStar[] = [];
  // Compact, super-crisp world-space firework constellation right above Wira!
  buildWorldRow('SMPN 7', 0, 176, -152, 22, arr);
  buildWorldRow('MATARAM', 1, 224, -118, 22, arr);
  return arr;
})();

interface WorldShell {
  dx: number;
  peakH: number;
  tLaunch: number;
  flight: number;
  cMain: string;
  cSub: string;
  cCore: string;
  pitch: number;
  kind: 'peony' | 'text' | 'crown';
  maxR: number;
}

const WORLD_SHELLS: WorldShell[] = [
  // Opening flanking chrysanthemum bursts in-world around Wira
  { dx: -82, peakH: 136, tLaunch: 0.08, flight: 0.42, cMain: '#ffd66b', cSub: '#ff884d', cCore: '#ffffff', pitch: 1.02, kind: 'peony', maxR: 52 },
  { dx:  84, peakH: 142, tLaunch: 0.28, flight: 0.44, cMain: '#6ef2b8', cSub: '#5ed4ff', cCore: '#ffffff', pitch: 1.12, kind: 'peony', maxR: 52 },
  // 3 Sky-writing shells launching out of the bamboo mortar to form 'SMPN 7' / 'MATARAM' right above Wira!
  { dx: -62, peakH: 136, tLaunch: 0.58, flight: 0.44, cMain: '#ffe07d', cSub: '#7ce8ff', cCore: '#ffffff', pitch: 0.96, kind: 'text', maxR: 34 },
  { dx:   0, peakH: 140, tLaunch: 0.66, flight: 0.44, cMain: '#fff0a6', cSub: '#6ef2b8', cCore: '#ffffff', pitch: 1.05, kind: 'text', maxR: 36 },
  { dx:  62, peakH: 136, tLaunch: 0.74, flight: 0.44, cMain: '#ffe07d', cSub: '#ff8e6e', cCore: '#ffffff', pitch: 1.00, kind: 'text', maxR: 34 },
  // Finale crown bursts framing the glowing firework text
  { dx: -96, peakH: 166, tLaunch: 1.85, flight: 0.44, cMain: '#ff7a90', cSub: '#ffd66b', cCore: '#ffffff', pitch: 1.15, kind: 'crown', maxR: 54 },
  { dx:  96, peakH: 166, tLaunch: 2.16, flight: 0.44, cMain: '#7ce8ff', cSub: '#ffd66b', cCore: '#ffffff', pitch: 0.92, kind: 'crown', maxR: 54 },
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
    WORLD_SHELLS.forEach((sh, idx) => {
      const launchBit = 1 << (idx * 2);
      const burstBit = 1 << (idx * 2 + 1);
      if (emote.age >= sh.tLaunch && !(emote.stageMask & launchBit)) {
        emote.stageMask |= launchBit;
        soundEngine.playFireworkLaunch(sh.pitch);
      }
      if (emote.age >= sh.tLaunch + sh.flight && !(emote.stageMask & burstBit)) {
        emote.stageMask |= burstBit;
        if (idx === 2) soundEngine.playFireworkTextFinale();
        else if (sh.kind !== 'text') soundEngine.playFireworkBurst(sh.pitch);
      }
    });
  }
  return emote.age < emote.duration ? emote : null;
}

export function emoteHopOffset(_emote: ActiveEmote | null, _reducedMotion: boolean): number {
  return 0;
}

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

/** Ground-level details right around Wira: boot dust puffs, grounded bamboo mortar & warm ground flash! */
export function drawEmoteGround(
  c: CanvasRenderingContext2D,
  emote: ActiveEmote | null,
  px: number,
  py: number,
  reducedMotion: boolean,
) {
  if (!emote) return;
  const age = emote.age;
  const k = clamp01(age / emote.duration);
  const fade = k > 0.86 ? (1 - k) / 0.14 : 1;

  if (emote.id === 'six_seven' || emote.id === 'cheer') {
    if (!reducedMotion) {
      const beat = (age * (emote.id === 'six_seven' ? 3.5 : 3.0)) % 1;
      if (beat < 0.45) {
        const u = beat / 0.45;
        c.globalAlpha = (1 - u) * 0.34 * fade;
        R(c, snap(px - 14 - u * 8), snap(py - 2 - u * 2), 4, 2, '#cbbda0');
        R(c, snap(px + 10 + u * 8), snap(py - 2 - u * 2), 4, 2, '#cbbda0');
        c.globalAlpha = 1;
      }
    }
    return;
  }

  if (emote.id === 'smpn7_fireworks') {
    const mx = snap(emote.originX - 24);
    const my = snap(emote.originY - 2);

    // Warm golden ground illumination around Wira as shells burst overhead!
    let flash = 0;
    for (const sh of WORLD_SHELLS) {
      const bAge = age - (sh.tLaunch + sh.flight);
      if (bAge >= 0 && bAge < 0.45) flash = Math.max(flash, (1 - bAge / 0.45) * 0.24);
    }
    if (age > 1.1 && age < 3.8) flash = Math.max(flash, 0.10);
    if (flash > 0.01) {
      c.globalAlpha = flash * fade;
      R(c, snap(emote.originX - 58), snap(emote.originY - 14), 116, 26, '#ffd97d');
      c.globalAlpha = 1;
    }

    // Grounded Kalimantan Bamboo Mortar ('mercon bambu') right beside Wira
    c.globalAlpha = fade;
    R(c, mx - 6, my - 1, 14, 4, 'rgba(20,24,18,0.28)');
    R(c, mx - 5, my - 16, 10, 17, '#1b1612');
    R(c, mx - 3, my - 14, 6, 14, '#7d6b3d');
    R(c, mx - 3, my - 14, 2, 14, '#a69055');
    R(c, mx - 4, my - 11, 8, 2, '#c7432d');
    R(c, mx - 4, my - 5, 8, 2, '#d9b45c');
    R(c, mx - 3, my - 15, 6, 2, '#2b2118');

    if (age < 2.2 && !reducedMotion) {
      const sx = mx + ((Math.floor(age * 24) % 3) - 1) * 2;
      R(c, sx, my - 18, 2, 2, '#fff4b8');
      R(c, sx - 2, my - 20, 2, 2, '#e38842');
    }
    c.globalAlpha = 1;
  }
}

/** In-world overhead effects: rockets launch right from Wira's bamboo mortar & explode into 'SMPN 7 MATARAM' in the same scene! */
export function drawEmoteOverlay(
  c: CanvasRenderingContext2D,
  emote: ActiveEmote | null,
  px: number,
  py: number,
  _hopY: number,
  reducedMotion: boolean,
) {
  if (!emote) return;
  const age = emote.age;
  const k = clamp01(age / emote.duration);
  const fade = k < 0.06 ? k / 0.06 : k > 0.86 ? (1 - k) / 0.14 : 1;

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

  if (emote.id === 'smpn7_fireworks') {
    // Anchor right above Wira in the SAME world scene (clamped gently only near top map boundary so text never clips off-map)
    const cx = emote.originX;
    const baseY = Math.max(205, emote.originY);
    const mx = emote.originX - 24;
    const my = emote.originY - 17;

    // Subtle soft dark smoke/contrast haze right behind the sky-written fireworks so the bright sparks pop on any background!
    if (age > 0.95) {
      const hazeIn = clamp01((age - 0.95) / 0.30);
      c.globalAlpha = hazeIn * fade * 0.42;
      R(c, snap(cx - 126), snap(baseY - 174), 252, 82, '#0d1520');
      R(c, snap(cx - 118), snap(baseY - 178), 236, 90, '#0d1520');
      c.globalAlpha = 1;
    }

    // Muzzle smoke puffs from the bamboo mortar
    if (!reducedMotion) {
      for (const sh of WORLD_SHELLS) {
        const tRel = age - sh.tLaunch;
        if (tRel >= 0 && tRel < 0.32) {
          const su = tRel / 0.32;
          c.globalAlpha = (1 - su) * 0.45 * fade;
          R(c, snap(mx - 4 - su * 6), snap(my - 4 - su * 10), 6, 4, '#cfc6b4');
          R(c, snap(mx + 2 + su * 5), snap(my - 6 - su * 12), 4, 4, '#dfd8c8');
        }
      }
      c.globalAlpha = 1;
    }

    c.save();
    c.globalCompositeOperation = 'lighter';

    // 1) Rockets launching from Wira's bamboo mortar + glowing willow/chrysanthemum bursts right in the scene!
    WORLD_SHELLS.forEach((sh, idx) => {
      if (age < sh.tLaunch) return;
      const tRel = age - sh.tLaunch;
      const bx = cx + sh.dx;
      const by = baseY - sh.peakH;

      if (tRel < sh.flight) {
        const u = clamp01(tRel / sh.flight);
        const easeY = 1 - Math.pow(1 - u, 2.1);
        const curX = mx + (bx - mx) * u;
        const curY = my + (by - my) * easeY;

        c.globalAlpha = 0.95 * fade;
        R(c, snap(curX) - 1, snap(curY) - 3, 4, 5, sh.cMain);
        R(c, snap(curX), snap(curY) - 3, 2, 3, '#ffffff');
        if (!reducedMotion) {
          for (let s = 1; s <= 7; s++) {
            const su = Math.max(0, u - s * 0.04);
            const sx = mx + (bx - mx) * su + Math.sin(age * 32 + s + idx) * 1.5;
            const sy = my + (by - my) * (1 - Math.pow(1 - su, 2.1));
            c.globalAlpha = (1 - s / 8) * 0.72 * fade;
            R(c, snap(sx), snap(sy), 2, 2, s < 4 ? '#ffe49c' : '#d97538');
          }
        }
      } else {
        const bAge = tRel - sh.flight;
        const bLife = sh.kind === 'text' ? 0.85 : 1.75;
        if (bAge > bLife) return;
        const bu = clamp01(bAge / bLife);
        const expand = 1 - Math.pow(1 - bu, 3.0);
        const grav = bu * bu * 30;
        const maxR = reducedMotion ? sh.maxR * 0.65 : sh.maxR;
        const alpha = (1 - bu * bu) * fade;

        if (bAge < 0.10) {
          c.globalAlpha = (1 - bAge / 0.10) * 0.8 * fade;
          R(c, snap(bx - 12), snap(by - 12), 24, 24, '#fffef2');
        }

        const rays = reducedMotion ? 8 : (sh.kind === 'text' ? 12 : 16);
        for (let r = 0; r < rays; r++) {
          const ang = (r / rays) * Math.PI * 2 + idx * 0.42;
          const tier = (r % 2 === 0 ? 1.0 : 0.70) * maxR * expand;
          const sx = bx + Math.cos(ang) * tier;
          const sy = by + Math.sin(ang) * tier * 0.86 + grav * (r % 2 === 0 ? 1 : 0.72);

          if (!reducedMotion && sh.kind !== 'text' && bu > 0.12 && bu < 0.88) {
            const tx = bx + Math.cos(ang) * (tier * 0.82);
            const ty = by + Math.sin(ang) * (tier * 0.82) * 0.86 + grav * 0.66;
            c.globalAlpha = alpha * 0.42;
            R(c, snap(tx), snap(ty), 2, 2, sh.cSub);
          }

          const twinkle = reducedMotion || bu < 0.55 || ((Math.floor(age * 24) + r + idx) % 3 !== 0);
          if (twinkle) {
            c.globalAlpha = alpha * 0.42;
            R(c, snap(sx) - 2, snap(sy) - 2, 6, 6, r % 2 === 0 ? sh.cMain : sh.cSub);
            c.globalAlpha = alpha;
            R(c, snap(sx), snap(sy), 2, 2, bu < 0.35 ? sh.cCore : sh.cMain);
          }
        }
      }
    });

    // 2) Firework Stars Exploding Out of Shells 2, 3, 4 to Spell 'SMPN 7' & 'MATARAM' Right Above Wira!
    const origins = [
      { x: cx + WORLD_SHELLS[2].dx, y: baseY - WORLD_SHELLS[2].peakH, tBurst: WORLD_SHELLS[2].tLaunch + WORLD_SHELLS[2].flight },
      { x: cx + WORLD_SHELLS[3].dx, y: baseY - WORLD_SHELLS[3].peakH, tBurst: WORLD_SHELLS[3].tLaunch + WORLD_SHELLS[3].flight },
      { x: cx + WORLD_SHELLS[4].dx, y: baseY - WORLD_SHELLS[4].peakH, tBurst: WORLD_SHELLS[4].tLaunch + WORLD_SHELLS[4].flight },
    ];

    for (let i = 0; i < WORLD_SMPN7_STARS.length; i++) {
      const st = WORLD_SMPN7_STARS[i];
      const orig = origins[st.zone];
      const sAge = age - orig.tBurst;
      if (sAge < 0) continue;
      const life = 3.45;
      if (sAge > life) continue;

      const tx = cx + st.dx;
      const ty = baseY + st.dy;

      const bloom = sAge < 0.28 ? 1 - Math.pow(1 - sAge / 0.28, 3.2) : 1;
      const droop = sAge > 2.25 ? Math.pow((sAge - 2.25) / 1.20, 2.1) * (16 + st.seed * 14) : 0;
      const driftX = reducedMotion ? 0 : Math.max(0, sAge - 0.28) * (1.8 + (st.seed - 0.5) * 2.4);
      const sx = orig.x + st.jx * (1 - bloom) + (tx - orig.x) * bloom + driftX;
      const sy = orig.y + st.jy * (1 - bloom) + (ty - orig.y) * bloom + droop;

      const burnFade = sAge > 2.45 ? Math.max(0, 1 - (sAge - 2.45) / 1.0) : 1;
      const strobe = reducedMotion ? 0.95 : 0.76 + 0.24 * Math.sin(age * (18 + st.seed * 12) + i * 1.9);
      const alpha = fade * burnFade * strobe;
      if (alpha <= 0.02) continue;

      const cooling = sAge > 2.35;
      const halo = cooling
        ? (sAge > 2.9 ? '#c9432c' : '#f28b3d')
        : st.row === 0
          ? (st.seed > 0.5 ? '#ffd863' : '#ffae4c')
          : (st.seed > 0.45 ? '#6ae6ff' : '#6ef5b8');

      c.globalAlpha = alpha * 0.38;
      R(c, Math.round(sx) - 2, Math.round(sy) - 2, 6, 6, halo);
      c.globalAlpha = Math.min(1, alpha * 1.05);
      R(c, Math.round(sx), Math.round(sy), 3, 3, halo);
      if (!cooling) {
        c.fillStyle = '#ffffff';
        c.fillRect(Math.round(sx) + 1, Math.round(sy) + 1, 1, 1);
      }

      if (!reducedMotion && sAge > 0.30 && sAge < 2.6 && ((Math.floor(age * 16 + i * 7) % 31) === 0)) {
        const cAng = st.seed * Math.PI * 2 + age * 5;
        c.globalAlpha = alpha * 0.85;
        R(c, snap(sx + Math.cos(cAng) * 6), snap(sy + Math.sin(cAng) * 6), 2, 2, '#fffbe0');
      }
    }

    c.restore();
    c.globalAlpha = 1;
    return;
  }

  // 'wave' & 'cheer'
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
