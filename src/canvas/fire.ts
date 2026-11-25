import type { Wind } from './physics';

/*
 * High-craft Karhutla peat & timber wildfire renderer.
 * Multi-layered roaring flame tongues + pinched rising flamelets are pre-baked
 * into a 16-frame pixel atlas per variant (1 blit per hotspot), paired with
 * charred criss-crossed jungle timber, pulsing magma fissures, buoyant wind-driven
 * sparks, rising dark-amber smoke wisps, and radiant heat shimmer.
 */

const FW = 46, FH = 54, FRAMES = 16;
const atlases = new Map<number, HTMLCanvasElement[]>();
let coalSprite: HTMLCanvasElement | null = null;

// 8-stop physically-inspired blackbody pixel-art ramp (soot-crimson -> roaring orange -> gold -> white-hot core)
const RAMP = [
  '#4d1414', // 0: outer soot-crimson envelope
  '#8c2219', // 1: deep wildfire red
  '#c93f1e', // 2: fierce vermilion
  '#eb6c22', // 3: roaring flame orange
  '#fa9e2f', // 4: rich amber-gold
  '#ffd059', // 5: bright yellow-gold
  '#ffefa6', // 6: incandescent cream
  '#ffffff', // 7: white-hot core
];

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}

/** Seven S-curved roaring tongues + rising pinched-off flamelets ('lidah api'). */
function bakeFrame(frame: number, variant: number) {
  const { c, ctx } = makeCanvas(FW, FH);
  const phase = (frame / FRAMES) * Math.PI * 2;
  const vShift = (variant - 1) * 0.9;

  // Back-to-front tongues: outer flanking licks first, roaring center spire last
  const tongues = [
    { ox: -12, w: 8,  h: 0.50, ph: 0.4 + vShift,       sp: 1.0,  core: false },
    { ox:  12, w: 8,  h: 0.48, ph: 3.9 - vShift,       sp: 1.0,  core: false },
    { ox: -8,  w: 11, h: 0.74, ph: 1.5 + vShift * 1.2, sp: 1.0,  core: true  },
    { ox:  8,  w: 10, h: 0.70, ph: 4.8 + vShift * 0.8, sp: 1.0,  core: true  },
    { ox: -3,  w: 13, h: 0.90, ph: 2.6 - vShift * 0.7, sp: 1.0,  core: true  },
    { ox:  4,  w: 12, h: 0.84, ph: 5.5 + vShift * 1.1, sp: 1.0,  core: true  },
    { ox:  0,  w: 15, h: 1.00, ph: 0.9 + vShift * 0.5, sp: 1.0,  core: true  },
  ];

  const baseY = FH - 5;
  const drawRun = (cx: number, y: number, hw: number, col: string) => {
    const x0 = Math.round(cx - hw), x1 = Math.round(cx + hw);
    if (x1 > x0 && y >= 0 && y < FH) {
      ctx.fillStyle = col;
      ctx.fillRect(x0, y, x1 - x0, 1);
    }
  };

  for (const tg of tongues) {
    const breathe = 0.85 + Math.sin(phase * tg.sp + tg.ph) * 0.15;
    const height = Math.round((FH - 11) * tg.h * breathe);
    for (let row = 0; row < height; row++) {
      const u = row / Math.max(1, height);
      // Bulbous base skirt tapering into whip-like concave flame tip
      const skirt = u < 0.18 ? Math.sin((u / 0.18) * Math.PI * 0.5) * 0.15 + 0.88 : 1;
      const taper = Math.pow(1 - u, 0.66) * skirt;
      // Upward-traveling S-wave whip (exact integer harmonics of `phase` so 16-frame loop is 100% seamless!)
      const wave =
        Math.sin(phase * 2 - u * 5.6 + tg.ph) * (0.6 + u * 3.1) +
        Math.sin(phase * 3 - u * 9.2 + tg.ph * 1.7) * (u * 1.3);

      const halfW = Math.max(0.55, (tg.w * 0.5) * taper);
      const cx = FW * 0.5 + tg.ox * (1 - u * 0.48) + wave;
      const y = baseY - row;

      // Outer crimson/vermilion -> mid roaring orange -> gold -> white-hot heart
      const outerIdx = u > 0.82 ? 0 : u > 0.56 ? 1 : 2;
      drawRun(cx, y, halfW, RAMP[outerIdx]);
      if (halfW > 1.3) drawRun(cx, y, halfW * 0.74, RAMP[Math.min(7, outerIdx + 1)]);
      if (halfW > 2.2) drawRun(cx, y, halfW * 0.52, RAMP[Math.min(7, outerIdx + 2)]);
      if (tg.core && halfW > 3.1 && u < 0.76) drawRun(cx, y, halfW * 0.34, RAMP[5]);
      if (tg.core && halfW > 4.2 && u < 0.52) drawRun(cx, y, halfW * 0.20, RAMP[6]);
      if (tg.core && halfW > 5.2 && u < 0.28) drawRun(cx, y, halfW * 0.11, RAMP[7]);
    }

    // Detached rising flamelets ('lidah api') pinching off above the tongue tip!
    const lift = ((frame / FRAMES) + tg.ph / (Math.PI * 2)) % 1;
    if (lift < 0.72) {
      const lx = Math.round(FW * 0.5 + tg.ox * 0.45 + Math.sin(phase * 2 + tg.ph) * 2.6);
      const ly = Math.round(baseY - height - 2 - lift * 7);
      const sz = lift < 0.35 ? 3 : 2;
      if (ly >= 1 && ly < FH - 4) {
        ctx.fillStyle = lift < 0.3 ? RAMP[4] : lift < 0.52 ? RAMP[3] : RAMP[1];
        ctx.fillRect(lx - 1, ly, sz, sz);
        if (lift < 0.35) {
          ctx.fillStyle = RAMP[6];
          ctx.fillRect(lx, ly, 1, 1);
        }
      }
    }
  }

  // Crisp dark-ember silhouette rim so flames pop vibrantly over peat, smoke, and grass
  const img = ctx.getImageData(0, 0, FW, FH);
  const d = img.data, out = new Uint8ClampedArray(d);
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < FW && y < FH && d[(y * FW + x) * 4 + 3] > 0;
  for (let y = 0; y < FH; y++) {
    for (let x = 0; x < FW; x++) {
      const i = (y * FW + x) * 4;
      if (d[i + 3] || !(solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) continue;
      out[i] = 72;
      out[i + 1] = 20;
      out[i + 2] = 14;
      out[i + 3] = 135;
    }
  }
  img.data.set(out);
  ctx.putImageData(img, 0, 0);
  return c;
}

function atlas(variant: number) {
  let a = atlases.get(variant);
  if (!a) {
    a = Array.from({ length: FRAMES }, (_, i) => bakeFrame(i, variant));
    atlases.set(variant, a);
  }
  return a;
}

/** Charred criss-crossed rainforest logs & glowing peat bed under every hotspot. */
function coals() {
  if (coalSprite) return coalSprite;
  const { c, ctx } = makeCanvas(46, 20);
  const P = (x: number, y: number, w: number, h: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w, h);
  };
  // Scorched peat crater + pale grey wood-ash halo
  P(2, 9, 42, 9, '#1c1511');
  P(5, 7, 36, 10, '#2b2019');
  P(8, 15, 30, 2, '#595048'); // ash dust
  P(10, 8, 26, 6, '#522218'); // glowing peat bed core

  // Criss-crossed charred jungle branches with split end-grain
  P(2, 11, 19, 5, '#291f19'); P(2, 11, 19, 1, '#4f3b2d');
  P(1, 11, 3, 5, '#634936'); P(2, 12, 1, 3, '#c49662');

  P(25, 11, 19, 5, '#261c17'); P(25, 11, 19, 1, '#4a372a');
  P(42, 11, 3, 5, '#634936'); P(43, 12, 1, 3, '#c49662');

  P(9, 6, 28, 5, '#362820'); P(9, 6, 28, 1, '#5c4534');
  P(14, 13, 18, 4, '#2e221b');

  // Glowing magma-orange fissures along split bark
  for (const [x, y, w] of [
    [6, 13, 6], [14, 8, 7], [24, 8, 6], [18, 14, 9], [30, 13, 6],
  ] as [number, number, number][]) {
    P(x, y, w, 1, '#d94522');
    P(x + 1, y, Math.max(1, w - 2), 1, '#ffa834');
    if (w >= 6) P(x + 2, y, 2, 1, '#fff0a6');
  }
  coalSprite = c;
  return c;
}

export interface FireDraw {
  x: number;
  y: number;
  t: number;
  level: number;
  seed: number;
  wind: Wind;
  reduced?: boolean;
}

/** Scorched peat crater, magma coal bed, roaring multi-tongue flames, swirling sparks & smoke wisps. */
export function drawFirePit(c: CanvasRenderingContext2D, d: FireDraw) {
  const { x, y, t, wind } = d;
  const level = Math.max(0, Math.min(1, d.level));
  if (level <= 0.01) return;
  const S = 2;
  const rx = Math.round(x), ry = Math.round(y);

  // 1. Layered scorched peat crater & pulsing subterranean ember ring
  c.fillStyle = '#221a14';
  c.fillRect(rx - 36, ry - 5, 72, 15);
  c.fillStyle = '#33241a';
  c.fillRect(rx - 30, ry - 8, 60, 18);
  const bedPulse = d.reduced ? 0.8 : 0.72 + 0.28 * Math.sin(t * 6.2 + d.seed * 1.7);
  c.globalAlpha = (0.45 + level * 0.45) * bedPulse;
  c.fillStyle = '#8f2f19';
  c.fillRect(rx - 24, ry - 3, 48, 9);
  c.fillStyle = '#e06622';
  c.fillRect(rx - 15, ry - 1, 30, 5);
  c.globalAlpha = 1;

  // 2. Charred timber & coal bed sprite
  const cs = coals();
  c.drawImage(cs, rx - cs.width, ry - 18, cs.width * S, cs.height * S);

  // 3. Live crackling embers pulsing across the logs
  for (let i = 0; i < 11; i++) {
    const gx = rx - 28 + i * 5.5 + (i % 2) * 2;
    const gy = ry - 1 + (i % 3) * 2;
    const pulse = 0.4 + 0.6 * Math.abs(Math.sin(t * (2.6 + i * 0.37) + i * 1.3 + d.seed));
    c.globalAlpha = pulse * (0.5 + level * 0.5);
    c.fillStyle = i % 3 === 0 ? '#fff099' : i % 3 === 1 ? '#ff9933' : '#d93f1e';
    c.fillRect(Math.round(gx), gy, 2, 2);
  }
  c.globalAlpha = 1;

  // 4. Rising warm soot/smoke wisps curling above the flame crown (anchors flame to canopy smoke!)
  const scale = 0.44 + level * 0.62;
  const fw = Math.round(FW * S * scale), fh = Math.round(FH * S * scale);
  const lean = wind.dir * (4 + wind.gust * 9) * level;
  if (!d.reduced && level > 0.2) {
    for (let s = 0; s < 4; s++) {
      const cycle = (t * (0.85 + s * 0.14) + s * 0.25 + d.seed * 0.31) % 1;
      const sx = rx + lean * (0.7 + cycle * 1.4) + Math.sin(t * 3.2 + s * 2.1 + cycle * 5) * (5 + cycle * 8);
      const sy = ry - fh * (0.78 + cycle * 0.65);
      const rad = Math.round((5 + cycle * 9) * scale);
      c.globalAlpha = (1 - cycle) * 0.24 * level;
      c.fillStyle = cycle < 0.3 ? '#4a2a22' : '#2e2927';
      c.fillRect(Math.round(sx - rad), Math.round(sy - rad * 0.6), rad * 2, Math.round(rad * 1.2));
    }
    c.globalAlpha = 1;
  }

  // 5. Main roaring flame body (16fps hand-crafted pixel atlas + wind shear)
  const variant = d.seed % 3;
  const frames = atlas(variant);
  const fi = d.reduced ? 4 : Math.floor(t * 16 + d.seed * 3.7) % FRAMES;
  c.save();
  c.translate(rx + Math.round(lean * 0.28), ry + 3);
  c.transform(1, 0, -lean / (fh || 1), 1, 0, 0);
  c.drawImage(frames[fi], Math.round(-fw / 2), -fh, fw, fh);
  c.restore();

  // 6. Blazing white-gold core bloom locking the tongues into the burning timber
  c.globalAlpha = 0.65 * level * bedPulse;
  c.fillStyle = '#fff5c2';
  c.fillRect(rx - Math.round(11 * scale), ry - 6, Math.round(22 * scale), 5);
  c.globalAlpha = 0.36 * level;
  c.fillStyle = '#ffa630';
  c.fillRect(rx - Math.round(19 * scale), ry - 4, Math.round(38 * scale), 5);
  c.globalAlpha = 1;

  // 7. Buoyant swirling wildfire sparks & embers carried by the Kalimantan wind!
  if (!d.reduced && level > 0.15) {
    const sparkCount = 12;
    for (let i = 0; i < sparkCount; i++) {
      const rate = 0.9 + (i % 5) * 0.22;
      const life = (t * rate + i * 0.19 + d.seed * 0.43) % 1;
      const spread = ((i * 7) % 13) - 6;
      const swirl = Math.sin(t * 5.4 + i * 1.9 + life * 7) * (3 + life * 9);
      const sx = Math.round(rx + spread * 2.4 * scale + swirl + lean * (0.4 + life * 1.7));
      const sy = Math.round(ry - 8 - life * (fh * 1.35 + 22));
      const alpha = (1 - life) * (0.55 + 0.45 * level);
      if (alpha <= 0.04) continue;
      c.globalAlpha = alpha;
      c.fillStyle = life < 0.25 ? '#ffffff' : life < 0.55 ? '#ffd45e' : life < 0.8 ? '#ff7b24' : '#c93418';
      const sz = life < 0.45 ? 2 : 2;
      c.fillRect(sx, sy, sz, life < 0.3 ? 3 : 2);
    }
    c.globalAlpha = 1;
  }

  // 8. Shimmering thermal refraction bars above the fire
  if (!d.reduced && level > 0.28) {
    for (let i = 0; i < 4; i++) {
      const sy = ry - fh - 5 - i * 7;
      const wob = Math.round(Math.sin(t * 6.8 + i * 1.5 + d.seed) * (2 + i)) * 2;
      c.globalAlpha = (0.11 - i * 0.022) * level;
      c.fillStyle = '#ffe8b5';
      c.fillRect(rx - 14 + wob + Math.round(lean), sy, 28, 2);
    }
    c.globalAlpha = 1;
  }
}

/** Warm multi-harmonic flickering pool cast on surrounding ground & trees. */
export function fireLightRadius(level: number, t: number, seed: number) {
  const flicker = Math.sin(t * 7.8 + seed) * 7 + Math.sin(t * 13.4 + seed * 2.3) * 4;
  return (78 + flicker) * (0.46 + level * 0.54);
}
