import { Pendulum, Spring, type Wind } from './physics';
import { drawPixelText, pixelTextWidth } from './pixelFont';

export type SignKind = 'post' | 'hanging' | 'board';
export interface SignStyle {
  label: string; sub?: string; kind: SignKind;
  w?: number; h?: number; posts?: 1 | 2;
  paint?: string; paintShade?: string; paintLight?: string;
  wood?: string; ink?: string; lantern?: boolean;
  flag?: string; arrow?: boolean; warn?: boolean; scale?: number;
}

interface SignLayers { face: HTMLCanvasElement; support: HTMLCanvasElement }
const layers = new WeakMap<SignStyle, SignLayers>();
const motion = new Map<string, { pend: Pendulum; flex: Spring }>();
const snap = (n: number) => Math.round(n);
const grain = (a: number, b: number) => {
  const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return v - Math.floor(v);
};
const makeCanvas = (w: number, h: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  return { canvas, ctx: canvas.getContext('2d')! };
};

export function invalidateSignCache() { /* Styles are immutable and keyed by identity. */ }

function bake(style: SignStyle): SignLayers {
  const cached = layers.get(style);
  if (cached) return cached;
  const width = Math.max(style.w ?? 60, pixelTextWidth(style.label) + 12, style.sub ? pixelTextWidth(style.sub) + 12 : 0);
  const height = Math.max(style.h ?? 18, style.sub ? 27 : 17);
  const { canvas: face, ctx } = makeCanvas(width + 6, height + 7);
  const put = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
  };
  const wood = style.wood ?? '#86623f';
  const stain = style.paint ?? wood;
  // The plank has an exposed end grain and real thickness behind its painted face.
  put(3, 5, width + 2, height + 2, '#382719');
  put(2, 3, width + 2, height + 2, '#593b25');
  put(2, 2, width, height, wood);
  put(3, 3, width - 2, height - 2, stain);
  put(3, 3, width - 2, 1, style.paintLight ?? '#b18b58');
  put(3, height, width - 2, 1, style.paintShade ?? '#4a3425');
  put(width, 3, 1, height - 1, '#3d2b20');
  // Weathering stays at the edges so it cannot obscure the lettering.
  for (let i = 0; i < 12; i++) {
    const gx = 5 + Math.floor(grain(i, width) * (width - 11));
    const gy = i % 2 ? 4 : height - 2;
    put(gx, gy, 3 + Math.floor(grain(i, height) * 7), 1, i % 2 ? '#dfb77655' : '#32241555');
  }
  for (let i = 0; i < 3; i++) {
    const gx = 7 + Math.floor(grain(i + 18, width) * (width - 16));
    put(gx, height - 2, 2, 1, '#69814c');
  }
  // A fixed 5x7 alphabet, never a scaled/antialiased browser font.
  const center = 2 + width / 2;
  const ink = style.ink ?? '#fff4d6';
  const carveShadow = '#00000059';
  drawPixelText(ctx, style.label, center, style.sub ? 5 : Math.floor((height - 7) / 2) + 2, ink, { shadow: carveShadow });
  if (style.sub) {
    put(center - Math.min(24, width / 3), 14, Math.min(48, width * 0.7), 1, '#e9d0a166');
    drawPixelText(ctx, style.sub, center, 17, ink, { shadow: carveShadow });
  }
  for (const nx of [5, width - 2]) {
    // Thin iron straps hold the small plank together without crossing the text.
    put(nx, 8, 2, Math.max(5, height - 13), '#9aa59a');
    put(nx + 1, 9, 1, Math.max(3, height - 15), '#4a554b');
    put(nx, 5, 2, 2, '#232c2a');
    put(nx, 5, 1, 1, '#c5b99a');
    put(nx, height - 1, 1, 1, '#4b3b2a');
  }
  const support = makeCanvas(9, 36);
  const s = support.ctx;
  s.fillStyle = '#31281f'; s.fillRect(1, 0, 7, 36);
  s.fillStyle = '#795737'; s.fillRect(2, 0, 5, 34);
  s.fillStyle = '#a0794b'; s.fillRect(2, 0, 1, 30);
  s.fillStyle = '#4b3829'; s.fillRect(6, 0, 1, 34);
  for (let y = 3; y < 30; y += 6) { s.fillStyle = '#56402c'; s.fillRect(4, y, 1, 3); }
  s.fillStyle = '#43534a'; s.fillRect(1, 4, 7, 2);
  s.fillStyle = '#879386'; s.fillRect(2, 4, 1, 1);
  s.fillStyle = '#28352a'; s.fillRect(0, 32, 9, 3);
  const built = { face, support: support.canvas };
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
  id: string; style: SignStyle;
  x: number; y: number; t: number; dt: number; wind: Wind;
  reduced?: boolean; dim?: number;
}

export function drawSign(ctx: CanvasRenderingContext2D, d: SignDraw) {
  const { style, x, y, wind } = d;
  const { face, support } = bake(style);
  const scale = style.scale ?? 1.5;
  const boardW = face.width * scale;
  const boardH = face.height * scale;
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
    const postH = 36 * scale;
    const offset = style.posts === 2 ? boardW * 0.32 : 0;
    for (const side of style.posts === 2 ? [-1, 1] : [0]) {
      const px = x + side * offset;
      ctx.fillStyle = '#14211948';
      ctx.fillRect(snap(px - 11), snap(y - 4), 24, 8);
      ctx.drawImage(support, snap(px - support.width * scale / 2), snap(y - postH), support.width * scale, postH);
    }
    const by = y - postH - boardH * 0.25;
    ctx.save();
    ctx.translate(snap(x + flex), snap(by));
    ctx.rotate(sway * 0.018);
    ctx.drawImage(face, snap(-boardW / 2), snap(-boardH / 2), boardW, boardH);
    ctx.restore();
  } else if (style.kind === 'hanging') {
    ctx.fillStyle = '#503b2a'; ctx.fillRect(snap(x - 5), snap(y - 2), 18, 4);
    ctx.fillStyle = '#ad8656'; ctx.fillRect(snap(x - 5), snap(y - 3), 18, 1);
    const anchorY = y + 4;
    const topY = anchorY + 11;
    const cx = x + Math.sin(sway) * 11;
    for (const side of [-0.32, 0.32]) {
      const ax = x + side * boardW * 0.75;
      const bx = cx + side * boardW;
      ctx.strokeStyle = '#5b6359'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(snap(ax), anchorY); ctx.lineTo(snap(bx), snap(topY)); ctx.stroke();
      ctx.fillStyle = '#b9c3af'; ctx.fillRect(snap(ax), snap(anchorY), 2, 2);
    }
    ctx.save();
    ctx.translate(snap(cx), snap(topY));
    ctx.rotate(sway * 0.45);
    ctx.drawImage(face, snap(-boardW / 2), 0, boardW, boardH);
    ctx.restore();
    if (style.lantern) {
      const lx = cx + boardW * 0.32;
      const ly = topY + boardH + 7;
      ctx.fillStyle = '#4c5144'; ctx.fillRect(snap(lx), snap(ly - 7), 2, 7);
      ctx.fillStyle = '#403729'; ctx.fillRect(snap(lx - 5), snap(ly), 12, 12);
      ctx.fillStyle = '#f4cf81'; ctx.fillRect(snap(lx - 3), snap(ly + 2), 8, 7);
      ctx.fillStyle = '#ffeab1'; ctx.fillRect(snap(lx - 1), snap(ly + 3), 3, 5);
    }
  } else {
    ctx.fillStyle = '#1a201955';
    ctx.fillRect(snap(x - boardW / 2 + 3), snap(y - boardH / 2 + 4), boardW, boardH);
    ctx.drawImage(face, snap(x - boardW / 2), snap(y - boardH / 2), boardW, boardH);
  }
  ctx.globalAlpha = alpha;
}