import type { FireHotspot } from '../types/gameTypes';
import type { Viewport } from '../game/model';
import type { Wind } from './physics';

/*
 * Ultra-fast Kalimantan Karhutla peat-haze & smoke system.
 * ZERO per-frame allocations: all gradients, veil strips, and dithered pixel
 * smoke banks are pre-baked onto offscreen canvases and drawn with single blits.
 */

const snap = (v: number) => Math.round(v / 2) * 2;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const hash = (a: number, b: number) => {
  const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453123;
  return v - Math.floor(v);
};

const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

interface CloudBank {
  canvas: HTMLCanvasElement;
  w: number;
  h: number;
}

const bankCache = new Map<string, CloudBank>();
let hazeVeilCanvas: HTMLCanvasElement | null = null;
let sunVeilCanvas: HTMLCanvasElement | null = null;

/** Pre-baked 64x64 directional peat-smoke atmosphere veil (zero per-frame gradients). */
function getHazeVeil(): HTMLCanvasElement {
  if (hazeVeilCanvas) return hazeVeilCanvas;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 56, 64, 0);
  grad.addColorStop(0, 'rgba(156, 134, 98, 0.08)');
  grad.addColorStop(0.55, 'rgba(178, 146, 102, 0.16)');
  grad.addColorStop(1, 'rgba(206, 138, 82, 0.28)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  const top = ctx.createLinearGradient(0, 0, 0, 28);
  top.addColorStop(0, 'rgba(168, 148, 118, 0.20)');
  top.addColorStop(1, 'rgba(168, 148, 118, 0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, 64, 28);

  const rim = ctx.createLinearGradient(44, 0, 64, 0);
  rim.addColorStop(0, 'rgba(235, 118, 52, 0)');
  rim.addColorStop(1, 'rgba(235, 118, 52, 0.18)');
  ctx.fillStyle = rim;
  ctx.fillRect(44, 0, 20, 64);

  hazeVeilCanvas = c;
  return c;
}

/** Pre-baked 64x64 golden morning sunbeam veil when forest is healed. */
function getSunVeil(): HTMLCanvasElement {
  if (sunVeilCanvas) return sunVeilCanvas;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  const sky = ctx.createLinearGradient(0, 0, 0, 38);
  sky.addColorStop(0, 'rgba(255, 236, 172, 0.16)');
  sky.addColorStop(1, 'rgba(255, 236, 172, 0)');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 64, 38);
  sunVeilCanvas = c;
  return c;
}

/** Bakes a soft, multi-lobed pixel-art fog/smoke bank once and caches it. */
function getSmokeBank(variant: number, tone: 'peat' | 'ash' | 'warm' | 'mist'): CloudBank {
  const key = `${variant}|${tone}`;
  const hit = bankCache.get(key);
  if (hit) return hit;

  const w = 96 + (variant % 3) * 20;
  const h = 28 + (variant % 2) * 8;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const palette: Record<typeof tone, [number, number, number][]> = {
    peat: [[168, 152, 124], [196, 181, 152], [218, 205, 178]],
    ash:  [[118, 112, 102], [148, 141, 128], [178, 170, 155]],
    warm: [[188, 134, 92],  [216, 162, 114], [238, 194, 144]],
    mist: [[182, 212, 206], [208, 232, 226], [232, 246, 242]],
  };
  const cols = palette[tone];

  const lobes: { cx: number; cy: number; rx: number; ry: number }[] = [];
  const count = 5 + (variant % 2);
  for (let i = 0; i < count; i++) {
    const u = count === 1 ? 0.5 : i / (count - 1);
    lobes.push({
      cx: w * (0.16 + u * 0.68) + (hash(i, variant) - 0.5) * 10,
      cy: h * (0.52 + (hash(variant, i + 3) - 0.5) * 0.22),
      rx: w * (0.16 + hash(i + 7, variant) * 0.14),
      ry: h * (0.30 + hash(i + 11, variant) * 0.18),
    });
  }

  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let density = 0;
      let lift = 0;
      for (const lb of lobes) {
        const dx = (x - lb.cx) / lb.rx;
        const dy = (y - lb.cy) / lb.ry;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < 1) {
          const v = (1 - dist2) * (1 - dist2);
          if (v > density) {
            density = v;
            lift = clamp01(0.5 - dy * 0.5);
          }
        }
      }
      if (density <= 0.03) continue;
      const threshold = (BAYER4[y & 3][x & 3] + 0.5) / 16;
      if (density < 0.26 && density * 3.3 < threshold) continue;

      const cIdx = lift > 0.68 ? 2 : lift > 0.36 ? 1 : 0;
      const [r, g, b] = cols[cIdx];
      const idx = (y * w + x) * 4;
      d[idx] = r;
      d[idx + 1] = g;
      d[idx + 2] = b;
      d[idx + 3] = Math.round(clamp01(density * 1.15) * 255);
    }
  }
  ctx.putImageData(img, 0, 0);

  const built = { canvas, w, h };
  bankCache.set(key, built);
  return built;
}

/** Low-lying mist over Lake Rantau & peat smoke creeping out of the eastern forest. */
export function drawWorldGroundFog(
  c: CanvasRenderingContext2D,
  fires: FireHotspot[],
  view: Viewport,
  t: number,
  wind: Wind,
  reduced: boolean
) {
  const prev = c.globalAlpha;
  const time = reduced ? 0 : t;
  const left = view.x - view.width / view.scale / 2 - 220;
  const right = view.x + view.width / view.scale / 2 + 220;

  // 1. Lake mist (skip completely if lake is off-screen)
  if (left < 680 && right > 150) {
    for (let i = 0; i < 3; i++) {
      const bank = getSmokeBank(i, 'mist');
      const span = 420;
      const drift = reduced ? i * 110 : ((time * (5 + i * 2 + wind.dir * 4) + i * 137) % span);
      const mx = 195 + drift - 30;
      const my = 562 + i * 54 + Math.sin(time * 0.55 + i * 1.7) * 4;
      c.globalAlpha = prev * 0.14;
      c.drawImage(bank.canvas, snap(mx), snap(my), bank.w * 2, bank.h * 2);
    }
  }

  // 2. Peatland ground haze (skip if forest is off-screen)
  if (right > 760) {
    let activeCount = 0;
    for (let i = 0; i < fires.length; i++) if (fires[i].intensity > 0) activeCount++;
    if (activeCount > 0) {
      const ratio = activeCount / fires.length;
      for (let i = 0; i < 5; i++) {
        const bank = getSmokeBank(i + 1, i % 3 === 0 ? 'warm' : 'peat');
        const speed = 13 + (i % 3) * 4 - wind.dir * 12;
        const cycle = 520;
        const travel = reduced ? (i * 93) % cycle : ((time * speed + i * 103) % cycle);
        const wx = 1310 - travel;
        const wy = 165 + ((i * 109) % 510);
        const env = Math.sin((travel / cycle) * Math.PI);
        c.globalAlpha = prev * env * (0.12 + ratio * 0.18);
        c.drawImage(bank.canvas, snap(wx - bank.w), snap(wy - bank.h), bank.w * 2, bank.h * 2);
      }
    }
  }

  c.globalAlpha = prev;
}

/** Billowing smoke columns rising above visible burning/smoldering hotspots. */
export function drawWorldCanopySmoke(
  c: CanvasRenderingContext2D,
  fires: FireHotspot[],
  view: Viewport,
  now: number,
  t: number,
  wind: Wind,
  reduced: boolean
) {
  const left = view.x - view.width / view.scale / 2 - 180;
  const right = view.x + view.width / view.scale / 2 + 180;
  if (right < 900) return; // fast cull when player is in west village/lake

  const prev = c.globalAlpha;
  const time = reduced ? 0 : t;
  const puffs = reduced ? 1 : 2;

  for (let i = 0; i < fires.length; i++) {
    const f = fires[i];
    if (f.x < left || f.x > right) continue;
    const active = f.intensity > 0;
    const smolder = !active && f.extinguishedAt !== undefined ? clamp01(1 - (now - f.extinguishedAt) / 4.5) : 0;
    const strength = active ? f.intensity / f.maxIntensity : smolder * 0.5;
    if (strength <= 0.03) continue;

    for (let k = 0; k < puffs; k++) {
      const ph = reduced ? 0.45 : ((time * (0.28 + (i % 3) * 0.04) + k / puffs + i * 0.17) % 1);
      const px = f.x + (wind.dir * (26 + wind.gust * 28) - 10) * ph;
      const py = f.y - 34 - ph * 125;
      const scale = 0.9 + ph * 1.25;
      const bank = getSmokeBank((i + k) % 4, active ? (ph < 0.3 ? 'warm' : 'ash') : 'mist');
      const alpha = (ph < 0.2 ? ph / 0.2 : 1 - (ph - 0.2) / 0.8) * strength * 0.32;
      if (alpha <= 0.015) continue;
      c.globalAlpha = prev * alpha;
      const dw = snap(bank.w * scale * 1.1);
      const dh = snap(bank.h * scale * 1.1);
      c.drawImage(bank.canvas, snap(px - dw / 2), snap(py - dh / 2), dw, dh);
    }
  }

  c.globalAlpha = prev;
}

/** Fast screen-space atmosphere using pre-baked veil canvas + 6 parallax banks. */
export function drawScreenAtmosphere(
  c: CanvasRenderingContext2D,
  opts: {
    view: Viewport;
    playerX: number;
    playerY: number;
    fires: FireHotspot[];
    discovered: boolean;
    t: number;
    wind: Wind;
    reduced: boolean;
  }
) {
  const { view, playerX, playerY, fires, discovered, t, wind, reduced } = opts;
  const { width, height, scale, x: camX, y: camY } = view;
  if (!discovered || width <= 0 || height <= 0) return;

  const prev = c.globalAlpha;
  const prevSmooth = c.imageSmoothingEnabled;
  const time = reduced ? 0 : t;

  let activeCount = 0;
  for (let i = 0; i < fires.length; i++) if (fires[i].intensity > 0) activeCount++;
  const remaining = activeCount / Math.max(1, fires.length);
  const eastness = clamp01((camX - 420) / 1120);

  if (remaining > 0) {
    const hazeIntensity = remaining * (0.28 + eastness * 0.72);

    // 1. Single-blit pre-baked atmospheric veil (stretched smoothly)
    c.imageSmoothingEnabled = true;
    c.globalAlpha = prev * hazeIntensity;
    c.drawImage(getHazeVeil(), 0, 0, width, height);
    c.imageSmoothingEnabled = false;

    // 2. Two crisp parallax smoke-bank layers (6 drawImage calls total)
    const psx = width * 0.5 + (playerX - camX) * scale;
    const psy = height * 0.5 + (playerY - camY - 24) * scale;
    const spanW = width + 520;

    for (let i = 0; i < 6; i++) {
      const far = i < 3;
      const parallax = far ? 0.38 : 0.78;
      const speed = far ? 13 : 23;
      const scaleMul = far ? 2.2 : 2.8;
      const tone = i === 5 && eastness > 0.4 ? 'warm' : far ? 'peat' : 'ash';
      const bank = getSmokeBank(i, tone);
      const bw = Math.round(bank.w * scaleMul);
      const bh = Math.round(bank.h * scaleMul);
      const rawX = -camX * scale * parallax + (reduced ? 0 : time * (speed + wind.dir * 14)) + (i % 3) * (spanW / 3) + (far ? 0 : 190);
      const bx = (((rawX % spanW) + spanW) % spanW) - 260;
      const by = height * (far ? 0.12 + (i % 3) * 0.13 : 0.34 + (i % 3) * 0.19)
        + (reduced ? 0 : Math.sin(time * 0.42 + i * 1.9) * 8);

      const distPlayer = Math.hypot(bx + bw * 0.5 - psx, by + bh * 0.5 - psy);
      const clearHalo = clamp01((distPlayer - 55) / 140);
      const a = (far ? 0.12 : 0.095) * hazeIntensity * (0.45 + 0.55 * clearHalo);
      if (a <= 0.01) continue;

      c.globalAlpha = prev * a;
      c.drawImage(bank.canvas, snap(bx), snap(by), bw, bh);
    }

    // 3. Lightweight airborne ash & micro-embers (max 10 tiny rects)
    if (!reduced) {
      const moteCount = 4 + Math.round(remaining * 6);
      for (let i = 0; i < moteCount; i++) {
        const mx = (((hash(i, 4.1) * width + time * (-18 + wind.dir * 28 - (i % 4) * 4)) % width) + width) % width;
        const my = (((hash(i, 8.7) * height + time * (10 + (i % 3) * 5)) % height) + height) % height;
        const isEmber = eastness > 0.35 && i % 4 === 0;
        c.globalAlpha = prev * remaining * (isEmber ? 0.65 : 0.26);
        c.fillStyle = isEmber ? '#ffd27d' : '#c9c0ae';
        c.fillRect(snap(mx), snap(my), 2, 2);
      }
    }
  } else {
    c.imageSmoothingEnabled = true;
    c.globalAlpha = prev;
    c.drawImage(getSunVeil(), 0, 0, width, height);
    c.imageSmoothingEnabled = prevSmooth;
  }

  c.imageSmoothingEnabled = prevSmooth;
  c.globalAlpha = prev;
}
