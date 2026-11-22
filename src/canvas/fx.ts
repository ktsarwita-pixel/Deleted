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
  private max = 240;

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
          const ox = p.ox ?? p.x, oy = p.oy ?? p.y, tx = p.tx ?? p.x;
          const x = ox + (tx - ox) * u;
          const arcH = 30 + (Math.floor(p.seed) % 3) * 4;
          const lift = Math.sin(u * Math.PI) * arcH;
          const y = oy - lift;
          const dir = tx >= ox ? 1 : -1;
          // 3 Kalimantan lake species: 0 = Ikan Jelawat (silver-emerald + red fins), 1 = Ikan Mas (gold carp), 2 = Ikan Haruan (river teal-bronze)
          const sp = Math.floor(p.seed) % 3;
          const dorsal = sp === 0 ? '#4d7f6a' : sp === 1 ? '#d96f28' : '#3a6f7d';
          const flank  = sp === 0 ? '#9ec4b4' : sp === 1 ? '#f29f3d' : '#6cb4c0';
          const belly  = sp === 0 ? '#f0f7f4' : sp === 1 ? '#fbe5a2' : '#dff0ee';
          const finCol = sp === 0 ? '#df4d36' : sp === 1 ? '#cf4228' : '#2d535e';
          const glint  = sp === 0 ? '#ffffff' : sp === 1 ? '#fff7cf' : '#c8f6f8';

          // Fish-shaped dark underwater shadow directly beneath the leaping fish on the lake surface
          const shY = oy + 2 + Math.round(lift * 0.08);
          const wagSh = Math.round(Math.sin(p.age * 34 + p.seed)) * 2;
          c.globalAlpha = prev * (0.34 + 0.14 * (1 - Math.sin(u * Math.PI)));
          R(x - 4 * dir, shY, 10, 4, '#0f2d33');
          R(x + (dir > 0 ? 5 : -7), shY + 1, 3, 2, '#0f2d33');
          R(x - (dir > 0 ? 8 : -5), shY - 1 + (wagSh >> 1), 3, 2, '#0f2d33');
          R(x - (dir > 0 ? 8 : -5), shY + 2 + (wagSh >> 1), 3, 2, '#0f2d33');

          // High-speed caudal tail wagging + 5-stage pitch angle along ballistic trajectory
          const wag = Math.round(Math.sin(p.age * 38 + p.seed) * 1) * 2;
          // pitchSlope: -2 (steep climb), -1 (climb), 0 (arched apex), +1 (descent), +2 (steep dive)
          const pitch = u < 0.18 ? -2 : u < 0.38 ? -1 : u < 0.62 ? 0 : u < 0.82 ? 1 : 2;
          c.globalAlpha = prev;
          const P = (dx: number, dy: number, w: number, h: number, col: string) => {
            const wx = dir === 1 ? x + dx : x - dx - w;
            R(wx, y + dy, w, h, col);
          };

          if (pitch === 0) {
            // Graceful arched crest pose at the top of the leap
            P(-12, 2 + wag, 4, 2, finCol); P(-12, -2 + wag, 4, 2, finCol); P(-9, wag >> 1, 3, 2, finCol); // forked tail
            P(-6, -2, 12, 2, dorsal); // arched emerald/gold back
            P(-6, 0, 14, 2, flank);   // lateral line
            P(-4, 2, 10, 2, belly);   // silver/gold belly
            P(6, 0, 4, 2, dorsal); P(6, 2, 2, 2, flank); // tapered snout
            P(-2, -4, 4, 2, finCol);  // raised dorsal fin
            P(0, 4, 3, 2, finCol);    // ventral pectoral fin
            P(-1, -1, 2, 2, glint); P(3, 0, 2, 1, glint); // sunlit wet scale glints
            P(5, 0, 2, 2, '#171a1c'); // crisp eye
          } else {
            // Sloped body segments following climb (pitch < 0) or dive (pitch > 0)
            const s = pitch; // -2, -1, +1, +2 vertical step from tail toward snout
            const ty = -s * 2; // tail is lower when climbing, higher when diving!
            const hy = s * 2;  // head is higher when climbing, lower when diving!
            // Forked wagging tail fin
            P(-11, ty - 2 + wag, 3, 2, finCol);
            P(-11, ty + 2 + wag, 3, 2, finCol);
            P(-8, ty + (wag >> 1), 3, 2, finCol);
            // Peduncle (rear body)
            P(-5, (ty >> 1) - 1, 5, 2, dorsal);
            P(-5, (ty >> 1) + 1, 5, 2, flank);
            // Mid torso + belly + dorsal & pectoral fins
            P(-1, -2, 6, 2, dorsal);
            P(-1, 0, 6, 2, flank);
            P(-1, 2, 5, 2, belly);
            P(0, -4, 4, 2, finCol);
            P(1, 3, 3, 2, finCol);
            // Head + tapered snout + eye
            P(4, (hy >> 1) - 1, 5, 2, dorsal);
            P(4, (hy >> 1) + 1, 4, 2, belly);
            P(7, hy, 3, 2, flank);
            P(1, -1, 2, 2, glint);
            P(5, (hy >> 1) - 1, 2, 2, '#171a1c');
          }

          // Trailing airborne water droplets flicked off the wagging tail near the crest!
          if (u > 0.16 && u < 0.82) {
            c.globalAlpha = prev * 0.78;
            const d1x = x - dir * (13 + ((Math.floor(p.age * 24) % 3) * 2));
            const d1y = y + (pitch < 0 ? 5 : -3) + wag;
            R(d1x, d1y, 2, 2, '#dffaf6');
            if (u > 0.32 && u < 0.68) R(d1x - dir * 4, d1y + 3, 2, 2, '#9ce6dc');
          }
          break;
        }
      }
    }
    c.globalAlpha = prev;
  }
}
