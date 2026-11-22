import type { Direction, PortraitId } from '../types/gameTypes';
import { VerletChain, type Wind } from './physics';

/*
 * Pixel sprite factory with physical secondary motion.
 * Bodies are painted once per frame and cached with an automatic outline;
 * hair, scarves and the carried bucket are simulated every frame so they
 * keep swinging after Wira stops or turns.
 */
export type Who = 'wira' | 'budi' | 'pak_rt';
export type Pose = 'stand' | 'walk' | 'pour' | 'fill' | 'wave' | 'point' | 'cough';
export const SCALE = 2;
const W = 32, H = 44;

interface Look {
  skin: string; skinShade: string; skinLight: string;
  hair: string; hairLight: string;
  top: string; topShade: string; topLight: string;
  inner: string; innerShade: string; trim: string;
  pants: string; pantsShade: string;
  sarong?: string; sarongShade?: string; sarongLight?: string;
  head: 'kerchief' | 'peci' | 'short';
  accent?: string; accentLight?: string;
  ponytail?: boolean; vest?: boolean; apron?: boolean; batik?: boolean; glasses?: boolean; mustache?: string;
  strap?: boolean;
}

const LOOKS: Record<Who, Look> = {
  wira: {
    skin: '#e3a877', skinShade: '#bd7d55', skinLight: '#f6d3a6', hair: '#2e2320', hairLight: '#5c4337',
    top: '#b8432f', topShade: '#862f20', topLight: '#da674b', inner: '#f0e2bf', innerShade: '#cbb88f', trim: '#e9ba5c',
    pants: '#3f4d3a', pantsShade: '#2b3829', sarong: '#7d3f52', sarongShade: '#5a2b3b', sarongLight: '#a35c6c',
    head: 'kerchief', accent: '#c7432d', accentLight: '#ea7550', ponytail: true, vest: true, strap: true,
  },
  budi: {
    skin: '#c98d5e', skinShade: '#a06a43', skinLight: '#dfa979', hair: '#221c19', hairLight: '#3d332d',
    top: '#4f7d55', topShade: '#375a3c', topLight: '#72a06c', inner: '#ece1c4', innerShade: '#c8b995', trim: '#d9b45c',
    pants: '#4a3b30', pantsShade: '#342a22', head: 'peci', apron: true, mustache: '#2a211d',
  },
  pak_rt: {
    skin: '#bd8055', skinShade: '#965d3a', skinLight: '#d59d6e', hair: '#a9a597', hairLight: '#d2cebf',
    top: '#a5683a', topShade: '#794927', topLight: '#c98d52', inner: '#e9dab2', innerShade: '#c4b389', trim: '#efc96d',
    pants: '#3a3631', pantsShade: '#28251f', sarong: '#3f5a4a', sarongShade: '#2b4034', sarongLight: '#5d7d63',
    head: 'short', batik: true, glasses: true, mustache: '#ede7d4',
  },
};

export interface FrameSpec {
  who: Who; dir: Direction; pose: Pose; frame: number;
  blink: boolean; holding: boolean; newShoes: boolean;
  flutter: number; breath: number; mouth: boolean; glance: number; sway: number;
  gait?: number;
}

/** Live motion passed by the renderer for secondary animation. */
export interface MotionInfo {
  dt: number; vx: number; vy: number; speed: number; lean: number; wind: Wind; reduced?: boolean;
}

const blank = (w: number, h: number) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d')!; ctx.imageSmoothingEnabled = false;
  return { c, ctx };
};

function outline(canvas: HTMLCanvasElement, rgb: [number, number, number] = [27, 22, 18]) {
  const ctx = canvas.getContext('2d')!;
  const { width: w, height: h } = canvas;
  const img = ctx.getImageData(0, 0, w, h); const d = img.data; const out = new Uint8ClampedArray(d);
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (d[i + 3] !== 0) continue;
    if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) { out[i] = rgb[0]; out[i + 1] = rgb[1]; out[i + 2] = rgb[2]; out[i + 3] = 255; }
  }
  img.data.set(out); ctx.putImageData(img, 0, 0);
  return canvas;
}

function mirror(src: HTMLCanvasElement) {
  const { c, ctx } = blank(src.width, src.height);
  ctx.translate(src.width, 0); ctx.scale(-1, 1); ctx.drawImage(src, 0, 0);
  return c;
}

export function upperOffset(s: Pick<FrameSpec, 'pose' | 'frame' | 'breath'>) {
  const f = s.frame & 3;
  const bob = s.pose === 'walk' && (f === 1 || f === 3) ? -1 : 0;
  const crouch = s.pose === 'fill' ? 3 : s.pose === 'cough' ? 1 : 0;
  return bob + crouch - (s.pose === 'stand' ? s.breath : 0);
}

function paint(ctx: CanvasRenderingContext2D, s: FrameSpec) {
  const L = LOOKS[s.who];
  const P = (x: number, y: number, w: number, h: number, c: string) => { if (w > 0 && h > 0) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); } };
  const side = s.dir === 'left' || s.dir === 'right';
  const back = s.dir === 'up';
  const f = s.frame & 3;
  const walking = s.pose === 'walk';
  const crouch = s.pose === 'fill' ? 3 : s.pose === 'cough' ? 1 : 0;
  const bob = walking && (f === 1 || f === 3) ? -1 : 0;
  const Ub = upperOffset(s);
  const legTop = 31 + bob + crouch;
  const shoe = s.newShoes
    ? { a: '#c9412d', b: '#f07b50', sole: '#f3ead4', stripe: '#f5c650', lace: '#ffffff' }
    : s.who === 'wira' ? { a: '#6b4a32', b: '#8f6742', sole: '#3a2a20', stripe: '#6b4a32', lace: '#c9b48d' }
      : { a: '#3b302a', b: '#5a4a42', sole: '#211b17', stripe: '#3b302a', lace: '#8d7f70' };
  const sleeve = L.vest ? L.inner : L.top, sleeveShade = L.vest ? L.innerShade : L.topShade;

  // ---------- legs with a lifted-foot arc ----------
  const legFront = (x: number, bottom: number, lift: number) => {
    const knee = bottom - lift;
    P(x, legTop, 3, knee - 2 - legTop, L.pants);
    P(x + 2, legTop, 1, knee - 2 - legTop, L.pantsShade);
    P(x, legTop, 3, 1, L.sarong ? L.sarongShade! : L.pantsShade);
    P(x, knee - 3, 3, 3, shoe.a); P(x, knee - 3, 2, 1, shoe.b);
    P(x, knee - 4, 3, 1, L.pantsShade);                       // ankle cuff
    if (s.newShoes) {
      P(x + 1, knee - 2, 1, 1, shoe.stripe);
      P(x, knee - 4, 3, 1, shoe.lace);
      P(x + 1, knee - 3, 1, 1, shoe.lace);
    }
    P(x, knee, 3, 1, shoe.sole);
    P(x, knee, 1, 1, '#00000055'); P(x + 2, knee, 1, 1, '#00000055'); // tread notches
    if (lift > 0) P(x, knee + 1, 3, 1, 'rgba(20,24,18,.18)');
  };
  const legSide = (hip: number, off: number, bottom: number, near: boolean, lift: number) => {
    const mid = Math.floor((legTop + bottom - 2) / 2);
    const col = near ? L.pants : L.pantsShade;
    P(hip + Math.round(off / 2), legTop, 3, mid - legTop, col);
    P(hip + off, mid, 3, bottom - 2 - mid - lift, col);
    const sx = hip + off, by = bottom - lift;
    P(sx, by - 3, 4, 3, shoe.a); P(sx + 1, by - 3, 3, 1, shoe.b);
    P(sx, by - 4, 3, 1, L.pantsShade);
    if (s.newShoes) { P(sx + 1, by - 2, 2, 1, shoe.stripe); P(sx, by - 4, 3, 1, shoe.lace); P(sx + 3, by - 2, 1, 2, shoe.lace); }
    P(sx, by, 4, 1, shoe.sole);
    P(sx + 1, by, 1, 1, '#00000055'); P(sx + 3, by, 1, 1, '#00000055');
    if (near) P(sx + 3, by - 2, 1, 2, shoe.b);               // toe cap catches light
  };

  const arm = (x: number, y: number) => {
    P(x, y, 2, 3, sleeve); P(x + 1, y, 1, 3, sleeveShade);
    P(x, y + 1, 1, 1, L.vest ? '#ffffff33' : L.topLight);      // shoulder catchlight
    P(x, y + 3, 2, 3, L.skin); P(x + 1, y + 3, 1, 3, L.skinShade);
    P(x, y + 3, 1, 1, L.skinLight);                           // wrist
    P(x, y + 6, 2, 1, L.skinShade);
    P(x, y + 7, 1, 1, L.skin);                                // thumb / finger split
  };

  const ty = 22 + Ub;
  const swing = walking ? (f === 0 ? 1 : f === 2 ? -1 : 0) : 0;

  // far arm behind the torso (side view)
  if (side && s.pose !== 'pour' && s.pose !== 'point') {
    const off = -swing * 2;
    P(14 + Math.round(off / 2), ty + 1, 2, 3, sleeveShade);
    P(14 + off, ty + 4, 2, 3, L.skinShade);
  }

  if (!side) {
    let lb = 40, rb = 40, ll = 0, rl = 0;
    if (walking) { const g = [[41, 40, 0, 2], [40, 38, 2, 0], [40, 41, 0, 2], [38, 40, 2, 0]][f]; lb = g[0]; rb = g[1]; ll = g[2]; rl = g[3]; }
    const spread = crouch >= 3 ? 1 : 0;
    legFront(12 - spread, lb, ll); legFront(17 + spread, rb, rl);
  } else {
    let bk = { off: -1, b: 40, l: 0 }, nr = { off: 1, b: 40, l: 0 };
    if (walking) {
      bk = [{ off: -3, b: 40, l: 0 }, { off: 1, b: 38, l: 2 }, { off: 3, b: 40, l: 0 }, { off: 0, b: 40, l: 1 }][f];
      nr = [{ off: 3, b: 40, l: 2 }, { off: 0, b: 40, l: 0 }, { off: -3, b: 40, l: 0 }, { off: 1, b: 38, l: 2 }][f];
    } else if (crouch >= 3) { bk = { off: -2, b: 40, l: 0 }; nr = { off: 3, b: 40, l: 0 }; }
    legSide(14, bk.off, bk.b, false, bk.l); legSide(14, nr.off, nr.b, true, nr.l);
  }

  // ---------- torso ----------
  if (!side) {
    P(11, ty, 10, 9, L.top);
    if (L.vest) {
      if (!back) {
        P(14, ty, 4, 8, L.inner); P(14, ty + 7, 4, 1, L.innerShade);
        P(13, ty + 1, 1, 7, L.trim); P(18, ty + 1, 1, 7, L.trim);
        for (const yy of [3, 5]) { P(12, ty + yy, 1, 1, L.trim); P(19, ty + yy, 1, 1, L.trim); }
        // woven shoulder strap
        P(12, ty + 1, 2, 1, '#8a6a3c'); P(14, ty + 2, 2, 1, '#8a6a3c'); P(16, ty + 3, 2, 1, '#a5814a'); P(18, ty + 4, 2, 1, '#8a6a3c');
      } else {
        P(15, ty + 2, 2, 1, L.trim); P(14, ty + 3, 4, 1, L.trim); P(15, ty + 4, 2, 1, L.trim);
        P(15, ty + 3, 2, 1, L.top); P(15, ty + 6, 2, 1, L.trim);
      }
    }
    if (L.batik) {
      for (let yy = 0; yy < 8; yy++) for (let xx = 0; xx < 10; xx++) if ((xx + yy * 2) % 4 === 0) P(11 + xx, ty + yy, 1, 1, L.trim);
      if (!back) { P(14, ty, 4, 1, L.inner); P(15, ty + 1, 2, 1, L.inner); }
    }
    if (L.apron && !back) {
      P(13, ty + 2, 6, 8, L.inner); P(13, ty, 1, 2, L.inner); P(18, ty, 1, 2, L.inner);
      P(13, ty + 9, 6, 1, L.innerShade); P(14, ty + 5, 4, 3, '#ded0ab'); P(14, ty + 5, 4, 1, '#bfae88');
    }
    P(20, ty, 1, 9, L.topShade); P(11, ty + 1, 1, 4, L.topLight);
    // sarong wrapped over the hips (batik parang motif)
    if (L.sarong) {
      const sl = L.sarongLight ?? '#ffffff', sd = L.sarongShade ?? '#000000';
      P(10, ty + 6, 12, 6, L.sarong);
      P(10, ty + 6, 12, 1, sl); P(10, ty + 11, 12, 1, sd);
      for (let xx = 0; xx < 12; xx += 3) P(10 + xx, ty + 8 + (xx % 6 === 0 ? 0 : 1), 2, 1, sl);
      P(10, ty + 6, 1, 6, sl); P(21, ty + 6, 1, 6, sd);
    }
    P(11, ty + (L.sarong ? 5 : 8), 10, 1, L.vest && !L.sarong ? L.trim : L.topShade);
    if (L.vest && !L.sarong) for (let xx = 11; xx < 21; xx += 2) P(xx, ty + 8, 1, 1, '#9c6a2c');
  } else {
    P(13, ty, 6, 9, L.top);
    if (L.vest) { P(18, ty + 1, 1, 6, L.inner); P(17, ty + 1, 1, 7, L.trim); P(14, ty + 3, 1, 1, L.trim); P(14, ty + 5, 1, 1, L.trim); }
    if (L.batik) for (let yy = 0; yy < 8; yy++) for (let xx = 0; xx < 6; xx++) if ((xx + yy * 2) % 4 === 0) P(13 + xx, ty + yy, 1, 1, L.trim);
    if (L.apron) { P(17, ty + 2, 2, 8, L.inner); P(17, ty + 5, 2, 2, '#ded0ab'); }
    P(13, ty, 1, 9, L.topShade); P(18, ty, 1, 1, L.topLight);
    if (L.sarong) {
      const sl = L.sarongLight ?? '#ffffff', sd = L.sarongShade ?? '#000000';
      P(12, ty + 6, 8, 6, L.sarong); P(12, ty + 6, 8, 1, sl); P(12, ty + 11, 8, 1, sd);
      for (let xx = 0; xx < 8; xx += 3) P(12 + xx, ty + 8 + (xx % 6 === 0 ? 0 : 1), 2, 1, sl);
      P(12, ty + 6, 1, 6, sl);
    }
    P(13, ty + (L.sarong ? 5 : 8), 6, 1, L.topShade);
  }

  // ---------- arms ----------
  if (!side) {
    const holdLeft = s.holding && back, holdRight = s.holding && !back;
    if (s.pose === 'pour') {
      for (const x of [10, 20]) { P(x, ty, 2, 2, sleeve); P(x, ty - 4, 2, 4, L.skin); P(x, ty - 5, 2, 1, L.skinShade); }
    } else if (s.pose === 'fill') {
      // Both hands reaching forward together to lower/haul the bucket rope over the pier
      P(11, ty + 1, 2, 3, sleeve); P(19, ty + 1, 2, 3, sleeve);
      P(12, ty + 4, 2, 4, L.skin); P(18, ty + 4, 2, 4, L.skin);
      P(14, ty + 7, 4, 2, L.skinShade); P(14, ty + 7, 3, 1, L.skinLight);
    } else {
      if (s.pose === 'cough') { P(10, ty, 2, 2, sleeve); P(12, ty - 3, 3, 3, L.skin); P(14, ty - 2, 1, 1, L.skinShade); }
      else arm(9, ty + 1 + (holdLeft ? 0 : swing));
      if (s.pose === 'wave') {
        const wv = f & 1;
        P(21, ty, 2, 2, sleeve); P(22, ty - 3, 2, 3, L.skin); P(22 + wv, ty - 6, 2, 3, L.skin); P(22 + wv, ty - 6, 2, 1, L.skinLight);
      } else if (s.pose === 'point') {
        P(21, ty + 1, 3, 2, sleeve); P(24, ty + 1, 4, 2, L.skin); P(28, ty + 1, 1, 1, L.skin); P(24, ty + 2, 4, 1, L.skinShade);
      } else arm(21, ty + 1 - (holdRight ? 0 : swing));
    }
  } else {
    if (s.pose === 'pour') { P(16, ty, 2, 2, sleeve); P(18, ty - 1, 3, 2, L.skin); P(21, ty - 2, 2, 2, L.skin); }
    else if (s.pose === 'fill') { P(16, ty + 1, 3, 2, sleeve); P(18, ty + 3, 4, 2, L.skin); P(21, ty + 4, 2, 2, L.skinShade); }
    else if (s.pose === 'point') { P(16, ty + 1, 3, 2, sleeve); P(19, ty + 1, 5, 2, L.skin); P(19, ty + 2, 5, 1, L.skinShade); }
    else if (s.holding) { P(16, ty, 2, 3, sleeve); P(16, ty + 3, 2, 4, L.skin); P(17, ty + 3, 1, 4, L.skinShade); P(16, ty + 7, 2, 1, L.skinShade); }
    else {
      const off = swing * 2;
      P(15, ty, 2, 3, sleeve); P(16, ty, 1, 3, sleeveShade);
      P(15 + Math.round(off / 2), ty + 3, 2, 2, L.skin); P(15 + off, ty + 5, 2, 2, L.skin); P(15 + off, ty + 6, 2, 1, L.skinShade);
    }
  }

  // ---------- head ----------
  const hy = 8 + Ub;
  const row = (r: number, x0: number, x1: number, c: string) => P(x0, hy + r, x1 - x0 + 1, 1, c);

  const headColor = back ? L.hair : L.skin;
  row(0, 11, 20, L.hair); row(1, 10, 21, L.hair);
  for (let r = 2; r <= 11; r++) row(r, 9, 22, headColor);
  row(12, 10, 21, headColor); row(13, 11, 20, headColor);
  // jaw shading + rim light from the upper left
  if (!back) { row(12, 10, 21, L.skinShade); row(13, 11, 20, L.skinShade); P(9, hy + 4, 1, 6, L.skinLight); }

  if (back) {
    P(12, hy + 1, 4, 1, L.hairLight); P(11, hy + 2, 2, 2, L.hairLight);
    P(13, hy + 12, 6, 2, L.skinShade);
    P(9, hy + 5, 2, 6, L.hair); P(21, hy + 5, 2, 5, L.hair);
  } else if (!side) {
    const ex1 = 12 + s.glance, ex2 = 18 + s.glance, ey = hy + 7;
    if (L.head === 'peci') { P(9, hy + 4, 1, 4, L.hair); P(22, hy + 4, 1, 4, L.hair); }
    else {
      for (let r = 2; r <= 4; r++) row(r, 9, 22, L.hair);
      if (L.head === 'kerchief') {
        P(9, hy + 5, 2, 6, L.hair); P(21, hy + 5, 2, 5, L.hair);
        for (const x of [11, 12, 14, 15, 17, 19, 20]) P(x, hy + 5, 1, 1, L.hair);
        P(11, hy + 6, 1, 1, L.hair); P(20, hy + 6, 1, 1, L.hair);
      } else { P(9, hy + 5, 1, 4, L.hair); P(22, hy + 5, 1, 4, L.hair); }
      P(13, hy + 1, 3, 1, L.hairLight); P(12, hy + 2, 2, 1, L.hairLight);
    }
    for (const ex of [ex1, ex2]) {
      P(ex, ey - 2, 2, 1, L.hair);                            // brow
      if (s.blink) { P(ex, ey + 1, 2, 1, '#2a1f1b'); P(ex, ey, 2, 1, L.skinShade); }
      else {
        P(ex, ey, 2, 2, '#1f1a18');
        P(ex, ey, 1, 1, '#f7f0e1');
        P(ex + 1, ey + 1, 1, 1, '#4a3a34');                   // iris depth
      }
    }
    P(16, ey + 1, 1, 2, L.skinShade);                         // nose bridge
    P(15, ey + 3, 2, 1, L.skinShade);
    P(10, ey + 1, 1, 3, L.skinLight); P(21, ey + 1, 1, 3, L.skinShade); // cheek contour
    if (L.glasses) {
      const G = '#ddd6bb';
      for (const gx of [11, 17]) { P(gx, ey - 1, 4, 1, G); P(gx, ey + 2, 4, 1, G); P(gx, ey, 1, 2, G); P(gx + 3, ey, 1, 2, G); }
      P(15, ey, 2, 1, G);
    } else if (s.who === 'wira') { P(11, ey + 2, 1, 1, '#e8876a'); P(20, ey + 2, 1, 1, '#e8876a'); }
    P(16, ey + 2, 1, 1, L.skinShade);
    const my = hy + 10;
    if (L.mustache) { P(13, my, 6, 1, L.mustache); P(15, my + 1, 2, 1, s.mouth ? '#5a1f1a' : '#8a3a2c'); }
    else if (s.mouth) { P(15, my, 2, 2, '#5a1f1a'); P(15, my + 1, 2, 1, '#b84c3d'); }
    else { P(15, my, 2, 1, '#9c3b2c'); P(14, my - 1, 1, 1, L.skinShade); P(17, my - 1, 1, 1, L.skinShade); }
  } else {
    P(23, hy + 8, 1, 2, L.skin); P(23, hy + 9, 1, 1, L.skinShade);
    if (L.head !== 'peci') {
      for (let r = 2; r <= 4; r++) row(r, 9, 22, L.hair);
      for (let r = 5; r <= 10; r++) row(r, 9, 14, L.hair);
      row(11, 10, 13, L.hair);
      if (L.head === 'kerchief') { P(15, hy + 5, 1, 1, L.hair); P(17, hy + 5, 1, 1, L.hair); }
      P(13, hy + 1, 3, 1, L.hairLight);
    } else P(9, hy + 4, 4, 5, L.hair);
    P(14, hy + 7, 1, 2, L.skin); P(15, hy + 8, 1, 1, L.skinShade);
    P(19, hy + 6, 2, 1, L.hair);
    if (s.blink) P(19, hy + 8, 2, 1, '#2a1f1b');
    else { P(19, hy + 7, 2, 2, '#1f1a18'); P(19, hy + 7, 1, 1, '#f7f0e1'); }
    if (L.glasses) { const G = '#ddd6bb'; P(18, hy + 6, 4, 1, G); P(18, hy + 9, 4, 1, G); P(18, hy + 7, 1, 2, G); P(21, hy + 7, 1, 2, G); P(15, hy + 7, 3, 1, G); }
    else if (s.who === 'wira') P(18, hy + 9, 1, 1, '#e8876a');
    if (L.mustache) P(19, hy + 10, 4, 1, L.mustache);
    else P(20, hy + 10, 2, s.mouth ? 2 : 1, s.mouth ? '#5a1f1a' : '#9c3b2c');
    P(22, hy + 3, 1, 7, L.skinLight);
    P(9, hy + 5, 1, 6, L.head === 'peci' ? L.hair : L.skinLight);
  }

  // ---------- finishing pass: cloth folds, rim light, neck shadow ----------
  if (!back) {
    P(13, hy + 13, 6, 1, L.skinShade);                        // chin
    P(14, hy + 14, 4, 1, '#00000033');                        // neck shadow
  }
  if (L.head !== 'peci' && !back) {
    // a few strands break the hair silhouette
    P(10, hy + 4, 1, 2, L.hairLight);
    P(19, hy + 3, 1, 2, L.hairLight);
    P(15, hy + 1, 2, 1, L.hairLight);
  }
  // vertical cloth folds so the tunic is not a flat slab
  if (!side) {
    for (const fx2 of [12, 19]) {
      P(fx2, ty + 2, 1, 5, '#00000026');
      P(fx2 + 1, ty + 3, 1, 4, '#ffffff1f');
    }
    P(11, ty + 7, 10, 1, '#00000030');                        // hem crease
  } else {
    P(14, ty + 2, 1, 5, '#00000026');
    P(16, ty + 3, 1, 4, '#ffffff1f');
  }
  // rim light down the lit edge of the body
  const rimX = side ? 13 : 11;
  P(rimX, ty + 1, 1, 6, '#ffffff2e');
  P(rimX, ty - 1, 2, 1, '#ffffff24');

  // ---------- headwear ----------
  const fl = s.flutter % 3;
  if (L.head === 'kerchief') {
    row(2, 9, 22, L.accent!); row(3, 9, 22, L.accent!); row(2, 10, 21, L.accentLight!);
    for (const x of [11, 14, 17, 20]) P(x, hy + 3, 1, 1, L.trim);
    if (!side && !back) { P(21, hy + 2, 3, 3, L.accent!); P(23, hy + 4, 2, 1, L.accent!); P(24, hy + 5 + (fl === 1 ? 1 : 0), 2, 1, L.accent!); }
    else if (side) { P(7, hy + 3, 3, 2, L.accent!); P(6, hy + 4, 2, 1, L.accent!); }
    else { P(15, hy + 3, 2, 2, L.accent!); P(14, hy + 5, 1, 2 + (fl === 1 ? 1 : 0), L.accent!); P(17, hy + 5, 1, 2 + (fl === 2 ? 1 : 0), L.accentLight!); }
  } else if (L.head === 'peci') {
    P(10, hy - 1, 12, 5, '#1e1b19'); P(11, hy - 1, 10, 1, '#3b3633'); P(10, hy + 3, 12, 1, '#2b2724');
    P(10, hy - 1, 2, 4, '#4a4441');
  }
}

const frameCache = new Map<string, HTMLCanvasElement>();
export function getFrame(s: FrameSpec): HTMLCanvasElement {
  const walking = s.pose === 'walk'; const key = `${s.who}|${s.dir}|${s.pose}|${s.frame & 3}|${walking ? 0 : +s.blink}|${+s.holding}|${+s.newShoes}|${walking ? 0 : s.flutter % 3}|${walking ? 0 : s.breath}|${+s.mouth}|${walking ? 0 : s.glance}|0`;
  const hit = frameCache.get(key);
  if (hit) return hit;
  let canvas: HTMLCanvasElement;
  if (s.dir === 'left') canvas = mirror(getFrame({ ...s, dir: 'right' }));
  else { const { c, ctx } = blank(W, H); paint(ctx, s); canvas = outline(c); }
  frameCache.set(key, canvas);
  return canvas;
}

// ---------------- simulated secondary motion ----------------
interface HairRig { tail: VerletChain; ribbons: [VerletChain, VerletChain]; hem: [VerletChain, VerletChain] | null; t: VerletChain | null }
const rigs = new Map<string, HairRig>();
function rig(who: Who): HairRig {
  let r = rigs.get(who);
  if (!r) {
    r = { tail: new VerletChain(4, 3.1), ribbons: [new VerletChain(3, 2.7), new VerletChain(3, 2.4)], hem: who === 'wira' ? [new VerletChain(3, 2.6), new VerletChain(3, 2.3)] : null, t: who === 'budi' ? new VerletChain(2, 2.2) : null };
    rigs.set(who, r);
  }
  return r;
}
export function resetRigs() { rigs.clear(); }

function drawChain(c: CanvasRenderingContext2D, chain: VerletChain, widths: number[], colors: string[], tip?: string) {
  for (let i = 1; i < chain.nodes.length; i++) {
    const a = chain.nodes[i - 1], b = chain.nodes[i];
    const w = widths[Math.min(i - 1, widths.length - 1)] * SCALE;
    const steps = 1;
    for (let k = 0; k <= steps; k++) {
      const u = k / steps;
      const x = Math.round((a.x + (b.x - a.x) * u) * SCALE), y = Math.round((a.y + (b.y - a.y) * u) * SCALE);
      c.fillStyle = colors[Math.min(i - 1, colors.length - 1)];
      c.fillRect(Math.round(x - w / 2), Math.round(y - w / 2), Math.max(2, w), Math.max(2, w));
    }
    if (i === chain.nodes.length - 1 && tip) {
      c.fillStyle = tip;
      c.fillRect(Math.round(b.x * SCALE) - 2, Math.round(b.y * SCALE) - 2, 4, 4);
    }
  }
}

/** Feet sit at (x, y). */
export function drawCharacter(c: CanvasRenderingContext2D, x: number, y: number, s: FrameSpec, m?: MotionInfo) {
  const dt = Math.min(0.05, m?.dt ?? 0);
  const reduced = m?.reduced;
  const r = rig(s.who);
  const L = LOOKS[s.who];
  const ub = upperOffset(s);
  // head anchor in sprite-local pixels, converted to world offset
  const headY = y - (42 - (8 + ub)) * SCALE;
  const windX = m ? m.wind.dir * (10 + m.wind.gust * 34 + m.speed * 0.16) : 0;
  const inertia = m ? -m.vx * 0.055 : 0;

  if (L.ponytail) {
    const anchor = { x: x + (s.dir === 'left' ? 9 : s.dir === 'right' ? 5 : -7), y: headY - 4 };
    if (!reduced && dt > 0) r.tail.update(dt, anchor, 430, windX + inertia, 0.982);
    else if (reduced) r.tail.update(0.0001, anchor, 430, 0, 0.9);
    drawChain(c, r.tail, [2.6, 2.2, 1.8, 1.3], [L.hair, L.hair, '#3d2f28', L.hairLight], L.accent);
  }
  if (L.head === 'kerchief') {
    const knot = { x: x + (s.dir === 'left' ? -10 : 10), y: headY - 8 };
    for (let i = 0; i < 2; i++) {
      const ch = r.ribbons[i];
      const a = { x: knot.x + (i ? 2 : -2), y: knot.y + (i ? 1 : 0) };
      if (!reduced && dt > 0) ch.update(dt, a, 300, windX * 1.5 + inertia * 1.6 + (i ? 6 : -6), 0.975);
      else if (reduced) ch.update(0.0001, a, 300, 0, 0.9);
      drawChain(c, ch, [2.2, 1.8, 1.2], [L.accent!, i ? L.accentLight! : L.accent!], L.trim);
    }
  }
  if (r.t) {
    // Pak Budi's apron string / Pak RT's sash flapping
    const a = { x: x + 8, y: y - 30 };
    if (!reduced && dt > 0) r.t.update(dt, a, 260, windX, 0.97);
    drawChain(c, r.t, [1.6, 1.2], ['#ded0ab', '#c8b995']);
  }
  if (r.hem && L.sarong) {
    // Wira's woven sarong hem trails her hip, then settles after each step.
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      const facing = s.dir === 'left' ? -1 : 1;
      const anchor = { x: x + side * 8, y: y - 21 };
      const windForce = windX * 0.72 - (m?.vx ?? 0) * 0.11 * facing;
      if (!reduced && dt > 0) r.hem[i].update(dt, anchor, 340, windForce + side * 3, 0.976);
      drawChain(c, r.hem[i], [3.2, 2.8, 2.1], ['#5a2b3b', '#7d3f52', '#a35c6c'], '#e9ba5c');
    }
  }

  const frame = getFrame(s);
  const phase = (s.gait ?? ((s.frame & 3) / 4)) * Math.PI * 2;
  const bobPx = m && !reduced && s.pose === 'walk' ? Math.round((1 - Math.cos(phase)) * 0.95) : 0;
  const leanPx = m && !reduced ? Math.round(Math.max(-2, Math.min(2, m.vx / 140))) : 0;
  c.drawImage(frame, Math.round(x) - (W / 2) * SCALE + leanPx, Math.round(y - bobPx) - 42 * SCALE, W * SCALE, H * SCALE);
}

export function drawShadow(c: CanvasRenderingContext2D, x: number, y: number, w = 30, alpha = 0.26) {
  const rx = Math.round(x), ry = Math.round(y);
  c.fillStyle = `rgba(20,24,18,${alpha})`;
  c.fillRect(rx - w / 2, ry - 2, w, 5);
  c.fillRect(rx - w / 2 + 4, ry - 4, w - 8, 9);
}

/** World offset (from the feet) of the hand that carries a bucket. */
export function handPoint(s: Pick<FrameSpec, 'dir' | 'pose' | 'frame' | 'breath'>) {
  const ub = upperOffset(s);
  if (s.pose === 'pour') {
    if (s.dir === 'right') return { x: 12, y: (ub - 22) * SCALE };
    if (s.dir === 'left') return { x: -12, y: (ub - 22) * SCALE };
    return { x: 0, y: (ub - 25) * SCALE };
  }
  if (s.pose === 'fill') {
    if (s.dir === 'right') return { x: 13, y: (ub - 13) * SCALE };
    if (s.dir === 'left') return { x: -13, y: (ub - 13) * SCALE };
    return { x: 0, y: (ub - 11) * SCALE };
  }
  const y = (ub - 12) * SCALE;
  if (s.dir === 'right') return { x: 2, y };
  if (s.dir === 'left') return { x: -2, y };
  if (s.dir === 'up') return { x: -12, y };
  return { x: 12, y };
}

// ---------------- buckets ----------------
const bucketCache = new Map<string, HTMLCanvasElement>();

function paintBucket(ctx: CanvasRenderingContext2D, big: boolean, water: number, slosh: number, shimmer: number) {
  const w = big ? 14 : 11, h = big ? 14 : 12;
  const P = (x: number, y: number, ww: number, hh: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x, y, ww, hh); };
  const col = big
    ? { body: '#b5813f', light: '#e6bb78', shade: '#7c592c', deep: '#5a4128', rim: '#4b3a2a', band: '#3f3226', handle: '#e2c37f', rivet: '#f0dca6' }
    : { body: '#3f90a3', light: '#8ad0d6', shade: '#2a6476', deep: '#22485a', rim: '#1d3d4c', band: '#2b5f6f', handle: '#cfdbd2', rivet: '#e9f3ee' };
  const cx = Math.floor(w / 2);
  // handle arc with a grip
  P(cx - 3, 0, 6, 1, col.handle); P(cx - 4, 1, 1, 2, col.handle); P(cx + 3, 1, 1, 2, col.handle);
  P(cx - 1, 0, 2, 1, col.rivet);
  P(1, 3, 1, 2, col.handle); P(w - 2, 3, 1, 2, col.handle);
  // rim (elliptical mouth)
  P(0, 4, w, 2, col.rim); P(1, 4, w - 2, 1, col.deep);
  if (water > 0) {
    const lvl = 4 + Math.round((1 - water) * 1.5);
    const tilt = Math.max(-1, Math.min(1, Math.round(slosh * 2)));
    P(1, lvl, w - 2, 2, '#5fb9c6');
    P(1 + tilt, lvl, w - 3, 1, '#8fd9de');
    P(2 + (shimmer % 2) * 3, lvl, 2, 1, '#eafaf3');
    if (tilt > 0) P(w - 2, lvl + 1, 1, 1, '#3d8f9e'); else if (tilt < 0) P(1, lvl + 1, 1, 1, '#3d8f9e');
  }
  // staved body, slightly tapered, lit from the left
  for (let y = 6; y < h - 1; y++) {
    const inset = y >= h - 4 ? 1 : y >= h - 2 ? 2 : 0;
    P(inset, y, w - inset * 2, 1, col.body);
    P(inset, y, 2, 1, col.light);
    P(w - inset - 3, y, 3, 1, col.shade);
    P(w - inset - 1, y, 1, 1, col.deep);
    // stave seams
    for (let sx = inset + 3; sx < w - inset - 2; sx += 3) P(sx, y, 1, 1, col.shade);
  }
  // iron bands with rivets
  const bands = big ? [6, 9, h - 3] : [7, h - 3];
  for (const by of bands) {
    P(0, by, w, 1, col.band);
    P(1, by, 1, 1, col.rivet); P(w - 2, by, 1, 1, col.band);
  }
  P(1, h - 1, w - 2, 1, col.deep);
}

export function bucketSprite(big: boolean, full: boolean, shimmer: number) {
  const key = `${big}|${full}|${shimmer % 2}`;
  const hit = bucketCache.get(key);
  if (hit) return hit;
  const w = big ? 14 : 11, h = big ? 14 : 12;
  const { c, ctx } = blank(w, h);
  paintBucket(ctx, big, full ? 1 : 0, 0, shimmer);
  const out = outline(c);
  bucketCache.set(key, out);
  return out;
}

/** Bucket drawn live so the water inside sloshes with the swing. */
export function drawBucketLive(
  c: CanvasRenderingContext2D, x: number, y: number, big: boolean,
  fill: number, slosh: number, t: number, scale = SCALE, angle = 0, cropRows = 0
) {
  const q = fill <= 0.02 ? 0 : fill >= 0.85 ? 1 : 0.5;
  const shimmer = Math.floor(t * 4) & 1;
  // Quantize angle into discrete pre-baked pixel-art steps (-4..+4) so runtime NEVER uses c.rotate()!
  const aStep = Math.max(-4, Math.min(4, Math.round(angle / 0.26)));
  const key = `live2|${big}|${q}|${shimmer}|${aStep}`;
  let spr = bucketCache.get(key);
  if (!spr) {
    const w = big ? 14 : 11, h = big ? 14 : 12;
    const { c: base, ctx: bctx } = blank(w, h);
    paintBucket(bctx, big, q, 0, shimmer);
    const outlined = outline(base);
    if (aStep === 0) {
      spr = outlined;
    } else {
      const pad = 6;
      const { c: rotC, ctx: rctx } = blank(outlined.width + pad * 2, outlined.height + pad * 2);
      rctx.translate(rotC.width / 2, pad + 2);
      rctx.rotate(aStep * 0.26);
      rctx.drawImage(outlined, -outlined.width / 2, -2);
      spr = rotC;
    }
    bucketCache.set(key, spr);
  }
  const padY = aStep === 0 ? 0 : 6 * scale;
  const dx = Math.round(x - spr.width * scale / 2), dy = Math.round(y - padY);
  if (cropRows > 0) {
    const srcH = Math.max(1, spr.height - cropRows);
    c.drawImage(spr, 0, 0, spr.width, srcH, dx, dy, spr.width * scale, srcH * scale);
  } else {
    c.drawImage(spr, dx, dy, spr.width * scale, spr.height * scale);
  }
  if (q > 0 && aStep === 0 && cropRows === 0) {
    const shift = Math.round(Math.max(-1, Math.min(1, slosh))) * scale;
    const surfY = dy + (big ? 5 : 4) * scale;
    const w = (big ? 10 : 7) * scale;
    c.fillStyle = '#8fd9de';
    c.fillRect(dx + 2 * scale + shift, surfY, w, scale);
    c.fillStyle = '#eafaf3';
    c.fillRect(dx + 3 * scale + shift, surfY, Math.max(scale, Math.round(w * 0.4)), scale);
  }
}

// ---------------- animals ----------------
const animalCache = new Map<string, HTMLCanvasElement>();
export function catSprite(awake: boolean, breath: number, tail: number) {
  const key = `cat|${awake}|${breath}|${tail}`;
  const hit = animalCache.get(key); if (hit) return hit;
  const { c, ctx } = blank(22, 14);
  const P = (x: number, y: number, w: number, h: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
  const white = '#efe6d2', orange = '#d98a45', dark = '#7a5236', shade = '#cfc2a6', deep = '#b9ab8d';
  const top = 6 - breath;
  // tail curled along the ground
  P(2, 10, 10, 2, orange); P(1 - (tail === 1 ? 1 : 0), 9 - (tail === 2 ? 1 : 0), 2, 2, orange); P(4, 11, 4, 1, dark);
  // body loaf with belly shading and tabby stripes
  P(3, top, 13, 11 - top, white); P(4, top - 1, 11, 1, white);
  P(5, top, 6, 3, orange); P(11, top + 1, 4, 2, dark); P(3, 9, 13, 1, shade); P(3, 10, 13, 1, deep);
  for (let i = 0; i < 3; i++) P(6 + i * 3, top + 1, 1, 4, '#dccfb2');
  // front paws tucked under
  P(6, 9, 3, 2, '#f7f0e0'); P(10, 9, 3, 2, '#f7f0e0');
  // head
  const hy = awake ? 1 : 4;
  P(13, hy + 1, 6, 5, white); P(13, hy, 2, 2, orange); P(17, hy - 1, 2, 2, white); P(18, hy, 1, 1, '#e8a59a');
  P(13, hy + 1, 3, 2, orange); P(13, hy - 1, 1, 2, orange); P(16, hy - 2, 1, 2, white);
  if (awake) { P(14, hy + 3, 1, 1, '#4f7f3a'); P(17, hy + 3, 1, 1, '#4f7f3a'); P(15, hy + 4, 2, 1, '#d98a8a'); P(19, hy + 3, 1, 1, '#f7f0e0'); }
  else { P(14, hy + 3, 2, 1, dark); P(17, hy + 3, 1, 1, dark); }
  const out = outline(c, [40, 30, 24]);
  animalCache.set(key, out); return out;
}

export function chickenSprite(frame: number, peck: boolean) {
  const key = `hen|${frame & 1}|${peck}`;
  const hit = animalCache.get(key); if (hit) return hit;
  const { c, ctx } = blank(14, 14);
  const P = (x: number, y: number, w: number, h: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
  const white = '#f1ebdc', shade = '#cdc3ab', deep = '#a99f89', red = '#d34a35', yellow = '#e9b44b';
  // tail feathers
  P(0, 3, 3, 4, white); P(0, 2, 2, 2, shade); P(0, 6, 2, 1, deep);
  // body with wing
  P(2, 5, 8, 5, white); P(3, 9, 6, 1, shade); P(2, 8, 8, 1, deep);
  P(4, 6, 4, 3, shade); P(4, 6, 4, 1, '#ded5c0'); P(5, 8, 2, 1, deep);
  // head + comb + wattle
  if (!peck) {
    P(8, 2, 4, 4, white); P(8, 1, 2, 1, red); P(9, 0, 1, 1, red); P(11, 3, 2, 1, yellow);
    P(10, 5, 1, 1, red); P(9, 3, 1, 1, '#1d1a17'); P(8, 2, 1, 1, '#ffffff');
  } else {
    P(9, 6, 4, 3, white); P(9, 5, 2, 1, red); P(13, 8, 1, 1, yellow); P(10, 7, 1, 1, '#1d1a17'); P(11, 8, 1, 1, red);
  }
  // legs alternate with a lifted foot
  if (frame & 1) { P(4, 10, 1, 2, yellow); P(7, 10, 1, 3, yellow); P(3, 12, 2, 1, yellow); P(7, 13, 2, 1, yellow); }
  else { P(5, 10, 1, 3, yellow); P(6, 10, 1, 2, yellow); P(4, 13, 2, 1, yellow); P(6, 12, 2, 1, yellow); }
  const out = outline(c, [46, 38, 30]);
  animalCache.set(key, out); return out;
}

// ---------------- portraits ----------------
export function portraitCanvas(who: PortraitId, mouth: boolean, blink: boolean, tick = 0) {
  const { c, ctx } = blank(24, 24);
  const bg: Record<string, [string, string]> = {
    wira: ['#35503a', '#2a4130'], budi: ['#4a4f35', '#3b402a'], pak_rt: ['#4f4334', '#3e3428'], radio: ['#283b3b', '#1f2f2f'], info: ['#35503a', '#2a4130'],
  };
  const [b1, b2] = bg[who] ?? bg.wira;
  ctx.fillStyle = b1; ctx.fillRect(0, 0, 24, 24);
  ctx.fillStyle = b2; for (let i = 0; i < 24; i += 4) ctx.fillRect(i, 18, 2, 6);
  if (who === 'radio') {
    const P = (x: number, y: number, w: number, h: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    P(15, 2, 1, 6, '#c9c1a2'); P(14, 1, 3, 1, '#e1d8b5');
    P(3, 8, 18, 12, '#1e1a16'); P(4, 9, 16, 10, '#8f6a3d'); P(4, 9, 16, 1, '#b48a52');
    P(5, 11, 7, 6, '#463e31'); for (let y = 11; y < 17; y += 2) P(5, y, 7, 1, '#2e2820');
    P(14, 11, 4, 3, '#cdbf8a'); P(15 + (tick % 3), 12, 1, 1, '#9c3b2c');
    P(14, 15, 2, 2, '#e3b45d'); P(17, 15, 2, 2, tick % 2 ? '#a9d17a' : '#5c7b45');
    if (tick % 2) { P(1, 10, 1, 3, '#a9d6cf'); P(22, 10, 1, 3, '#a9d6cf'); }
    return c;
  }
  const frame = getFrame({ who: who as Who, dir: 'down', pose: 'stand', frame: 0, blink, holding: false, newShoes: false, flutter: tick % 3, breath: 0, mouth, glance: 0, sway: 0 });
  ctx.drawImage(frame, 4, 4, 24, 24, 0, 2, 24, 24);
  // static ponytail / ribbon so the portrait still reads as Wira
  if (who === 'wira') {
    const P = (x: number, y: number, w: number, h: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    P(20, 9 + (tick % 2), 3, 5, '#2e2320'); P(21, 13 + (tick % 2), 2, 3, '#2e2320'); P(20, 9, 3, 1, '#c7432d');
  }
  return c;
}

let warmed = false;
export function warmupSprites() {
  if (warmed || typeof document === 'undefined') return;
  warmed = true;
  for (const dir of ['down', 'up', 'left', 'right'] as Direction[]) {
    for (const pose of ['stand', 'walk', 'fill', 'pour'] as Pose[]) {
      for (const holding of [false, true]) {
        for (const newShoes of [false, true]) {
          for (const frame of [0, 1, 2, 3]) {
            getFrame({ who: 'wira', dir, pose, frame, blink: false, holding, newShoes, flutter: 0, breath: 0, mouth: false, glance: 0, sway: 0 });
          }
        }
      }
    }
  }
  const dummy = document.createElement('canvas').getContext('2d')!;
  for (const big of [false, true]) {
    for (const fill of [0, 0.5, 1]) {
      for (const shimmer of [0, 1]) {
        for (let a = -4; a <= 4; a++) {
          drawBucketLive(dummy, 0, 0, big, fill, 0, shimmer * 0.25, SCALE, a * 0.26, 0);
        }
      }
    }
  }
}
