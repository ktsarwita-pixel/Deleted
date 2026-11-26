/* High-throughput cosmetic particle system. Zero per-frame array allocations; 2px pixel grid. */
export type FxKind = 'px' | 'puff' | 'ring' | 'coin' | 'leaf' | 'text' | 'flame' | 'fish' | 'spark';
export interface Fx {
  kind: FxKind; x: number; y: number; vx: number; vy: number; ay: number; drag: number;
  age: number; life: number; size: number; grow: number; color: string; alpha: number; seed: number;
  text?: string; ox?: number; oy?: number; tx?: number; ty?: number; ground?: boolean;
}
const snap = (v: number) => Math.round(v / 2) * 2;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

// Precomputed 24-point ellipse unit lookup for zero-trig water/fire rings
const RING_N = 24;
const RING_X = new Float32Array(RING_N);
const RING_Y = new Float32Array(RING_N);
for (let i = 0; i < RING_N; i++) {
  const a = (i / RING_N) * Math.PI * 2;
  RING_X[i] = Math.cos(a);
  RING_Y[i] = Math.sin(a) * 0.42;
}

export class FxSystem {
  list: Fx[] = [];
  private max = 240;

  add(p: Partial<Fx> & { kind: FxKind; x: number; y: number }) {
    if (this.list.length >= this.max) {
      // Overwrite oldest non-coin/non-text slot to avoid splice shifting when full
      this.list.shift();
    }
    this.list.push({
      vx: 0, vy: 0, ay: 0, drag: 0, age: 0, life: 1, size: 2, grow: 0, color: '#ffffff', alpha: 1,
      seed: Math.random() * 100, ...p,
    });
  }
  clear() { this.list.length = 0; }

  update(dt: number, target: { x: number; y: number }) {
    if (dt <= 0) return;
    const arr = this.list;
    let w = 0;
    for (let i = 0, len = arr.length; i < len; i++) {
      const p = arr[i];
      p.age += dt;
      if (p.age >= p.life) continue;
      if (p.kind === 'coin') {
        p.tx = target.x; p.ty = target.y - 50;
      } else if (p.kind !== 'fish') {
        const d = p.drag > 0 ? Math.exp(-p.drag * dt) : 1;
        p.vx *= d; p.vy = p.vy * d + p.ay * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.size = Math.max(0, p.size + p.grow * dt);
        if (p.kind === 'leaf') p.x += Math.sin(p.age * 3 + p.seed) * 22 * dt;
      }
      arr[w++] = p;
    }
    arr.length = w;
  }

  draw(c: CanvasRenderingContext2D, ground: boolean, vLeft = -9999, vRight = 9999, vTop = -9999, vBot = 9999) {
    const prev = c.globalAlpha;
    const arr = this.list;
    for (let idx = 0, len = arr.length; idx < len; idx++) {
      const p = arr[idx];
      if (!!p.ground !== ground) continue;
      if (p.kind !== 'coin' && p.kind !== 'fish' && (p.x < vLeft || p.x > vRight || p.y < vTop || p.y > vBot)) continue;
      const k = p.age / p.life;
      switch (p.kind) {
        case 'px': {
          c.globalAlpha = prev * p.alpha * (1 - k * k);
          const s = Math.max(2, snap(p.size));
          c.fillStyle = p.color;
          c.fillRect(snap(p.x - s / 2), snap(p.y - s / 2), s, s);
          break;
        }
        case 'spark': {
          c.globalAlpha = prev * p.alpha * (1 - k);
          const arm = Math.round(Math.sin(k * Math.PI) * 3) * 2;
          const sx = snap(p.x), sy = snap(p.y);
          c.fillStyle = p.color;
          c.fillRect(sx, sy, 2, 2);
          if (arm > 0) {
            c.fillRect(sx - arm, sy, arm, 2); c.fillRect(sx + 2, sy, arm, 2);
            c.fillRect(sx, sy - arm, 2, arm); c.fillRect(sx, sy + 2, 2, arm);
          }
          break;
        }
        case 'puff': {
          c.globalAlpha = prev * p.alpha * (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85);
          const s = snap(p.size);
          const px = snap(p.x - s / 2), py = snap(p.y - s / 2);
          c.fillStyle = p.color;
          c.fillRect(px + 2, py, Math.max(2, s - 4), s);
          c.fillRect(px, py + 2, s, Math.max(2, s - 4));
          c.globalAlpha *= 0.55;
          c.fillStyle = '#ffffff';
          c.fillRect(px + 2, py + 2, Math.max(2, (s >> 1) - 2), Math.max(2, (s >> 1) - 2));
          break;
        }
        case 'ring': {
          c.globalAlpha = prev * p.alpha * (1 - k);
          const r = p.size + p.grow * p.age;
          const step = r < 14 ? 2 : 1;
          c.fillStyle = p.color;
          for (let i = 0; i < RING_N; i += step) {
            c.fillRect(snap(p.x + RING_X[i] * r), snap(p.y + RING_Y[i] * r), 2, 2);
          }
          break;
        }
        case 'coin': {
          const u = clamp01(p.age / p.life);
          const e = 1 - (1 - u) * (1 - u);
          const x = (p.ox ?? p.x) + ((p.tx ?? p.x) - (p.ox ?? p.x)) * e;
          const y = (p.oy ?? p.y) + ((p.ty ?? p.y) - (p.oy ?? p.y)) * e - Math.sin(u * Math.PI) * 46;
          c.globalAlpha = prev * (u > 0.85 ? (1 - u) / 0.15 : 1);
          const w = [6, 4, 2, 4][Math.floor(p.age * 14) & 3];
          const cx = snap(x - w / 2), cy = snap(y - 3);
          c.fillStyle = '#e3b85a'; c.fillRect(cx, cy, w, 6);
          c.fillStyle = '#fbe3a1'; c.fillRect(cx, cy, Math.max(2, w - 2), 2);
          c.fillStyle = '#a97b32'; c.fillRect(cx, cy + 4, w, 2);
          break;
        }
        case 'leaf': {
          c.globalAlpha = prev * p.alpha * (k > 0.8 ? (1 - k) / 0.2 : 1);
          const flip = Math.sin(p.age * 6 + p.seed) > 0;
          c.fillStyle = p.color;
          c.fillRect(snap(p.x), snap(p.y), flip ? 4 : 2, flip ? 2 : 4);
          break;
        }
        case 'flame': {
          c.globalAlpha = prev * (1 - k);
          c.fillStyle = k < 0.3 ? '#ffe1a0' : k < 0.6 ? '#f39a43' : '#c9472b';
          const s = Math.max(2, snap(p.size * (1 - k)));
          c.fillRect(snap(p.x - s / 2), snap(p.y - s / 2), s, s);
          break;
        }
        case 'text': {
          c.globalAlpha = prev * (k < 0.1 ? k / 0.1 : k > 0.7 ? (1 - k) / 0.3 : 1);
          c.font = '8px "Press Start 2P", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
          const y = snap(p.y - Math.min(1, k * 1.6) * 26);
          const sx = snap(p.x);
          c.fillStyle = '#16201a'; c.fillText(p.text ?? '', sx + 2, y + 2);
          c.fillStyle = p.color; c.fillText(p.text ?? '', sx, y);
          break;
        }
        case 'fish': {
          const u = clamp01(p.age / p.life);
          const ox = p.ox ?? p.x, oy = p.oy ?? p.y, tx = p.tx ?? p.x + 44;
          const dir = tx >= ox ? 1 : -1;
          const x = ox + (tx - ox) * u;
          const arc = 4 * u * (1 - u);
          const H = 30;
          const y = oy - arc * H;
          const vy = -H * 4 * (1 - 2 * u);
          const vx = (tx - ox);
          const ang = Math.atan2(vy, vx * dir);
          const ux = Math.cos(ang) * dir, uy = Math.sin(ang);
          const nx = -uy, ny = ux;
          const wag = Math.sin(p.age * 34 + p.seed) * 1.8;
          c.globalAlpha = prev;
          const P = (along: number, perp: number, w: number, h: number, col: string) => {
            c.fillStyle = col;
            c.fillRect(snap(x + ux * along + nx * perp) - (w >> 1), snap(y + uy * along + ny * perp) - (h >> 1), w, h);
          };
          P(7, 0, 2, 2, '#17231e'); P(5, -1, 4, 4, '#2a5f63'); P(2, -1, 4, 6, '#2a5f63'); P(-1, -1, 4, 6, '#397b7c');
          P(-4, 0, 4, 4, '#397b7c'); P(4, 2, 4, 2, '#efe5c8'); P(1, 2, 4, 2, '#f6eed8'); P(-2, 2, 4, 2, '#efe5c8');
          P(2, -3, 4, 2, '#d98a4e'); P(0, 3, 2, 2, '#c97843');
          P(-7, wag * 0.6, 2, 2, '#2a5f63'); P(-10, wag - 2, 2, 2, '#d98a4e'); P(-10, wag + 2, 2, 2, '#d98a4e');
          P(5, -1, 2, 2, '#f6f2e4');
          if (Math.floor(p.age * 20) % 3 === 0) P(1, -1, 2, 2, '#ffffff');
          break;
        }
      }
    }
    c.globalAlpha = prev;
  }
}
