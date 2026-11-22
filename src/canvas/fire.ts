import type { Wind } from './physics';

/*
 * Karhutla fire. The flame body is baked into a short animation atlas so ten
 * simultaneous fires cost one blit each; embers, coals, heat shimmer and the
 * light pool are drawn live so they stay tied to wind and to the fire's level.
 */

const FW = 34, FH = 40, FRAMES = 16;
const atlases = new Map<number, HTMLCanvasElement[]>();
let coalSprite: HTMLCanvasElement | null = null;

const RAMP = ['#8e2a1e', '#c4452b', '#e86a2c', '#f79a38', '#ffc65c', '#ffe49a', '#fff6d8'];

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}

/** Five tongues that merge at the base and split into licks at the top. */
function bakeFrame(frame: number, variant: number) {
  const { c, ctx } = makeCanvas(FW, FH);
  const phase = (frame / FRAMES) * Math.PI * 2;
  const vShift = (variant - 1) * 0.95;
  const tongues = [
    { ox: -9 + (variant === 2 ? 1 : 0), w: 8, h: 0.62 + (variant === 1 ? 0.06 : 0), ph: 0.0 + vShift, sp: 1.0 },
    { ox: -4, w: 10, h: 0.86 - (variant === 2 ? 0.05 : 0), ph: 1.7 + vShift * 1.3, sp: 1.25 },
    { ox: 1 - (variant === 1 ? 1 : 0), w: 12, h: 1.0, ph: 3.1 + vShift * 0.8, sp: 0.85 },
    { ox: 6, w: 9, h: 0.78 + (variant === 2 ? 0.07 : 0), ph: 4.6 + vShift * 1.1, sp: 1.15 },
    { ox: 10 - (variant === 2 ? 1 : 0), w: 7, h: 0.55 + (variant === 0 ? 0.05 : 0), ph: 5.9 + vShift * 1.5, sp: 1.4 },
  ];
  const baseY = FH - 4;
  // paint back tongues first so the tallest reads in front
  for (const tg of tongues) {
    const breathe = 0.86 + Math.sin(phase * tg.sp + tg.ph) * 0.14;
    const height = Math.round((FH - 8) * tg.h * breathe);
    for (let row = 0; row < height; row++) {
      const u = row / height;
      // taper: wide skirt, narrow lick
      const taper = Math.pow(1 - u, 0.62);
      const wobble = Math.sin(phase * 2.1 * tg.sp + tg.ph + u * 5.2) * (0.7 + u * 2.4)
        + Math.sin(phase * 3.7 + tg.ph * 2 + u * 9) * (u * 1.1);
      const halfW = Math.max(0.5, (tg.w / 2) * taper);
      const cx = FW / 2 + tg.ox * (1 - u * 0.55) + wobble;
      const y = baseY - row;
      // heat rises: hottest at base core, cooling at the outer licks
      const heat = 1 - u;
      const outer = Math.max(0, Math.min(RAMP.length - 1, Math.round((1 - heat) * 2.2)));
      const drawRun = (hw: number, col: string) => {
        const x0 = Math.round(cx - hw), x1 = Math.round(cx + hw);
        if (x1 <= x0) return;
        ctx.fillStyle = col;
        ctx.fillRect(x0, y, x1 - x0, 1);
      };
      drawRun(halfW, RAMP[outer]);
      if (halfW > 1.6) drawRun(halfW * 0.66, RAMP[Math.min(RAMP.length - 1, outer + 2)]);
      if (halfW > 3 && u < 0.72) drawRun(halfW * 0.34, RAMP[Math.min(RAMP.length - 1, outer + 4)]);
      if (halfW > 4.4 && u < 0.4) drawRun(halfW * 0.16, RAMP[6]);
      // detached licks breaking off the tip
      if (u > 0.82 && Math.sin(phase * 3 + tg.ph + row) > 0.55) {
        ctx.fillStyle = RAMP[Math.min(RAMP.length - 1, outer + 1)];
        ctx.fillRect(Math.round(cx + wobble * 0.6), y - 2, 2, 2);
      }
    }
  }
  // soft dark rim so the flame separates from bright ground
  const img = ctx.getImageData(0, 0, FW, FH);
  const d = img.data, out = new Uint8ClampedArray(d);
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < FW && y < FH && d[(y * FW + x) * 4 + 3] > 0;
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const i = (y * FW + x) * 4;
    if (d[i + 3] || !(solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) continue;
    out[i] = 96; out[i + 1] = 34; out[i + 2] = 22; out[i + 3] = 90;
  }
  img.data.set(out);
  ctx.putImageData(img, 0, 0);
  return c;
}

function atlas(variant: number) {
  let a = atlases.get(variant);
  if (!a) { a = Array.from({ length: FRAMES }, (_, i) => bakeFrame(i, variant)); atlases.set(variant, a); }
  return a;
}

/** Charred log pile with glowing cracks; sits under every fire. */
function coals() {
  if (coalSprite) return coalSprite;
  const { c, ctx } = makeCanvas(38, 16);
  const P = (x: number, y: number, w: number, h: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
  P(1, 7, 36, 7, '#241c16');
  P(3, 5, 32, 8, '#332821');
  P(4, 4, 30, 3, '#463629');
  // three logs at different angles with end grain
  P(2, 9, 15, 5, '#3d2f24'); P(2, 9, 15, 1, '#5b4634'); P(1, 9, 3, 5, '#6d5540'); P(2, 10, 1, 3, '#a98a63');
  P(20, 10, 16, 5, '#332720'); P(20, 10, 16, 1, '#54402f'); P(34, 10, 3, 5, '#6d5540'); P(35, 11, 1, 3, '#a98a63');
  P(9, 4, 20, 5, '#463629'); P(9, 4, 20, 1, '#66503a');
  // hairline cracks where the heat shows through
  for (const [x, y, w] of [[6, 11, 5], [13, 6, 6], [24, 12, 5], [18, 5, 4], [29, 11, 4]] as [number, number, number][]) {
    P(x, y, w, 1, '#c4452b'); P(x + 1, y, Math.max(1, w - 2), 1, '#f79a38');
  }
  coalSprite = c;
  return c;
}

export interface FireDraw {
  x: number; y: number; t: number; level: number; seed: number; wind: Wind; reduced?: boolean;
}

/** Ground scorch, coal bed, flame body, embers and heat shimmer. */
export function drawFirePit(c: CanvasRenderingContext2D, d: FireDraw) {
  const { x, y, t, wind } = d;
  const level = Math.max(0, Math.min(1, d.level));
  if (level <= 0.01) return;
  const S = 2;
  const rx = Math.round(x), ry = Math.round(y);

  // scorched ground with a hot inner ring
  c.fillStyle = '#2c231b';
  c.fillRect(rx - 30, ry - 5, 60, 13);
  c.fillStyle = '#3b2b20';
  c.fillRect(rx - 24, ry - 7, 48, 4);
  c.globalAlpha = 0.5 + level * 0.4;
  c.fillStyle = '#6d2f1c';
  c.fillRect(rx - 20, ry - 2, 40, 6);
  c.globalAlpha = 1;

  // coal bed
  const cs = coals();
  c.drawImage(cs, rx - cs.width, ry - 14, cs.width * S, cs.height * S);

  // live coals pulsing out of phase
  for (let i = 0; i < 9; i++) {
    const gx = rx - 22 + i * 5 + (i % 2) * 2;
    const gy = ry + 1 + (i % 3);
    const pulse = 0.45 + 0.55 * Math.abs(Math.sin(t * (2.1 + i * 0.31) + i));
    c.globalAlpha = pulse * (0.5 + level * 0.5);
    c.fillStyle = i % 3 === 0 ? '#ffd06a' : i % 3 === 1 ? '#f2762e' : '#c4452b';
    c.fillRect(gx, gy, 2, 2);
  }
  c.globalAlpha = 1;

  // flame body: one atlas blit, stepped through at 15fps for a hand-drawn feel
  const variant = d.seed % 3;
  const frames = atlas(variant);
  const fi = d.reduced ? 4 : Math.floor(t * 15 + d.seed * 3.3) % FRAMES;
  const scale = 0.4 + level * 0.6;
  const fw = Math.round(FW * S * scale), fh = Math.round(FH * S * scale);
  const lean = wind.dir * (3 + wind.gust * 7) * level;
  c.save();
  // shear the sprite so gusts bend the whole flame, tip more than base
  c.translate(rx + Math.round(lean * 0.3), ry + 2);
  c.transform(1, 0, -lean / (fh || 1), 1, 0, 0);
  c.drawImage(frames[fi], Math.round(-fw / 2), -fh, fw, fh);
  c.restore();

  // white-hot base glow anchoring the flame to the coals
  c.globalAlpha = 0.55 * level;
  c.fillStyle = '#ffe9b0';
  c.fillRect(rx - Math.round(9 * scale), ry - 5, Math.round(18 * scale), 4);
  c.globalAlpha = 0.3 * level;
  c.fillStyle = '#ffb347';
  c.fillRect(rx - Math.round(15 * scale), ry - 3, Math.round(30 * scale), 4);
  c.globalAlpha = 1;

  // heat shimmer: displaced bright scanlines above the flame
  if (!d.reduced && level > 0.25) {
    for (let i = 0; i < 4; i++) {
      const sy = ry - fh - 4 - i * 6;
      const wob = Math.round(Math.sin(t * 6 + i * 1.4 + d.seed) * (2 + i)) * 2;
      c.globalAlpha = (0.1 - i * 0.02) * level;
      c.fillStyle = '#ffe4b0';
      c.fillRect(rx - 12 + wob + Math.round(lean), sy, 24, 2);
    }
    c.globalAlpha = 1;
  }
}

/** Warm flickering pool cast on the ground; drawn in a lighter pass. */
export function fireLightRadius(level: number, t: number, seed: number) {
  return (66 + Math.sin(t * 7.3 + seed) * 8) * (0.45 + level * 0.55);
}
