import { Pendulum, Spring, type Wind } from './physics';
import { drawPixelText, pixelTextWidth } from './pixelFont';

export type SignKind = 'post' | 'hanging' | 'board';
export type SignIcon = 'drop' | 'flame' | 'shop' | 'home' | 'shield' | 'exit' | 'radio';
export type SignArrow = 'down' | 'right' | 'left';

export interface SignStyle {
  label: string;
  sub?: string;
  kind: SignKind;
  w?: number;
  h?: number;
  posts?: 1 | 2;
  paint?: string;
  paintShade?: string;
  paintLight?: string;
  wood?: string;
  ink?: string;
  lantern?: boolean;
  flag?: string;
  arrow?: boolean;
  dirArrow?: SignArrow;
  icon?: SignIcon;
  warn?: boolean;
  scale?: number;
}

interface SignLayers {
  face: HTMLCanvasElement;
  support: HTMLCanvasElement;
  roofPadY: number;
}

const OUTLINE = '#1e140d';
const layers = new WeakMap<SignStyle, SignLayers>();
const motion = new Map<string, { pend: Pendulum; flex: Spring }>();
const snap = (n: number) => Math.round(n);

const grain = (a: number, b: number) => {
  const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

const makeCanvas = (w: number, h: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
};

export function invalidateSignCache() {
  /* Styles are immutable and keyed by identity. */
}

/** Paints a crisp 7x7 pixel-art emblem onto a sign face. */
function drawEmblem(ctx: CanvasRenderingContext2D, icon: SignIcon, x: number, y: number) {
  const P = (dx: number, dy: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x + dx, y + dy, w, h);
  };
  // Subtle dark carved backing pocket
  P(-1, -1, 9, 9, '#1b130d88');

  if (icon === 'drop') {
    P(3, 0, 1, 2, '#9ce8f5');
    P(2, 2, 3, 2, '#62cbe0');
    P(1, 4, 5, 2, '#41a8c4');
    P(2, 6, 3, 1, '#31849e');
    P(2, 3, 1, 2, '#e8fcff');
  } else if (icon === 'flame') {
    P(3, 0, 2, 2, '#ff9947');
    P(2, 2, 4, 2, '#f26a36');
    P(1, 4, 5, 2, '#d9442b');
    P(2, 6, 3, 1, '#9e2b1c');
    P(3, 3, 2, 2, '#ffe885');
    P(3, 4, 1, 1, '#ffffff');
  } else if (icon === 'shop') {
    // Mini striped warung awning + counter
    P(0, 0, 7, 2, '#d95b43');
    P(1, 0, 2, 2, '#f7e5be');
    P(5, 0, 1, 2, '#f7e5be');
    P(1, 2, 5, 3, '#3c2a1d');
    P(0, 5, 7, 2, '#c89b5e');
  } else if (icon === 'home') {
    // Traditional Kalimantan pitched roof + warm doorway
    P(3, 0, 1, 1, '#e8be74');
    P(1, 1, 5, 2, '#b85a3a');
    P(0, 2, 7, 1, '#d97852');
    P(1, 3, 5, 4, '#cfa46b');
    P(3, 4, 2, 3, '#4a2f1b');
  } else if (icon === 'shield') {
    // Posko Siaga Kalimantan shield emblem
    P(1, 0, 5, 2, '#e5c473');
    P(1, 2, 5, 3, '#c94f38');
    P(2, 5, 3, 2, '#e5c473');
    P(3, 1, 1, 4, '#fff6d6');
    P(2, 2, 3, 1, '#fff6d6');
  } else if (icon === 'exit') {
    // Open doorway + outward arrow
    P(0, 0, 4, 7, '#cfa468');
    P(1, 1, 2, 5, '#2b1d12');
    P(4, 3, 3, 1, '#ffe699');
    P(5, 2, 1, 3, '#ffe699');
  } else if (icon === 'radio') {
    // Vintage radio waves + dial
    P(1, 3, 5, 4, '#c89b5c');
    P(2, 4, 2, 2, '#302419');
    P(4, 1, 2, 1, '#9be8d8');
    P(2, 0, 2, 1, '#9be8d8');
  }
}

/** Paints a crisp 5x7 carved directional arrow on wayfinding post signs. */
function drawDirectionArrow(ctx: CanvasRenderingContext2D, dir: SignArrow, x: number, y: number) {
  const P = (dx: number, dy: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x + dx, y + dy, w, h);
  };
  if (dir === 'down') {
    P(2, 0, 2, 4, '#362214');
    P(0, 3, 6, 1, '#362214');
    P(1, 4, 4, 1, '#362214');
    P(2, 5, 2, 1, '#362214');
    P(2, 0, 2, 3, '#ffe399');
    P(0, 3, 6, 1, '#ffe399');
    P(1, 4, 4, 1, '#f2bd68');
    P(2, 5, 2, 1, '#e09b48');
  } else if (dir === 'right') {
    P(0, 2, 4, 3, '#362214');
    P(3, 0, 1, 7, '#362214');
    P(4, 1, 1, 5, '#362214');
    P(5, 2, 1, 3, '#362214');
    P(0, 2, 3, 2, '#ffe399');
    P(3, 1, 1, 5, '#ffe399');
    P(4, 2, 1, 3, '#f2bd68');
    P(5, 3, 1, 1, '#ffffff');
  } else {
    P(2, 0, 1, 7, '#ffe399');
    P(1, 1, 1, 5, '#ffe399');
    P(0, 2, 1, 3, '#ffffff');
    P(3, 2, 3, 2, '#f2bd68');
  }
}

function bake(style: SignStyle): SignLayers {
  const cached = layers.get(style);
  if (cached) return cached;

  const hasIcon = !!style.icon;
  const hasDir = !!style.dirArrow;
  const sideExtra = (hasIcon ? 11 : 0) + (hasDir ? 9 : 0);
  const textW = Math.max(pixelTextWidth(style.label), style.sub ? pixelTextWidth(style.sub) : 0);
  const width = Math.max(style.w ?? 60, textW + 14 + sideExtra);
  const height = Math.max(style.h ?? 18, style.sub ? 29 : 19);

  // Post signs receive a pitched Kalimantan ironwood shingle rooflet overhanging the top!
  const hasRoof = style.kind === 'post';
  const roofPadY = hasRoof ? 8 : 0;
  const padX = hasRoof ? 5 : 3;

  const { canvas: face, ctx } = makeCanvas(width + padX * 2 + 2, height + roofPadY + 6);
  const put = (x: number, y: number, w: number, h: number, color: string) => {
    if (w > 0 && h > 0) {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    }
  };

  const bx = padX;
  const by = roofPadY + 2;
  const wood = style.wood ?? '#8c633c';
  const stain = style.paint ?? '#5c3c26';
  const rimLight = style.paintLight ?? '#d9b170';
  const rimShade = style.paintShade ?? '#3b2617';

  // 1) Drop/thickness shadow + crisp #1e140d notched Kalimantan plaque silhouette
  put(bx + 1, by + 2, width + 1, height + 1, '#120c0888');
  // Notched chamfered outer outline (1px inset on extreme corners for authentic hand-carved look)
  put(bx, by - 1, width, height + 2, OUTLINE);
  put(bx - 1, by, width + 2, height, OUTLINE);

  // 2) Beveled hardwood outer frame + sunlit top chamfer + recessed painted inner panel
  put(bx, by, width, height, wood);
  put(bx + 1, by, width - 2, 1, '#e6c387');           // bright sunlit top timber edge
  put(bx, by + height - 1, width, 1, '#472e1b');      // deep bottom frame shadow
  put(bx + width - 1, by + 1, 1, height - 2, '#543721');
  put(bx, by + 1, 1, height - 2, '#b88954');

  // Inner recessed dark bevel & rich stained signboard field
  put(bx + 2, by + 2, width - 4, height - 4, rimShade);
  put(bx + 3, by + 3, width - 6, height - 6, stain);
  put(bx + 3, by + 3, width - 6, 1, `${rimLight}55`); // subtle inner top catchlight

  // 3) Subtle organic hardwood grain streaks (kept clear of center lettering)
  for (let i = 0; i < 10; i++) {
    const gx = bx + 5 + Math.floor(grain(i, width) * Math.max(4, width - 14));
    const gy = i % 2 === 0 ? by + 4 : by + height - 5;
    put(gx, gy, 3 + Math.floor(grain(i, height) * 6), 1, i % 2 === 0 ? '#ffffff18' : '#00000024');
  }

  // Optional hazard warning stripe accents along bottom inner rail (for HUTAN / AWAS API)
  if (style.warn) {
    for (let sx = bx + 4; sx < bx + width - 6; sx += 6) {
      put(sx, by + height - 4, 3, 1, '#e05638');
      put(sx + 3, by + height - 4, 3, 1, '#f2c96b');
    }
  }

  // 4) Gleaming brass corner rivets / Dayak corner studs
  for (const [cx0, cy0] of [
    [bx + 2, by + 2],
    [bx + width - 3, by + 2],
    [bx + 2, by + height - 3],
    [bx + width - 3, by + height - 3],
  ]) {
    put(cx0, cy0, 1, 1, '#f5d98e');
  }

  // For wrought-iron strapped post signs, add compact iron corner clasps
  if (style.kind === 'post') {
    for (const sx of [bx + 1, bx + width - 3]) {
      put(sx, by + 4, 2, 3, '#4c5750');
      put(sx, by + 4, 1, 1, '#aeb8ad');
      put(sx, by + height - 7, 2, 3, '#4c5750');
      put(sx, by + height - 7, 1, 1, '#aeb8ad');
    }
  }

  // 5) Pictogram Emblem, Chiseled Pixel Lettering & Carved Directional Arrow
  const contentLeft = bx + 5 + (hasIcon ? 10 : 0);
  const contentRight = bx + width - 5 - (hasDir ? 8 : 0);
  const textCenter = Math.round((contentLeft + contentRight) * 0.5);
  const ink = style.ink ?? '#fff5dc';
  const carveShadow = '#120c07cc';

  if (style.icon) {
    const iy = style.sub ? by + 5 : by + Math.floor((height - 7) / 2);
    drawEmblem(ctx, style.icon, bx + 5, iy);
  }
  if (style.dirArrow) {
    const ay = by + Math.floor((height - 7) / 2);
    drawDirectionArrow(ctx, style.dirArrow, bx + width - 11, ay);
  }

  if (style.sub) {
    drawPixelText(ctx, style.label, textCenter, by + 4, ink, { shadow: carveShadow });
    // Crisp golden-ochre divider rule with center diamond dot
    const ruleHalf = Math.min(20, Math.floor((contentRight - contentLeft) * 0.42));
    put(textCenter - ruleHalf, by + 13, ruleHalf * 2, 1, '#e8c98c66');
    put(textCenter, by + 13, 1, 1, '#ffe6a3');
    const subInk = style.warn ? '#ffd480' : ink;
    drawPixelText(ctx, style.sub, textCenter, by + 16, subInk, { shadow: carveShadow });
  } else {
    const ty = by + Math.floor((height - 7) / 2);
    drawPixelText(ctx, style.label, textCenter, ty, ink, { shadow: carveShadow });
  }

  // 6) Pitched Kalimantan Shingle Rooflet ('atap sirap ulin') atop outdoor post signs!
  if (hasRoof) {
    const rx0 = 1;
    const rw = width + (padX - 1) * 2;
    const midX = Math.floor((width + padX * 2) / 2);
    // Crisp dark outline + overhanging eaves
    put(rx0, by - 3, rw, 4, OUTLINE);
    put(rx0 + 2, by - 5, rw - 4, 3, OUTLINE);
    put(rx0 + 5, by - 7, rw - 10, 3, OUTLINE);
    // Layered ulin roof shingles + sunlit upper ridge
    put(rx0 + 1, by - 2, rw - 2, 2, '#5c3b23');
    put(rx0 + 3, by - 4, rw - 6, 2, '#7d5232');
    put(rx0 + 6, by - 6, rw - 12, 2, '#a36e43');
    put(rx0 + 6, by - 6, rw - 12, 1, '#cfa06b');
    // Shingle lap notches along the eave
    for (let sx = rx0 + 4; sx < rx0 + rw - 4; sx += 5) {
      put(sx, by - 2, 1, 2, '#3b2414');
    }
    // Carved Dayak ridge finial at roof peak
    put(midX - 1, 0, 3, 3, OUTLINE);
    put(midX, 1, 1, 2, '#f0ce7a');
    // Under-eave cast shadow across top of signboard
    put(bx, by, width, 1, '#26180ecc');
  }

  // 7) Sculpted Kayu Ulin Support Post with Chamfered Cap, Iron Collar & Mossy Base
  const support = makeCanvas(11, 38);
  const s = support.ctx;
  const sp = (x: number, y: number, w: number, h: number, c: string) => {
    s.fillStyle = c;
    s.fillRect(x, y, w, h);
  };
  sp(2, 0, 7, 37, OUTLINE);
  sp(3, 1, 5, 35, '#6e4c2e');
  sp(3, 1, 2, 34, '#9c7147'); // sunlit left bevel
  sp(3, 1, 1, 32, '#ba8c5c');
  sp(7, 1, 1, 35, '#47301c'); // shaded right edge
  // Wrought-iron mounting collar & brass bolt near top
  sp(1, 3, 9, 4, OUTLINE);
  sp(2, 4, 7, 2, '#4f5b53');
  sp(3, 4, 2, 1, '#a9b5aa');
  sp(5, 4, 1, 1, '#f2cf7e'); // brass rivet!
  // Bark/grain checks
  for (let y = 10; y < 31; y += 7) sp(5, y, 1, 4, '#4d341f');
  // Mossy stone & turf collar at ground base
  sp(1, 33, 9, 4, OUTLINE);
  sp(2, 33, 7, 3, '#5c6658');
  sp(3, 33, 3, 1, '#8c9684');
  sp(2, 35, 4, 2, '#4b6e3c');
  sp(6, 34, 3, 2, '#5d8246');

  const built = { face, support: support.canvas, roofPadY };
  layers.set(style, built);
  return built;
}

function getMotion(id: string) {
  let item = motion.get(id);
  if (!item) {
    item = { pend: new Pendulum(0.4, 1.8, 10), flex: new Spring(145, 13) };
    motion.set(id, item);
  }
  return item;
}

export function bumpSign(id: string, force = 3.4) {
  const state = getMotion(id);
  state.pend.kick(force);
  state.flex.kick(force * 7);
}

export interface SignDraw {
  id: string;
  style: SignStyle;
  x: number;
  y: number;
  t: number;
  dt: number;
  wind: Wind;
  reduced?: boolean;
  dim?: number;
}

export function drawSign(ctx: CanvasRenderingContext2D, d: SignDraw) {
  const { style, x, y, wind, t } = d;
  const { face, support } = bake(style);
  const scale = style.scale ?? 1.5;
  const boardW = Math.round(face.width * scale);
  const boardH = Math.round(face.height * scale);
  const state = getMotion(d.id);
  if (!d.reduced && d.dt > 0) {
    state.pend.update(Math.min(d.dt, 0.05), wind.dir * (0.4 + wind.gust));
    state.flex.update(Math.min(d.dt, 0.05));
  }
  const sway = d.reduced ? 0 : state.pend.angle;
  const flex = d.reduced ? 0 : Math.max(-3, Math.min(3, state.flex.value + wind.dir * 1.3));
  const alpha = ctx.globalAlpha;
  ctx.globalAlpha *= d.dim ?? 1;

  if (style.kind === 'post') {
    const postH = Math.round(36 * scale);
    const supW = Math.round(support.width * scale);
    const offset = style.posts === 2 ? boardW * 0.29 : 0;

    // Ground cast shadow under post(s) and overhanging rooflet
    ctx.fillStyle = 'rgba(18, 26, 18, 0.28)';
    ctx.fillRect(snap(x - boardW * 0.38), snap(y - 3), snap(boardW * 0.76), 7);

    for (const side of style.posts === 2 ? [-1, 1] : [0]) {
      const px = x + side * offset;
      ctx.drawImage(support, snap(px - supW / 2), snap(y - postH), supW, postH);
    }
    const by = y - postH - boardH * 0.26;
    ctx.save();
    ctx.translate(snap(x + flex), snap(by));
    ctx.rotate(sway * 0.018);
    ctx.drawImage(face, snap(-boardW / 2), snap(-boardH / 2), boardW, boardH);
    ctx.restore();
  } else if (style.kind === 'hanging') {
    // Ornate wrought-iron scrolled eave bracket + brass mounting bar
    const armW = Math.max(26, Math.round(boardW * 0.82));
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(snap(x - armW / 2 - 1), snap(y - 3), armW + 2, 5);
    ctx.fillStyle = '#3b433e';
    ctx.fillRect(snap(x - armW / 2), snap(y - 2), armW, 3);
    ctx.fillStyle = '#8b968d';
    ctx.fillRect(snap(x - armW / 2 + 1), snap(y - 2), armW - 2, 1);
    // Decorative iron scroll curl at outer tip
    ctx.fillStyle = '#2b322e';
    ctx.fillRect(snap(x + armW / 2 - 2), snap(y - 5), 4, 3);
    ctx.fillStyle = '#d9b468';
    ctx.fillRect(snap(x - 2), snap(y - 3), 4, 3);

    const anchorY = y + 2;
    const topY = anchorY + 12;
    const cx = x + Math.sin(sway) * 10;

    // Crisp pixel-art iron chain links (zero blurry antialiased stroke lines!)
    for (const side of [-0.30, 0.30]) {
      const ax = x + side * boardW * 0.78;
      const bx = cx + side * boardW * 0.78;
      for (let step = 0; step <= 4; step++) {
        const u = step / 4;
        const lx = snap(ax + (bx - ax) * u);
        const ly = snap(anchorY + (topY - anchorY) * u);
        ctx.fillStyle = OUTLINE;
        ctx.fillRect(lx - 1, ly - 1, 4, 4);
        ctx.fillStyle = step % 2 === 0 ? '#aeb8ad' : '#5c675f';
        ctx.fillRect(lx, ly, 2, 2);
      }
    }

    ctx.save();
    ctx.translate(snap(cx), snap(topY));
    ctx.rotate(sway * 0.42);
    ctx.drawImage(face, snap(-boardW / 2), 0, boardW, boardH);
    ctx.restore();

    if (style.lantern) {
      const lx = snap(cx + boardW * 0.30);
      const ly = snap(topY + boardH + 6);
      const flicker = d.reduced ? 1 : 0.88 + 0.12 * Math.sin(t * 11.5);
      // Warm soft lantern glow halo
      ctx.fillStyle = `rgba(255, 214, 120, ${(0.18 * flicker).toFixed(3)})`;
      ctx.fillRect(lx - 10, ly - 2, 22, 18);
      // Chain link + brass cap + outlined glass cage + glowing candle core
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(lx, ly - 6, 2, 6);
      ctx.fillRect(lx - 6, ly, 14, 14);
      ctx.fillStyle = '#b88c46';
      ctx.fillRect(lx - 5, ly + 1, 12, 2);
      ctx.fillRect(lx - 5, ly + 11, 12, 2);
      ctx.fillStyle = '#f2c66d';
      ctx.fillRect(lx - 4, ly + 3, 10, 8);
      ctx.fillStyle = '#fff6cf';
      ctx.fillRect(lx - 2, ly + 4, 6, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(lx, ly + 5, 2, 3);
    }
  } else {
    // Architectural wall/gable plaque shadow + crisp baked plaque
    ctx.fillStyle = 'rgba(18, 14, 10, 0.38)';
    ctx.fillRect(snap(x - boardW / 2 + 2), snap(y - boardH / 2 + 3), boardW, boardH);
    ctx.drawImage(face, snap(x - boardW / 2), snap(y - boardH / 2), boardW, boardH);
  }
  ctx.globalAlpha = alpha;
}
