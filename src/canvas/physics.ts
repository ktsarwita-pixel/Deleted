/* Shared motion physics: wind field, pendulums, verlet chains, springs. */

/** Layered value-noise so the whole scene shares one coherent breeze. */
const n1 = (x: number) => { const s = Math.sin(x); return s * 0.5 + 0.5; };

export interface Wind { dir: number; power: number; gust: number; turb: number }

/** `dir` -1..1 (negative = blowing left), `power` 0..1, `gust` 0..1 spike. */
export function windAt(x: number, y: number, t: number): Wind {
  const slow = Math.sin(t * 0.17 + x * 0.0011 + y * 0.0007);
  const mid = Math.sin(t * 0.41 - x * 0.0023 + y * 0.0019);
  const fast = Math.sin(t * 1.07 + x * 0.007 + y * 0.005);
  const dir = Math.max(-1, Math.min(1, slow * 0.62 + mid * 0.28 + fast * 0.1));
  // gusts arrive as slow envelopes, stronger while the fire still burns
  const env = Math.pow(n1(t * 0.23 + y * 0.002), 3);
  const gust = Math.max(0, Math.min(1, env * 1.35 - 0.28 + mid * 0.22));
  return { dir, power: Math.abs(dir), gust, turb: (fast + mid) * 0.5 };
}

/** Damped pendulum: angle'' = -(g/L)sin(angle) - c*angle' + drive. */
export class Pendulum {
  angle = 0;
  vel = 0;
  constructor(private length = 1, private damping = 2.1, private gravity = 9.8) {}
  update(dt: number, drive = 0) {
    const steps = Math.max(1, Math.min(6, Math.ceil(dt / (1 / 120))));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const acc = -(this.gravity / this.length) * Math.sin(this.angle) - this.damping * this.vel + drive;
      this.vel += acc * h;
      this.angle += this.vel * h;
    }
    this.angle = Math.max(-1.15, Math.min(1.15, this.angle));
  }
  kick(v: number) { this.vel += v; }
  reset() { this.angle = 0; this.vel = 0; }
}

/** Small verlet chain used for hair, ribbons and chains that trail behind. */
export interface VerletNode { x: number; y: number; px: number; py: number }

export class VerletChain {
  nodes: VerletNode[] = [];
  constructor(public segs: number, public segLen: number) {
    for (let i = 0; i <= segs; i++) this.nodes.push({ x: 0, y: i * segLen, px: 0, py: i * segLen });
  }
  /** anchor = fixed head point; gravity pulls down, wind pushes sideways. */
  update(dt: number, anchor: { x: number; y: number }, gravity = 520, wind = 0, drag = 0.985, steps = 4) {
    const h = Math.min(dt, 1 / 30);
    const head = this.nodes[0];
    head.px = head.x; head.py = head.y;
    head.x = anchor.x; head.y = anchor.y;
    for (let i = 1; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      const vx = (n.x - n.px) * drag, vy = (n.y - n.py) * drag;
      n.px = n.x; n.py = n.y;
      n.x += vx + wind * h * h * 60;
      n.y += vy + gravity * h * h;
    }
    for (let s = 0; s < steps; s++) {
      for (let i = 1; i < this.nodes.length; i++) {
        const a = this.nodes[i - 1], b = this.nodes[i];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.0001;
        const diff = ((d - this.segLen) / d) * (i === 1 ? 1 : 0.5);
        b.x -= dx * diff; b.y -= dy * diff;
        if (i > 1) { a.x += dx * diff * 0.5; a.y += dy * diff * 0.5; }
      }
      this.nodes[0].x = anchor.x; this.nodes[0].y = anchor.y;
    }
  }
  /** Horizontal lean of the tip, -1..1, for baked-frame selection. */
  lean(anchorX: number) {
    const tip = this.nodes[this.nodes.length - 1];
    return Math.max(-1, Math.min(1, (tip.x - anchorX) / (this.segLen * this.segs * 1.4)));
  }
}

/** Critically-ish damped spring used for camera shake and impacts. */
export class Spring {
  value = 0;
  vel = 0;
  constructor(private stiffness = 260, private damping = 17) {}
  update(dt: number) {
    const h = Math.min(dt, 1 / 30);
    this.vel += (-this.stiffness * this.value - this.damping * this.vel) * h;
    this.value += this.vel * h;
    if (Math.abs(this.value) < 0.001 && Math.abs(this.vel) < 0.01) { this.value = 0; this.vel = 0; }
  }
  kick(v: number) { this.vel += v; }
}

/**
 * Expanding surface ripple. Each ring is a crest/trough pair seen in
 * perspective, with a secondary trailing wave and a specular glint.
 */
export interface Ripple {
  x: number; y: number; r: number; speed: number; age: number; life: number;
  strength: number; squash: number; seed: number;
}

export class RippleField {
  list: Ripple[] = [];
  add(x: number, y: number, strength = 1, speed = 34) {
    this.list.push({
      x, y, r: 1.5, speed, age: 0, life: 1.5 + strength * 0.6, strength,
      squash: 0.4, seed: Math.random() * 6.28,
    });
    if (this.list.length > 26) this.list.shift();
  }
  update(dt: number) {
    for (const r of this.list) {
      r.age += dt;
      // waves slow as they spread, like real capillary rings losing energy
      r.r += r.speed * dt * (1 - (r.age / r.life) * 0.55);
    }
    this.list = this.list.filter(r => r.age < r.life);
  }
  /**
   * `clip` restricts drawing to open water so rings never cross the jetty deck.
   * It is applied once for the whole batch, not per ring.
   */
  draw(c: CanvasRenderingContext2D, snap: (v: number) => number, color = '#e4f6ee', clip?: (c: CanvasRenderingContext2D) => void) {
    if (!this.list.length) return;
    const prev = c.globalAlpha;
    c.save();
    if (clip) clip(c);
    for (const r of this.list) {
      const k = r.age / r.life;
      // quick attack, long fade
      const fade = (k < 0.12 ? k / 0.12 : 1 - (k - 0.12) / 0.88) * r.strength;
      const rx = Math.max(2, Math.round(r.r));
      const ry = Math.max(1, Math.round(r.r * r.squash));
      const n = Math.max(12, Math.min(44, Math.round(r.r * 1.3)));
      // trough just inside the crest gives the ring thickness
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const ca = Math.cos(a), sa = Math.sin(a);
        const jitter = Math.sin(a * 3 + r.seed) * 0.6;
        const cxp = snap(r.x + ca * (rx + jitter));
        const cyp = snap(r.y + sa * (ry + jitter * 0.4));
        // the near half of the ring catches more light than the far half
        const facing = sa > -0.25;
        c.globalAlpha = prev * fade * (facing ? 0.82 : 0.4);
        c.fillStyle = color;
        c.fillRect(cxp, cyp, 2, 2);
        if (rx > 4) {
          c.globalAlpha = prev * fade * (facing ? 0.3 : 0.15);
          c.fillStyle = '#2f5f66';
          c.fillRect(snap(r.x + ca * (rx - 2)), snap(r.y + sa * (ry - 1)), 2, 2);
        }
      }
      // trailing secondary wave
      if (rx > 9) {
        const r2 = rx * 0.62, ry2 = Math.max(1, ry * 0.62);
        const n2 = Math.max(10, Math.round(r2 * 1.5));
        c.globalAlpha = prev * fade * 0.34;
        c.fillStyle = color;
        for (let i = 0; i < n2; i++) {
          const a = (i / n2) * Math.PI * 2;
          c.fillRect(snap(r.x + Math.cos(a) * r2), snap(r.y + Math.sin(a) * ry2), 2, 2);
        }
      }
      // impact glint at the centre, only while the ring is young
      if (k < 0.3) {
        c.globalAlpha = prev * (1 - k / 0.3) * r.strength;
        c.fillStyle = '#f4fffb';
        c.fillRect(snap(r.x) - 1, snap(r.y) - 1, 3, 2);
      }
    }
    c.restore();
    c.globalAlpha = prev;
  }
}

/** Simple ballistic droplet used by the poured water. */
export interface Droplet { x: number; y: number; vx: number; vy: number; age: number; life: number; size: number }

export class DropletField {
  list: Droplet[] = [];
  add(x: number, y: number, vx: number, vy: number, size = 3, life = 1.2) {
    this.list.push({ x, y, vx, vy, age: 0, life, size });
    if (this.list.length > 140) this.list.shift();
  }
  update(dt: number, gravity = 780, wind = 0) {
    for (const d of this.list) {
      d.age += dt; d.vy += gravity * dt; d.vx += wind * 26 * dt;
      d.x += d.vx * dt; d.y += d.vy * dt;
      d.vx *= Math.exp(-0.55 * dt);
    }
    this.list = this.list.filter(d => d.age < d.life);
  }
  draw(c: CanvasRenderingContext2D, snap: (v: number) => number) {
    for (const d of this.list) {
      const k = d.age / d.life;
      c.globalAlpha = 1 - k * k;
      // droplets stretch along their velocity: real falling water look
      const sp = Math.hypot(d.vx, d.vy);
      const len = Math.max(2, Math.min(9, Math.round(sp / 90) * 2));
      const ux = sp > 1 ? d.vx / sp : 0, uy = sp > 1 ? d.vy / sp : 1;
      c.fillStyle = '#7fc6d2';
      c.fillRect(snap(d.x - ux * len * 0.5), snap(d.y - uy * len * 0.5), Math.max(2, Math.abs(ux) * len + d.size - 1), Math.max(2, Math.abs(uy) * len + d.size - 1));
      c.fillStyle = '#dcf4f0';
      c.fillRect(snap(d.x - ux * len * 0.5), snap(d.y - uy * len * 0.5), 2, 2);
    }
    c.globalAlpha = 1;
  }
}
