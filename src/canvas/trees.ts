/* Procedural Kalimantan rainforest & village trees + understory props, pre-baked & cached. */
const SCALE = 2;
const h2 = (x: number, y: number) => {
  const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

interface TreeSprite {
  trunk: HTMLCanvasElement;      // Full rooted wood skeleton (roots + trunk + primary boughs / snag limbs)
  canopy: HTMLCanvasElement;     // Foliage crown cushions only (never detached wood branches!)
  highlights: HTMLCanvasElement; // Interior sunlit leaf clusters (strictly inset inside canopy)
  stemTopH: number;              // Height from ground to where canopy base meets the trunk fork
}

const cache = new Map<string, TreeSprite>();
const propCache = new Map<string, HTMLCanvasElement>();

function outline(canvas: HTMLCanvasElement, rgb: [number, number, number]) {
  const ctx = canvas.getContext('2d')!;
  const { width: w, height: h } = canvas;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const out = new Uint8ClampedArray(d);
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (!d[i + 3] && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) {
        out[i] = rgb[0];
        out[i + 1] = rgb[1];
        out[i + 2] = rgb[2];
        out[i + 3] = 255;
      }
    }
  }
  img.data.set(out);
  ctx.putImageData(img, 0, 0);
  return canvas;
}

function makeCanvas(w: number, h: number) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

/** Draws a pixel-stepped elliptical foliage cushion with scalloped leaf silhouette. */
function fillLeafDome(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  pal: string[],
  seed: number
) {
  const x0 = Math.floor(cx - rx - 2), x1 = Math.ceil(cx + rx + 2);
  const y0 = Math.floor(cy - ry - 2), y1 = Math.ceil(cy + ry + 2);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      const ang = Math.atan2(ny, nx);
      const scallop = 1 + Math.sin(ang * 7 + seed * 2.1) * 0.08 + Math.cos(ang * 11 - seed) * 0.05;
      const dist = Math.hypot(nx, ny * 1.06) / scallop;
      if (dist > 1) continue;

      let lit = -nx * 0.48 - ny * 0.86;
      if (ny > 0.38) lit -= (ny - 0.38) * 1.25;
      const cell = h2(Math.floor(x * 0.5) + seed * 13, Math.floor(y * 0.5) + seed * 7);
      lit += (cell - 0.5) * 0.28;

      const idx = lit > 0.56 ? 5 : lit > 0.24 ? 4 : lit > -0.08 ? 3 : lit > -0.44 ? 2 : lit > -0.78 ? 1 : 0;
      ctx.fillStyle = pal[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const fanCount = Math.max(3, Math.round(rx * 0.55));
  for (let i = 0; i < fanCount; i++) {
    const t = -2.55 + (i / Math.max(1, fanCount - 1)) * 1.85;
    const fx = Math.round(cx + Math.cos(t) * rx * 0.72);
    const fy = Math.round(cy + Math.sin(t) * ry * 0.68);
    ctx.fillStyle = i % 2 === 0 ? pal[5] : pal[4];
    ctx.fillRect(fx - 1, fy, 3, 1);
    ctx.fillRect(fx, fy - 1, 2, 2);
  }
}

/** Draws a tapered wooden limb on the unified trunk+branch canvas (never detached!). */
function drawLimb(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  thick0: number,
  thick1: number,
  dark: string,
  mid: string,
  lit: string
) {
  const steps = Math.max(4, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  for (let s = 0; s <= steps; s++) {
    const u = s / steps;
    const x = Math.round(x0 + (x1 - x0) * u + Math.sin(u * Math.PI) * 0.5);
    const y = Math.round(y0 + (y1 - y0) * u);
    const th = Math.max(1, Math.round(thick0 + (thick1 - thick0) * u));
    const hw = Math.floor(th / 2);
    ctx.fillStyle = mid;
    ctx.fillRect(x - hw, y - hw, th, th);
    ctx.fillStyle = lit;
    ctx.fillRect(x - hw, y - hw, Math.max(1, th - 1), 1);
    if (th >= 2) {
      ctx.fillStyle = dark;
      ctx.fillRect(x + hw, y, 1, Math.max(1, th - 1));
    }
  }
}

function build(size: number, burnt: boolean, variant: number): TreeSprite {
  const R = Math.round(22 * size);
  const cw = R * 2 + 16;
  const ch = Math.round(R * 1.9) + 16;
  const stemH = Math.round(22 * size);
  const overlapY = Math.round(R * 0.72);

  // Unified Wood Skeleton Canvas (same width `cw` so wide forked boughs & snag limbs stay 100% attached to trunk!)
  const woodH = ch + stemH - overlapY + 4;
  const { canvas: trunk, ctx: tx } = makeCanvas(cw, woodH);
  const { canvas: canopy, ctx: cx } = makeCanvas(cw, ch);
  const { canvas: highlights, ctx: hx } = makeCanvas(cw, ch);

  const midX = Math.round(cw / 2);
  const groundY = woodH - 3; // exact root plane inside `trunk` canvas
  const forkY = groundY - stemH;

  const P = (x: number, y: number, w: number, h: number, c: string) => {
    if (w > 0 && h > 0) {
      tx.fillStyle = c;
      tx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    }
  };

  const bark = burnt
    ? ['#1d1612', '#30261f', '#4a3b30', '#635042']
    : ['#362517', '#543b24', '#785636', '#9e7449'];
  const tw = Math.max(8, Math.round(8 * size));
  const ox = midX - Math.floor(tw / 2);

  // 1) Rooted Trunk Column + Sweeping Kalimantan Plank Buttress Roots ('Akar Banir')
  P(ox, forkY, tw, stemH, bark[1]);
  P(ox + 1, forkY, Math.max(2, Math.round(tw * 0.35)), stemH - 1, bark[2]);
  P(ox + 1, forkY + 2, 1, stemH - 5, bark[3]);
  P(ox + tw - 2, forkY, 2, stemH, bark[0]);

  for (let r = 0; r < 7; r++) {
    const spreadL = Math.round((r / 6) * 7);
    const spreadR = Math.round((r / 6) * 8);
    const ry = groundY - 7 + r;
    P(ox - spreadL, ry, spreadL + 2, 2, bark[2]);
    P(ox - spreadL, ry, 2, 1, bark[3]);
    P(ox + tw - 2, ry, spreadR + 2, 2, bark[0]);
    P(ox + tw - 2, ry, Math.max(1, spreadR - 2), 1, bark[1]);
    P(ox + Math.floor(tw * 0.45), ry, 2, 2, bark[2]);
  }

  // Bark fissures & heartwood knot
  for (let y = forkY + 4; y < groundY - 6; y += 4) {
    const bx = ox + 2 + Math.floor(h2(y, variant) * Math.max(2, tw - 4));
    P(bx, y, 1, 3, bark[0]);
  }
  const ky = forkY + Math.floor(stemH * 0.44);
  P(ox + Math.floor(tw * 0.4), ky, 3, 3, bark[0]);
  P(ox + Math.floor(tw * 0.4) + 1, ky + 1, 1, 1, '#1a110b');

  // 2) Forked Primary Boughs / Burnt Snag Skeleton — ALL drawn onto `tx` (`trunk` canvas) so branches NEVER slide off the trunk!
  if (burnt) {
    const bTop = groundY - stemH - ch + overlapY;
    const limbs: [number, number, number, number, number, number][] = [
      [midX - 1, forkY + 3, midX - R * 0.66, bTop + ch * 0.46, 5, 1],
      [midX + 1, forkY + 3, midX + R * 0.64, bTop + ch * 0.48, 5, 1],
      [midX - 1, forkY + 1, midX - R * 0.34, bTop + ch * 0.20, 4, 1],
      [midX + 1, forkY + 1, midX + R * 0.32, bTop + ch * 0.22, 4, 1],
      [midX,     forkY + 2, midX + (variant - 1) * 4, bTop + ch * 0.14, 3, 1],
      // Secondary forked dead twigs
      [midX - R * 0.38, bTop + ch * 0.35, midX - R * 0.72, bTop + ch * 0.28, 2, 1],
      [midX + R * 0.36, bTop + ch * 0.37, midX + R * 0.70, bTop + ch * 0.30, 2, 1],
      [midX - R * 0.22, bTop + ch * 0.26, midX - R * 0.44, bTop + ch * 0.14, 2, 1],
      [midX + R * 0.20, bTop + ch * 0.28, midX + R * 0.46, bTop + ch * 0.15, 2, 1],
    ];
    for (const [x0, y0, x1, y1, t0, t1] of limbs) {
      drawLimb(tx, x0, y0, x1, y1, t0, t1, bark[0], bark[1], bark[2]);
    }
    // Smoldering ember cracks baked directly onto the charred wood skeleton (never floats off!)
    for (const [ex, ey] of [
      [midX - Math.round(R * 0.26), Math.round(bTop + ch * 0.40)],
      [midX + Math.round(R * 0.24), Math.round(bTop + ch * 0.42)],
      [ox + 2, ky + 3],
    ]) {
      P(ex, ey, 3, 1, '#c9431e');
      P(ex + 1, ey, 1, 1, '#ffd466');
    }
  } else {
    // Living sturdy primary wooden boughs reaching cleanly from trunk top up into canopy interior
    drawLimb(tx, midX - 2, forkY + 4, midX - R * 0.40, forkY - R * 0.28, 5, 2, bark[0], bark[1], bark[2]);
    drawLimb(tx, midX + 2, forkY + 4, midX + R * 0.40, forkY - R * 0.26, 5, 2, bark[0], bark[1], bark[2]);
    drawLimb(tx, midX,     forkY + 3, midX,            forkY - R * 0.38, 5, 3, bark[0], bark[1], bark[2]);

    // Velvet emerald root moss + epiphytic fern tuft on trunk
    P(ox - 4, groundY - 3, 5, 2, '#3d6331');
    P(ox - 3, groundY - 4, 3, 1, '#689449');
    P(ox + tw - 1, groundY - 3, 4, 2, '#35572b');
    if (variant === 1) {
      P(ox - 2, ky - 2, 5, 2, '#3b6331');
      P(ox - 3, ky - 4, 7, 2, '#5c8c43');
      P(ox - 1, ky - 5, 3, 1, '#8bbd5e');
    }
  }
  outline(trunk, [20, 14, 10]);

  // 3) Foliage Canopy Cushions ONLY on `canopy` (so wind sways leaves naturally without detaching branches!)
  if (burnt) {
    const scorchPal = ['#1f1915', '#2e251e', '#45372b', '#5e4a38', '#785e46', '#917355'];
    for (const [bx, by, brx, bry, sd] of [
      [midX - R * 0.48, ch * 0.47, R * 0.26, R * 0.17, 1 + variant],
      [midX + R * 0.46, ch * 0.49, R * 0.25, R * 0.16, 4 + variant],
      [midX - R * 0.18, ch * 0.30, R * 0.24, R * 0.15, 7 + variant],
      [midX + R * 0.20, ch * 0.34, R * 0.21, R * 0.14, 9 + variant],
    ] as [number, number, number, number, number][]) {
      fillLeafDome(cx, bx, by, brx, bry, scorchPal, sd);
    }
    outline(canopy, [20, 15, 12]);
  } else {
    const palettes: string[][] = [
      ['#112219', '#1b3623', '#294f2d', '#3e7039', '#619448', '#90bd5e'],
      ['#12241b', '#1d3926', '#2b5432', '#427840', '#699e4f', '#9bc968'],
      ['#142419', '#213b23', '#33592d', '#4c7c39', '#75a349', '#a6cc64'],
    ];
    const pal = palettes[variant % 3];

    const backDomes: [number, number, number, number, number][] = [
      [midX - R * 0.54, ch * 0.62, R * 0.44, R * 0.30, 1],
      [midX + R * 0.54, ch * 0.63, R * 0.44, R * 0.30, 2],
      [midX,            ch * 0.65, R * 0.58, R * 0.34, 3],
    ];
    for (const [bx, by, rx, ry, sd] of backDomes) {
      fillLeafDome(cx, bx, by, rx, ry, [pal[0], pal[0], pal[1], pal[2], pal[3], pal[3]], sd + variant);
    }

    const mainDomes: [number, number, number, number, number][] =
      variant === 0
        ? [
            [midX - R * 0.62, ch * 0.54, R * 0.42, R * 0.29, 4],
            [midX + R * 0.60, ch * 0.55, R * 0.42, R * 0.29, 5],
            [midX - R * 0.26, ch * 0.56, R * 0.46, R * 0.32, 6],
            [midX + R * 0.28, ch * 0.56, R * 0.44, R * 0.31, 7],
            [midX - R * 0.38, ch * 0.36, R * 0.42, R * 0.30, 8],
            [midX + R * 0.34, ch * 0.38, R * 0.40, R * 0.28, 9],
            [midX - R * 0.06, ch * 0.25, R * 0.48, R * 0.33, 10],
          ]
        : variant === 1
        ? [
            [midX - R * 0.66, ch * 0.56, R * 0.44, R * 0.32, 11],
            [midX + R * 0.66, ch * 0.57, R * 0.44, R * 0.32, 12],
            [midX,            ch * 0.57, R * 0.54, R * 0.34, 13],
            [midX - R * 0.44, ch * 0.37, R * 0.45, R * 0.32, 14],
            [midX + R * 0.42, ch * 0.39, R * 0.44, R * 0.31, 15],
            [midX - R * 0.10, ch * 0.27, R * 0.50, R * 0.34, 16],
          ]
        : [
            [midX - R * 0.56, ch * 0.58, R * 0.43, R * 0.29, 17],
            [midX + R * 0.58, ch * 0.58, R * 0.42, R * 0.29, 18],
            [midX,            ch * 0.54, R * 0.50, R * 0.32, 19],
            [midX - R * 0.34, ch * 0.38, R * 0.44, R * 0.29, 20],
            [midX + R * 0.36, ch * 0.40, R * 0.40, R * 0.28, 21],
            [midX - R * 0.14, ch * 0.24, R * 0.45, R * 0.31, 22],
            [midX + R * 0.14, ch * 0.28, R * 0.36, R * 0.26, 23],
          ];

    for (const [bx, by, rx, ry, sd] of mainDomes) {
      fillLeafDome(cx, bx, by, rx, ry, pal, sd);
    }

    if (variant === 1) {
      for (const [vx, vy, vh] of [
        [midX - Math.round(R * 0.62), Math.round(ch * 0.68), 7],
        [midX + Math.round(R * 0.60), Math.round(ch * 0.70), 6],
      ]) {
        cx.fillStyle = '#3f5732';
        cx.fillRect(vx, vy, 1, vh);
        cx.fillStyle = '#628546';
        cx.fillRect(vx, vy + 1, 1, Math.max(2, vh - 3));
      }
    }

    const mask = cx.getImageData(0, 0, cw, ch).data;
    const on = (x: number, y: number) => x >= 0 && y >= 0 && x < cw && y < ch && mask[(y * cw + x) * 4 + 3] > 0;
    const deepInside = (x: number, y: number) => on(x - 3, y) && on(x + 5, y) && on(x, y - 3) && on(x, y + 3);

    for (let i = 0; i < 6; i++) {
      const fx = 6 + Math.floor(h2(i + 31, variant + 5) * (cw - 14));
      const fy = 6 + Math.floor(h2(i + 47, variant + 9) * (ch * 0.56));
      if (!deepInside(fx, fy)) continue;
      const [baseCol, hiCol] = variant === 2
        ? ['#e0533c', '#ff9b73']
        : i % 2 === 0
        ? ['#e8a638', '#ffe082']
        : ['#d44d3a', '#ff9478'];
      cx.fillStyle = baseCol;
      cx.fillRect(fx, fy, 3, 2);
      cx.fillRect(fx + 1, fy + 2, 1, 1);
      cx.fillStyle = hiCol;
      cx.fillRect(fx, fy, 2, 1);
    }

    outline(canopy, [15, 28, 19]);

    // Sunlit leaf highlights strictly deep inside the canopy so 1px rustle NEVER pokes outside the outline!
    for (let i = 0; i < Math.round(R * 1.3); i++) {
      const lx = 8 + Math.floor(h2(i + variant * 13, 7) * (cw - 16));
      const ly = 6 + Math.floor(h2(i + variant * 19, 3) * (ch * 0.52));
      if (!deepInside(lx, ly)) continue;
      hx.fillStyle = i % 3 === 0 ? '#bde079' : '#96c45c';
      hx.fillRect(lx, ly, 3 + (i % 2), 1);
      hx.fillRect(lx + 1, ly - 1, 2, 2);
    }
  }

  return { trunk, canopy, highlights, stemTopH: stemH - overlapY };
}

export function treeSprite(size: number, burnt: boolean, variant: number) {
  const key = `${Math.round(size * 10)}|${burnt}|${variant}`;
  let s = cache.get(key);
  if (!s) {
    s = build(size, burnt, variant);
    cache.set(key, s);
  }
  return s;
}

export const treeVariant = (x: number, y: number) => Math.floor(h2(x * 0.37, y * 0.71) * 3);

/**
 * Roots planted firmly at (x, y).
 * Trunk & branches share one rooted skeleton (zero root sliding or severed branches!),
 * while upper foliage gently bends with wind shear from the crown collar.
 */
export function drawTree(c: CanvasRenderingContext2D, x: number, y: number, s = 1, burnt = false, sway = 0, alpha = 1) {
  const t = treeSprite(s, burnt, treeVariant(x, y));
  const rx = Math.round(x), ry = Math.round(y);
  const prev = c.globalAlpha;
  c.globalAlpha = prev * alpha;

  // Clamp sway to natural gentle Kalimantan breeze so crowns never detach or over-skew
  const clampedSway = Math.max(-3.5, Math.min(3.5, sway));

  if (alpha >= 1) {
    c.fillStyle = burnt ? 'rgba(18,16,14,.22)' : 'rgba(14,28,18,.30)';
    const sw = Math.round(t.canopy.width * SCALE * (burnt ? 0.48 : 0.72));
    c.fillRect(rx - Math.round(sw * 0.46) + 8, ry - 5, sw, 12);
    c.fillRect(rx - Math.round(sw * 0.34) + 10, ry - 9, Math.round(sw * 0.72), 19);
  }

  const trunkW = t.trunk.width * SCALE, trunkH = t.trunk.height * SCALE;
  const cw = t.canopy.width * SCALE, ch = t.canopy.height * SCALE;

  // 1) Rooted Wood Skeleton (roots fixed at (rx, ry); subtle top wood flex only!)
  const woodTipLean = clampedSway * (burnt ? 0.32 : 0.48);
  c.save();
  c.translate(rx, ry + 6);
  c.transform(1, 0, -woodTipLean / Math.max(1, trunkH), 1, 0, 0);
  c.drawImage(t.trunk, -trunkW / 2, -trunkH, trunkW, trunkH);
  c.restore();

  // 2) Foliage Crown anchored to the exact collar position at the top of the stem, bending smoothly upward!
  const collarY = ry - t.stemTopH * SCALE;
  const collarX = rx + woodTipLean * ((t.stemTopH * SCALE) / Math.max(1, trunkH));
  const crownTopFlex = clampedSway * (burnt ? 0.55 : 1.65);

  c.save();
  c.translate(collarX, collarY);
  c.transform(1, 0, -crownTopFlex / Math.max(1, ch), 1, 0, 0);
  c.drawImage(t.canopy, -cw / 2, -ch, cw, ch);
  if (!burnt) {
    // Subtle 1px leaf-shimmer rustle inside the same sheared crown space (zero vertical hop or outline escape!)
    const rustle = Math.max(-1.5, Math.min(1.5, clampedSway * 0.42));
    c.drawImage(t.highlights, -cw / 2 + rustle, -ch, cw, ch);
  }
  c.restore();

  c.globalAlpha = prev;
}

export function canopyCenter(s: number, x: number, y: number) {
  const t = treeSprite(s, true, treeVariant(x, y));
  const ch = t.canopy.height * SCALE;
  return { y: y - t.stemTopH * SCALE - ch * 0.5, w: t.canopy.width * SCALE };
}

/* ---------------- forest floor props ---------------- */

type PropKind = 'fern' | 'sapling' | 'log' | 'rock' | 'banana' | 'bush';

function bakeProp(kind: PropKind, variant: number, burnt: boolean): HTMLCanvasElement {
  const key = `${kind}|${variant}|${burnt}`;
  const hit = propCache.get(key);
  if (hit) return hit;
  const w = kind === 'banana' ? 32 : kind === 'log' ? 36 : 22;
  const h = kind === 'banana' ? 36 : kind === 'log' ? 15 : 22;
  const { canvas, ctx } = makeCanvas(w, h);
  const P = (x: number, y: number, ww: number, hh: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(ww), Math.round(hh));
  };
  const dead = burnt;
  const green = dead ? ['#3d3329', '#574839', '#73604b', '#8c765c'] : ['#234226', '#376332', '#588c42', '#87ba58'];

  if (kind === 'fern') {
    for (let i = 0; i < 7; i++) {
      const a = -1.25 + i * 0.42, len = 8 + (i % 3) * 2;
      for (let k = 0; k < len; k++) {
        const droop = k * k * 0.035;
        const x = Math.round(w / 2 + Math.sin(a) * k);
        const y = Math.round(h - 3 - Math.cos(a) * k * 0.85 + droop);
        P(x, y, 2, 2, green[k > len * 0.6 ? 3 : k % 2 ? 2 : 1]);
        if (k % 2 === 1) P(x - 1, y + 1, 1, 1, green[0]);
      }
    }
    P(w / 2 - 2, h - 3, 4, 2, green[0]);
  } else if (kind === 'sapling') {
    P(w / 2 - 1, 5, 2, h - 7, dead ? '#453629' : '#5e462d');
    for (let i = 0; i < 5; i++) {
      const y = 6 + i * 3, dir = i % 2 ? 1 : -1;
      P(w / 2 + dir * 2, y, 5, 2, green[1]);
      P(w / 2 + dir * 4, y - 1, 3, 2, green[2]);
      P(w / 2 + dir * 5, y - 1, 2, 1, green[3]);
    }
    P(w / 2 - 3, 2, 7, 3, green[2]);
    P(w / 2 - 2, 1, 4, 2, green[3]);
  } else if (kind === 'log') {
    P(2, 5, w - 4, 8, dead ? '#302720' : '#5e432b');
    P(2, 5, w - 4, 2, dead ? '#4d3e32' : '#8a6642');
    P(2, 11, w - 4, 2, '#261c14');
    for (let x = 5; x < w - 5; x += 5) P(x, 8, 3, 1, dead ? '#42352a' : '#735336');
    P(0, 4, 4, 9, dead ? '#473b30' : '#856544');
    P(1, 5, 2, 7, dead ? '#6e5e4f' : '#cca97e');
    P(w - 4, 4, 4, 9, dead ? '#403429' : '#75583a');
    if (!dead) {
      P(7, 4, 6, 2, '#59823e'); P(8, 3, 4, 1, '#84ad56');
      P(21, 4, 5, 2, '#59823e');
      P(15, 8, 3, 2, '#d98236'); P(15, 8, 2, 1, '#ffd080');
    } else {
      P(9, 4, 5, 1, '#8e8880'); P(18, 7, 3, 1, '#d95326');
    }
  } else if (kind === 'rock') {
    P(3, 9, 15, 8, '#505752');
    P(4, 6, 13, 10, '#69716a');
    P(6, 5, 8, 4, '#8b948b');
    P(7, 5, 4, 2, '#b2bab0');
    P(3, 15, 15, 2, '#3c423d');
    if (!dead) {
      P(3, 13, 4, 3, '#4f753a'); P(4, 12, 2, 1, '#78a14f');
      P(15, 12, 3, 3, '#4f753a');
    }
  } else if (kind === 'banana') {
    P(w / 2 - 2, 11, 4, h - 12, dead ? '#544634' : '#65853f');
    P(w / 2 - 2, 11, 1, h - 12, dead ? '#6e5c45' : '#8cb056');
    for (let i = 0; i < 6; i++) {
      const a = -1.35 + i * 0.54;
      for (let k = 2; k < 13; k++) {
        const droop = k > 8 ? (k - 8) * 0.8 : 0;
        const x = Math.round(w / 2 + Math.sin(a) * k);
        const y = Math.round(12 - Math.cos(a) * k * 0.58 + droop);
        const t = 1 + Math.round((1 - k / 13) * 2.2);
        P(x - t, y, t * 2 + 1, 2, green[k % 3 === 0 ? 3 : 2]);
        P(x, y, 1, 1, green[3]);
        if (k % 4 === 0) P(x - t, y + 2, t * 2 + 1, 1, green[0]);
      }
    }
    P(w / 2 - 3, h - 2, 6, 2, green[0]);
  } else {
    for (let i = 0; i < 11; i++) {
      const bx = 3 + Math.floor(h2(i, variant) * (w - 9));
      const by = h - 4 - Math.floor(h2(i + 5, variant) * 10);
      P(bx, by, 5 + (i % 3), 4, green[1 + (i % 2)]);
      P(bx + 1, by - 1, 3, 2, green[3]);
    }
    if (!dead && variant !== 1) {
      P(6, h - 10, 2, 2, '#f26d52'); P(13, h - 8, 2, 2, '#ffd166');
    }
    P(2, h - 3, w - 4, 3, green[0]);
  }
  const out = outline(canvas, dead ? [24, 19, 15] : [16, 29, 19]);
  propCache.set(key, out);
  return out;
}

/** Props stay rooted at (x, y); living plants bend from their base while rocks/logs stay solid. */
export function drawProp(c: CanvasRenderingContext2D, kind: PropKind, x: number, y: number, burnt: boolean, sway = 0, scale = 1) {
  const spr = bakeProp(kind, Math.floor(h2(x * 0.31, y * 0.17) * 3), burnt);
  const w = Math.round(spr.width * SCALE * scale);
  const h = Math.round(spr.height * SCALE * scale);
  const rx = Math.round(x), ry = Math.round(y);
  c.fillStyle = 'rgba(14,28,18,.24)';
  c.fillRect(Math.round(rx - w * 0.32), ry - 2, Math.round(w * 0.64), 5);
  if (kind === 'rock' || kind === 'log' || sway === 0) {
    c.drawImage(spr, Math.round(rx - w / 2), ry - h, w, h);
  } else {
    const lean = Math.max(-4, Math.min(4, sway * 0.45));
    c.save();
    c.translate(rx, ry);
    c.transform(1, 0, -lean / Math.max(1, h), 1, 0, 0);
    c.drawImage(spr, -w / 2, -h, w, h);
    c.restore();
  }
}

let treesWarmed = false;
export function warmupTrees() {
  if (treesWarmed || typeof document === 'undefined') return;
  treesWarmed = true;
  for (const burnt of [false, true]) {
    for (let v = 0; v < 3; v++) {
      for (const s of [0.8, 0.9, 1.0, 1.1, 1.2, 1.3]) treeSprite(s, burnt, v);
      for (const k of ['fern', 'sapling', 'log', 'rock', 'banana', 'bush'] as PropKind[]) bakeProp(k, v, burnt);
    }
  }
}
