/* In-world pixel-art Emote animations & SMPN 7 Mataram fireworks system (zero canvas allocations). */
import { poly, R, text } from './backgrounds';
import { soundEngine } from '../audio/soundEngine';

export type EmoteId = 'six_seven' | 'smpn7_fireworks' | 'wave' | 'cheer';

export interface ActiveEmote {
  id: EmoteId;
  age: number;
  duration: number;
  originX: number;
  originY: number;
  stageMask: number; // bitmask of already-triggered timed audio/burst stages
}

const snap = (v: number) => Math.round(v / 2) * 2;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export const EMOTE_DURATIONS: Record<EmoteId, number> = {
  six_seven: 2.7,
  smpn7_fireworks: 4.4,
  wave: 2.1,
  cheer: 2.3,
};

interface RocketSpec {
  dx: number;
  peakH: number;
  tLaunch: number;
  flight: number;
  cMain: string;
  cCore: string;
  cSub: string;
  pitch: number;
}

const SMPN7_ROCKETS: RocketSpec[] = [
  { dx: -62, peakH: 124, tLaunch: 0.02, flight: 0.38, cMain: '#ffe066', cCore: '#ffffff', cSub: '#ff8a5c', pitch: 1.00 },
  { dx:  64, peakH: 132, tLaunch: 0.34, flight: 0.40, cMain: '#5ed8ff', cCore: '#fff9d6', cSub: '#5ef59b', pitch: 1.12 },
  { dx:   0, peakH: 152, tLaunch: 0.68, flight: 0.42, cMain: '#ff6b9d', cCore: '#ffffff', cSub: '#ffe066', pitch: 0.94 },
  { dx: -94, peakH: 118, tLaunch: 1.08, flight: 0.38, cMain: '#5ef59b', cCore: '#fff9d6', cSub: '#5ed8ff', pitch: 1.18 },
  { dx:  94, peakH: 128, tLaunch: 1.44, flight: 0.40, cMain: '#ffe066', cCore: '#ffffff', cSub: '#c084fc', pitch: 1.05 },
];

export function createActiveEmote(id: EmoteId, x: number, y: number): ActiveEmote {
  if (id === 'six_seven') soundEngine.playEmote67();
  else if (id === 'wave') soundEngine.playEmoteCheer(true);
  else if (id === 'cheer') soundEngine.playEmoteCheer(false);
  return {
    id,
    age: 0,
    duration: EMOTE_DURATIONS[id],
    originX: x,
    originY: y,
    stageMask: 0,
  };
}

/** Advances active emote timer & triggers staggered firework rocket launches / bursts. */
export function stepActiveEmote(emote: ActiveEmote | null, dt: number): ActiveEmote | null {
  if (!emote) return null;
  emote.age += dt;
  if (emote.id === 'smpn7_fireworks') {
    SMPN7_ROCKETS.forEach((rk, idx) => {
      const launchBit = 1 << (idx * 2);
      const burstBit = 1 << (idx * 2 + 1);
      if (emote.age >= rk.tLaunch && !(emote.stageMask & launchBit)) {
        emote.stageMask |= launchBit;
        soundEngine.playFireworkLaunch();
      }
      if (emote.age >= rk.tLaunch + rk.flight && !(emote.stageMask & burstBit)) {
        emote.stageMask |= burstBit;
        soundEngine.playFireworkBurst(rk.pitch);
      }
    });
  }
  return emote.age < emote.duration ? emote : null;
}

/** Vertical hop offset (negative = up in the air) applied to Wira during active emotes. */
export function emoteHopOffset(emote: ActiveEmote | null, reducedMotion: boolean): number {
  if (!emote || reducedMotion) return 0;
  if (emote.id === 'six_seven') {
    return -Math.abs(Math.round(Math.sin(emote.age * 9.5) * 3));
  }
  if (emote.id === 'smpn7_fireworks') {
    const hop = Math.max(0, Math.sin(emote.age * 7.2));
    return -Math.round(hop * 6);
  }
  if (emote.id === 'cheer') {
    const hop = Math.abs(Math.sin(emote.age * 6.8));
    return -Math.round(hop * 8);
  }
  return 0;
}

/** Pixel-art '6' and '7' block glyph renderer (scale = 2px per cell, crisp arcade proportions). */
const GLYPH_6 = [
  ' 1111 ',
  '11    ',
  '11111 ',
  '11  11',
  '11  11',
  ' 1111 ',
];
const GLYPH_7 = [
  '111111',
  '    11',
  '   11 ',
  '  11  ',
  '  11  ',
  '  11  ',
];
const GLYPH_BANG = [
  '11',
  '11',
  '11',
  '11',
  '  ',
  '11',
];

function drawPixelGlyph(
  c: CanvasRenderingContext2D,
  rows: string[],
  x: number,
  y: number,
  px: number,
  fill: string,
  hi: string,
) {
  // Crisp dark outline pass
  c.fillStyle = '#18121e';
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let col = 0; col < row.length; col++) {
      if (row[col] !== '1') continue;
      c.fillRect(x + col * px - px, y + r * px, px * 3, px);
      c.fillRect(x + col * px, y + r * px - px, px, px * 3);
    }
  }
  // Main fill + top-row specular highlight
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let col = 0; col < row.length; col++) {
      if (row[col] !== '1') continue;
      c.fillStyle = r === 0 ? hi : fill;
      c.fillRect(x + col * px, y + r * px, px, px);
    }
  }
}

function drawStarSpark(c: CanvasRenderingContext2D, x: number, y: number, arm: number, col: string) {
  const sx = snap(x), sy = snap(y);
  R(c, sx, sy, 2, 2, '#ffffff');
  if (arm >= 2) {
    R(c, sx - arm, sy, arm, 2, col);
    R(c, sx + 2, sy, arm, 2, col);
    R(c, sx, sy - arm, 2, arm, col);
    R(c, sx, sy + 2, 2, arm, col);
  }
}

/** Ground-level rings / glow drawn underneath characters during an emote. */
export function drawEmoteGround(
  c: CanvasRenderingContext2D,
  emote: ActiveEmote | null,
  px: number,
  py: number,
  reducedMotion: boolean,
) {
  if (!emote) return;
  const k = clamp01(emote.age / emote.duration);

  if (emote.id === 'six_seven') {
    // Pulsing arcade gold & cyan seesaw shockwave rings around Wira's feet!
    for (let i = 0; i < 2; i++) {
      const ph = (emote.age * 1.6 + i * 0.5) % 1;
      if (reducedMotion && i > 0) break;
      const rx = 14 + ph * 26;
      const ry = rx * 0.42;
      c.globalAlpha = (1 - ph) * 0.55 * (1 - k * 0.5);
      const col = i === 0 ? '#ffbe3b' : '#5ef5d8';
      for (let s = 0; s < 16; s++) {
        const a = (s / 16) * Math.PI * 2;
        R(c, snap(px + Math.cos(a) * rx), snap(py + Math.sin(a) * ry), 2, 2, col);
      }
    }
    c.globalAlpha = 1;
  } else if (emote.id === 'smpn7_fireworks' || emote.id === 'cheer') {
    const pulse = 0.22 * (1 - k * 0.7);
    c.globalAlpha = pulse;
    R(c, snap(px - 22), snap(py - 4), 44, 10, emote.id === 'smpn7_fireworks' ? '#ffe066' : '#6ef2a8');
    c.globalAlpha = 1;
  }
}

/** Overhead & sky-level pixel-art emote effects drawn above characters and trees! */
export function drawEmoteOverlay(
  c: CanvasRenderingContext2D,
  emote: ActiveEmote | null,
  px: number,
  py: number,
  hopY: number,
  reducedMotion: boolean,
) {
  if (!emote) return;
  const age = emote.age;
  const k = clamp01(age / emote.duration);
  const fade = k < 0.08 ? k / 0.08 : k > 0.86 ? (1 - k) / 0.14 : 1;

  if (emote.id === 'six_seven') {
    // 1) Alternating "6-7" seesaw weighing hands right beside Wira's shoulders!
    const seesaw = reducedMotion ? 0 : Math.sin(age * 11.5);
    const leftHandY = snap(py - 28 + hopY + seesaw * 6);
    const rightHandY = snap(py - 28 + hopY - seesaw * 6);
    c.globalAlpha = fade;
    // Left palm (gold aura + pixel hand)
    R(c, snap(px - 22), leftHandY - 1, 8, 6, '#22150d');
    R(c, snap(px - 21), leftHandY, 6, 4, '#f2c18d');
    R(c, snap(px - 21), leftHandY - 3, 6, 2, '#ffbe3b');
    // Right palm (cyan aura + pixel hand)
    R(c, snap(px + 14), rightHandY - 1, 8, 6, '#22150d');
    R(c, snap(px + 15), rightHandY, 6, 4, '#f2c18d');
    R(c, snap(px + 15), rightHandY - 3, 6, 2, '#5ef5d8');

    // 2) Overhead Pixel Emote Badge with Seesaw-Bobbing '6' and '7' + '!'
    const popScale = age < 0.16 ? 0.5 + 0.5 * Math.sin((age / 0.16) * (Math.PI / 2)) : 1;
    const bx = snap(px);
    const by = snap(py - 78 - (1 - popScale) * 10);

    // Ornate pixel speech plaque
    R(c, bx - 30, by - 16, 60, 28, '#161b24');
    R(c, bx - 28, by - 14, 56, 24, '#26333f');
    R(c, bx - 28, by - 14, 56, 2, '#ffcf5c'); // gold top trim
    R(c, bx - 28, by + 8, 56, 2, '#4bc9b8');  // cyan bottom trim
    // Speech pointer tail
    R(c, bx - 4, by + 12, 8, 4, '#161b24');
    R(c, bx - 2, by + 10, 4, 4, '#26333f');

    const bob6 = reducedMotion ? -2 : Math.round(seesaw * 3);
    const bob7 = reducedMotion ? 2 : Math.round(-seesaw * 3);
    drawPixelGlyph(c, GLYPH_6, bx - 22, by - 9 + bob6, 2, '#ffbe3b', '#fff4b8');
    drawPixelGlyph(c, GLYPH_7, bx - 4, by - 9 + bob7, 2, '#5ef5d8', '#e6fffb');
    drawPixelGlyph(c, GLYPH_BANG, bx + 14, by - 9 + Math.round(Math.abs(seesaw) * -2), 2, '#ff6b7a', '#ffd6dc');

    // Orbiting hype sparkles
    if (!reducedMotion) {
      for (let i = 0; i < 4; i++) {
        const spA = age * 4.2 + i * (Math.PI / 2);
        const sx = bx + Math.cos(spA) * 38;
        const sy = by - 2 + Math.sin(spA * 2) * 12;
        const arm = ((Math.floor(age * 10 + i) % 3) + 1) * 2;
        drawStarSpark(c, sx, sy, arm, i % 2 === 0 ? '#ffcf5c' : '#5ef5d8');
      }
    }
    c.globalAlpha = 1;
    return;
  }

  if (emote.id === 'smpn7_fireworks') {
    const cx = px;
    const baseY = Math.max(210, py); // keep bursts comfortably visible inside house & village!

    // 1) Launch 5 staggered rockets & render chrysanthemum + willow pixel firework bursts!
    SMPN7_ROCKETS.forEach((rk, idx) => {
      if (age < rk.tLaunch) return;
      const rx0 = cx + rk.dx * 0.35;
      const rx1 = cx + rk.dx;
      const ry0 = py - 14;
      const ry1 = baseY - rk.peakH;
      const tRel = age - rk.tLaunch;

      if (tRel < rk.flight) {
        // Ascending rocket + sparkling fuse trail!
        const u = clamp01(tRel / rk.flight);
        const ease = 1 - (1 - u) * (1 - u);
        const curX = rx0 + (rx1 - rx0) * u;
        const curY = ry0 + (ry1 - ry0) * ease;
        c.globalAlpha = 0.95;
        R(c, snap(curX) - 2, snap(curY) - 4, 4, 6, rk.cMain);
        R(c, snap(curX) - 1, snap(curY) - 6, 2, 3, '#ffffff');
        if (!reducedMotion) {
          for (let s = 1; s <= 5; s++) {
            const su = Math.max(0, u - s * 0.055);
            const sx = rx0 + (rx1 - rx0) * su + Math.sin(age * 28 + s + idx) * 2;
            const sy = ry0 + (ry1 - ry0) * (1 - (1 - su) * (1 - su));
            c.globalAlpha = (1 - s / 6) * 0.8;
            R(c, snap(sx), snap(sy), 2, 2, s % 2 ? '#ffcf5c' : '#f2ede2');
          }
        }
        c.globalAlpha = 1;
      } else {
        // Detonated Chrysanthemum + Golden Willow Starburst!
        const bAge = tRel - rk.flight;
        const bLife = 1.65;
        if (bAge > bLife) return;
        const bu = clamp01(bAge / bLife);
        const expand = 1 - Math.pow(1 - bu, 2.6);
        const gravity = bu * bu * 28;
        const radius = (reducedMotion ? 34 : 54) * expand;
        const alpha = (1 - bu) * fade;

        // Initial flash halo at burst center
        if (bAge < 0.16) {
          c.globalAlpha = (1 - bAge / 0.16) * 0.7;
          R(c, snap(rx1 - 12), snap(ry1 - 12), 24, 24, '#fffbe6');
        }

        // Outer 14-ray chrysanthemum star ring + glowing ember trails
        const rays = reducedMotion ? 8 : 14;
        for (let r = 0; r < rays; r++) {
          const ang = (r / rays) * Math.PI * 2 + idx * 0.4;
          const sx = rx1 + Math.cos(ang) * radius;
          const sy = ry1 + Math.sin(ang) * radius * 0.86 + gravity;

          // Trailing willow tail dots
          if (!reducedMotion && bu < 0.85) {
            const tx1 = rx1 + Math.cos(ang) * (radius * 0.76);
            const ty1 = ry1 + Math.sin(ang) * (radius * 0.76) * 0.86 + gravity * 0.65;
            c.globalAlpha = alpha * 0.48;
            R(c, snap(tx1), snap(ty1), 2, 2, rk.cSub);
          }

          c.globalAlpha = alpha;
          const col = r % 2 === 0 ? rk.cMain : rk.cSub;
          R(c, snap(sx) - 1, snap(sy) - 1, 4, 4, col);
          if (bu < 0.55) R(c, snap(sx), snap(sy), 2, 2, rk.cCore);
        }

        // Inner 7-star secondary crackle ring
        const innerR = radius * 0.52;
        for (let r = 0; r < 7; r++) {
          const ang = (r / 7) * Math.PI * 2 - idx * 0.3;
          const ix = rx1 + Math.cos(ang) * innerR;
          const iy = ry1 + Math.sin(ang) * innerR * 0.86 + gravity * 0.5;
          const twinkle = reducedMotion || Math.sin(age * 26 + r * 2.1 + idx) > -0.2;
          if (twinkle) {
            c.globalAlpha = alpha * 0.9;
            R(c, snap(ix), snap(iy), 2, 2, '#fff9d6');
          }
        }
        c.globalAlpha = 1;
      }
    });

    // 2) Celebratory "★ SMPN 7 MATARAM ★" Illuminated Pixel Sky Crest Banner!
    if (age > 0.36) {
      const bIn = clamp01((age - 0.36) / 0.24);
      const bx = snap(cx);
      const by = snap(baseY - 94 - (1 - bIn) * 8);
      const bw = 166, bh = 28;
      c.globalAlpha = bIn * fade;

      // Royal navy-and-gold celebratory banner with festive side ribbons
      poly(c, [[bx - bw / 2 - 8, by + 4], [bx - bw / 2, by - 4], [bx - bw / 2, by + 12]], '#c93b4b');
      poly(c, [[bx + bw / 2 + 8, by + 4], [bx + bw / 2, by - 4], [bx + bw / 2, by + 12]], '#c93b4b');
      R(c, bx - bw / 2 - 2, by - bh / 2 - 2, bw + 4, bh + 4, '#121826');
      R(c, bx - bw / 2, by - bh / 2, bw, bh, '#1d2d47');
      // Gold & sky-cyan school pride trim
      R(c, bx - bw / 2, by - bh / 2, bw, 2, '#ffe066');
      R(c, bx - bw / 2, by + bh / 2 - 2, bw, 2, '#5ed8ff');
      R(c, bx - bw / 2 + 2, by - bh / 2 + 2, 4, 4, '#ffe066');
      R(c, bx + bw / 2 - 6, by - bh / 2 + 2, 4, 4, '#ffe066');

      // Mini golden crest shield with '7' perched on top of the banner!
      R(c, bx - 9, by - bh / 2 - 13, 18, 13, '#121826');
      R(c, bx - 7, by - bh / 2 - 11, 14, 10, '#2c5680');
      R(c, bx - 7, by - bh / 2 - 11, 14, 2, '#ffe066');
      R(c, bx - 3, by - bh / 2 - 8, 6, 1, '#fff9d6');
      R(c, bx + 1, by - bh / 2 - 7, 2, 2, '#fff9d6');
      R(c, bx - 1, by - bh / 2 - 5, 2, 3, '#fff9d6');

      // Crisp pixel-font title inside the illuminated sky banner
      text(c, 'SMPN 7 MATARAM', bx, by + 1, '#fff5c2', 8);

      // Flanking twinkling firework stars
      const pulseArm = (!reducedMotion && Math.floor(age * 8) % 2 === 0) ? 4 : 2;
      drawStarSpark(c, bx - bw / 2 - 12, by - 4, pulseArm, '#ffe066');
      drawStarSpark(c, bx + bw / 2 + 10, by - 4, pulseArm, '#5ef59b');
      c.globalAlpha = 1;
    }
    return;
  }

  // 'wave' (Salam Rimba!) & 'cheer' (Semangat!) overhead pixel badges + sparkles
  const bx = snap(px);
  const by = snap(py - 74 + hopY * 0.4);
  c.globalAlpha = fade;
  R(c, bx - 18, by - 14, 36, 24, '#16201a');
  R(c, bx - 16, by - 12, 32, 20, '#283d2e');
  R(c, bx - 16, by - 12, 32, 2, '#e8cf8c');
  R(c, bx - 3, by + 8, 6, 4, '#16201a');

  if (emote.id === 'wave') {
    // Pixel waving palm + Kalimantan emerald leaf inside speech bubble
    const tilt = reducedMotion ? 0 : Math.round(Math.sin(age * 12) * 2);
    R(c, bx - 8 + tilt, by - 6, 8, 9, '#f0be8a');
    R(c, bx - 8 + tilt, by - 9, 2, 4, '#f0be8a');
    R(c, bx - 5 + tilt, by - 10, 2, 5, '#f0be8a');
    R(c, bx - 2 + tilt, by - 9, 2, 4, '#f0be8a');
    // Emerald leaf beside hand
    R(c, bx + 4, by - 5, 6, 6, '#58b868');
    R(c, bx + 6, by - 7, 4, 4, '#8ce08a');
  } else {
    // 'cheer': Pixel water-droplet + golden victory star!
    drawStarSpark(c, bx - 5, by - 3, 4, '#ffe066');
    R(c, bx + 5, by - 6, 6, 8, '#62d4e8');
    R(c, bx + 7, by - 9, 2, 4, '#bdf5ff');
    if (!reducedMotion) {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + age * 3.2;
        const r = 18 + ((age * 24 + i * 7) % 16);
        R(c, snap(px + Math.cos(a) * r), snap(py - 28 + Math.sin(a) * r * 0.6), 2, 2, i % 2 ? '#6ef2a8' : '#ffe066');
      }
    }
  }
  c.globalAlpha = 1;
}
