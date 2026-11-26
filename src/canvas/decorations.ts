import type { Wind } from './physics';

/*
 * High-craft Kalimantan 3D depth-sorted decorations & animated cultural props.
 * Every static sprite (papaya trees, hibiscus/bougainvillea bushes, carved Dayak totems,
 * kentongan slit-drum shelter, lakeside saung pavilion, lamp posts, stacked pottery,
 * Rafflesia arnoldii blooms, scarecrow) is pre-baked onto offscreen pixel canvases ONCE
 * and drawn with single integer blits — zero per-frame path/gradient/allocation overhead!
 */

const SCALE = 2;

export type StaticDecorKind =
  | 'totem'
  | 'kentongan'
  | 'papaya'
  | 'hibiscus'
  | 'bougainvillea'
  | 'pottery_rack'
  | 'saung'
  | 'scarecrow'
  | 'rafflesia'
  | 'hollow_snag'
  | 'stone_lantern';

export interface WorldDecor {
  x: number;
  y: number; // depth-sort anchor (ground contact y)
  kind: StaticDecorKind | 'street_lamp' | 'umbul' | 'flagpole';
  variant?: number;
  flip?: boolean;
}

const spriteCache = new Map<string, { c: HTMLCanvasElement; ax: number; ay: number }>();
let lampGlowSprite: HTMLCanvasElement | null = null;
let sunbeamSprite: HTMLCanvasElement | null = null;

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}

function outline(canvas: HTMLCanvasElement, rgb: [number, number, number] = [26, 20, 15]) {
  const ctx = canvas.getContext('2d')!;
  const { width: w, height: h } = canvas;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const out = new Uint8ClampedArray(d);
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] !== 0) continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) {
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

export function getLampGlowSprite(): HTMLCanvasElement {
  if (lampGlowSprite) return lampGlowSprite;
  const { c, ctx } = makeCanvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
  g.addColorStop(0, 'rgba(255, 232, 150, 0.42)');
  g.addColorStop(0.38, 'rgba(255, 192, 92, 0.20)');
  g.addColorStop(1, 'rgba(255, 168, 70, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  lampGlowSprite = c;
  return c;
}

export function getSunbeamSprite(): HTMLCanvasElement {
  if (sunbeamSprite) return sunbeamSprite;
  const { c, ctx } = makeCanvas(96, 160);
  ctx.fillStyle = '#fff2ba';
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.lineTo(46, 0);
  ctx.lineTo(88, 156);
  ctx.lineTo(34, 156);
  ctx.closePath();
  ctx.fill();
  sunbeamSprite = c;
  return c;
}

function getStaticDecorSprite(kind: StaticDecorKind, variant = 0): { c: HTMLCanvasElement; ax: number; ay: number } {
  const key = `${kind}|${variant}`;
  const hit = spriteCache.get(key);
  if (hit) return hit;

  let res: { c: HTMLCanvasElement; ax: number; ay: number };

  if (kind === 'totem') {
    // Carved Kalimantan Dayak Ironwood Totem / Belontang Post with Shield & Hornbill Finial
    const { c, ctx } = makeCanvas(22, 46);
    const P = (x: number, y: number, w: number, h: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    // Stone plinth
    P(5, 39, 12, 5, '#6e6859'); P(6, 38, 10, 2, '#a39b88');
    // Ironwood carved pillar
    P(7, 10, 8, 29, '#5e3d25'); P(8, 10, 3, 29, '#8f623d'); P(13, 10, 2, 29, '#3d2717');
    // Carved Dayak Talawang shield emblem mid-post
    P(5, 18, 12, 14, '#9c3b2b'); P(6, 17, 10, 16, '#b84935');
    P(7, 19, 8, 12, '#3d2219');
    P(9, 20, 4, 10, '#f0cc75'); P(7, 24, 8, 2, '#e69845');
    P(10, 24, 2, 2, '#fff7d6');
    // Hornbill (Burung Enggang) crest finial on top!
    P(6, 7, 10, 3, '#c99b56');
    P(8, 3, 6, 4, '#2b2420'); P(12, 4, 6, 2, '#f2c44e'); P(11, 2, 5, 2, '#d94c2f'); // golden beak + red casque!
    P(5, 5, 4, 2, '#f2ede0'); // tail feathers
    res = { c: outline(c), ax: 11, ay: 44 };
  } else if (kind === 'kentongan') {
    // Traditional Village Posko Slit-Drum (Kentongan Siaga) under mini sirap roof
    const { c, ctx } = makeCanvas(26, 44);
    const P = (x: number, y: number, w: number, h: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    // Two timber posts
    P(4, 11, 3, 30, '#5e3f27'); P(4, 11, 1, 30, '#996d46');
    P(19, 11, 3, 30, '#5e3f27'); P(19, 11, 1, 30, '#996d46');
    P(3, 39, 5, 3, '#787162'); P(18, 39, 5, 3, '#787162');
    // Mini pitched sirap shingle roof
    P(1, 9, 24, 3, '#6e3d28'); P(3, 6, 20, 3, '#8c5137'); P(6, 4, 14, 2, '#ad6a49'); P(9, 2, 8, 2, '#cfa065');
    P(4, 12, 18, 2, '#c93e2e'); // red Posko trim
    // Hanging carved wooden kentongan slit-drum + striker mallet
    P(12, 13, 2, 4, '#d8c598'); // rope
    P(9, 17, 7, 15, '#9e6d3b'); P(10, 17, 2, 15, '#cfa065'); P(14, 17, 2, 15, '#694523');
    P(12, 20, 2, 10, '#24170e'); // resonance slit!
    P(10, 15, 5, 2, '#b84632'); // carved crown cap
    // Hanging striker stick on right cord
    P(17, 14, 1, 8, '#cbb88d'); P(16, 22, 3, 6, '#d4a86a');
    res = { c: outline(c), ax: 13, ay: 42 };
  } else if (kind === 'papaya') {
    // Tropical Kalimantan Fruiting Papaya Tree (Pohon Pepaya)
    const { c, ctx } = makeCanvas(34, 54);
    const P = (x: number, y: number, w: number, h: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    // Ringed papaya trunk
    P(15, 20, 4, 31, '#8b7d5c'); P(15, 20, 2, 31, '#aba07c'); P(18, 20, 1, 31, '#5d533c');
    for (let ry = 23; ry < 49; ry += 4) P(15, ry, 4, 1, '#6d6248');
    P(14, 49, 6, 3, '#6d6248');
    // Clustered ripe golden-orange & green papayas tucked under leaf crown!
    P(13, 19, 3, 4, '#e89638'); P(14, 19, 1, 2, '#ffd275');
    P(18, 19, 3, 4, '#7aa846'); P(16, 21, 3, 4, '#f0a83e');
    // Radiating palmate papaya leaf canopy
    const fronds: [number, number, number, number, string][] = [
      [3, 14, 12, 4, '#3d6936'], [19, 14, 12, 4, '#3d6936'],
      [2, 10, 13, 4, '#4f8242'], [19, 10, 13, 4, '#4f8242'],
      [6, 6, 10, 4, '#669c50'], [18, 6, 10, 4, '#669c50'],
      [11, 3, 12, 5, '#7cb55e'], [13, 2, 8, 3, '#9cd175'],
    ];
    for (const [fx, fy, fw, fh, col] of fronds) {
      P(fx, fy, fw, fh, col);
      P(fx + 2, fy - 1, Math.max(2, fw - 4), 1, '#8ec468');
    }
    res = { c: outline(c, [24, 30, 18]), ax: 17, ay: 52 };
  } else if (kind === 'hibiscus' || kind === 'bougainvillea') {
    // Lush Tropical Flowering Shrub (Kembang Sepatu / Bugenvil)
    const { c, ctx } = makeCanvas(28, 24);
    const P = (x: number, y: number, w: number, h: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    // Layered rounded leaf cushions
    P(3, 9, 22, 11, '#33592f');
    P(2, 11, 24, 8, '#3f6b38');
    P(5, 6, 18, 11, '#4f8243');
    P(7, 4, 14, 8, '#679c52');
    P(9, 4, 8, 3, '#86ba68');
    // Vivid tropical blossoms
    const b1 = kind === 'hibiscus' ? '#df3e34' : (variant % 2 === 0 ? '#d9438a' : '#e86f38');
    const b2 = kind === 'hibiscus' ? '#ff886b' : (variant % 2 === 0 ? '#ffa6d2' : '#ffb570');
    const spots: [number, number][] = [[6, 9], [12, 6], [19, 8], [9, 14], [16, 13], [22, 13]];
    for (const [bx, by] of spots) {
      P(bx, by, 4, 4, b1);
      P(bx + 1, by, 2, 2, b2);
      P(bx + 1, by + 1, 1, 1, '#fff29c'); // stamen!
    }
    res = { c: outline(c, [22, 30, 18]), ax: 14, ay: 21 };
  } else if (kind === 'pottery_rack') {
    // Kalimantan Terracotta Gentong Jars, Woven Rattan Baskets & Bamboo Shelf
    const { c, ctx } = makeCanvas(32, 26);
    const P = (x: number, y: number, w: number, h: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    // Wooden low rack
    P(2, 16, 28, 3, '#8f683d'); P(2, 16, 28, 1, '#cfa46e');
    P(4, 19, 3, 5, '#5c3f24'); P(25, 19, 3, 5, '#5c3f24');
    // Glazed Kalimantan dragon/terracotta water jar on left
    P(4, 7, 9, 9, '#a84f32'); P(5, 5, 7, 11, '#c46342'); P(6, 7, 2, 6, '#e68e68');
    P(4, 4, 9, 2, '#6e3320');
    // Two woven Dayak rattan bakul baskets with geometric bands
    P(15, 8, 7, 8, '#c79b56'); P(14, 7, 9, 2, '#e3bc78'); P(15, 11, 7, 2, '#9e3b2c');
    P(23, 10, 6, 6, '#b88b4a'); P(22, 9, 8, 2, '#dfc082'); P(23, 13, 6, 1, '#3b664e');
    res = { c: outline(c), ax: 16, ay: 24 };
  } else if (kind === 'saung') {
    // Traditional Kalimantan Lakeside Bamboo & Sirap Gazebo (Saung Tepi Danau)
    const { c, ctx } = makeCanvas(58, 56);
    const P = (x: number, y: number, w: number, h: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    // Stilt pilings & shadow
    for (const px of [8, 27, 46]) { P(px, 42, 4, 10, '#4f3520'); P(px, 42, 1, 10, '#8c623d'); }
    // Raised timber sitting platform + woven tikar mat + backrest rail
    P(6, 37, 46, 6, '#7a5432'); P(6, 37, 46, 2, '#bd9158');
    P(10, 35, 38, 3, '#d9ba7c'); // woven pandan sitting mat!
    for (let mx = 12; mx < 46; mx += 6) P(mx, 36, 3, 1, '#a84432');
    // Corner bamboo/ulin columns supporting the roof
    for (const px of [8, 46]) { P(px, 19, 4, 19, '#6e4b2c'); P(px, 19, 2, 19, '#ad804f'); }
    P(8, 31, 42, 2, '#9c7244'); // side bamboo rail
    // Small ceramic teapot & two cups on the saung mat!
    P(26, 31, 5, 4, '#9e4c34'); P(27, 30, 3, 1, '#cfa266');
    P(22, 33, 3, 2, '#e8efe8'); P(33, 33, 3, 2, '#e8efe8');
    // Layered pitched palm-thatch / sirap pavilion roof with carved ridge horns
    P(2, 17, 54, 4, '#5e3c26'); P(4, 13, 50, 4, '#754b30');
    P(8, 9, 42, 4, '#8c5b3b'); P(13, 6, 32, 4, '#a66f48');
    P(19, 4, 20, 3, '#bd8556'); P(17, 2, 3, 3, '#dfb676'); P(38, 2, 3, 3, '#dfb676');
    // Hanging warm paper/rattan lantern under saung center eave!
    P(28, 21, 2, 3, '#cbb88c'); P(26, 24, 6, 5, '#f7cf72'); P(27, 25, 4, 3, '#fff4bd');
    res = { c: outline(c), ax: 29, ay: 52 };
  } else if (kind === 'scarecrow') {
    // Charming Kebun Scarecrow (Orang-Orangan Sawah) in Caping Hat & Batik Shirt
    const { c, ctx } = makeCanvas(26, 36);
    const P = (x: number, y: number, w: number, h: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    P(12, 10, 2, 24, '#785634'); // vertical bamboo pole
    P(3, 14, 20, 2, '#9c7448');  // crossbar arms
    // Straw hands & hem tufts
    P(2, 14, 3, 3, '#e3c46e'); P(21, 14, 3, 3, '#e3c46e'); P(9, 24, 8, 3, '#dfc068');
    // Patched batik tunic
    P(8, 13, 10, 11, '#b84b36'); P(8, 13, 3, 10, '#d96c52');
    P(13, 17, 4, 4, '#467862'); // green cloth patch!
    // Burlap head + conical woven caping farmer hat
    P(10, 7, 6, 6, '#d9be8a'); P(11, 9, 1, 1, '#2b2118'); P(14, 9, 1, 1, '#2b2118');
    P(5, 6, 16, 2, '#cfa75e'); P(7, 4, 12, 2, '#e3be74'); P(10, 2, 6, 2, '#f2d38c');
    P(8, 6, 10, 1, '#b84230'); // red hat band
    res = { c: outline(c), ax: 13, ay: 34 };
  } else if (kind === 'rafflesia') {
    // Iconic Borneo Rafflesia arnoldii (Padma Raksasa) Giant Crimson Rainforest Flower + Bud!
    const { c, ctx } = makeCanvas(30, 20);
    const P = (x: number, y: number, w: number, h: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    // Dark host Tetrastigma vine & unopened cabbage-like Rafflesia bud beside it
    P(2, 13, 24, 3, '#3b291d');
    P(22, 10, 6, 6, '#593328'); P(23, 9, 4, 4, '#874836');
    // 5 Thick fleshy crimson-terracotta petals with raised cream-white warts!
    P(8, 3, 8, 5, '#a83228');   // top petal
    P(2, 7, 7, 6, '#9c2c23');   // left petal
    P(15, 7, 7, 6, '#b83b2e');  // right petal
    P(5, 12, 7, 6, '#8f261e');  // bottom-left petal
    P(12, 12, 7, 6, '#a83228'); // bottom-right petal
    // Central corona diaphragm & deep spiked disk cavity
    P(7, 7, 10, 7, '#d4573b');
    P(9, 8, 6, 5, '#471815');
    P(10, 9, 4, 3, '#e07a38'); P(11, 10, 2, 1, '#ffd480');
    // Cream-white petal speckles
    for (const [wx, wy] of [[10, 4], [13, 5], [4, 9], [6, 10], [17, 8], [19, 10], [7, 14], [14, 15]]) {
      P(wx, wy, 1, 1, '#f7e6c4');
    }
    res = { c: outline(c, [30, 16, 14]), ax: 14, ay: 17 };
  } else if (kind === 'hollow_snag') {
    // Ancient Moss-Draped Rainforest Buttress Snag with Staghorn Epiphyte Fern & Shelf Fungi
    const { c, ctx } = makeCanvas(32, 42);
    const P = (x: number, y: number, w: number, h: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    // Flared buttress roots
    P(4, 34, 24, 6, '#3d2b1d'); P(7, 28, 18, 8, '#4f3825');
    P(10, 8, 12, 26, '#5c422c'); P(11, 10, 4, 24, '#7d5b3d'); P(19, 10, 3, 24, '#3b291a');
    //agged broken hollow crown + dark owl/hornbill hollow
    P(10, 5, 4, 4, '#6e4f35'); P(17, 6, 4, 4, '#4f3825');
    P(13, 16, 5, 7, '#1d140d');
    // Lush green moss mantle & epiphyte staghorn fern (tanduk rusa)
    P(9, 11, 7, 3, '#4f7d3d'); P(10, 10, 5, 2, '#78ab56');
    P(19, 18, 8, 6, '#487538'); P(21, 16, 6, 4, '#6ca34e'); P(23, 22, 5, 4, '#5a8c42');
    // Golden bracket shelf fungi
    P(8, 25, 5, 2, '#df8b38'); P(9, 25, 3, 1, '#');
    P(9, 25, 3, 1, '#ffe08c');
    P(18, 30, 5, 2, '#d47b30'); P(19, 30, 3, 1, '#ffd97d');
    res = { c: outline(c, [24, 18, 13]), ax: 16, ay: 40 };
  } else {
    // Carved Kalimantan River-Stone Garden Lantern (stone_lantern)
    const { c, ctx } = makeCanvas(18, 28);
    const P = (x: number, y: number, w: number, h: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    P(4, 22, 10, 4, '#666b64'); P(5, 21, 8, 2, '#8d948a');
    P(7, 14, 4, 8, '#737870'); P(7, 14, 2, 8, '#9aa196');
    P(4, 8, 10, 6, '#5d635c'); P(6, 9, 6, 4, '#ffda78'); P(7, 10, 4, 2, '#fff7cc'); // warm lit window!
    P(2, 6, 14, 3, '#6c736a'); P(4, 4, 10, 2, '#8d948a'); P(7, 2, 4, 2, '#aeb5aa');
    P(4, 23, 4, 2, '#4f783d'); // touch of moss
    res = { c: outline(c, [26, 28, 24]), ax: 9, ay: 26 };
  }

  spriteCache.set(key, res);
  return res;
}

// Pre-baked bamboo street-lamp post (lantern swings live at tip!)
let lampPostLeft: HTMLCanvasElement | null = null;
let lampPostRight: HTMLCanvasElement | null = null;
function getLampPost(flip: boolean): HTMLCanvasElement {
  if (!flip && lampPostRight) return lampPostRight;
  if (flip && lampPostLeft) return lampPostLeft;
  const { c, ctx } = makeCanvas(24, 46);
  const P = (x: number, y: number, w: number, h: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
  const px = flip ? 16 : 5;
  // River-stone base plinth
  P(px - 2, 39, 8, 5, '#686457'); P(px - 1, 38, 6, 2, '#9e9886');
  // Tall segmented Kalimantan bamboo/ulin pole
  P(px, 5, 4, 34, '#6e4e2e'); P(px + 1, 5, 1, 34, '#ad8352');
  for (let y = 11; y < 37; y += 7) P(px, y, 4, 1, '#4a331d');
  // Curved cross-arm + diagonal brace
  if (!flip) {
    P(px, 4, 13, 3, '#7d5934'); P(px, 4, 13, 1, '#bd935c');
    P(px + 4, 7, 3, 2, '#5e4125'); P(px + 3, 9, 2, 2, '#5e4125');
  } else {
    P(px - 9, 4, 13, 3, '#7d5934'); P(px - 9, 4, 13, 1, '#bd935c');
    P(px - 3, 7, 3, 2, '#5e4125'); P(px - 1, 9, 2, 2, '#5e4125');
  }
  const out = outline(c);
  if (flip) lampPostLeft = out; else lampPostRight = out;
  return out;
}

export const VILLAGE_DECORS: WorldDecor[] = [
  // Western Village Entrance Dayak Welcome Totems & Road Lanterns
  { x: 156, y: 274, kind: 'totem' },
  { x: 156, y: 356, kind: 'totem' },
  { x: 278, y: 272, kind: 'street_lamp' },
  { x: 492, y: 272, kind: 'street_lamp', flip: true },
  { x: 736, y: 272, kind: 'street_lamp' },
  { x: 400, y: 488, kind: 'street_lamp' },
  { x: 1332, y: 472, kind: 'street_lamp' },

  // Ceremonial Umbul-Umbul Pennants, Posko Merah-Putih Flagpole & Kentongan Alarm Drum
  { x: 448, y: 242, kind: 'umbul', variant: 0 },
  { x: 668, y: 242, kind: 'umbul', variant: 1 },
  { x: 748, y: 244, kind: 'umbul', variant: 2 },
  { x: 760, y: 274, kind: 'kentongan' },
  { x: 896, y: 206, kind: 'flagpole' },
  { x: 970, y: 274, kind: 'totem' },

  // Lush Village Courtyard Flora, Fruiting Papaya Trees & Pottery Racks
  { x: 108, y: 266, kind: 'papaya' },
  { x: 318, y: 262, kind: 'hibiscus', variant: 0 },
  { x: 154, y: 264, kind: 'bougainvillea', variant: 0 },
  { x: 468, y: 264, kind: 'bougainvillea', variant: 1 },
  { x: 638, y: 248, kind: 'pottery_rack' },
  { x: 772, y: 254, kind: 'hibiscus', variant: 1 },

  // Lakeside Saung Pavilion, Stone Lanterns, Southern Kebun Scarecrow & Papayas
  { x: 742, y: 654, kind: 'saung' },
  { x: 392, y: 512, kind: 'stone_lantern' },
  { x: 494, y: 512, kind: 'stone_lantern' },
  { x: 240, y: 816, kind: 'hibiscus', variant: 0 },
  { x: 312, y: 816, kind: 'bougainvillea', variant: 0 },
  { x: 460, y: 868, kind: 'scarecrow' },
  { x: 706, y: 882, kind: 'papaya' },
  { x: 562, y: 924, kind: 'papaya' },

  // Deep Kalimantan Rainforest Hollow Buttress Snags & Giant Rafflesia Blooms!
  { x: 1188, y: 312, kind: 'hollow_snag' },
  { x: 1516, y: 586, kind: 'hollow_snag' },
  { x: 1712, y: 416, kind: 'hollow_snag' },
  { x: 1618, y: 568, kind: 'rafflesia' },
  { x: 1806, y: 404, kind: 'rafflesia' },
  { x: 1468, y: 782, kind: 'rafflesia' },
];

export function drawWorldDecor(
  c: CanvasRenderingContext2D,
  d: WorldDecor,
  t: number,
  wind: Wind,
  motion: boolean,
) {
  const dx = Math.round(d.x);
  const dy = Math.round(d.y);

  // Soft ground contact shadow
  c.fillStyle = 'rgba(18, 24, 16, 0.24)';
  const sw = d.kind === 'saung' ? 96 : d.kind === 'pottery_rack' ? 52 : 28;
  c.fillRect(dx - (sw >> 1), dy - 3, sw, 6);

  if (d.kind === 'street_lamp') {
    const flip = !!d.flip;
    const post = getLampPost(flip);
    const ox = flip ? dx - 34 : dx - 12;
    const oy = dy - 44 * SCALE;
    c.drawImage(post, ox, oy, post.width * SCALE, post.height * SCALE);

    // Swaying woven rattan lantern hanging from arm tip!
    const tipX = flip ? dx - 22 : dx + 22;
    const tipY = dy - 74;
    const swing = motion ? Math.round(Math.sin(t * 2.1 + d.x * 0.05) * 2 + wind.dir * (1 + wind.gust * 1.5)) : 0;
    const lx = tipX + swing;
    c.fillStyle = '#cbb88e';
    c.fillRect(tipX - 1, tipY, 2, 5);
    c.fillStyle = '#5c3d22';
    c.fillRect(lx - 6, tipY + 4, 12, 3);
    c.fillStyle = '#f5b947';
    c.fillRect(lx - 5, tipY + 7, 10, 9);
    c.fillStyle = '#fff5c0';
    c.fillRect(lx - 3, tipY + 8, 6, 6);
    c.fillStyle = '#5c3d22';
    c.fillRect(lx - 4, tipY + 16, 8, 2);

    // Pre-baked soft warm lantern halo (single sprite blit, zero gradient creation!)
    const prev = c.globalAlpha;
    c.globalAlpha = 0.42 + (motion ? 0.06 * Math.sin(t * 3.1 + d.x) : 0);
    const glow = getLampGlowSprite();
    c.drawImage(glow, lx - 38, tipY - 22, 76, 76);
    c.globalAlpha = prev * 0.22;
    c.drawImage(glow, lx - 34, dy - 18, 68, 30);
    c.globalAlpha = prev;
    return;
  }

  if (d.kind === 'umbul') {
    // Tall curved Indonesian bamboo Umbul-Umbul ceremonial banner fluttering in the wind!
    const pal: [string, string, string][] = [
      ['#cf3f2e', '#f5ebd2', '#f0bf4c'],
      ['#2f7a58', '#f5ebd2', '#f0bf4c'],
      ['#32688a', '#f5ebd2', '#f28c42'],
    ];
    const [c1, c2, trim] = pal[(d.variant ?? 0) % pal.length];
    // Bamboo mast bending gently at tip
    for (let seg = 0; seg < 11; seg++) {
      const sy = dy - seg * 7;
      const bend = motion ? Math.round((seg / 10) ** 2 * (3 + wind.dir * (2 + wind.gust * 2.5) + Math.sin(t * 2.8 + seg * 0.4 + d.x) * 1.4)) : Math.round((seg / 10) ** 2 * 3);
      const sx = dx + bend;
      // Fluttering vertical pennant cloth beside mast
      if (seg >= 2 && seg <= 10) {
        const wCloth = seg === 10 ? 4 : seg >= 8 ? 6 : 8;
        const wave = motion ? Math.round(Math.sin(t * 5.2 - seg * 0.7 + d.x) * 1.6) : 0;
        c.fillStyle = seg % 2 === 0 ? c1 : c2;
        c.fillRect(sx + 2, sy - 6, wCloth + wave, 7);
        c.fillStyle = trim;
        c.fillRect(sx + 2, sy - 6, 2, 7);
      }
      c.fillStyle = '#6e5230';
      c.fillRect(sx - 1, sy - 7, 3, 7);
      c.fillStyle = '#bfa065';
      c.fillRect(sx - 1, sy - 7, 1, 7);
    }
    return;
  }

  if (d.kind === 'flagpole') {
    // Official Posko Balai RT Merah-Putih Flagpole with rippling Indonesian flag!
    c.fillStyle = '#787365';
    c.fillRect(dx - 6, dy - 6, 12, 6);
    c.fillStyle = '#aeb5b0';
    c.fillRect(dx - 2, dy - 86, 4, 80);
    c.fillStyle = '#dfe6e2';
    c.fillRect(dx - 2, dy - 86, 2, 80);
    c.fillStyle = '#f0c85b';
    c.fillRect(dx - 3, dy - 90, 6, 4); // golden finial ball!
    // Rippling Merah-Putih flag columns
    const dir = wind.dir >= 0 ? 1 : -1;
    for (let col = 0; col < 7; col++) {
      const wave = motion ? Math.round(Math.sin(t * 5.6 - col * 0.65) * (0.6 + col * 0.25)) * 2 : 0;
      const fx = dir > 0 ? dx + 2 + col * 4 : dx - 6 - col * 4;
      const fy = dy - 84 + wave;
      c.fillStyle = '#1e1814';
      c.fillRect(fx - 1, fy - 1, 5, 18);
      c.fillStyle = '#d63629'; // Merah (top)
      c.fillRect(fx, fy, 4, 8);
      c.fillStyle = '#f7f4eb'; // Putih (bottom)
      c.fillRect(fx, fy + 8, 4, 8);
    }
    return;
  }

  const spr = getStaticDecorSprite(d.kind, d.variant ?? 0);
  const swayPx = (d.kind === 'papaya' || d.kind === 'hibiscus' || d.kind === 'bougainvillea') && motion
    ? Math.round(Math.sin(t * 1.8 + d.x * 0.06) * 1 + wind.dir * wind.gust * 1.2)
    : 0;
  c.drawImage(
    spr.c,
    dx - spr.ax * SCALE + swayPx,
    dy - spr.ay * SCALE,
    spr.c.width * SCALE,
    spr.c.height * SCALE,
  );
}

let warmed = false;
export function warmupDecorations() {
  if (warmed || typeof document === 'undefined') return;
  warmed = true;
  getLampGlowSprite();
  getSunbeamSprite();
  getLampPost(false);
  getLampPost(true);
  for (const d of VILLAGE_DECORS) {
    if (d.kind !== 'street_lamp' && d.kind !== 'umbul' && d.kind !== 'flagpole') {
      getStaticDecorSprite(d.kind, d.variant ?? 0);
    }
  }
}
