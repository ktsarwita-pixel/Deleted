import type { Direction, PortraitId } from '../types/gameTypes';
import { type Wind } from './physics';

/*
 * High-craft Kalimantan pixel character & creature sprite factory (36x48 canvas @ 2x scale).
 * Includes 5 distinct characters (Wira, Pak Budi, Pak RT Daman, Ibu Sari, Manggala Agni Ranger),
 * true 8-frame articulated walk cycles, expressive facial animation, work/idle poses,
 * and detailed calico cat + kampung hens & rooster sprites.
 */
export type Who = 'wira' | 'budi' | 'pak_rt' | 'bu_sari' | 'manggala';
export type Pose =
  | 'stand'
  | 'walk'
  | 'pour'
  | 'fill'
  | 'wave'
  | 'point'
  | 'cough'
  | 'juggle67'
  | 'celebrate'
  | 'wipe'
  | 'radio_check';

export const SCALE = 2;
const W = 36, H = 48;

interface Look {
  skin: string; skinShade: string; skinLight: string;
  hair: string; hairLight: string;
  top: string; topShade: string; topLight: string;
  inner: string; innerShade: string; trim: string;
  pants: string; pantsShade: string; pantsLight: string;
  sarong?: string; sarongShade?: string; sarongLight?: string;
  head: 'kerchief' | 'peci' | 'short' | 'bun' | 'cap';
  accent?: string; accentLight?: string;
  ponytail?: boolean; vest?: boolean; apron?: boolean; batik?: boolean;
  glasses?: boolean; mustache?: string; strap?: boolean;
  hiVis?: boolean; kebaya?: boolean; eyeTone: string;
}

const LOOKS: Record<Who, Look> = {
  wira: {
    skin: '#e5aa78', skinShade: '#be7d53', skinLight: '#f8d7ad',
    hair: '#291f1c', hairLight: '#614538',
    top: '#bc432e', topShade: '#872c1d', topLight: '#df6b4e',
    inner: '#f3e5c3', innerShade: '#cbb990', trim: '#f0c05a',
    pants: '#3d4c38', pantsShade: '#283526', pantsLight: '#55694e',
    sarong: '#7e3e52', sarongShade: '#582939', sarongLight: '#aa6072',
    head: 'kerchief', accent: '#cc422b', accentLight: '#f07952',
    ponytail: true, vest: true, strap: true, eyeTone: '#3c2b24',
  },
  budi: {
    skin: '#cc8f5f', skinShade: '#a26b43', skinLight: '#e4af80',
    hair: '#221c19', hairLight: '#433730',
    top: '#4c7e53', topShade: '#345a3a', topLight: '#73a46e',
    inner: '#efe4c8', innerShade: '#c8ba96', trim: '#deb85c',
    pants: '#4c3c30', pantsShade: '#342921', pantsLight: '#665243',
    head: 'peci', apron: true, mustache: '#271e1a', eyeTone: '#34261f',
  },
  pak_rt: {
    skin: '#bf8256', skinShade: '#965d39', skinLight: '#daa274',
    hair: '#aba799', hairLight: '#dad6c7',
    top: '#a86939', topShade: '#794825', topLight: '#ce9155',
    inner: '#ecdeb6', innerShade: '#c4b388', trim: '#f2cc6e',
    pants: '#393530', pantsShade: '#26231e', pantsLight: '#504b44',
    sarong: '#3d5b4a', sarongShade: '#294033', sarongLight: '#608468',
    head: 'short', batik: true, glasses: true, mustache: '#efe9d6', eyeTone: '#2f2520',
  },
  bu_sari: {
    skin: '#dea172', skinShade: '#b5764d', skinLight: '#f4cea4',
    hair: '#241b19', hairLight: '#4f3a31',
    top: '#c45b4a', topShade: '#913c30', topLight: '#e0806c',
    inner: '#f5e7c9', innerShade: '#d2c09c', trim: '#f0ca6d',
    pants: '#325358', pantsShade: '#223a3e', pantsLight: '#4b7379',
    sarong: '#2f6268', sarongShade: '#1e4348', sarongLight: '#589196',
    head: 'bun', accent: '#fff4d2', accentLight: '#f4b942',
    kebaya: true, eyeTone: '#382721',
  },
  manggala: {
    skin: '#cf9162', skinShade: '#a46b43', skinLight: '#e8b384',
    hair: '#251e1b', hairLight: '#473932',
    top: '#4c5b3b', topShade: '#344028', topLight: '#697c52',
    inner: '#e86a2c', innerShade: '#b84b18', trim: '#e9eef0',
    pants: '#38432e', pantsShade: '#252e1e', pantsLight: '#4f5d42',
    head: 'cap', accent: '#d95b26', accentLight: '#f58b44',
    hiVis: true, strap: true, eyeTone: '#30241e',
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

function outline(canvas: HTMLCanvasElement, rgb: [number, number, number] = [25, 20, 16]) {
  const ctx = canvas.getContext('2d')!;
  const { width: w, height: h } = canvas;
  const img = ctx.getImageData(0, 0, w, h); const d = img.data; const out = new Uint8ClampedArray(d);
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (d[i + 3] !== 0) continue;
    if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) {
      out[i] = rgb[0]; out[i + 1] = rgb[1]; out[i + 2] = rgb[2]; out[i + 3] = 255;
    }
  }
  img.data.set(out); ctx.putImageData(img, 0, 0);
  return canvas;
}

function mirror(src: HTMLCanvasElement) {
  const { c, ctx } = blank(src.width, src.height);
  ctx.translate(src.width, 0); ctx.scale(-1, 1); ctx.drawImage(src, 0, 0);
  return c;
}

// 8-frame walk cycle bob: contact(0), down/recoil(1), passing(2), high-point(3), contact(4), down(5), passing(6), high(7)
const WALK_BOB_8 = [0, 1, 0, -1, 0, 1, 0, -1];

export function upperOffset(s: Pick<FrameSpec, 'pose' | 'frame' | 'breath'>) {
  const f4 = s.frame & 3;
  const f8 = s.frame & 7;
  if (s.pose === 'juggle67') return (f4 === 1 || f4 === 3) ? 1 : 0;
  if (s.pose === 'celebrate') return [1, -1, -1, 0][f4];
  if (s.pose === 'walk') return WALK_BOB_8[f8];
  const crouch = s.pose === 'fill' ? 3 : s.pose === 'pour' ? 1 : s.pose === 'cough' ? 1 : 0;
  return crouch - (s.pose === 'stand' || s.pose === 'wipe' || s.pose === 'radio_check' ? s.breath : 0);
}

function paint(ctx: CanvasRenderingContext2D, s: FrameSpec) {
  const L = LOOKS[s.who];
  const P = (x: number, y: number, w: number, h: number, c: string) => {
    if (w > 0 && h > 0) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  };
  const side = s.dir === 'left' || s.dir === 'right';
  const back = s.dir === 'up';
  const f4 = s.frame & 3;
  const f8 = s.frame & 7;
  const walking = s.pose === 'walk';
  const Ub = upperOffset(s);
  const crouch = s.pose === 'fill' ? 3 : s.pose === 'cough' ? 1 : s.pose === 'pour' ? 1 : 0;
  const legTop = 33 + (walking ? WALK_BOB_8[f8] : crouch);

  const shoe = s.newShoes
    ? { a: '#cc3f2b', b: '#f47e52', sole: '#f5ecd6', stripe: '#f7ca52', lace: '#ffffff' }
    : s.who === 'wira' ? { a: '#6e4c33', b: '#946b45', sole: '#38281e', stripe: '#6e4c33', lace: '#d1bc94' }
    : s.who === 'manggala' ? { a: '#2e2924', b: '#4d453d', sole: '#1a1714', stripe: '#3b352f', lace: '#8a8275' }
    : s.who === 'bu_sari' ? { a: '#6b3b2e', b: '#945745', sole: '#2e1d17', stripe: '#e6c26e', lace: '#e6c26e' }
    : { a: '#3d312a', b: '#5e4d44', sole: '#211b17', stripe: '#3d312a', lace: '#918272' };

  const sleeve = L.vest ? L.inner : L.top;
  const sleeveShade = L.vest ? L.innerShade : L.topShade;
  const sleeveLight = L.vest ? '#fff7df' : L.topLight;

  // ---------- Articulated Front/Back Leg with Knee Highlight & Boot Tread ----------
  const legFront = (x: number, bottom: number, lift: number, kneeShift = 0) => {
    const footY = bottom - lift;
    const thighH = Math.max(2, Math.floor((footY - 3 - legTop) * 0.55));
    const shinY = legTop + thighH;
    const shinH = Math.max(2, footY - 3 - shinY);
    // Thigh
    P(x, legTop, 4, thighH, L.pants);
    P(x, legTop, 1, thighH, L.pantsLight);
    P(x + 3, legTop, 1, thighH, L.pantsShade);
    // Knee + Shin
    const sx = x + kneeShift;
    P(sx, shinY, 4, shinH, L.pants);
    P(sx + 1, shinY, 2, 1, L.pantsLight); // knee cap catchlight
    P(sx + 3, shinY, 1, shinH, L.pantsShade);
    P(sx, footY - 4, 4, 1, L.pantsShade); // trouser cuff
    // Boot / Sneaker
    P(sx, footY - 3, 4, 3, shoe.a);
    P(sx, footY - 3, 3, 1, shoe.b);
    if (s.newShoes) {
      P(sx + 1, footY - 2, 2, 1, shoe.stripe);
      P(sx + 1, footY - 4, 2, 1, shoe.lace);
    } else if (s.who === 'bu_sari') {
      P(sx + 1, footY - 2, 2, 1, shoe.stripe);
    }
    P(sx, footY, 4, 1, shoe.sole);
    P(sx, footY, 1, 1, '#00000050'); P(sx + 3, footY, 1, 1, '#00000050');
  };

  // ---------- Articulated Side-View Two-Segment Leg (Thigh -> Knee -> Calf -> angled Foot) ----------
  const legSide = (hipX: number, thighOff: number, footOff: number, bottom: number, near: boolean, lift: number, toeUp = 0) => {
    const footY = bottom - lift;
    const midY = Math.floor((legTop + footY - 3) * 0.52);
    const col = near ? L.pants : L.pantsShade;
    const hi = near ? L.pantsLight : L.pants;
    // Thigh segment
    P(hipX + thighOff, legTop, 4, Math.max(2, midY - legTop), col);
    if (near) P(hipX + thighOff, legTop + 1, 1, Math.max(1, midY - legTop - 1), hi);
    // Shin segment
    P(hipX + footOff, midY, 4, Math.max(2, footY - 3 - midY), col);
    if (near) P(hipX + footOff + 1, midY, 2, 1, hi); // knee highlight
    // Boot / Sneaker with toe box facing right (mirrored automatically for left)
    const sx = hipX + footOff;
    P(sx, footY - 3, 5, 3, shoe.a);
    P(sx + 1, footY - 3, 3, 1, shoe.b);
    if (near) P(sx + 3, footY - 2 - toeUp, 2, 2, shoe.b);
    if (s.newShoes) {
      P(sx + 1, footY - 2, 2, 1, shoe.stripe);
      P(sx + 1, footY - 4, 2, 1, shoe.lace);
      P(sx + 3, footY - 3, 1, 1, shoe.lace);
    }
    P(sx, footY - toeUp, 5, 1, shoe.sole);
  };

  const ty = 23 + Ub;
  // Smooth 8-frame sinusoidal arm swing (-3..+3)
  const swing8 = walking ? [3, 2, 0, -2, -3, -2, 0, 2][f8] : 0;
  const shoulderTwist = walking && !side ? [1, 1, 0, -1, -1, -1, 0, 1][f8] : 0;

  // Far arm behind torso in side view (with elbow bend!)
  if (side && s.pose !== 'pour' && s.pose !== 'point') {
    const aOff = -swing8;
    const elbowX = 16 + Math.round(aOff * 0.45);
    const handX = 16 + aOff + (aOff > 0 ? 1 : 0);
    P(16, ty + 1, 3, 3, sleeveShade);
    P(elbowX, ty + 4, 3, 3, L.skinShade);
    P(handX, ty + 6 - (Math.abs(aOff) > 1 ? 1 : 0), 3, 2, L.skinShade);
  }

  // ---------- Legs (8-Frame Fluid Walk + Action Stances) ----------
  if (!side) {
    if (walking) {
      // 8-frame front/back stride: [leftBot, rightBot, leftLift, rightLift, lKneeShift, rKneeShift]
      const g = [
        [44, 43, 0, 2,  0,  0], // 0: L plant, R toe-off
        [44, 42, 0, 3,  0,  0], // 1: L recoil, R swing start
        [44, 41, 0, 3,  0,  0], // 2: R passing high
        [43, 43, 1, 0,  0,  0], // 3: R reach forward
        [43, 44, 2, 0,  0,  0], // 4: R plant, L toe-off
        [42, 44, 3, 0,  0,  0], // 5: R recoil, L swing start
        [41, 44, 3, 0,  0,  0], // 6: L passing high
        [43, 43, 0, 1,  0,  0], // 7: L reach forward
      ][f8];
      // Draw higher/back leg first so passing knee overlaps naturally
      if (g[2] > g[3]) {
        legFront(13, g[0], g[2], g[4]); legFront(19, g[1], g[3], g[5]);
      } else {
        legFront(19, g[1], g[3], g[5]); legFront(13, g[0], g[2], g[4]);
      }
    } else {
      let lb = 44, rb = 44, ll = 0, rl = 0;
      if (s.pose === 'juggle67') {
        if (f4 === 0) { rl = 1; rb = 43; }
        else if (f4 === 2) { ll = 1; lb = 43; }
      } else if (s.pose === 'celebrate' && (f4 === 1 || f4 === 2)) {
        lb = 42; rb = 42; ll = 2; rl = 2;
      }
      const spread = (crouch >= 2 || s.pose === 'juggle67' || s.pose === 'pour') ? 1 : 0;
      legFront(13 - spread, lb, ll);
      legFront(19 + spread, rb, rl);
    }
  } else {
    if (walking) {
      // 8-frame side stride: [thighOff, footOff, lift, toeUp]
      const cycle: [number, number, number, number][] = [
        [ 2,  4, 0, 1], // 0: heel strike forward
        [ 1,  2, 0, 0], // 1: flat-foot weight acceptance
        [ 0,  0, 0, 0], // 2: mid-stance
        [-1, -3, 0, 0], // 3: heel-off push
        [-2, -4, 2, 0], // 4: toe-off behind
        [-1, -2, 3, 0], // 5: knee-bend swing
        [ 1,  1, 3, 0], // 6: high knee passing
        [ 2,  3, 1, 1], // 7: terminal swing reach
      ];
      const nr = cycle[f8];
      const bk = cycle[(f8 + 4) & 7];
      legSide(16, bk[0], bk[1], 44, false, bk[2], bk[3]);
      legSide(16, nr[0], nr[1], 44, true,  nr[2], nr[3]);
    } else if (s.pose === 'pour') {
      // Dynamic forward lunge when heaving water onto fire!
      legSide(15, -2, -4, 44, false, 0, 0);
      legSide(17,  2,  4, 44, true,  0, 0);
    } else if (crouch >= 3) {
      legSide(16, -2, -3, 44, false, 0, 0);
      legSide(16,  2,  3, 44, true,  0, 0);
    } else {
      legSide(16, -1, -1, 44, false, 0, 0);
      legSide(16,  1,  1, 44, true,  0, 0);
    }
  }

  // ---------- Detailed Torso, Traditional Motifs & Gear ----------
  if (!side) {
    const tx0 = 12;
    P(tx0, ty, 12, 10, L.top);
    // Subtle shoulder roundness
    P(tx0 + 1, ty - 1, 10, 1, L.top);
    P(tx0, ty + 1, 1, 5, L.topLight);
    P(tx0 + 11, ty + 1, 1, 8, L.topShade);

    if (L.vest) {
      if (!back) {
        // Cream inner shirt + Kalimantan Dayak embroidered vest panels
        P(16 + shoulderTwist, ty, 4, 9, L.inner);
        P(16 + shoulderTwist, ty + 8, 4, 1, L.innerShade);
        P(15 + shoulderTwist, ty + 1, 1, 8, L.trim);
        P(20 + shoulderTwist, ty + 1, 1, 8, L.trim);
        for (const yy of [2, 5, 7]) {
          P(13, ty + yy, 2, 1, L.trim);
          P(21, ty + yy, 2, 1, L.trim);
        }
        // Woven rattan satchel strap + brass buckle
        if (L.strap) {
          P(13, ty + 1, 2, 1, '#8a6839');
          P(15, ty + 2, 2, 2, '#9e7944');
          P(17, ty + 4, 2, 2, '#efc86b'); // brass buckle glint!
          P(19, ty + 6, 3, 1, '#8a6839');
        }
      } else {
        // Dayak shield diamond motif on back of Wira's vest
        P(17, ty + 2, 2, 1, L.trim);
        P(15, ty + 3, 6, 1, L.trim);
        P(16, ty + 4, 4, 2, L.accent ?? L.trim);
        P(17, ty + 4, 2, 2, L.trim);
        P(15, ty + 6, 6, 1, L.trim);
        P(17, ty + 7, 2, 1, L.trim);
      }
    }

    if (L.hiVis) {
      // Manggala Agni Karhutla high-vis orange ranger safety vest + silver reflective bands!
      P(13, ty + 1, 4, 8, L.inner);
      P(19, ty + 1, 4, 8, L.inner);
      if (!back) P(17, ty, 2, 9, L.top); // olive shirt center zip
      else P(13, ty + 1, 10, 8, L.inner);
      // Reflective silver safety stripes
      P(13, ty + 4, 10, 1, L.trim);
      P(13, ty + 7, 10, 1, L.trim);
      if (!back) P(17, ty + 4, 2, 4, L.topShade);
    }

    if (L.kebaya && !back) {
      // Ibu Sari's embroidered V-neck kebaya lapel & gold brooch (peniti emas)
      P(16, ty, 4, 3, L.skin);
      P(15, ty + 1, 1, 7, L.trim);
      P(20, ty + 1, 1, 7, L.trim);
      P(17, ty + 3, 2, 2, '#f5d274'); // gold kebaya brooch
      P(16, ty + 5, 4, 5, L.topShade);
    }

    if (L.batik) {
      for (let yy = 1; yy < 9; yy++) {
        for (let xx = 0; xx < 12; xx++) {
          if ((xx + yy * 2) % 4 === 0) P(tx0 + xx, ty + yy, 1, 1, L.trim);
          else if ((xx + yy) % 5 === 0) P(tx0 + xx, ty + yy, 1, 1, L.topLight);
        }
      }
      if (!back) {
        P(16, ty, 4, 1, L.inner);
        P(17, ty + 1, 2, 2, L.inner);
        // Posko RT green armband on left sleeve + clipped VHF radio at hip
        P(11, ty + 2, 2, 2, '#4ea865');
        P(21, ty + 7, 2, 3, '#222629'); P(22, ty + 5, 1, 2, '#222629');
      }
    }

    if (L.apron && !back) {
      // Pak Budi's crisp warung apron with striped weave, pocket notepad & side cloth
      P(14, ty + 2, 8, 9, L.inner);
      P(14, ty, 1, 2, L.inner); P(21, ty, 1, 2, L.inner);
      P(14, ty + 10, 8, 1, L.innerShade);
      P(15, ty + 5, 6, 3, '#dfd0aa'); P(15, ty + 5, 6, 1, '#bfa97c');
      P(16, ty + 4, 2, 1, '#589c64'); // Rupiah note / pencil peeking from pocket!
      P(21, ty + 6, 2, 4, '#e89b6c'); // striped kitchen towel tucked at hip!
    }

    // Wrapped sarong / hip sash
    if (L.sarong) {
      const sl = L.sarongLight ?? '#ffffff', sd = L.sarongShade ?? '#000000';
      const sarH = L.kebaya ? 7 : 6;
      P(11, ty + 6, 14, sarH, L.sarong);
      P(11, ty + 6, 14, 1, sl);
      P(11, ty + 5 + sarH, 14, 1, sd);
      for (let xx = 0; xx < 14; xx += 3) {
        P(11 + xx, ty + 8 + (xx % 6 === 0 ? 0 : 1), 2, 1, sl);
      }
      P(11, ty + 6, 1, sarH, sl);
      P(24, ty + 6, 1, sarH, sd);
    } else {
      P(tx0, ty + 9, 12, 1, '#2b241d'); // belt
      P(17, ty + 9, 2, 1, '#d9b55b');   // belt buckle
    }
  } else {
    // Side-view sculpted torso (chest volume + back curve)
    P(14, ty, 8, 10, L.top);
    P(15, ty - 1, 6, 1, L.top);
    P(14, ty, 1, 10, L.topShade);
    P(21, ty + 1, 1, 7, L.topLight);
    if (L.vest) {
      P(20, ty + 1, 2, 7, L.inner);
      P(19, ty + 1, 1, 8, L.trim);
      P(15, ty + 3, 2, 1, L.trim); P(15, ty + 6, 2, 1, L.trim);
      if (L.strap) { P(16, ty + 2, 2, 2, '#8a6839'); P(18, ty + 4, 2, 2, '#efc86b'); }
    }
    if (L.hiVis) {
      P(14, ty + 1, 8, 8, L.inner);
      P(14, ty + 4, 8, 1, L.trim); P(14, ty + 7, 8, 1, L.trim);
    }
    if (L.batik) {
      for (let yy = 1; yy < 9; yy++) for (let xx = 0; xx < 8; xx++) if ((xx + yy * 2) % 4 === 0) P(14 + xx, ty + yy, 1, 1, L.trim);
    }
    if (L.apron) {
      P(19, ty + 2, 3, 9, L.inner);
      P(19, ty + 5, 3, 2, '#dfd0aa');
    }
    if (L.sarong) {
      const sl = L.sarongLight ?? '#ffffff', sd = L.sarongShade ?? '#000000';
      P(13, ty + 6, 10, 6, L.sarong);
      P(13, ty + 6, 10, 1, sl); P(13, ty + 11, 10, 1, sd);
      for (let xx = 0; xx < 10; xx += 3) P(13 + xx, ty + 8 + (xx % 6 === 0 ? 0 : 1), 2, 1, sl);
    } else {
      P(14, ty + 9, 8, 1, '#2b241d');
    }
  }

  // ---------- Articulated Arms & Expressive Hand Poses ----------
  const drawFrontArm = (ax: number, ay: number, isLeft: boolean, swingVal: number) => {
    const lift = swingVal < 0 ? -1 : 0;
    const drop = swingVal > 0 ? 1 : 0;
    // Rounded shoulder cap + rolled sleeve cuff
    P(ax, ay, 3, 4, sleeve);
    P(ax + (isLeft ? 0 : 2), ay, 1, 3, isLeft ? sleeveLight : sleeveShade);
    P(ax, ay + 3, 3, 1, sleeveShade);
    // Forearm + hand with thumb pixel
    P(ax, ay + 4 + lift, 3, 4 + drop, L.skin);
    P(ax + (isLeft ? 2 : 0), ay + 4 + lift, 1, 4 + drop, L.skinShade);
    P(ax + (isLeft ? 0 : 2), ay + 4 + lift, 1, 2, L.skinLight);
    P(ax + (isLeft ? 2 : 0), ay + 7 + lift + drop, 1, 1, L.skinLight); // thumb
  };

  if (!side) {
    const holdLeft = s.holding && back, holdRight = s.holding && !back;
    if (s.pose === 'pour') {
      for (const ax of [10, 23]) {
        P(ax, ty, 3, 3, sleeve);
        P(ax, ty - 5, 3, 5, L.skin);
        P(ax + 1, ty - 6, 2, 1, L.skinLight);
      }
    } else if (s.pose === 'fill') {
      P(10, ty + 1, 3, 3, sleeve); P(23, ty + 1, 3, 3, sleeve);
      P(12, ty + 4, 3, 4, L.skin); P(21, ty + 4, 3, 4, L.skin);
      P(15, ty + 7, 6, 3, L.skin); P(15, ty + 7, 5, 1, L.skinLight);
    } else if (s.pose === 'juggle67') {
      const lY = ty + 4 + [2, 0, -2, 0][f4];
      const rY = ty + 4 + [-2, 0, 2, 0][f4];
      P(9, ty + 1, 3, 3, sleeve); P(11, ty + 1, 1, 3, sleeveShade);
      const lTop = Math.min(ty + 3, lY), lBot = Math.max(ty + 5, lY + 1);
      P(8, lTop, 3, lBot - lTop + 1, L.skin); P(10, lTop, 1, lBot - lTop + 1, L.skinShade);
      P(5, lY, 5, 2, L.skin); P(5, lY, 4, 1, L.skinLight); P(5, lY + 1, 5, 1, L.skinShade);

      P(24, ty + 1, 3, 3, sleeve); P(26, ty + 1, 1, 3, sleeveShade);
      const rTop = Math.min(ty + 3, rY), rBot = Math.max(ty + 5, rY + 1);
      P(25, rTop, 3, rBot - rTop + 1, L.skin); P(27, rTop, 1, rBot - rTop + 1, L.skinShade);
      P(26, rY, 5, 2, L.skin); P(27, rY, 4, 1, L.skinLight); P(26, rY + 1, 5, 1, L.skinShade);
    } else if (s.pose === 'celebrate') {
      if (f4 === 0) {
        P(9, ty + 1, 3, 3, sleeve); P(24, ty + 1, 3, 3, sleeve);
        P(8, ty + 3, 4, 3, L.skin); P(24, ty + 3, 4, 3, L.skin);
      } else if (f4 === 1 || f4 === 2) {
        const lPump = f4 === 1 ? -1 : 0, rPump = f4 === 2 ? -1 : 0;
        P(9, ty, 3, 3, sleeve); P(7, ty - 4, 3, 5, L.skin); P(6, ty - 7 + lPump, 3, 4, L.skin); P(6, ty - 7 + lPump, 2, 1, L.skinLight);
        P(24, ty, 3, 3, sleeve); P(26, ty - 4, 3, 5, L.skin); P(27, ty - 7 + rPump, 3, 4, L.skin); P(27, ty - 7 + rPump, 2, 1, L.skinLight);
      } else {
        P(9, ty, 3, 3, sleeve); P(7, ty - 1, 3, 3, L.skin);
        P(24, ty, 3, 3, sleeve); P(26, ty - 1, 3, 3, L.skin);
      }
    } else if (s.pose === 'wipe') {
      // Pak Budi wiping / tending with a cloth in front
      const wx = [-1, 0, 1, 0][f4];
      drawFrontArm(9, ty + 1, true, 0);
      P(24, ty + 1, 3, 3, sleeve);
      P(21 + wx, ty + 4, 4, 3, L.skin);
      P(19 + wx, ty + 6, 5, 2, '#f5ebd2'); P(20 + wx, ty + 7, 3, 1, '#d8c59c');
    } else if (s.pose === 'radio_check') {
      // Pak RT / Ranger holding VHF handy-talkie near shoulder with blinking green RX/TX LED!
      drawFrontArm(9, ty + 1, true, 0);
      P(24, ty + 1, 3, 3, sleeve);
      P(23, ty - 1, 3, 4, L.skin);
      P(22, ty - 3, 3, 4, '#23282b'); // VHF walkie-talkie body
      P(23, ty - 6, 1, 3, '#171a1c'); // antenna
      P(23, ty - 2, 1, 1, (f4 & 1) ? '#5ff57a' : '#2c6b38'); // blinking LED!
    } else {
      if (s.pose === 'cough') {
        P(10, ty, 3, 3, sleeve); P(13, ty - 3, 3, 4, L.skin); P(15, ty - 2, 1, 2, L.skinShade);
      } else {
        drawFrontArm(9, ty + 1, true, holdLeft ? 0 : swing8);
      }
      if (s.pose === 'wave') {
        const wv = [-1, 0, 1, 0][f4];
        P(24, ty, 3, 3, sleeve); P(25, ty - 3, 3, 4, L.skin);
        P(25 + wv, ty - 7, 4, 4, L.skin); P(25 + wv, ty - 7, 3, 1, L.skinLight); P(28 + wv, ty - 6, 1, 3, L.skinShade);
      } else if (s.pose === 'point') {
        P(24, ty + 1, 3, 3, sleeve); P(27, ty + 1, 5, 3, L.skin); P(32, ty + 1, 2, 1, L.skinLight); P(27, ty + 3, 5, 1, L.skinShade);
      } else {
        drawFrontArm(24, ty + 1, false, holdRight ? 0 : -swing8);
      }
    }
  } else {
    // Side-view near arm with realistic shoulder + bent elbow + forearm swing!
    if (s.pose === 'pour') {
      P(17, ty, 3, 3, sleeve); P(20, ty - 2, 4, 3, L.skin); P(23, ty - 3, 3, 3, L.skinLight);
    } else if (s.pose === 'fill') {
      P(17, ty + 1, 3, 3, sleeve); P(20, ty + 3, 4, 3, L.skin); P(23, ty + 5, 3, 2, L.skinShade);
    } else if (s.pose === 'point') {
      P(17, ty + 1, 4, 3, sleeve); P(21, ty + 1, 6, 3, L.skin); P(27, ty + 1, 2, 1, L.skinLight);
    } else if (s.holding) {
      P(17, ty, 3, 4, sleeve); P(17, ty, 1, 3, sleeveLight);
      P(18, ty + 4, 3, 4, L.skin); P(18, ty + 7, 3, 2, L.skinShade);
    } else {
      const aOff = swing8;
      const elbowX = 16 + Math.round(aOff * 0.45);
      const handX = 16 + aOff + (aOff > 0 ? 1 : 0);
      const handLift = aOff > 1 ? -1 : 0;
      P(16, ty, 4, 4, sleeve); P(16, ty, 2, 3, sleeveLight); P(16, ty + 3, 4, 1, sleeveShade);
      P(elbowX, ty + 4, 3, 3, L.skin);
      P(handX, ty + 6 + handLift, 3, 3, L.skin);
      P(handX + 2, ty + 6 + handLift, 1, 2, L.skinLight);
      P(handX, ty + 8 + handLift, 3, 1, L.skinShade);
    }
  }

  // ---------- Sculpted Head, Hair Volume, Expressive Eyes & Headwear ----------
  const hy = 8 + Ub;
  const row = (r: number, x0: number, x1: number, c: string) => P(x0, hy + r, x1 - x0 + 1, 1, c);

  // Neck
  P(16, hy + 13, 4, 3, L.skinShade);
  if (!back) P(16, hy + 13, 3, 1, L.skin);

  // Rounded cranium & jawline
  const headBase = back ? L.hair : L.skin;
  row(0, 13, 22, L.hair);
  row(1, 11, 24, L.hair);
  for (let r = 2; r <= 11; r++) row(r, 10, 25, headBase);
  row(12, 11, 24, headBase);
  row(13, 13, 22, headBase);

  if (!back) {
    // Warm jaw contour + upper-left sunlight rim on cheek
    row(12, 11, 24, L.skinShade);
    row(13, 13, 22, L.skinShade);
    row(11, 12, 23, L.skin);
    P(10, hy + 4, 1, 7, L.skinLight);
  }

  if (back) {
    // Rich layered back hair crown + neck hairline
    P(11, hy + 2, 14, 10, L.hair);
    P(13, hy + 1, 5, 2, L.hairLight);
    P(12, hy + 3, 3, 2, L.hairLight);
    P(14, hy + 12, 8, 2, L.skinShade);
    if (L.head === 'bun') {
      // Ibu Sari's back hair bun (konde) + frangipani flower!
      P(14, hy + 6, 8, 6, L.hair);
      P(15, hy + 7, 4, 2, L.hairLight);
      P(21, hy + 6, 3, 3, L.accent!); P(22, hy + 7, 1, 1, L.accentLight!);
    }
  } else if (!side) {
    // Ears
    P(9, hy + 7, 1, 3, L.skin); P(9, hy + 9, 1, 1, L.skinShade);
    P(26, hy + 7, 1, 3, L.skinShade);

    const poseGlance = s.pose === 'juggle67' ? (f4 === 0 ? 1 : f4 === 2 ? -1 : 0) : s.glance;
    const lookUp = s.pose === 'celebrate' && (f4 === 1 || f4 === 2) ? -1 : 0;
    const ex1 = 13 + poseGlance, ex2 = 20 + poseGlance, ey = hy + 7 + lookUp;

    // Hair framing & bangs
    if (L.head === 'peci' || L.head === 'cap') {
      P(10, hy + 4, 1, 4, L.hair); P(25, hy + 4, 1, 4, L.hair);
    } else {
      for (let r = 2; r <= 4; r++) row(r, 10, 25, L.hair);
      if (L.head === 'kerchief') {
        P(10, hy + 5, 2, 6, L.hair); P(24, hy + 5, 2, 5, L.hair);
        for (const x of [12, 13, 16, 17, 20, 22, 23]) P(x, hy + 5, 1, 1, L.hair);
        P(12, hy + 6, 1, 1, L.hair); P(16, hy + 6, 1, 1, L.hair); P(23, hy + 6, 1, 1, L.hair);
      } else if (L.head === 'bun') {
        P(10, hy + 5, 2, 6, L.hair); P(24, hy + 5, 2, 6, L.hair);
        P(12, hy + 5, 3, 1, L.hair); P(21, hy + 5, 3, 1, L.hair);
        // Side konde flower peeking on left!
        P(8, hy + 4, 3, 3, L.accent!); P(9, hy + 5, 1, 1, L.accentLight!);
      } else {
        // Pak RT neat side-parted silver hair
        P(10, hy + 5, 1, 4, L.hair); P(25, hy + 5, 1, 4, L.hair);
        P(12, hy + 4, 8, 1, L.hairLight);
      }
      P(14, hy + 1, 4, 1, L.hairLight); P(12, hy + 2, 3, 1, L.hairLight);
    }

    // Expressive eyebrows + 3-tone eyes!
    const browRaise = (s.pose === 'celebrate' || s.pose === 'wave') ? -1 : 0;
    const browFurrow = (s.pose === 'pour' || s.pose === 'cough') ? 1 : 0;
    for (let idx = 0; idx < 2; idx++) {
      const ex = idx === 0 ? ex1 : ex2;
      P(ex, ey - 2 + browRaise + (browFurrow && idx === 0 ? 0 : 0), 3, 1, L.hair);
      if (s.blink) {
        P(ex, ey + 1, 3, 1, '#2a1f1b');
        P(ex, ey, 3, 1, L.skinShade);
      } else {
        P(ex, ey, 3, 1, '#181311');           // crisp upper eyelash line
        P(ex, ey + 1, 3, 1, L.eyeTone);       // warm iris lower row
        P(ex + 2, ey + 1, 1, 1, '#f7f0e2');   // sclera corner
        P(ex, ey, 1, 1, '#ffffff');           // bright eye catchlight!
      }
    }

    // Subtle nose & cheek warmth
    P(18, ey + 1, 1, 2, L.skinShade);
    if (L.glasses) {
      const G = '#e5dcbe';
      for (const gx of [12, 19]) {
        P(gx, ey - 1, 5, 1, G); P(gx, ey + 2, 5, 1, G);
        P(gx, ey, 1, 2, G); P(gx + 4, ey, 1, 2, G);
      }
      P(17, ey, 2, 1, G);
    } else if (s.who === 'wira' || s.who === 'bu_sari') {
      P(12, ey + 2, 2, 1, '#ea8d72'); P(22, ey + 2, 2, 1, '#ea8d72');
    }

    // Mouth & Mustache
    const my = hy + 10;
    if (L.mustache) {
      P(15, my, 6, 1, L.mustache);
      P(14, my + 1, 1, 1, L.mustache); P(21, my + 1, 1, 1, L.mustache);
      P(17, my + 1, 2, 1, s.mouth ? '#5a1f1a' : '#8a3a2c');
    } else if (s.mouth) {
      P(17, my, 3, 2, '#5a1f1a'); P(17, my + 1, 3, 1, '#cc5949');
    } else if (s.pose === 'wave' || s.pose === 'celebrate' || s.who === 'bu_sari') {
      // Warm friendly smile!
      P(17, my, 3, 1, '#9c3b2c'); P(16, my - 1, 1, 1, '#b55240'); P(20, my - 1, 1, 1, '#b55240');
    } else {
      P(17, my, 2, 1, '#9c3b2c');
    }
  } else {
    // Side-view profile with sculpted nose, ear, brow, and hair volume!
    P(26, hy + 7, 1, 2, L.skin); P(26, hy + 8, 1, 1, L.skinShade); // nose tip!
    if (L.head !== 'peci' && L.head !== 'cap') {
      for (let r = 2; r <= 4; r++) row(r, 10, 25, L.hair);
      for (let r = 5; r <= 10; r++) row(r, 10, 16, L.hair);
      row(11, 11, 15, L.hair);
      P(14, hy + 1, 4, 1, L.hairLight); P(12, hy + 3, 3, 2, L.hairLight);
    } else {
      P(10, hy + 4, 5, 6, L.hair);
    }
    if (L.head === 'bun') {
      P(7, hy + 5, 4, 5, L.hair); P(8, hy + 6, 2, 2, L.hairLight);
      P(9, hy + 4, 3, 2, L.accent!); P(10, hy + 4, 1, 1, L.accentLight!);
    }
    // Side ear
    P(16, hy + 7, 2, 3, L.skin); P(17, hy + 8, 1, 1, L.skinShade);
    // Side eye + brow
    P(21, hy + 6, 3, 1, L.hair);
    if (s.blink) {
      P(21, hy + 8, 3, 1, '#2a1f1b');
    } else {
      P(21, hy + 7, 3, 1, '#181311');
      P(21, hy + 8, 2, 1, L.eyeTone);
      P(22, hy + 7, 1, 1, '#ffffff');
    }
    if (L.glasses) {
      const G = '#e5dcbe';
      P(20, hy + 6, 5, 1, G); P(20, hy + 9, 5, 1, G);
      P(20, hy + 7, 1, 2, G); P(24, hy + 7, 1, 2, G); P(17, hy + 7, 3, 1, G);
    } else if (s.who === 'wira' || s.who === 'bu_sari') {
      P(20, hy + 9, 2, 1, '#ea8d72');
    }
    if (L.mustache) P(22, hy + 10, 4, 1, L.mustache);
    else P(22, hy + 10, 2, s.mouth ? 2 : 1, s.mouth ? '#5a1f1a' : '#9c3b2c');
  }

  // ---------- Headwear & Dynamic Hair/Ribbon Secondary Motion ----------
  const fl = (walking ? (f8 >> 1) & 1 : (s.pose === 'juggle67' || s.pose === 'celebrate' ? (f4 & 1) : (s.flutter & 1)));
  if (L.ponytail) {
    if (side) {
      P(7, hy + 4, 3, 4, L.hair);
      P(5, hy + 6 + fl, 3, 4, L.hair);
      P(7, hy + 4, 2, 2, L.hairLight);
    } else if (back) {
      P(16, hy + 5, 4, 5, L.hair);
      P(16 + (fl ? 1 : 0), hy + 9, 3, 3, '#3d2f28');
      P(17, hy + 5, 2, 2, L.hairLight);
    }
  }

  if (L.head === 'kerchief') {
    // Dayak woven ikat headband with gold beadwork!
    row(2, 10, 25, L.accent!);
    row(3, 10, 25, L.accent!);
    row(2, 11, 24, L.accentLight!);
    for (const x of [12, 15, 18, 21, 24]) P(x, hy + 3, 1, 1, L.trim);
    if (!side && !back) {
      P(25, hy + 2, 3, 3, L.accent!);
      P(27, hy + 4 + fl, 2, 3, L.accentLight!);
    } else if (side) {
      P(7, hy + 2, 4, 2, L.accent!);
      P(5, hy + 3 + fl, 3, 2, L.accentLight!);
    } else {
      P(16, hy + 3, 4, 2, L.accent!);
      P(15, hy + 5, 2, 3 + fl, L.accent!);
      P(19, hy + 5, 2, 3 + (1 - fl), L.accentLight!);
    }
  } else if (L.head === 'peci') {
    P(11, hy - 1, 14, 5, '#1d1a18');
    P(12, hy - 2, 12, 1, '#2e2926');
    P(12, hy - 1, 10, 1, '#433d39');
    P(11, hy + 3, 14, 1, '#2b2724');
    if (!back) P(21, hy + 1, 2, 1, '#e8c464'); // subtle gold peci pin!
  } else if (L.head === 'cap') {
    // Manggala Agni field cap with visor & badge!
    P(10, hy - 1, 16, 5, '#414f33');
    P(12, hy - 2, 12, 1, '#586b46');
    P(10, hy + 3, 16, 1, '#2d3823');
    if (side) {
      P(24, hy + 2, 5, 2, '#2d3823'); P(24, hy + 2, 4, 1, '#586b46');
    } else if (!back) {
      P(11, hy + 3, 14, 2, '#2d3823');
      P(17, hy, 2, 2, '#f2c95c'); // gold Manggala Agni cap emblem!
    }
  }

  // Subtle vertical cloth fold & sunlit rim pass
  const rimX = side ? 14 : 12;
  P(rimX, ty + 1, 1, 6, '#ffffff26');
}

const frameCache = new Map<string, HTMLCanvasElement>();
export function getFrame(s: FrameSpec): HTMLCanvasElement {
  const frameMod = s.pose === 'walk' ? (s.frame & 7) : (s.frame & 3);
  const walking = s.pose === 'walk';
  const key = `${s.who}|${s.dir}|${s.pose}|${frameMod}|${walking ? 0 : +s.blink}|${+s.holding}|${+s.newShoes}|${walking ? 0 : s.flutter % 2}|${walking ? 0 : s.breath}|${+s.mouth}|${walking ? 0 : s.glance}`;
  const hit = frameCache.get(key);
  if (hit) return hit;
  let canvas: HTMLCanvasElement;
  if (s.dir === 'left') canvas = mirror(getFrame({ ...s, dir: 'right' }));
  else { const { c, ctx } = blank(W, H); paint(ctx, { ...s, frame: frameMod }); canvas = outline(c); }
  frameCache.set(key, canvas);
  return canvas;
}

// ---------------- character drawing ----------------
export function resetRigs() {}

/** Feet sit at (x, y). */
export function drawCharacter(c: CanvasRenderingContext2D, x: number, y: number, s: FrameSpec, m?: MotionInfo) {
  const reduced = !m || !!m.reduced;
  const frame = getFrame(s);
  const phase = (s.gait ?? ((s.frame & 7) / 8)) * Math.PI * 4;
  const bobPx = m && !reduced && s.pose === 'walk' ? Math.round((1 - Math.cos(phase)) * 0.7) : 0;
  const leanPx = m && !reduced ? Math.round(Math.max(-2, Math.min(2, m.vx / 140))) : 0;
  c.drawImage(frame, Math.round(x) - (W / 2) * SCALE + leanPx, Math.round(y - bobPx) - 45 * SCALE, W * SCALE, H * SCALE);
}

export function drawShadow(c: CanvasRenderingContext2D, x: number, y: number, w = 32, alpha = 0.26) {
  const rx = Math.round(x), ry = Math.round(y);
  c.fillStyle = `rgba(20,24,18,${alpha})`;
  c.fillRect(rx - w / 2, ry - 2, w, 5);
  c.fillRect(rx - w / 2 + 4, ry - 4, w - 8, 9);
}

/** World offset (from the feet) of the hand that carries a bucket. */
export function handPoint(s: Pick<FrameSpec, 'dir' | 'pose' | 'frame' | 'breath'>) {
  const ub = upperOffset(s);
  if (s.pose === 'pour') {
    if (s.dir === 'right') return { x: 14, y: (ub - 23) * SCALE };
    if (s.dir === 'left') return { x: -14, y: (ub - 23) * SCALE };
    return { x: 0, y: (ub - 26) * SCALE };
  }
  if (s.pose === 'fill') {
    if (s.dir === 'right') return { x: 14, y: (ub - 13) * SCALE };
    if (s.dir === 'left') return { x: -14, y: (ub - 13) * SCALE };
    return { x: 0, y: (ub - 11) * SCALE };
  }
  const y = (ub - 12) * SCALE;
  if (s.dir === 'right') return { x: 3, y };
  if (s.dir === 'left') return { x: -3, y };
  if (s.dir === 'up') return { x: -14, y };
  return { x: 14, y };
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
  P(cx - 3, 0, 6, 1, col.handle); P(cx - 4, 1, 1, 2, col.handle); P(cx + 3, 1, 1, 2, col.handle);
  P(cx - 1, 0, 2, 1, col.rivet);
  P(1, 3, 1, 2, col.handle); P(w - 2, 3, 1, 2, col.handle);
  P(0, 4, w, 2, col.rim); P(1, 4, w - 2, 1, col.deep);
  if (water > 0) {
    const lvl = 4 + Math.round((1 - water) * 1.5);
    const tilt = Math.max(-1, Math.min(1, Math.round(slosh * 2)));
    P(1, lvl, w - 2, 2, '#5fb9c6');
    P(1 + tilt, lvl, w - 3, 1, '#8fd9de');
    P(2 + (shimmer % 2) * 3, lvl, 2, 1, '#eafaf3');
    if (tilt > 0) P(w - 2, lvl + 1, 1, 1, '#3d8f9e'); else if (tilt < 0) P(1, lvl + 1, 1, 1, '#3d8f9e');
  }
  for (let y = 6; y < h - 1; y++) {
    const inset = y >= h - 4 ? 1 : y >= h - 2 ? 2 : 0;
    P(inset, y, w - inset * 2, 1, col.body);
    P(inset, y, 2, 1, col.light);
    P(w - inset - 3, y, 3, 1, col.shade);
    P(w - inset - 1, y, 1, 1, col.deep);
    for (let sx = inset + 3; sx < w - inset - 2; sx += 3) P(sx, y, 1, 1, col.shade);
  }
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

// ---------------- upgraded animals (calico cat, kampung hens & proud rooster!) ----------------
const animalCache = new Map<string, HTMLCanvasElement>();
export function catSprite(awake: boolean, breath: number, tail: number) {
  const key = `cat2|${awake}|${breath}|${tail}`;
  const hit = animalCache.get(key); if (hit) return hit;
  const { c, ctx } = blank(24, 15);
  const P = (x: number, y: number, w: number, h: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
  const white = '#f4ecda', orange = '#de8c44', dark = '#70492e', shade = '#d5c7aa', deep = '#b8a98a';
  const top = 6 - breath;
  // Expressive curled striped tail
  const ty = 10 - (tail === 2 ? 2 : tail === 1 ? 1 : 0);
  P(2, 10, 10, 2, orange); P(1, ty, 3, 2, orange); P(1, ty, 2, 1, dark); P(5, 10, 2, 2, dark);
  // Loaf body with calico patches & soft belly shading
  P(4, top, 13, 12 - top, white); P(5, top - 1, 11, 1, white);
  P(6, top, 6, 3, orange); P(11, top + 1, 4, 3, dark);
  P(4, 10, 13, 1, shade); P(4, 11, 13, 1, deep);
  // Tucked paws with toe beans
  P(7, 10, 3, 2, '#fbf5e8'); P(12, 10, 3, 2, '#fbf5e8');
  // Sculpted feline head, pointed ears & whiskers
  const hy = awake ? 1 : 4;
  P(14, hy + 1, 7, 5, white); P(14, hy, 3, 2, orange); P(19, hy, 2, 2, white);
  P(14, hy - 1, 2, 2, orange); P(19, hy - 1, 2, 2, dark);
  P(15, hy, 1, 1, '#eda89e'); P(19, hy, 1, 1, '#eda89e'); // pink inner ears
  if (awake) {
    P(16, hy + 3, 1, 2, '#3d7832'); P(19, hy + 3, 1, 2, '#3d7832'); // emerald eyes
    P(16, hy + 3, 1, 1, '#eefce8');
    P(17, hy + 4, 2, 1, '#e08b8b'); // pink nose
    P(21, hy + 3, 2, 1, '#e8e0cf'); // whiskers
  } else {
    P(15, hy + 3, 2, 1, dark); P(19, hy + 3, 2, 1, dark);
  }
  const out = outline(c, [40, 30, 24]);
  animalCache.set(key, out); return out;
}

export function chickenSprite(frame: number, peck: boolean, rooster = false) {
  const f = frame & 3;
  const key = `hen2|${f}|${peck}|${rooster}`;
  const hit = animalCache.get(key); if (hit) return hit;
  const { c, ctx } = blank(16, 16);
  const P = (x: number, y: number, w: number, h: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
  const body = rooster ? '#c96b32' : '#f4eee0';
  const wing = rooster ? '#8c3c22' : '#d8ceb6';
  const tailCol = rooster ? '#234a3c' : '#e4dcc6';
  const tailHi = rooster ? '#3d7a62' : '#f4eee0';
  const deep = rooster ? '#5c2b18' : '#b3a88e';
  const red = '#d94530', yellow = '#edb847';

  // Plumed tail feathers (arched emerald-teal sickle tail on rooster!)
  if (rooster) {
    P(0, 2, 4, 5, tailCol); P(1, 1, 3, 2, tailHi); P(0, 4, 2, 3, '#173028');
  } else {
    P(1, 4, 3, 4, tailCol); P(1, 3, 2, 2, tailHi); P(1, 7, 2, 1, deep);
  }
  // Plump body + layered wing feather bars
  const bob = !peck && (f === 1 || f === 3) ? -1 : 0;
  P(3, 6 + bob, 9, 5, body); P(4, 10 + bob, 7, 1, deep);
  P(5, 7 + bob, 5, 3, wing); P(5, 7 + bob, 4, 1, rooster ? '#e69b4c' : '#e6dec8');
  // Head, comb, beak & wattle
  if (!peck) {
    P(10, 3 + bob, 4, 4, rooster ? '#e0843c' : body);
    P(10, (rooster ? 1 : 2) + bob, 3, rooster ? 2 : 1, red);
    P(11, (rooster ? 0 : 1) + bob, 1, 1, red);
    P(14, 4 + bob, 2, 1, yellow);
    P(12, 6 + bob, 1, 2, red);
    P(11, 4 + bob, 1, 1, '#1d1a17');
  } else {
    P(11, 7, 4, 3, rooster ? '#e0843c' : body);
    P(12, 6, 2, 1, red);
    P(15, 9, 1, 1, yellow);
    P(12, 8, 1, 1, '#1d1a17');
    P(13, 9, 1, 1, red);
  }
  // 4-frame alternating kampung chicken walk
  if (f === 0) { P(6, 11, 1, 3, yellow); P(9, 11, 1, 3, yellow); P(6, 14, 2, 1, yellow); P(9, 14, 2, 1, yellow); }
  else if (f === 1) { P(5, 11, 1, 2, yellow); P(9, 11, 1, 3, yellow); P(4, 13, 2, 1, yellow); P(9, 14, 2, 1, yellow); }
  else if (f === 2) { P(6, 11, 1, 3, yellow); P(8, 11, 1, 3, yellow); P(6, 14, 2, 1, yellow); P(8, 14, 2, 1, yellow); }
  else { P(6, 11, 1, 3, yellow); P(10, 11, 1, 2, yellow); P(6, 14, 2, 1, yellow); P(10, 13, 2, 1, yellow); }

  const out = outline(c, [42, 34, 26]);
  animalCache.set(key, out); return out;
}

// ---------------- portraits ----------------
export function portraitCanvas(who: PortraitId, mouth: boolean, blink: boolean, tick = 0) {
  const { c, ctx } = blank(26, 26);
  const bg: Record<string, [string, string]> = {
    wira: ['#35503a', '#2a4130'], budi: ['#4a4f35', '#3b402a'], pak_rt: ['#4f4334', '#3e3428'], radio: ['#283b3b', '#1f2f2f'], info: ['#35503a', '#2a4130'],
  };
  const [b1, b2] = bg[who] ?? bg.wira;
  ctx.fillStyle = b1; ctx.fillRect(0, 0, 26, 26);
  ctx.fillStyle = b2; for (let i = 0; i < 26; i += 4) ctx.fillRect(i, 20, 2, 6);
  if (who === 'radio') {
    const P = (x: number, y: number, w: number, h: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    P(16, 2, 1, 6, '#c9c1a2'); P(15, 1, 3, 1, '#e1d8b5');
    P(4, 9, 18, 12, '#1e1a16'); P(5, 10, 16, 10, '#8f6a3d'); P(5, 10, 16, 1, '#b48a52');
    P(6, 12, 7, 6, '#463e31'); for (let y = 12; y < 18; y += 2) P(6, y, 7, 1, '#2e2820');
    P(15, 12, 4, 3, '#cdbf8a'); P(16 + (tick % 3), 13, 1, 1, '#9c3b2c');
    P(15, 16, 2, 2, '#e3b45d'); P(18, 16, 2, 2, tick % 2 ? '#a9d17a' : '#5c7b45');
    return c;
  }
  const targetWho: Who = (who in LOOKS ? who : 'wira') as Who;
  const frame = getFrame({ who: targetWho, dir: 'down', pose: 'stand', frame: 0, blink, holding: false, newShoes: false, flutter: tick % 2, breath: 0, mouth, glance: 0, sway: 0 });
  ctx.drawImage(frame, 5, 4, 26, 26, 0, 1, 26, 26);
  return c;
}

let warmed = false;
export function warmupSprites() {
  if (warmed || typeof document === 'undefined') return;
  warmed = true;
  for (const dir of ['down', 'up', 'left', 'right'] as Direction[]) {
    for (const pose of ['stand', 'walk'] as Pose[]) {
      const nFrames = pose === 'walk' ? 8 : 2;
      for (const holding of [false, true]) {
        for (let frame = 0; frame < nFrames; frame++) {
          getFrame({ who: 'wira', dir, pose, frame, blink: false, holding, newShoes: false, flutter: 0, breath: 0, mouth: false, glance: 0, sway: 0 });
        }
      }
    }
  }
  for (const who of ['budi', 'pak_rt', 'bu_sari', 'manggala'] as Who[]) {
    for (const dir of ['down', 'left', 'right'] as Direction[]) {
      getFrame({ who, dir, pose: 'stand', frame: 0, blink: false, holding: false, newShoes: false, flutter: 0, breath: 0, mouth: false, glance: 0, sway: 0 });
    }
  }
}
