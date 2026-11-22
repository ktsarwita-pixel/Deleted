/* Procedural Kalimantan trees + forest floor props, all baked once and cached. */
const SCALE = 2;
const h2 = (x: number, y: number) => { const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return v - Math.floor(v); };

interface TreeSprite {
  trunk: HTMLCanvasElement; canopy: HTMLCanvasElement; highlights: HTMLCanvasElement;
  trunkH: number; canopyDrop: number;
}
const cache = new Map<string, TreeSprite>();
const propCache = new Map<string, HTMLCanvasElement>();

function outline(canvas: HTMLCanvasElement, rgb: [number, number, number]) {
  const ctx = canvas.getContext('2d')!;
  const { width: w, height: h } = canvas;
  const img = ctx.getImageData(0, 0, w, h); const d = img.data; const out = new Uint8ClampedArray(d);
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (!d[i + 3] && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) {
      out[i] = rgb[0]; out[i + 1] = rgb[1]; out[i + 2] = rgb[2]; out[i + 3] = 255;
    }
  }
  img.data.set(out); ctx.putImageData(img, 0, 0); return canvas;
}

function makeCanvas(w: number, h: number) {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!; ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

function build(size: number, burnt: boolean, variant: number): TreeSprite {
  const R = Math.round(19 * size);
  const cw = R * 2 + 10, ch = Math.round(R * 1.8) + 12;
  const { canvas: canopy, ctx: cx } = makeCanvas(cw, ch);

  // Canopy is a cluster of lobes: a broad base, a crown and one off-centre peak.
  const blobs: { x: number; y: number; r: number }[] = [{ x: cw / 2, y: ch * 0.58, r: R * 0.8 }];
  const n = 6 + variant;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + variant * 0.8;
    blobs.push({
      x: cw / 2 + Math.cos(a) * R * 0.54,
      y: ch * 0.54 + Math.sin(a) * R * 0.4 - R * 0.06,
      r: R * (0.4 + h2(i, variant) * 0.2),
    });
  }
  blobs.push({ x: cw / 2 - R * 0.18, y: ch * 0.28, r: R * 0.46 });
  blobs.push({ x: cw / 2 + R * 0.24, y: ch * 0.4, r: R * 0.34 });

  const pal = burnt
    ? ['#241f1a', '#3d332a', '#584636', '#7a5f45', '#9a7a52']
    : ['#16291d', '#234027', '#33592f', '#4d7a3d', '#79a04e'];
  const inside = (x: number, y: number) => {
    let best: { x: number; y: number; r: number } | null = null, bd = 2;
    for (const b of blobs) {
      const d = Math.hypot(x - b.x, y - b.y) / b.r;
      if (d < 1 && (d < bd || (best && b.y > best.y && d < 0.94))) { bd = d; best = b; }
    }
    return best ? { best, bd } : null;
  };

  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const hit = inside(x, y);
    if (!hit) continue;
    const { best, bd } = hit;
    // burnt canopies lose their outer leaves, leaving a ragged skeleton
    if (burnt && h2(x, y + variant) > 0.58 && bd > 0.32) continue;
    const nx = (x - best.x) / best.r, ny = (y - best.y) / best.r;
    let lit = -nx * 0.5 - ny * 0.88 + (h2(x * 3, y * 5) - 0.5) * 0.5;
    if (ny > 0.5 && bd > 0.76) lit -= 0.95;
    if (ny < -0.55 && nx < -0.1) lit += 0.22;
    const idx = lit > 0.6 ? 4 : lit > 0.16 ? 3 : lit > -0.3 ? 2 : lit > -0.78 ? 1 : 0;
    cx.fillStyle = pal[idx]; cx.fillRect(x, y, 1, 1);
  }

  // Leaf sprigs and, on healthy trees, fruit and blossom.
  const mask = cx.getImageData(0, 0, cw, ch).data;
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < cw && y < ch && mask[(y * cw + x) * 4 + 3] > 0;
  for (let i = 0; i < R * 2; i++) {
    const x = Math.floor(h2(i, 7 + variant) * cw), y = Math.floor(h2(i, 3 + variant) * ch * 0.75);
    if (!on(x, y)) continue;
    cx.fillStyle = burnt ? (i % 3 ? '#6b563f' : '#8a6b48') : (i % 3 ? pal[4] : pal[3]);
    cx.fillRect(x, y, 3 + (i % 2), 1);
    cx.fillRect(x + 2, y - 2, 1, 2);
    cx.fillRect(x + 4, y + 2, 2, 1);
  }
  if (!burnt) {
    for (let i = 0; i < 5; i++) {
      const x = 4 + Math.floor(h2(i + 31, variant + 5) * (cw - 10));
      const y = 6 + Math.floor(h2(i + 47, variant + 9) * (ch * 0.6));
      if (!on(x, y) || !on(x, y + 2)) continue;
      const fruit = i % 2 ? ['#e0a13c', '#f4c96b'] : ['#c9483a', '#e8836a'];
      cx.fillStyle = fruit[0]; cx.fillRect(x, y, 3, 3);
      cx.fillStyle = fruit[1]; cx.fillRect(x, y, 1, 1);
      cx.fillStyle = '#2b3a24'; cx.fillRect(x + 1, y - 1, 1, 1);
    }
  } else {
    // ash pockets and a few glowing embers trapped in the dead crown
    for (let i = 0; i < 7; i++) {
      const x = 4 + Math.floor(h2(i + 11, variant + 3) * (cw - 8));
      const y = 6 + Math.floor(h2(i + 17, variant + 7) * (ch * 0.6));
      if (!on(x, y)) continue;
      cx.fillStyle = i % 3 ? '#8e8880' : '#5c534a';
      cx.fillRect(x, y, 2, 1);
    }
  }
  outline(canopy, burnt ? [24, 19, 15] : [16, 29, 20]);

  // Independent highlight layer so the wind can move it ahead of the canopy.
  const { canvas: highlights, ctx: hx } = makeCanvas(cw, ch);
  for (let i = 0; i < R * 2; i++) {
    const lx = Math.floor(h2(i + variant * 13, 7) * (cw - 6));
    const ly = Math.floor(h2(i + variant * 19, 3) * ch * 0.66);
    if (!on(lx, ly)) continue;
    hx.fillStyle = burnt ? (i % 3 ? '#8a6f4c' : '#a8855a') : (i % 3 ? '#8fb45e' : '#b7cb7c');
    hx.fillRect(lx, ly, 4 + (i % 3), 1);
    hx.fillRect(lx + 2, ly - 2, 2, 2);
    hx.fillRect(lx + 5, ly + 2, 2, 1);
  }

  // Trunk: buttress roots, bark plates, branches and moss at the base.
  const tw = Math.max(7, Math.round(6.5 * size)), th = Math.round(21 * size);
  const { canvas: trunk, ctx: tx } = makeCanvas(tw + 16, th + 6);
  const P = (x: number, y: number, w: number, h: number, c: string) => { tx.fillStyle = c; tx.fillRect(x, y, w, h); };
  const bark = burnt ? ['#241d18', '#3a2f26', '#54453a'] : ['#43311f', '#63492d', '#8d6a42'];
  const ox = 8;
  P(ox, 0, tw, th, bark[1]);
  P(ox, 0, 2, th, bark[2]);
  P(ox + tw - 2, 0, 2, th, bark[0]);
  P(ox + tw - 1, 0, 1, th, '#2b1f16');
  // bark plates and knots
  for (let y = 1; y < th - 3; y += 3) {
    const off = Math.floor(h2(y, variant) * 2);
    P(ox + 2 + off, y, 1, 2, bark[0]);
    if (h2(y, variant + 4) > 0.7) P(ox + 3, y, tw - 5, 1, bark[0]);
  }
  P(ox + 2, Math.floor(th * 0.4), 3, 3, bark[0]);
  P(ox + 3, Math.floor(th * 0.4) + 1, 1, 1, '#241a12');
  // buttress roots flaring into the soil
  P(ox - 4, th - 4, tw + 8, 4, bark[1]);
  P(ox - 6, th - 2, 4, 3, bark[0]); P(ox + tw + 2, th - 2, 4, 3, bark[0]);
  P(ox - 4, th - 4, 3, 1, bark[2]); P(ox + tw - 1, th - 5, 3, 2, bark[1]);
  // branches reaching up into the canopy
  P(ox - 3, 1, 4, 2, bark[1]); P(ox + tw - 1, 3, 5, 2, bark[1]);
  P(ox + tw + 2, 2, 2, 1, bark[2]);
  if (!burnt) { P(ox - 2, th - 8, 4, 2, '#4f6f3c'); P(ox - 1, th - 9, 2, 1, '#7d9c52'); P(ox + tw - 1, th - 7, 3, 2, '#4f6f3c'); }
  outline(trunk, [22, 17, 13]);

  return { trunk, canopy, highlights, trunkH: th, canopyDrop: Math.round(R * 0.35) };
}

export function treeSprite(size: number, burnt: boolean, variant: number) {
  const key = `${Math.round(size * 10)}|${burnt}|${variant}`;
  let s = cache.get(key);
  if (!s) { s = build(size, burnt, variant); cache.set(key, s); }
  return s;
}

export const treeVariant = (x: number, y: number) => Math.floor(h2(x * 0.37, y * 0.71) * 3);

/** Roots at (x, y); `sway` shifts the canopy in world pixels. */
export function drawTree(c: CanvasRenderingContext2D, x: number, y: number, s = 1, burnt = false, sway = 0, alpha = 1) {
  const t = treeSprite(s, burnt, treeVariant(x, y));
  const rx = Math.round(x), ry = Math.round(y);
  const prev = c.globalAlpha;
  c.globalAlpha = prev * alpha;
  if (alpha >= 1) {
    c.fillStyle = 'rgba(14,28,18,.28)';
    const sw = t.canopy.width * SCALE * 0.7;
    c.fillRect(rx - sw / 2 + 12, ry - 6, sw, 14);
    c.fillRect(rx - sw / 2 + 24, ry - 11, sw - 26, 23);
  }
  const trunkW = t.trunk.width * SCALE, trunkH = t.trunk.height * SCALE;
  // the trunk bends slightly with the same wind that moves the crown
  c.drawImage(t.trunk, rx - trunkW / 2 + Math.round(sway * 0.25), ry - trunkH + 4, trunkW, trunkH);
  const cw = t.canopy.width * SCALE, ch = t.canopy.height * SCALE;
  const top = ry - trunkH - ch + t.canopyDrop * SCALE * 2;
  const sx = Math.round(sway) * SCALE;
  c.drawImage(t.canopy, rx - cw / 2 + sx, top, cw, ch);
  c.drawImage(t.highlights, rx - cw / 2 + Math.round(sway * 1.6), top - Math.abs(Math.round(sway)) * 0.5, cw, ch);
  c.globalAlpha = prev;
}

export function canopyCenter(s: number, x: number, y: number) {
  const t = treeSprite(s, true, treeVariant(x, y));
  const trunkH = t.trunk.height * SCALE, ch = t.canopy.height * SCALE;
  return { y: y - trunkH - ch / 2 + t.canopyDrop * SCALE * 2, w: t.canopy.width * SCALE };
}

/* ---------------- forest floor props ---------------- */

type PropKind = 'fern' | 'sapling' | 'log' | 'rock' | 'banana' | 'bush';

function bakeProp(kind: PropKind, variant: number, burnt: boolean): HTMLCanvasElement {
  const key = `${kind}|${variant}|${burnt}`;
  const hit = propCache.get(key);
  if (hit) return hit;
  const w = kind === 'banana' ? 30 : kind === 'log' ? 34 : 20;
  const h = kind === 'banana' ? 34 : kind === 'log' ? 14 : 20;
  const { canvas, ctx } = makeCanvas(w, h);
  const P = (x: number, y: number, ww: number, hh: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x, y, ww, hh); };
  const dead = burnt;
  const green = dead ? ['#4b4034', '#5f5142', '#75634e'] : ['#2f5230', '#43703a', '#6b9a48'];

  if (kind === 'fern') {
    for (let i = 0; i < 7; i++) {
      const a = -1.15 + i * 0.38, len = 7 + (i % 3) * 2;
      for (let k = 0; k < len; k++) {
        const x = Math.round(w / 2 + Math.sin(a) * k), y = Math.round(h - 2 - Math.cos(a) * k * 0.9);
        P(x, y, 2, 2, green[k % 3 ? 1 : 2]);
        if (k % 2) P(x - 1, y, 1, 1, green[0]);
      }
    }
    P(w / 2 - 1, h - 2, 3, 2, dead ? '#3a3128' : '#3d5a2e');
  } else if (kind === 'sapling') {
    P(w / 2 - 1, 4, 2, h - 6, dead ? '#4a3c2e' : '#5c7a3f');
    for (let i = 0; i < 5; i++) {
      const y = 5 + i * 3, dir = i % 2 ? 1 : -1;
      P(w / 2 + dir * 2, y, 4, 2, green[1]);
      P(w / 2 + dir * 5, y - 1, 2, 2, green[2]);
    }
    P(w / 2 - 3, 2, 7, 3, green[2]);
  } else if (kind === 'log') {
    P(2, 4, w - 4, 7, dead ? '#3b3129' : '#6a4d33');
    P(2, 4, w - 4, 2, dead ? '#544638' : '#8d6a45');
    P(2, 9, w - 4, 2, '#2f251d');
    for (let x = 4; x < w - 4; x += 5) P(x, 6, 3, 1, dead ? '#4a3d31' : '#7d5b3c');
    P(0, 3, 4, 9, dead ? '#4b3f33' : '#8a6a48');
    P(1, 4, 2, 7, '#c2a67e'); P(1, 5, 1, 5, '#8d6f4e');
    P(w - 4, 3, 4, 9, dead ? '#4b3f33' : '#8a6a48');
    if (!dead) { P(8, 3, 4, 1, '#6f8a4a'); P(20, 3, 3, 1, '#6f8a4a'); }
    else { P(9, 3, 5, 1, '#8e8880'); P(21, 3, 4, 1, '#6d655c'); }
  } else if (kind === 'rock') {
    P(4, 8, 12, 7, '#5f6560'); P(5, 6, 10, 9, '#6d736c');
    P(6, 5, 7, 3, '#8b918a'); P(7, 5, 3, 2, '#a8ada4');
    P(4, 13, 12, 2, '#454a45');
    if (!dead) { P(3, 12, 3, 2, '#5d7a44'); P(15, 11, 2, 2, '#5d7a44'); }
  } else if (kind === 'banana') {
    // broad leaves radiating from a thick pseudo-stem
    P(w / 2 - 2, 8, 4, h - 8, dead ? '#5a4c39' : '#6f8a45');
    P(w / 2 - 2, 8, 1, h - 8, dead ? '#6d5c45' : '#8aa856');
    for (let i = 0; i < 6; i++) {
      const a = -1.3 + i * 0.52;
      for (let k = 2; k < 12; k++) {
        const x = Math.round(w / 2 + Math.sin(a) * k), y = Math.round(10 - Math.cos(a) * k * 0.55);
        const t = 1 + Math.round((1 - k / 12) * 2);
        P(x - t, y, t * 2 + 1, 2, dead ? (k % 3 ? '#5b4c39' : '#6d5c45') : (k % 3 ? green[1] : green[2]));
        if (k % 4 === 0) P(x - t, y + 2, t * 2 + 1, 1, dead ? '#40362a' : '#28462a');
      }
    }
    P(w / 2 - 3, h - 2, 6, 2, dead ? '#3d3327' : '#4c6a34');
  } else {
    for (let i = 0; i < 9; i++) {
      const bx = 3 + Math.floor(h2(i, variant) * (w - 8));
      const by = h - 3 - Math.floor(h2(i + 5, variant) * 8);
      P(bx, by, 4 + (i % 3), 4, green[i % 3]);
      P(bx, by, 2, 1, dead ? '#6d5c45' : '#86ad58');
    }
    P(2, h - 3, w - 4, 3, dead ? '#3a3128' : '#2c4a2c');
  }
  const out = outline(canvas, dead ? [26, 21, 17] : [18, 32, 21]);
  propCache.set(key, out);
  return out;
}

/** Props stand on (x, y) and can lean with the wind. */
export function drawProp(c: CanvasRenderingContext2D, kind: PropKind, x: number, y: number, burnt: boolean, sway = 0, scale = 1) {
  const spr = bakeProp(kind, Math.floor(h2(x * 0.31, y * 0.17) * 3), burnt);
  const w = spr.width * SCALE * scale, h = spr.height * SCALE * scale;
  c.fillStyle = 'rgba(14,28,18,.22)';
  c.fillRect(Math.round(x - w * 0.3), Math.round(y - 2), Math.round(w * 0.6), 5);
  c.drawImage(spr, Math.round(x - w / 2 + sway), Math.round(y - h), Math.round(w), Math.round(h));
}
