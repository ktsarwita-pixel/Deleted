import type { FireHotspot } from '../types/gameTypes';
import type { Viewport } from '../game/model';
import type { Wind } from './physics';

/*
 * Layered Kalimantan Karhutla peat-haze & smoke system.
 * Pre-baked soft pixel-dithered smoke bank sprites + world-space peat mist +
 * rising thermal smoke plumes over hotspots + screen-space volumetric haze,
 * airborne ash motes, sun scattering, and clearing sunbeams when forest heals.
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

/** Bakes a soft, multi-lobed pixel-art fog/smoke bank once and caches it. */
function getSmokeBank(variant: number, tone: 'peat' | 'ash' | 'warm' | 'mist'): CloudBank {
  const key = `${variant}|${tone}`;
  const hit = bankCache.get(key);
  if (hit) return hit;

  const w = 96 + (variant % 3) * 24;
  const h = 28 + (variant % 2) * 10;
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
  const count = 5 + (variant % 3);
  for (let i = 0; i < count; i++) {
    const u = count === 1 ? 0.5 : i / (count - 1);
    lobes.push({
      cx: w * (0.16 + u * 0.68) + (hash(i, variant) - 0.5) * 12,
      cy: h * (0.52 + (hash(variant, i + 3) - 0.5) * 0.24),
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
      // Subtle Bayer ordered dither at edges so pixel aesthetic stays crisp
      const threshold = (BAYER4[y & 3][x & 3] + 0.5) / 16;
      if (density < 0.28 && density * 3.2 < threshold) continue;

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

/**
 * Low-lying ground mist over the lake morning water & creeping peat smoke along
 * the eastern forest floor. Drawn in world coordinates before/among ground details.
 */
export function drawWorldGroundFog(
  c: CanvasRenderingContext2D,
  fires: FireHotspot[],
  t: number,
  wind: Wind,
  reduced: boolean
) {
  const prev = c.globalAlpha;
  const time = reduced ? 0 : t;

  // 1. Cool morning mist hovering gently over Lake Rantau
  for (let i = 0; i < 5; i++) {
    const bank = getSmokeBank(i, 'mist');
    const span = 440;
    const drift = reduced ? i * 78 : ((time * (5 + (i % 2) * 3 + wind.dir * 4) + i * 97) % span);
    const mx = 190 + drift - 40;
    const my = 554 + (i % 3) * 52 + Math.sin(time * 0.55 + i * 1.7) * 4;
    const edgeFade = Math.sin(clamp01((mx - 150) / span) * Math.PI);
    c.globalAlpha = prev * (0.13 + 0.05 * Math.sin(time * 0.7 + i)) * Math.max(0.25, edgeFade);
    c.drawImage(bank.canvas, snap(mx), snap(my), bank.w * 2, bank.h * 2);
  }

  // 2. Peatland ground haze creeping out from active fire hotspots
  const active = fires.filter(f => f.intensity > 0);
  if (active.length > 0) {
    const ratio = active.length / Math.max(1, fires.length);
    const count = 8;
    for (let i = 0; i < count; i++) {
      const tone = i % 3 === 0 ? 'warm' : 'peat';
      const bank = getSmokeBank(i + 2, tone);
      const speed = 12 + (i % 3) * 5 - wind.dir * 14;
      const cycle = 560;
      const travel = reduced ? (i * 67) % cycle : ((time * speed + i * 83) % cycle);
      const wx = 1320 - travel;
      const wy = 145 + ((i * 79) % 560) + Math.sin(time * 0.45 + i) * 8;
      const env = Math.sin(clamp01(travel / cycle) * Math.PI);
      c.globalAlpha = prev * env * (0.14 + ratio * 0.20);
      c.drawImage(bank.canvas, snap(wx - bank.w), snap(wy - bank.h), bank.w * 2, bank.h * 2);
    }
  }

  c.globalAlpha = prev;
}

/**
 * Billowing smoke columns rising from burning/smoldering hotspots in world space,
 * rendered above trees so the forest canopy looks engulfed in rising karhutla plumes.
 */
export function drawWorldCanopySmoke(
  c: CanvasRenderingContext2D,
  fires: FireHotspot[],
  now: number,
  t: number,
  wind: Wind,
  reduced: boolean
) {
  const prev = c.globalAlpha;
  const time = reduced ? 0 : t;

  for (let i = 0; i < fires.length; i++) {
    const f = fires[i];
    const active = f.intensity > 0;
    const smolder = !active && f.extinguishedAt !== undefined ? clamp01(1 - (now - f.extinguishedAt) / 5.5) : 0;
    const strength = active ? f.intensity / f.maxIntensity : smolder * 0.55;
    if (strength <= 0.02) continue;

    const puffs = reduced ? 2 : 4;
    for (let k = 0; k < puffs; k++) {
      const ph = reduced ? (k + 0.35) / puffs : ((time * (0.28 + (i % 3) * 0.04) + k / puffs + i * 0.13) % 1);
      const rise = ph * 135;
      const drift = (wind.dir * (28 + wind.gust * 34) - 12) * ph + Math.sin(time * 1.4 + i + k * 2.1) * (6 * ph);
      const px = f.x + drift;
      const py = f.y - 34 - rise;
      const scale = 0.85 + ph * 1.35;
      const tone = active ? (ph < 0.28 ? 'warm' : 'ash') : 'mist';
      const bank = getSmokeBank((i + k) % 6, tone);
      const alpha = (ph < 0.18 ? ph / 0.18 : 1 - (ph - 0.18) / 0.82) * strength * (active ? 0.34 : 0.26);
      if (alpha <= 0.01) continue;
      c.globalAlpha = prev * alpha;
      const dw = snap(bank.w * scale * 1.15);
      const dh = snap(bank.h * scale * 1.15);
      c.drawImage(bank.canvas, snap(px - dw / 2), snap(py - dh / 2), dw, dh);
    }
  }

  c.globalAlpha = prev;
}

/**
 * Screen-space atmospheric fog & karhutla haze overlay:
 * - Warm dry-season directional haze thicker toward the burning east forest
 * - Subtle clear visibility halo around Wira so gameplay stays super readable
 * - Multi-depth parallax smoke banks drifting with the shared wind field
 * - Floating glowing embers & fine ash motes near the forest edge
 * - Golden clearing sunbeams when all 10 fires are extinguished
 */
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
  if (width <= 0 || height <= 0) return;

  const prev = c.globalAlpha;
  const time = reduced ? 0 : t;
  const activeCount = fires.reduce((acc, f) => acc + (f.intensity > 0 ? 1 : 0), 0);
  const remaining = activeCount / Math.max(1, fires.length);

  // Proximity factor: fog thickens naturally as camera/player approaches the eastern peat forest (x > 760)
  const eastness = clamp01((camX - 420) / 680);

  if (discovered && remaining > 0) {
    const hazeIntensity = remaining * (0.68 + eastness * 0.32);

    // 1. Directional peat-smoke atmospheric gradient (thicker at top-right toward forest fires)
    const grad = c.createLinearGradient(0, height * 0.85, width, 0);
    grad.addColorStop(0, `rgba(156, 134, 98, ${(0.06 * hazeIntensity).toFixed(3)})`);
    grad.addColorStop(0.55, `rgba(178, 146, 102, ${(0.13 * hazeIntensity).toFixed(3)})`);
    grad.addColorStop(1, `rgba(202, 142, 88, ${(0.23 * hazeIntensity).toFixed(3)})`);
    c.fillStyle = grad;
    c.fillRect(0, 0, width, height);

    // Upper canopy smoke veil
    const topVeil = c.createLinearGradient(0, 0, 0, height * 0.42);
    topVeil.addColorStop(0, `rgba(168, 148, 118, ${(0.18 * hazeIntensity).toFixed(3)})`);
    topVeil.addColorStop(1, 'rgba(168, 148, 118, 0)');
    c.fillStyle = topVeil;
    c.fillRect(0, 0, width, height * 0.42);

    // 2. Three parallax layers of pixel-dithered smoke banks drifting with wind & camera
    const layers = [
      { count: 4, parallax: 0.35, speed: 11, scaleMul: 2.1, alpha: 0.13, yBase: 0.10, ySpan: 0.32, tone: 'peat' as const },
      { count: 4, parallax: 0.65, speed: 19, scaleMul: 2.6, alpha: 0.11, yBase: 0.24, ySpan: 0.48, tone: 'ash' as const },
      { count: 3, parallax: 0.95, speed: 28, scaleMul: 3.1, alpha: 0.09, yBase: 0.52, ySpan: 0.38, tone: 'warm' as const },
    ];

    const psx = width / 2 + (playerX - camX) * scale;
    const psy = height / 2 + (playerY - camY - 24) * scale;

    for (let li = 0; li < layers.length; li++) {
      const L = layers[li];
      const spanW = width + 560;
      for (let i = 0; i < L.count; i++) {
        const bank = getSmokeBank(li * 3 + i, i % 3 === 0 && eastness > 0.45 ? 'warm' : L.tone);
        const bw = Math.round(bank.w * L.scaleMul);
        const bh = Math.round(bank.h * L.scaleMul);
        const windVel = L.speed + wind.dir * (10 + L.speed * 0.55);
        const rawX = -camX * scale * L.parallax + (reduced ? 0 : time * windVel) + i * (spanW / L.count) + li * 137;
        const bx = (((rawX % spanW) + spanW) % spanW) - 280;
        const rawY = height * (L.yBase + ((i * 0.37 + li * 0.19) % 1) * L.ySpan)
          - (camY - 410) * scale * (L.parallax * 0.25)
          + (reduced ? 0 : Math.sin(time * 0.42 + i * 1.9 + li) * 10);

        // Keep Wira's immediate face/torso clear enough to read cleanly
        const distPlayer = Math.hypot(bx + bw * 0.5 - psx, rawY + bh * 0.5 - psy);
        const clearHalo = clamp01((distPlayer - 55) / 145);
        const a = L.alpha * hazeIntensity * (0.42 + 0.58 * clearHalo);
        if (a <= 0.008) continue;

        c.globalAlpha = prev * a;
        c.drawImage(bank.canvas, snap(bx), snap(rawY), bw, bh);
      }
    }

    // 3. Airborne peat ash & glowing micro-embers drifting across the viewport
    if (!reduced) {
      const moteCount = Math.round(10 + remaining * 16);
      for (let i = 0; i < moteCount; i++) {
        const speedX = -18 + wind.dir * 32 - (i % 5) * 4;
        const speedY = 9 + (i % 4) * 5;
        const mx = (((hash(i, 4.1) * width + time * speedX) % width) + width) % width;
        const my = (((hash(i, 8.7) * height + time * speedY + Math.sin(time * 1.6 + i) * 9) % height) + height) % height;
        const isEmber = eastness > 0.35 && i % 5 === 0;
        c.globalAlpha = prev * remaining * (isEmber ? 0.55 + 0.35 * Math.sin(time * 6 + i) : 0.28);
        c.fillStyle = isEmber ? (i % 2 ? '#ffb35c' : '#ffe094') : (i % 2 ? '#cfc6b4' : '#9e9688');
        c.fillRect(snap(mx), snap(my), isEmber ? 3 : 2, 2);
      }
    }

    // 4. Warm orange fire-horizon rim along the right edge when near the forest
    if (eastness > 0.2) {
      const rim = c.createLinearGradient(width * 0.72, 0, width, 0);
      rim.addColorStop(0, 'rgba(235, 118, 52, 0)');
      rim.addColorStop(1, `rgba(235, 118, 52, ${(0.16 * remaining * eastness).toFixed(3)})`);
      c.globalAlpha = prev;
      c.fillStyle = rim;
      c.fillRect(width * 0.72, 0, width * 0.28, height);
    }
  } else if (discovered && remaining === 0) {
    // Forest healed: crisp golden Kalimantan morning sunbeams & gentle fresh mist
    const skyGlow = c.createLinearGradient(0, 0, 0, height * 0.55);
    skyGlow.addColorStop(0, 'rgba(255, 236, 172, 0.14)');
    skyGlow.addColorStop(1, 'rgba(255, 236, 172, 0)');
    c.globalAlpha = prev;
    c.fillStyle = skyGlow;
    c.fillRect(0, 0, width, height * 0.55);

    c.save();
    for (let i = 0; i < 4; i++) {
      const rx = width * (0.18 + i * 0.22) + (reduced ? 0 : Math.sin(time * 0.3 + i) * 18);
      const beam = c.createLinearGradient(rx, 0, rx + 90, height * 0.75);
      beam.addColorStop(0, 'rgba(255, 244, 196, 0.08)');
      beam.addColorStop(1, 'rgba(255, 244, 196, 0)');
      c.fillStyle = beam;
      c.beginPath();
      c.moveTo(rx - 28, 0);
      c.lineTo(rx + 36, 0);
      c.lineTo(rx + 150, height * 0.75);
      c.lineTo(rx + 42, height * 0.75);
      c.closePath();
      c.fill();
    }
    c.restore();
  }

  c.globalAlpha = prev;
}
