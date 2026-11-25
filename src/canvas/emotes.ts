/* Grounded Kalimantan pixel-art character emotes & bamboo-mortar fireworks (zero canvas allocations). */
import { poly, R, text } from './backgrounds';
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
  smpn7_fireworks: 4.3,
  wave: 2.0,
  cheer: 2.2,
};

interface MortarShell {
  driftX: number;
  peakH: number;
  tLaunch: number;
  flight: number;
  cMain: string;
  cCore: string;
  cTrail: string;
  pitch: number;
}

const MORTAR_SHELLS: MortarShell[] = [
  { driftX: -48, peakH: 132, tLaunch: 0.14, flight: 0.44, cMain: '#f5cf70', cCore: '#fff9df', cTrail: '#d98a44', pitch: 1.00 },
  { driftX:  44, peakH: 140, tLaunch: 0.54, flight: 0.46, cMain: '#84c99b', cCore: '#f2fbf0', cTrail: '#e8c468', pitch: 1.12 },
  { driftX:  -4, peakH: 158, tLaunch: 0.96, flight: 0.48, cMain: '#e36b52', cCore: '#fff6dc', cTrail: '#f5cf70', pitch: 0.94 },
  { driftX: -78, peakH: 124, tLaunch: 1.38, flight: 0.44, cMain: '#92cfd4', cCore: '#f5fcfb', cTrail: '#d98a44', pitch: 1.16 },
  { driftX:  76, peakH: 134, tLaunch: 1.76, flight: 0.46, cMain: '#f5cf70', cCore: '#fff9df', cTrail: '#e36b52', pitch: 1.05 },
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
    MORTAR_SHELLS.forEach((sh, idx) => {
      const launchBit = 1 << (idx * 2);
      const burstBit = 1 << (idx * 2 + 1);
      if (emote.age >= sh.tLaunch && !(emote.stageMask & launchBit)) {
        emote.stageMask |= launchBit;
        soundEngine.playFireworkLaunch();
      }
      if (emote.age >= sh.tLaunch + sh.flight && !(emote.stageMask & burstBit)) {
        emote.stageMask |= burstBit;
        soundEngine.playFireworkBurst(sh.pitch);
      }
    });
  }
  return emote.age < emote.duration ? emote : null;
}

/** Body poses now animate Wira's knees & toes directly in sprites.ts (zero floating rigid bounce). */
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

/** Ground-level details: boot dust puffs, warm firework ground light & grounded bamboo mortar tube! */
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
  const fade = k > 0.85 ? (1 - k) / 0.15 : 1;

  if (emote.id === 'six_seven' || emote.id === 'cheer') {
    if (!reducedMotion) {
      // Subtle grounded dust puffs at Wira's heels on each rhythmic knee beat
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
    // Grounded Kalimantan Bamboo Mortar ('mercon bambu') placed beside Wira at (originX - 24, originY - 2)
    const mx = snap(emote.originX - 24);
    const my = snap(emote.originY - 2);

    // Warm ground illumination when shells detonate overhead
    let flash = 0;
    MORTAR_SHELLS.forEach(sh => {
      const bAge = age - (sh.tLaunch + sh.flight);
      if (bAge >= 0 && bAge < 0.42) flash = Math.max(flash, (1 - bAge / 0.42) * 0.22);
    });
    if (flash > 0.01) {
      c.globalAlpha = flash * fade;
      R(c, snap(px - 44), snap(py - 12), 88, 22, '#f5d27a');
      c.globalAlpha = 1;
    }

    // Mortar shadow + outlined bamboo tube + rattan binding rings
    c.globalAlpha = fade;
    R(c, mx - 6, my - 1, 14, 4, 'rgba(20,24,18,0.28)');
    R(c, mx - 5, my - 16, 10, 17, '#1b1612'); // crisp sprite outline
    R(c, mx - 3, my - 14, 6, 14, '#7d6b3d');  // aged bamboo body
    R(c, mx - 3, my - 14, 2, 14, '#a69055');  // lit bamboo left rim
    R(c, mx - 4, my - 11, 8, 2, '#c7432d');   // red festival cloth band
    R(c, mx - 4, my - 5, 8, 2, '#d9b45c');    // rattan tie band
    R(c, mx - 3, my - 15, 6, 2, '#2b2118');   // charred tube bore

    // Fizzing fuse spark before the final launch
    if (age < 1.85 && !reducedMotion) {
      const sx = mx + ((Math.floor(age * 24) % 3) - 1) * 2;
      R(c, sx, my - 18, 2, 2, '#fff4b8');
      R(c, sx - 2, my - 20, 2, 2, '#e38842');
    }
    c.globalAlpha = 1;
  }
}

/** Character-scale floating palm glyphs & realistic bamboo-mortar pyrotechnics. */
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
  const fade = k < 0.08 ? k / 0.08 : k > 0.84 ? (1 - k) / 0.16 : 1;

  if (emote.id === 'six_seven') {
    // Synced directly with sprites.ts 'juggle67' 7 fps frame cycle:
    // f=0: left palm low, right palm high; f=2: left palm high, right palm low!
    const phase = age * 7 * (Math.PI / 2);
    const lift = reducedMotion ? 0 : Math.cos(phase); // +1 when f=0 (R high, L low), -1 when f=2 (L high, R low)
    const leftY = snap(py - 54 + lift * 5);
    const rightY = snap(py - 54 - lift * 5);

    c.globalAlpha = fade;
    // Small outlined '6' hovering directly over Wira's upturned left palm & '7' over his right palm!
    drawSmallGlyph(c, GLYPH_6, snap(px - 24), leftY, '#eab85c', '#fff2be');
    drawSmallGlyph(c, GLYPH_7, snap(px + 14), rightY, '#da674b', '#ffd8c2');
    if (age > 0.35) {
      drawSmallGlyph(c, GLYPH_BANG, snap(px + 28), rightY - 2, '#f0e2bf', '#ffffff');
    }

    // Subtle warm ember/dust motes rising from each palm on upward toss
    if (!reducedMotion) {
      const mY = snap(py - 60 - ((age * 18) % 10));
      R(c, snap(px - 20), mY, 2, 2, lift < 0 ? '#fff2be' : '#cbb88f');
      R(c, snap(px + 18), mY, 2, 2, lift > 0 ? '#ffd8c2' : '#cbb88f');
    }
    c.globalAlpha = 1;
    return;
  }

  if (emote.id === 'smpn7_fireworks') {
    const mx = emote.originX - 24;
    const my = emote.originY - 17;
    const skyBaseY = Math.max(195, emote.originY);

    MORTAR_SHELLS.forEach((sh, idx) => {
      if (age < sh.tLaunch) return;
      const tRel = age - sh.tLaunch;
      const bx = mx + 24 + sh.driftX;
      const by = skyBaseY - sh.peakH;

      // Warm mortar muzzle smoke puff on launch
      if (tRel < 0.34 && !reducedMotion) {
        const su = tRel / 0.34;
        c.globalAlpha = (1 - su) * 0.45 * fade;
        R(c, snap(mx - 4 - su * 6), snap(my - 4 - su * 10), 6, 4, '#cfc6b4');
        R(c, snap(mx + 2 + su * 5), snap(my - 6 - su * 12), 4, 4, '#dfd8c8');
        c.globalAlpha = 1;
      }

      if (tRel < sh.flight) {
        // Ascending shell arcing from the bamboo mortar mouth with realistic deceleration & ember tail
        const u = clamp01(tRel / sh.flight);
        const easeY = 1 - (1 - u) * (1 - u);
        const curX = mx + (bx - mx) * u;
        const curY = my + (by - my) * easeY;
        c.globalAlpha = 0.95 * fade;
        R(c, snap(curX), snap(curY) - 2, 2, 4, sh.cCore);
        R(c, snap(curX), snap(curY) + 2, 2, 2, sh.cMain);
        if (!reducedMotion) {
          for (let s = 1; s <= 5; s++) {
            const su = Math.max(0, u - s * 0.055);
            const sx = mx + (bx - mx) * su;
            const sy = my + (by - my) * (1 - (1 - su) * (1 - su));
            c.globalAlpha = (1 - s / 6) * 0.65 * fade;
            R(c, snap(sx), snap(sy), 2, 2, s < 3 ? sh.cMain : '#b8834b');
          }
        }
        c.globalAlpha = 1;
      } else {
        // Spherical Kalimantan willow-peony burst with air drag, gravity droop & warm ember cooling
        const bAge = tRel - sh.flight;
        const bLife = 1.6;
        if (bAge > bLife) return;
        const bu = clamp01(bAge / bLife);
        const drag = 1 - Math.pow(1 - bu, 3.0); // rapid burst deceleration in air
        const gravity = bu * bu * 32;           // natural downward willow arc
        const maxR = reducedMotion ? 30 : 48;
        const alpha = (1 - bu * bu) * fade;

        if (bAge < 0.1) {
          c.globalAlpha = (1 - bAge / 0.1) * 0.55;
          R(c, snap(bx - 8), snap(by - 8), 16, 16, sh.cCore);
        }

        const rays = reducedMotion ? 8 : 12;
        for (let r = 0; r < rays; r++) {
          const ang = (r / rays) * Math.PI * 2 + idx * 0.45;
          const tier = (r % 2 === 0 ? 1.0 : 0.72) * maxR * drag;
          const sx = bx + Math.cos(ang) * tier;
          const sy = by + Math.sin(ang) * tier * 0.84 + gravity * (r % 2 === 0 ? 1 : 0.75);

          if (!reducedMotion && bu > 0.12 && bu < 0.88) {
            const prevTier = tier * 0.82;
            const tx = bx + Math.cos(ang) * prevTier;
            const ty = by + Math.sin(ang) * prevTier * 0.84 + gravity * 0.68;
            c.globalAlpha = alpha * 0.42;
            R(c, snap(tx), snap(ty), 2, 2, sh.cTrail);
          }

          const flicker = reducedMotion || bu < 0.62 || ((Math.floor(age * 22) + r + idx) % 3 !== 0);
          if (flicker) {
            c.globalAlpha = alpha;
            const col = bu < 0.22 ? sh.cCore : bu < 0.72 ? sh.cMain : sh.cTrail;
            R(c, snap(sx), snap(sy), 2, 2, col);
          }
        }
        c.globalAlpha = 1;
      }
    });

    // Understated wood-and-brass village plaque matching the game's native 'E' prompt style!
    if (age > 0.32) {
      const bIn = clamp01((age - 0.32) / 0.22);
      const tx = snap(px);
      const ty = snap(py - 92 - (1 - bIn) * 4);
      const bw = 132, bh = 20;
      c.globalAlpha = bIn * fade;
      R(c, tx - bw / 2 - 2, ty - bh / 2 - 2, bw + 4, bh + 4, '#16201a');
      R(c, tx - bw / 2, ty - bh / 2, bw, bh, '#283829');
      R(c, tx - bw / 2, ty - bh / 2, bw, 2, '#e5cf95');
      poly(c, [[tx - 3, ty + bh / 2 + 4], [tx - 3, ty + bh / 2], [tx + 3, ty + bh / 2]], '#16201a');
      text(c, 'SMPN 7 MATARAM', tx, ty + 1, '#f3e3b6', 7);
      c.globalAlpha = 1;
    }
    return;
  }

  // 'wave' & 'cheer': subtle, natural Kalimantan speech-note matching the world's native pixel palette
  c.globalAlpha = fade;
  const bx = snap(px + (emote.id === 'wave' ? 14 : 0));
  const by = snap(py - 88);
  if (emote.id === 'wave') {
    // Gentle acoustic greeting arcs near Wira's waving hand
    const pulse = reducedMotion ? 0 : Math.floor(age * 6) % 2;
    R(c, bx + 4 + pulse * 2, by + 6, 2, 4, '#e5cf95');
    R(c, bx + 6 + pulse * 2, by + 4, 2, 2, '#e5cf95');
    R(c, bx + 8 + pulse * 2, by + 8, 2, 4, '#cbb88f');
  } else if (!reducedMotion) {
    // Rising warm forest-leaf & golden spirit motes around Wira's raised hands
    for (let i = 0; i < 4; i++) {
      const u = ((age * 1.5 + i * 0.25) % 1);
      const sx = px + [-18, 16, -10, 10][i] + Math.sin(age * 5 + i) * 3;
      const sy = py - 48 - u * 26;
      c.globalAlpha = (1 - u) * 0.85 * fade;
      R(c, snap(sx), snap(sy), 2, 2, i % 2 === 0 ? '#e5cf95' : '#8bbf7a');
    }
  }
  c.globalAlpha = 1;
}
