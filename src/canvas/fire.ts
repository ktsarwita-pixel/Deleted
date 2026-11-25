import type { Wind } from './physics';

/*
 * High-craft Karhutla peat & timber wildfire renderer:
 * 1) `drawFireGround`: Pre-baked scalloped pixel-art peat crater, ash halo, pulsing
 *    subterranean peat-fire cracks & post-extinguish mossy regrowth (drawn on the GROUND layer!).
 * 2) `drawFirePit`: Criss-crossed charred jungle timber (back + front logs wrapping the base),
 *    curved 3D multi-lobe pixel-clustered flame atlas (zero flat scanline bottoms!),
 *    pinched rising teardrop flamelets, swirling wind sparks & rising soot wisps.
 */

const FW = 48, FH = 56, FRAMES = 16;
const atlases = new Map<number, HTMLCanvasElement[]>();
const scorchPatches = new Map<number, HTMLCanvasElement>();
const wetPatches = new Map<number, HTMLCanvasElement>();
const mossPatches = new Map<number, HTMLCanvasElement>();
let backLogsSprite: HTMLCanvasElement | null = null;
let frontLogsSprite: HTMLCanvasElement | null = null;

const h2 = (x: number, y: number) => {
  const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

// 8-stop blackbody pixel-art fire ramp
const RAMP = [
  '#421213', // 0: dark soot-maroon silhouette rim
  '#871f18', // 1: deep wildfire crimson
  '#c93d1b', // 2: fierce vermilion
  '#ed6f20', // 3: rich tangerine-orange
  '#fca42e', // 4: warm marigold
  '#ffd65c', // 5: bright golden-yellow
  '#fff3b8', // 6: incandescent cream
  '#ffffff', // 7: white-hot heart
];

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}

/** Pre-baked organic scalloped pixel-art scorched peat crater + ash & glowing fissure bed (ZERO rectangular boxes!). */
function getScorchPatch(variant: number): HTMLCanvasElement {
  let hit = scorchPatches.get(variant);
  if (hit) return hit;
  const W = 44, H = 22;
  const { c, ctx } = makeCanvas(W, H);
  const cx = W / 2, cy = H / 2;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const nx = (x - cx) / 20.5;
      const ny = (y - cy) / 9.5;
      const ang = Math.atan2(ny, nx);
      const scallop = 1 + Math.sin(ang * 5 + variant * 1.9) * 0.11 + Math.cos(ang * 9 - variant) * 0.07;
      const d = Math.hypot(nx, ny) / scallop;
      if (d > 1) continue;
      const n = h2(x + variant * 17, y + variant * 11);
      if (d > 0.84) {
        if (n > 0.42) {
          ctx.fillStyle = n > 0.75 ? '#4a3b28' : '#2e2319';
          ctx.fillRect(x, y, 1, 1);
        }
      } else if (d > 0.58) {
        ctx.fillStyle = n > 0.78 ? '#5c534a' : n > 0.4 ? '#261d15' : '#1d1510';
        ctx.fillRect(x, y, 1, 1);
      } else {
        ctx.fillStyle = n > 0.8 ? '#6e645a' : d < 0.34 ? '#381a13' : '#19120e';
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  // Radiating subterranean smoldering peat cracks baked into the crater
  const cracks: [number, number, number, number][] = [
    [cx - 11, cy + 1, 6, 1],
    [cx + 5,  cy + 2, 7, -1],
    [cx - 6,  cy - 3, 5, 0],
    [cx + 2,  cy - 2, 6, 1],
    [cx - 3,  cy + 4, 7, 0],
  ];
  for (const [sx, sy, len, slope] of cracks) {
    for (let k = 0; k < len; k++) {
      const px = Math.round(sx + k);
      const py = Math.round(sy + (slope * k) * 0.35);
      ctx.fillStyle = k === 0 || k === len - 1 ? '#8c2918' : '#e05c1f';
      ctx.fillRect(px, py, 1, 1);
      if (k === Math.floor(len / 2)) {
        ctx.fillStyle = '#ffc247';
        ctx.fillRect(px, py, 1, 1);
      }
    }
  }

  scorchPatches.set(variant, c);
  return c;
}

/** Damp, water-quenched dark peat & wet ash patch right after Wira pours water. */
function getWetPatch(variant: number): HTMLCanvasElement {
  let hit = wetPatches.get(variant);
  if (hit) return hit;
  const W = 42, H = 20;
  const { c, ctx } = makeCanvas(W, H);
  const cx = W / 2, cy = H / 2;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const nx = (x - cx) / 19;
      const ny = (y - cy) / 8.8;
      const ang = Math.atan2(ny, nx);
      const scallop = 1 + Math.sin(ang * 5 + variant * 1.9) * 0.11 + Math.cos(ang * 8) * 0.06;
      const d = Math.hypot(nx, ny) / scallop;
      if (d > 1) continue;
      const n = h2(x + variant * 13, y + 5);
      if (d > 0.82 && n < 0.45) continue;
      ctx.fillStyle = d < 0.48 ? (n > 0.72 ? '#323832' : '#211c18') : (n > 0.65 ? '#3d3529' : '#2b231b');
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // Small quenched charcoal remnants
  ctx.fillStyle = '#1c1815';
  ctx.fillRect(14, 9, 6, 2);
  ctx.fillRect(22, 10, 6, 2);
  ctx.fillStyle = '#4a453f';
  ctx.fillRect(15, 9, 4, 1);
  wetPatches.set(variant, c);
  return c;
}

/** Lush scalloped emerald moss & clover recovery cushion that grows over quenched peat! */
function getMossPatch(variant: number): HTMLCanvasElement {
  let hit = mossPatches.get(variant);
  if (hit) return hit;
  const W = 40, H = 18;
  const { c, ctx } = makeCanvas(W, H);
  const cx = W / 2, cy = H / 2;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const nx = (x - cx) / 17.5;
      const ny = (y - cy) / 7.8;
      const ang = Math.atan2(ny, nx);
      const scallop = 1 + Math.sin(ang * 6 + variant * 2.1) * 0.13 + Math.cos(ang * 9) * 0.07;
      const d = Math.hypot(nx, ny) / scallop;
      if (d > 1) continue;
      const n = h2(Math.floor(x * 0.5) + variant * 7, Math.floor(y * 0.5) + 3);
      ctx.fillStyle = d > 0.78 ? '#3b522d' : n > 0.68 ? '#638a43' : n > 0.34 ? '#4d6e37' : '#3f5c2f';
      ctx.fillRect(x, y, 1, 1);
    }
  }
  mossPatches.set(variant, c);
  return c;
}

/** Back & Front split jungle timber logs so the flame base sits INSIDE the woodpile! */
function getLogLayers() {
  if (backLogsSprite && frontLogsSprite) return { back: backLogsSprite, front: frontLogsSprite };

  const b = makeCanvas(38, 16);
  const P1 = (x: number, y: number, w: number, h: number, col: string) => {
    b.ctx.fillStyle = col;
    b.ctx.fillRect(x, y, w, h);
  };
  // Back angled charred branches + glowing heartwood bed
  P1(7, 5, 24, 5, '#1b130e');
  P1(8, 6, 22, 3, '#3a291e');
  P1(8, 6, 22, 1, '#5c4331');
  P1(3, 8, 15, 5, '#1b130e');
  P1(4, 9, 13, 3, '#33241a');
  P1(3, 9, 2, 3, '#a87d52'); // split wood end-grain left
  P1(20, 8, 15, 5, '#1b130e');
  P1(21, 9, 13, 3, '#302219');
  P1(33, 9, 2, 3, '#a87d52'); // split wood end-grain right
  // Glowing red-gold coal heart between the logs
  P1(11, 9, 16, 4, '#9e2f19');
  P1(13, 10, 12, 2, '#f58225');
  P1(16, 10, 6, 1, '#ffe485');

  const f = makeCanvas(38, 16);
  const P2 = (x: number, y: number, w: number, h: number, col: string) => {
    f.ctx.fillStyle = col;
    f.ctx.fillRect(x, y, w, h);
  };
  // Two smaller foreground charred billets crossing in front of the lower flame skirt (3D wrap!)
  P2(8, 11, 10, 4, '#17100c');
  P2(9, 12, 8, 2, '#36261c');
  P2(9, 11, 8, 1, '#6e4933');
  P2(12, 12, 3, 1, '#eb6820'); // glowing bark crack

  P2(20, 11, 10, 4, '#17100c');
  P2(21, 12, 8, 2, '#2e2017');
  P2(21, 11, 8, 1, '#63422e');
  P2(23, 12, 3, 1, '#eb6820');

  backLogsSprite = b.c;
  frontLogsSprite = f.c;
  return { back: backLogsSprite, front: frontLogsSprite };
}

/**
 * Bakes one frame of the 16-frame wildfire atlas using rising billowing flame lobes
 * & curved U-shaped 3D base (never flat horizontal barcode stripes!).
 */
function bakeFrame(frame: number, variant: number) {
  const { c, ctx } = makeCanvas(FW, FH);
  const phase = (frame / FRAMES) * Math.PI * 2;
  const vOff = (variant - 1) * 0.85;

  // Heat buffer in [0..1.35] so overlapping flame lobes & rising bubbles fuse organically!
  const heat = new Float32Array(FW * FH);
  const addBlob = (cx: number, cy: number, rx: number, ry: number, strength: number) => {
    const x0 = Math.max(1, Math.floor(cx - rx - 1)), x1 = Math.min(FW - 2, Math.ceil(cx + rx + 1));
    const y0 = Math.max(1, Math.floor(cy - ry - 1)), y1 = Math.min(FH - 2, Math.ceil(cy + ry + 1));
    for (let y = y0; y <= y1; y++) {
      const dy = (y - cy) / ry;
      for (let x = x0; x <= x1; x++) {
        const dx = (x - cx) / rx;
        const d2 = dx * dx + dy * dy;
        if (d2 >= 1) continue;
        const v = (1 - d2) * strength;
        const idx = y * FW + x;
        // Smooth soft-max union so overlapping tongues billow together naturally
        heat[idx] = Math.max(heat[idx], v) + Math.min(heat[idx], v) * 0.28;
      }
    }
  };

  // 7 curved tongues arranged around an elliptical 3D log-cradle arc (outer higher, center lower!)
  const tongues = [
    { ox: -11.5, baseLift: 4.5, w: 4.8, h: 21, ph: 0.3 + vOff,       amp: 2.2, heatScale: 0.78 },
    { ox:  11.5, baseLift: 4.5, w: 4.6, h: 20, ph: 3.7 - vOff,       amp: 2.2, heatScale: 0.76 },
    { ox: -7.2,  baseLift: 2.5, w: 6.0, h: 31, ph: 1.6 + vOff * 1.2, amp: 2.8, heatScale: 0.94 },
    { ox:  7.2,  baseLift: 2.5, w: 5.8, h: 29, ph: 4.9 + vOff * 0.7, amp: 2.7, heatScale: 0.92 },
    { ox: -3.2,  baseLift: 0.8, w: 6.8, h: 39, ph: 2.8 - vOff * 0.6, amp: 3.1, heatScale: 1.06 },
    { ox:  3.4,  baseLift: 1.0, w: 6.5, h: 37, ph: 5.6 + vOff * 1.1, amp: 3.0, heatScale: 1.04 },
    { ox:  0.0,  baseLift: 0.0, w: 7.8, h: 43, ph: 0.9 + vOff * 0.4, amp: 3.3, heatScale: 1.16 },
  ];

  const floorY = FH - 6;
  for (const tg of tongues) {
    const pulse = 0.88 + Math.sin(phase + tg.ph) * 0.12;
    const totalH = tg.h * pulse;
    const steps = 14;
    for (let s = 0; s <= steps; s++) {
      const u = s / steps;
      const y = floorY - tg.baseLift - u * totalH;
      // Traveling S-wave whip (exact integer multiples of `phase` for seamless 16-frame loop)
      const wave =
        Math.sin(phase * 2 - u * 5.2 + tg.ph) * (u * tg.amp) +
        Math.sin(phase * 3 - u * 8.4 + tg.ph * 1.6) * (u * u * 1.4);
      const x = FW * 0.5 + tg.ox * (1 - u * 0.44) + wave;
      // Billowing lobe modulation so edges have lively flame scallops
      const billow = 1 + Math.sin(phase * 2 - u * 7 + tg.ph) * 0.14;
      const radX = Math.max(0.9, tg.w * Math.pow(1 - u * 0.92, 0.68) * billow);
      const radY = Math.max(1.1, radX * 1.15);
      const hVal = tg.heatScale * (1.06 - u * 0.82);
      addBlob(x, y, radX, radY, hVal);
    }

    // Rising pinched-off teardrop flamelet ('lidah api') above each tongue!
    const lift = ((frame / FRAMES) + tg.ph / (Math.PI * 2)) % 1;
    if (lift < 0.68) {
      const fx = FW * 0.5 + tg.ox * 0.42 + Math.sin(phase * 2 + tg.ph) * 2.5;
      const fy = floorY - tg.baseLift - totalH - 1.5 - lift * 7.5;
      const fr = Math.max(1.0, (1 - lift / 0.72) * 2.4);
      addBlob(fx, fy, fr, fr * 1.35, (1 - lift) * 0.78);
    }
  }

  // Quantize heat field into crisp pixel-art color bands + warm dark silhouette rim
  for (let y = 1; y < FH - 1; y++) {
    for (let x = 1; x < FW - 1; x++) {
      const v = heat[y * FW + x];
      if (v < 0.22) continue;
      const idx =
        v > 1.16 ? 7 :
        v > 0.98 ? 6 :
        v > 0.80 ? 5 :
        v > 0.62 ? 4 :
        v > 0.46 ? 3 :
        v > 0.33 ? 2 : 1;
      ctx.fillStyle = RAMP[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // Crisp 1px dark soot-crimson pixel outline around the flame silhouette
  const img = ctx.getImageData(0, 0, FW, FH);
  const d = img.data, out = new Uint8ClampedArray(d);
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < FW && y < FH && d[(y * FW + x) * 4 + 3] > 0;
  for (let y = 0; y < FH; y++) {
    for (let x = 0; x < FW; x++) {
      const i = (y * FW + x) * 4;
      if (d[i + 3] || !(solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) continue;
      out[i] = 58;
      out[i + 1] = 16;
      out[i + 2] = 14;
      out[i + 3] = 155;
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

export interface FireGroundDraw {
  x: number;
  y: number;
  t: number;
  level: number;
  extinguished: boolean;
  sinceExtinguished: number;
  seed: number;
  wind: Wind;
  reduced?: boolean;
}

/**
 * Drawn on the GROUND layer (underneath characters, ferns & trees!).
 * Renders organic scalloped scorched peat + pulsing glowing cracks while burning,
 * and transitions smoothly into wet quenched soil, moss cushions & wildflower shoots when extinguished.
 */
export function drawFireGround(c: CanvasRenderingContext2D, d: FireGroundDraw) {
  const S = 2;
  const rx = Math.round(d.x), ry = Math.round(d.y);
  const variant = d.seed % 3;

  if (!d.extinguished || d.level > 0.04) {
    const patch = getScorchPatch(variant);
    const pw = patch.width * S, ph = patch.height * S;
    c.drawImage(patch, rx - pw / 2, ry - ph / 2 + 2, pw, ph);

    // Live subterranean Kalimantan peat glow breathing through the crater center
    const pulse = d.reduced ? 0.8 : 0.68 + 0.32 * Math.sin(d.t * 5.8 + d.seed * 1.7);
    c.globalAlpha = (0.28 + d.level * 0.42) * pulse;
    c.fillStyle = '#b83718';
    c.fillRect(rx - 18, ry - 3, 36, 8);
    c.fillStyle = '#ff8c29';
    c.fillRect(rx - 11, ry - 1, 22, 4);
    c.globalAlpha = 1;
    return;
  }

  // Post-extinguish ground recovery: quenched wet peat -> scalloped emerald moss -> swaying green shoots!
  const since = d.sinceExtinguished;
  const wet = getWetPatch(variant);
  const moss = getMossPatch(variant);
  const charAlpha = Math.max(0.18, 1 - since / 9);
  c.globalAlpha = charAlpha;
  c.drawImage(wet, rx - wet.width, ry - wet.height + 2, wet.width * S, wet.height * S);
  c.globalAlpha = 1;

  // Faint dying orange embers in the first 2.5s after pouring water
  if (since < 2.5) {
    c.globalAlpha = (1 - since / 2.5) * 0.85;
    for (let i = 0; i < 5; i++) {
      if ((Math.floor(d.t * 5 + i) % 3) !== 0) {
        c.fillStyle = i % 2 === 0 ? '#ff9436' : '#c9411e';
        c.fillRect(rx - 14 + i * 7, ry - 1 + (i % 2) * 3, 2, 2);
      }
    }
    c.globalAlpha = 1;
  }

  const mossGrow = Math.max(0, Math.min(1, (since - 0.9) / 4.2));
  if (mossGrow > 0.02) {
    c.globalAlpha = mossGrow * 0.92;
    const mw = Math.round(moss.width * S * (0.55 + 0.45 * mossGrow));
    const mh = Math.round(moss.height * S * (0.55 + 0.45 * mossGrow));
    c.drawImage(moss, Math.round(rx - mw / 2), Math.round(ry - mh / 2 + 2), mw, mh);
    c.globalAlpha = 1;
  }

  const shootGrow = Math.max(0, Math.min(1, (since - 1.6) / 4.8));
  if (shootGrow > 0.04) {
    const bend = d.wind.dir * (1 + d.wind.gust * 2.0) * shootGrow;
    for (const [dx, dy, hmax, idx] of [
      [-12, 2, 7, 0], [0, -1, 11, 1], [11, 3, 8, 2], [-5, 5, 6, 3],
    ] as [number, number, number, number][]) {
      const hh = Math.round(shootGrow * hmax);
      if (hh < 2) continue;
      const sw = d.reduced ? 0 : Math.round(Math.sin(d.t * 1.9 + idx * 1.4 + d.x * 0.1) + bend);
      c.fillStyle = '#4f7a39';
      c.fillRect(rx + dx, ry + dy - hh, 2, hh);
      if (hh >= 4) {
        c.fillStyle = '#88b856';
        c.fillRect(rx + dx - 2 + sw, ry + dy - hh, 2, 2);
        c.fillRect(rx + dx + 2 + sw, ry + dy - hh + 2, 2, 2);
      }
      if (idx === 1 && since > 6.5) {
        const fy = ry + dy - hh - 3;
        c.fillStyle = '#fff5e0';
        c.fillRect(rx + dx + sw - 2, fy, 6, 2);
        c.fillRect(rx + dx + sw, fy - 2, 2, 6);
        c.fillStyle = '#f5cf5b';
        c.fillRect(rx + dx + sw, fy, 2, 2);
      }
    }
  }
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

/** Upright burning logs, 3D billowing flames, foreground billets, swirling sparks & soot wisps. */
export function drawFirePit(c: CanvasRenderingContext2D, d: FireDraw) {
  const { x, y, t, wind } = d;
  const level = Math.max(0, Math.min(1, d.level));
  if (level <= 0.01) return;
  const S = 2;
  const rx = Math.round(x), ry = Math.round(y);
  const { back, front } = getLogLayers();

  // 1. Back charred branches & glowing coal nest
  c.drawImage(back, rx - back.width, ry - 18, back.width * S, back.height * S);

  // 2. Live crackling coals along the log bed
  for (let i = 0; i < 9; i++) {
    const gx = rx - 22 + i * 5.4 + (i % 2) * 2;
    const gy = ry - 1 + (i % 3) * 2;
    const pulse = 0.42 + 0.58 * Math.abs(Math.sin(t * (2.7 + i * 0.35) + i * 1.3 + d.seed));
    c.globalAlpha = pulse * (0.5 + level * 0.5);
    c.fillStyle = i % 3 === 0 ? '#fff099' : i % 3 === 1 ? '#ff9933' : '#d93f1e';
    c.fillRect(Math.round(gx), gy, 2, 2);
  }
  c.globalAlpha = 1;

  // 3. Rising warm soot/smoke wisps curling off the flame crown
  const scale = 0.46 + level * 0.58;
  const fw = Math.round(FW * S * scale), fh = Math.round(FH * S * scale);
  const lean = wind.dir * (4 + wind.gust * 8.5) * level;
  if (!d.reduced && level > 0.2) {
    for (let s = 0; s < 4; s++) {
      const cycle = (t * (0.82 + s * 0.14) + s * 0.25 + d.seed * 0.31) % 1;
      const sx = rx + lean * (0.7 + cycle * 1.35) + Math.sin(t * 3.1 + s * 2.1 + cycle * 5) * (4 + cycle * 7);
      const sy = ry - fh * (0.76 + cycle * 0.62);
      const rad = Math.round((4 + cycle * 8) * scale);
      c.globalAlpha = (1 - cycle) * 0.22 * level;
      c.fillStyle = cycle < 0.32 ? '#4a2a22' : '#2e2927';
      c.fillRect(Math.round(sx - rad), Math.round(sy - rad * 0.6), rad * 2, Math.round(rad * 1.2));
    }
    c.globalAlpha = 1;
  }

  // 4. Main sculpted multi-lobe pixel flame body (16fps + natural wind shear)
  const variant = d.seed % 3;
  const frames = atlas(variant);
  const fi = d.reduced ? 4 : Math.floor(t * 15 + d.seed * 3.7) % FRAMES;
  c.save();
  c.translate(rx + Math.round(lean * 0.24), ry + 5);
  c.transform(1, 0, -lean / (fh || 1), 1, 0, 0);
  c.drawImage(frames[fi], Math.round(-fw / 2), -fh, fw, fh);
  c.restore();

  // 5. Foreground charred wood billets crossing in front of the lower flame core (locks fire INTO the woodpile!)
  c.drawImage(front, rx - front.width, ry - 18, front.width * S, front.height * S);

  // 6. Buoyant swirling wildfire sparks carried upward by the wind
  if (!d.reduced && level > 0.15) {
    for (let i = 0; i < 11; i++) {
      const rate = 0.88 + (i % 5) * 0.21;
      const life = (t * rate + i * 0.19 + d.seed * 0.43) % 1;
      const spread = ((i * 7) % 13) - 6;
      const swirl = Math.sin(t * 5.2 + i * 1.9 + life * 7) * (3 + life * 8);
      const sx = Math.round(rx + spread * 2.2 * scale + swirl + lean * (0.4 + life * 1.6));
      const sy = Math.round(ry - 8 - life * (fh * 1.3 + 20));
      const alpha = (1 - life) * (0.55 + 0.45 * level);
      if (alpha <= 0.04) continue;
      c.globalAlpha = alpha;
      c.fillStyle = life < 0.25 ? '#ffffff' : life < 0.55 ? '#ffd45e' : life < 0.8 ? '#ff7b24' : '#c93418';
      c.fillRect(sx, sy, 2, life < 0.3 ? 3 : 2);
    }
    c.globalAlpha = 1;
  }
}

/** Warm multi-harmonic flickering pool cast on surrounding ground & trees. */
export function fireLightRadius(level: number, t: number, seed: number) {
  const flicker = Math.sin(t * 7.8 + seed) * 7 + Math.sin(t * 13.4 + seed * 2.3) * 4;
  return (80 + flicker) * (0.46 + level * 0.54);
}
