/* Cosmetic particle system. Everything snaps to the 2px world grid. */
export type FxKind = 'px' | 'puff' | 'ring' | 'coin' | 'leaf' | 'text' | 'flame' | 'fish' | 'spark';
export interface Fx {
  kind: FxKind; x: number; y: number; vx: number; vy: number; ay: number; drag: number;
  age: number; life: number; size: number; grow: number; color: string; alpha: number; seed: number;
  text?: string; ox?: number; oy?: number; tx?: number; ty?: number; ground?: boolean;
}
const snap = (v: number) => Math.round(v / 2) * 2;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export class FxSystem {
  list: Fx[] = [];
  private max = 480;

  add(p: Partial<Fx> & { kind: FxKind; x: number; y: number }) {
    this.list.push({
      vx: 0, vy: 0, ay: 0, drag: 0, age: 0, life: 1, size: 2, grow: 0, color: '#ffffff', alpha: 1,
      seed: Math.random() * 100, ...p,
    });
    if (this.list.length > this.max) this.list.splice(0, this.list.length - this.max);
  }
  clear() { this.list = []; }

  update(dt: number, target: { x: number; y: number }) {
    if (dt <= 0) return;
    for (const p of this.list) {
      p.age += dt;
      if (p.kind === 'coin') { p.tx = target.x; p.ty = target.y - 50; continue; }
      if (p.kind === 'fish') continue;
      const d = Math.exp(-p.drag * dt);
      p.vx *= d; p.vy = p.vy * d + p.ay * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.size = Math.max(0, p.size + p.grow * dt);
      if (p.kind === 'leaf') p.x += Math.sin(p.age * 3 + p.seed) * 22 * dt;
    }
    this.list = this.list.filter(p => p.age < p.life);
  }

  draw(c: CanvasRenderingContext2D, ground: boolean) {
    const prev = c.globalAlpha;
    for (const p of this.list) {
      if (!!p.ground !== ground) continue;
      const k = p.age / p.life;
      const R = (x: number, y: number, w: number, h: number, col = p.color) => { c.fillStyle = col; c.fillRect(snap(x), snap(y), w, h); };
      switch (p.kind) {
        case 'px': {
          c.globalAlpha = prev * p.alpha * (1 - k * k);
          const s = Math.max(2, snap(p.size)); R(p.x - s / 2, p.y - s / 2, s, s); break;
        }
        case 'spark': {
          c.globalAlpha = prev * p.alpha * (1 - k);
          const arm = Math.round(Math.sin(k * Math.PI) * 3) * 2;
          R(p.x, p.y, 2, 2); R(p.x - arm, p.y, arm, 2); R(p.x + 2, p.y, arm, 2); R(p.x, p.y - arm, 2, arm); R(p.x, p.y + 2, 2, arm);
          break;
        }
        case 'puff': {
          c.globalAlpha = prev * p.alpha * (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85);
          const s = snap(p.size);
          R(p.x - s / 2 + 2, p.y - s / 2, Math.max(2, s - 4), s); R(p.x - s / 2, p.y - s / 2 + 2, s, Math.max(2, s - 4));
          c.globalAlpha *= 0.55; R(p.x - s / 2 + 2, p.y - s / 2 + 2, Math.max(2, s / 2 - 2), Math.max(2, s / 2 - 2), '#ffffff');
          break;
        }
        case 'ring': {
          c.globalAlpha = prev * p.alpha * (1 - k);
          const r = p.size + p.grow * p.age;
          const n = Math.max(10, Math.round(r * 1.2));
          for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; R(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.42, 2, 2); }
          break;
        }
        case 'coin': {
          const u = clamp01(p.age / p.life);
          const e = 1 - (1 - u) * (1 - u);
          const x = (p.ox ?? p.x) + ((p.tx ?? p.x) - (p.ox ?? p.x)) * e;
          const y = (p.oy ?? p.y) + ((p.ty ?? p.y) - (p.oy ?? p.y)) * e - Math.sin(u * Math.PI) * 46;
          c.globalAlpha = prev * (u > 0.85 ? (1 - u) / 0.15 : 1);
          const w = [6, 4, 2, 4][Math.floor(p.age * 14) % 4];
          R(x - w / 2, y - 3, w, 6, '#e3b85a'); R(x - w / 2, y - 3, Math.max(2, w - 2), 2, '#fbe3a1'); R(x - w / 2, y + 1, w, 2, '#a97b32');
          break;
        }
        case 'leaf': {
          c.globalAlpha = prev * p.alpha * (k > 0.8 ? (1 - k) / 0.2 : 1);
          const flip = Math.sin(p.age * 6 + p.seed) > 0;
          R(p.x, p.y, flip ? 4 : 2, flip ? 2 : 4); break;
        }
        case 'flame': {
          c.globalAlpha = prev * (1 - k);
          const col = k < 0.3 ? '#ffe1a0' : k < 0.6 ? '#f39a43' : '#c9472b';
          const s = Math.max(2, snap(p.size * (1 - k))); R(p.x - s / 2, p.y - s / 2, s, s, col); break;
        }
        case 'text': {
          c.globalAlpha = prev * (k < 0.1 ? k / 0.1 : k > 0.7 ? (1 - k) / 0.3 : 1);
          c.font = '8px "Press Start 2P", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
          const y = snap(p.y - Math.min(1, k * 1.6) * 26);
          c.fillStyle = '#16201a'; c.fillText(p.text ?? '', snap(p.x) + 2, y + 2);
          c.fillStyle = p.color; c.fillText(p.text ?? '', snap(p.x), y);
          break;
        }
        case 'fish': {
          const u = clamp01(p.age / p.life);
          const x = (p.ox ?? p.x) + ((p.tx ?? p.x) - (p.ox ?? p.x)) * u;
          const y = (p.oy ?? p.y) - Math.sin(u * Math.PI) * 26;
          const dir = (p.tx ?? 0) >= (p.ox ?? 0) ? 1 : -1;
          const tilt = u < 0.5 ? -2 : 2;
          c.globalAlpha = prev;
          R(x - 4 * dir, y - tilt, 8, 4, '#e09b54'); R(x - 2 * dir, y - tilt, 4, 2, '#f6d39a');
          R(x - 8 * dir, y - tilt * 2, 4, 4, '#c56f36'); R(x + 3 * dir, y - tilt, 2, 2, '#1f1a17');
          break;
        }
      }
    }
    c.globalAlpha = prev;
  }
}
