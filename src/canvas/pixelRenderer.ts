import type { GameWorld, Viewport } from '../game/model';
import type { CollectibleItem, Direction, FireHotspot, PlayerState, SceneType } from '../types/gameTypes';
import { getBackground, hash, poly, R, text } from './backgrounds';
import { createDoorRig, drawHouseBackDoors, drawHouseFrontDoor, drawVillageDoors, updateDoors, type DoorRig } from './doors';
import {
  catSprite, chickenSprite, drawBucketLive, drawCharacter, drawShadow,
  handPoint, resetRigs, type FrameSpec, type MotionInfo, type Pose, type Who,
} from './sprites';
import { canopyCenter, drawProp, drawTree } from './trees';
import { FxSystem } from './fx';
import { canStand, INITIAL_FIRE_HOTSPOTS } from './worldData';
import { DropletField, Pendulum, RippleField, Spring, windAt, type Wind } from './physics';
import { drawPierFoam, drawPierReflections, fishJumpStaysInWater, isWater, onPier, pierRippleSpots, PIER } from './water';
import { drawFirePit, fireLightRadius } from './fire';
import { drawScreenAtmosphere, drawWorldCanopySmoke, drawWorldGroundFog } from './fog';
import { bumpSign, drawSign, type SignStyle } from './signs';

export interface RenderOptions { preview?: boolean }

const VILLAGE_TREES: [number, number, number][] = [
  // village shade trees
  [57, 219, 1.2], [358, 196, 1.05], [78, 427, 1.3], [106, 690, 1], [721, 540, 1.05], [842, 642, 1.15], [352, 470, 0.9],
  // deep forest stand, layered front to back
  [1070, 159, 1.1], [1236, 165, 1.3], [1320, 350, 1.15], [1326, 540, 1.35], [1225, 708, 1.25], [994, 727, 1.1],
  [1140, 130, 0.95], [1290, 240, 1.05], [1356, 430, 1.2], [1180, 250, 0.9], [1064, 380, 1], [1156, 520, 1.15],
  [1272, 620, 1.05], [1040, 640, 0.95], [986, 300, 1.05], [1348, 690, 1.3],
];
const LAKE = { x0: 210, x1: 640, y0: 556, y1: 728 };
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const snap = (v: number) => Math.round(v / 2) * 2;
// A relaxed walking pace: one planted footstep about every 58 world pixels.
const STEP_DISTANCE = 58;
const GAIT_DISTANCE = 104;

interface SignDef { id: string; x: number; y: number; depth: number; style: SignStyle }

/** Layered wooden signage, mounted on posts or hung from chains. */
const VILLAGE_SIGNS: SignDef[] = [
  { id: 'shop-board', x: 565, y: 112, depth: 144, style: { label: 'WARUNG BUDI', kind: 'board', w: 80, h: 18, paint: '#623b2b', ink: '#f8e9c4', scale: 1.5 } },
  { id: 'shop-open', x: 490, y: 151, depth: 206, style: { label: 'BUKA', kind: 'hanging', w: 36, h: 17, paint: '#2e634c', ink: '#f8e9c4', lantern: true, scale: 1.35 } },
  { id: 'posko', x: 825, y: 132, depth: 193, style: { label: 'POSKO', kind: 'board', w: 42, h: 17, paint: '#3b5740', ink: '#f8e9c4', scale: 1.5 } },
  { id: 'home', x: 210, y: 144, depth: 174, style: { label: 'RUMAH WIRA', kind: 'board', w: 74, h: 17, paint: '#754b30', ink: '#f8e9c4', scale: 1.4 } },
  { id: 'lake', x: 522, y: 500, depth: 500, style: { label: 'DANAU', sub: 'ISI AIR', kind: 'post', posts: 2, w: 50, h: 27, paint: '#315b60', ink: '#eef9eb', scale: 1.4 } },
  { id: 'forest', x: 884, y: 410, depth: 410, style: { label: 'HUTAN', sub: 'AWAS API', kind: 'post', posts: 1, w: 59, h: 27, paint: '#57432c', ink: '#fff0c3', scale: 1.5 } },
];
const HOUSE_SIGNS: SignDef[] = [
  { id: 'exit', x: 351, y: 511, depth: 534, style: { label: 'KELUAR', kind: 'board', w: 48, h: 17, paint: '#6a5030', ink: '#fff0c3', scale: 1.35 } },
  { id: 'radio-tag', x: 640, y: 250, depth: 263, style: { label: 'RADIO', kind: 'board', w: 39, h: 17, paint: '#3d514c', ink: '#eef9eb', scale: 1.3 } },
];

interface Hen { x: number; y: number; tx: number; ty: number; wait: number; face: 1 | -1; dist: number }
interface Mem {
  scene: SceneType; time: number; dt: number; collected: Set<string>; fires: Map<string, number>; fireVisual: Map<string, number>;
  water: number; step: number; progress: number; stillSince: number; cough: number;
  shakeX: Spring; shakeY: Spring; nextFish: number; treeState: Map<number, { burnt: boolean; since: number }>;
  pend: Pendulum; pendVel: number; slosh: number; vx: number; vy: number; pvx: number; speed: number; lean: number;
  ripples: RippleField; droplets: DropletField; pourNext: number; splashNext: number; steamNext: number;
  bumped: Map<string, number>; catTail: Spring; wind: Wind; lastX: number; lastY: number;
  propBurn: Map<number, number>; wasPierInWater: boolean;
  fillSplashAt: number; fillBubbleNext: number; fillDripNext: number;
  doors: DoorRig;
  jumpShadows: { ox: number; oy: number; tx: number; dir: -1 | 1; dySwim: number; t0: number; tJump: number; tLand: number; tEnd: number; seed: number; jumped: boolean; landed: boolean }[];
}
let mem: Mem | null = null;
let pending: { at: number; run: () => void }[] = [];
let hens: Hen[] = [];
let tufts: { x: number; y: number; color: string; bloomAt: number }[] | null = null;
let vignette: { w: number; h: number; c: HTMLCanvasElement } | null = null;
let fireGlowSprite: HTMLCanvasElement | null = null;

function getFireGlowSprite(): HTMLCanvasElement {
  if (fireGlowSprite) return fireGlowSprite;
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,155,62,0.38)');
  g.addColorStop(0.55, 'rgba(255,130,45,0.14)');
  g.addColorStop(1, 'rgba(255,115,35,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  fireGlowSprite = c;
  return c;
}
const fx = new FxSystem();

const progressOf = (w: GameWorld) => w.fires.filter(f => f.intensity === 0).length * 10;

function freshMem(w: GameWorld, prevDoors?: DoorRig): Mem {
  const doors = prevDoors ?? createDoorRig(w.scene);
  if (prevDoors && prevDoors.scene !== w.scene) updateDoors(doors, w, 0.016);
  return {
    scene: w.scene, time: w.time, dt: 0,
    collected: new Set(w.collectibles.filter(c => c.collected).map(c => c.id)),
    fires: new Map(w.fires.map(f => [f.id, f.intensity])),
    fireVisual: new Map(w.fires.map(f => [f.id, f.intensity / f.maxIntensity])),
    water: w.player.waterUnits, step: Math.floor(w.player.animFrame / STEP_DISTANCE), progress: progressOf(w),
    stillSince: w.time, cough: -1, shakeX: new Spring(320, 15), shakeY: new Spring(320, 15),
    nextFish: w.time + 1.6, treeState: new Map(), pend: new Pendulum(0.34, 1.9, 11), pendVel: 0, slosh: 0,
    vx: 0, vy: 0, pvx: 0, speed: 0, lean: 0, ripples: new RippleField(), droplets: new DropletField(),
    pourNext: 0, splashNext: 0, steamNext: 0, bumped: new Map(), catTail: new Spring(190, 7),
    wind: windAt(w.player.x, w.player.y, w.time), lastX: w.player.x, lastY: w.player.y, propBurn: new Map(),
    wasPierInWater: false,
    fillSplashAt: -1, fillBubbleNext: 0, fillDripNext: 0, jumpShadows: [],
    doors,
  };
}

function getTufts() {
  if (tufts) return tufts;
  tufts = [];
  const colors = ['#f1d36e', '#f3f0e4', '#eaa0b4', '#c9a6e6'];
  for (let i = 0; tufts.length < 74 && i < 1200; i++) {
    const x = 40 + hash(i, 1.7) * 900, y = 80 + hash(i, 9.1) * 700;
    const onRoad = (x > 165 && x < 1005 && y > 244 && y < 356) || (x > 396 && x < 490 && y > 310 && y < 646);
    const nearYard = (x > 308 && x < 434 && y > 218 && y < 258) || (x > 350 && x < 398 && y > 336 && y < 446) || (x > 168 && x < 692 && y > 510);
    if (onRoad || nearYard || !canStand('village', x, y) || (x > 450 && x < 690 && y < 280)) continue;
    tufts.push({ x: snap(x), y: snap(y), color: colors[i % 4], bloomAt: (i % 10) * 10 });
  }
  return tufts;
}

type PropKind = 'fern' | 'sapling' | 'banana' | 'bush';
interface ForestProp { x: number; y: number; kind: PropKind; scale: number }
let forestProps: ForestProp[] | null = null;

/** Ferns, saplings and banana plants: they scorch near fire and green back after. */
function getForestProps() {
  if (forestProps) return forestProps;
  forestProps = [];
  const kinds: PropKind[] = ['fern', 'bush', 'sapling', 'fern', 'banana', 'bush'];
  for (let i = 0; forestProps.length < 44 && i < 700; i++) {
    const x = 954 + hash(i, 3.3) * 404, y = 112 + hash(i, 7.7) * 616;
    // never plant a prop on top of a hotspot: the flames must stay readable
    if (INITIAL_FIRE_HOTSPOTS.some(f => Math.hypot(f.x - x, f.y - y) < 34)) continue;
    forestProps.push({ x: snap(x), y: snap(y), kind: kinds[i % kinds.length], scale: 0.85 + hash(i, 11) * 0.55 });
  }
  for (const [x, y] of [[196, 596], [662, 618], [242, 764], [612, 750], [176, 686]] as [number, number][])
    forestProps.push({ x, y, kind: 'fern', scale: 0.95 });
  return forestProps;
}

function fillTarget(p: PlayerState, a?: GameWorld['action']) {
  if (a?.type === 'fill' && a.target) return a.target;
  if (p.y >= 546 && p.x >= 405 && p.x <= 479) {
    if (p.y >= 604) return { x: p.x, y: 652 };
    return { x: p.x <= 442 ? 386 : 498, y: Math.max(562, p.y + 10) };
  }
  return { x: Math.max(230, Math.min(620, p.x)), y: Math.max(564, p.y + 34) };
}
function signsFor(scene: SceneType) { return scene === 'house' ? HOUSE_SIGNS : VILLAGE_SIGNS; }

/** Wira brushing past a sign, or a fire going out, sets it swinging. */
function bumpNearby(w: GameWorld, m: Mem, x: number, y: number, force: number, cooldown = 1.1) {
  for (const s of signsFor(w.scene)) {
    const d = Math.hypot(s.x - x, s.depth - y);
    if (d > 320) continue;
    const last = m.bumped.get(s.id) ?? -99;
    if (w.time - last < cooldown) continue;
    m.bumped.set(s.id, w.time);
    bumpSign(s.id, force * clamp01(1 - d / 320));
  }
}

// ------------------------------------------------------------------ events
function detectEvents(w: GameWorld, m: Mem, motion: boolean, dt: number) {
  const p = w.player;
  for (const item of w.collectibles) {
    if (!item.collected || m.collected.has(item.id)) continue;
    m.collected.add(item.id);
    if (!motion || item.scene !== w.scene) continue;
    for (let i = 0; i < 10; i++) fx.add({ kind: 'spark', x: item.x + (Math.random() - 0.5) * 30, y: item.y - 10 + (Math.random() - 0.5) * 24, life: 0.5 + Math.random() * 0.3, color: '#fbe3a1' });
    for (let i = 0; i < 5; i++) pending.push({ at: w.time + i * 0.07, run: () => fx.add({ kind: 'coin', x: item.x, y: item.y, ox: item.x, oy: item.y - 6, tx: p.x, ty: p.y - 50, life: 0.62 }) });
    pending.push({ at: w.time + 0.5, run: () => fx.add({ kind: 'text', x: w.player.x, y: w.player.y - 96, life: 1.4, color: '#f3d58e', text: `+Rp ${item.rupiahValue / 1000}.000` }) });
    m.shakeY.kick(26); m.shakeX.kick(10);
    bumpNearby(w, m, item.x, item.y, 1.4);
  }
  for (const f of w.fires) {
    const prev = m.fires.get(f.id) ?? f.intensity;
    if (prev > 0 && f.intensity === 0 && motion) {
      pending.push({ at: w.time + 0.28, run: () => {
        for (let i = 0; i < 18; i++) fx.add({ kind: 'puff', x: f.x + (Math.random() - 0.5) * 34, y: f.y - 14 - Math.random() * 16, vx: (Math.random() - 0.3) * 30 + m.wind.dir * 26, vy: -46 - Math.random() * 54, drag: 1.2, size: 8 + Math.random() * 9, grow: 24, life: 1.3 + Math.random() * 0.9, color: '#e9ece4', alpha: 0.78 });
        for (let i = 0; i < 20; i++) fx.add({ kind: 'px', x: f.x, y: f.y - 8, vx: (Math.random() - 0.5) * 180, vy: -60 - Math.random() * 130, ay: 430, life: 0.5 + Math.random() * 0.35, size: 2 + Math.random() * 2, color: i % 3 ? '#8fd2d6' : '#e3f6ec' });
        fx.add({ kind: 'ring', x: f.x, y: f.y + 4, size: 4, grow: 48, life: 0.65, color: '#cfe8df', alpha: 0.72, ground: true });
        fx.add({ kind: 'text', x: f.x, y: f.y - 62, life: 1.5, color: '#bfe8a8', text: '+10%' });
        fx.add({ kind: 'text', x: w.player.x, y: w.player.y - 96, life: 1.5, color: '#f3d58e', text: '+Rp 6.000' });
        if (mem) { mem.shakeY.kick(70); mem.shakeX.kick(26); }
        bumpNearby(w, m, f.x, f.y, 4.2, 0.4);
      } });
    }
    m.fires.set(f.id, f.intensity);
    // eased flame height so fire shrinks and flares smoothly
    const target = f.intensity / f.maxIntensity;
    const cur = m.fireVisual.get(f.id) ?? target;
    m.fireVisual.set(f.id, cur + (target - cur) * Math.min(1, dt * 5.5));
  }
  if (p.waterUnits > m.water && motion && w.action?.type !== 'fill') {
    const tgt = fillTarget(p, w.action);
    m.ripples.add(tgt.x, tgt.y, 1.1, 42);
  }
  m.water = p.waterUnits;
  const step = Math.floor(p.animFrame / STEP_DISTANCE);
  // Wood does not kick up soil. Only ordinary ground footsteps get a tiny dust mote.
  const nowOnPier = w.scene === 'village' && onPier(p.x, p.y);
  const pierSpots = nowOnPier ? pierRippleSpots(p.x, p.y) : [];
  const onPierWater = pierSpots.length > 0;
  if (p.isMoving && step !== m.step && motion && !nowOnPier) {
    const col = w.scene === 'village' ? '#cdb88c' : '#b48c5e';
    fx.add({ kind: 'puff', x: p.x - Math.sign(m.vx) * 5, y: p.y + 2, vx: -m.vx * 0.08, vy: -12, drag: 4, size: 3, grow: 7, life: 0.34, color: col, alpha: 0.34 });
    if (p.hasNewShoes && step % 2 === 0) fx.add({ kind: 'spark', x: p.x + (p.dir === 'left' ? 10 : -10), y: p.y - 4, life: 0.22, color: '#f8d670' });
  }
  if (motion && onPierWater) {
    // One soft arrival ripple once the jetty reaches open water; no spray, dust,
    // shoe sparkles, or bucket drips are emitted from the wooden deck.
    if (!m.wasPierInWater) {
      const nearest = pierSpots.reduce((best, spot) => Math.abs(spot[0] - p.x) < Math.abs(best[0] - p.x) ? spot : best, pierSpots[0]);
      m.ripples.add(nearest[0], nearest[1], 0.23, 15);
    } else if (p.isMoving && step !== m.step) {
      // A quiet ring at the adjacent piling once per relaxed footfall.
      const spot = pierSpots[Math.abs(step) % pierSpots.length];
      m.ripples.add(spot[0], spot[1], 0.14, 12);
    }
  }
  m.wasPierInWater = onPierWater;
  m.step = step;
  if (p.isMoving || w.action) m.stillSince = w.time;
  const prog = progressOf(w);
  if (prog === 100 && m.progress < 100 && motion) {
    for (let i = 0; i < 70; i++) pending.push({ at: w.time + 0.9 + i * 0.04, run: () => fx.add({ kind: 'leaf', x: w.player.x - 280 + Math.random() * 560, y: w.player.y - 250, vy: 42 + Math.random() * 32, life: 4.4, color: ['#b9d27a', '#f1d36e', '#eaa0b4', '#f3f0e4'][i % 4] }) });
    for (let i = 0; i < 16; i++) fx.add({ kind: 'spark', x: p.x + (Math.random() - 0.5) * 80, y: p.y - 40 - Math.random() * 56, life: 0.9 + Math.random() * 0.6, color: '#fbe3a1' });
    m.shakeY.kick(40);
  }
  m.progress = prog;
  if (w.cutscene === 0 && w.scene === 'village') {
    const cycle = Math.floor(w.time / 2.6);
    if (cycle !== m.cough && motion) {
      for (let i = 0; i < 3; i++) pending.push({ at: w.time + i * 0.18, run: () => fx.add({ kind: 'puff', x: w.player.x + 4, y: w.player.y - 58, vx: 18 + m.wind.dir * 20, vy: -16, drag: 1, size: 5, grow: 13, life: 1, color: '#a9a596', alpha: 0.6 }) });
      m.shakeX.kick(6);
    }
    m.cough = cycle;
  }
  // swinging bucket flicks water out when the pendulum whips round
  if (motion && p.waterUnits > 0 && w.scene === 'village' && !nowOnPier && p.isMoving && Math.abs(m.pendVel) > 4.6 && Math.random() < dt * 0.5) {
    const hp = handPoint(playerSpec(w, m, m.time));
    m.droplets.add(p.x + hp.x, p.y + hp.y + 8, m.vx * 0.16 + m.pendVel * 8, -24, 1.5, 0.32);
  }
}

// ------------------------------------------------------------------ ambient life
function updateHens(w: GameWorld, dt: number) {
  if (!hens.length) hens = [0, 1, 2].map(i => ({ x: 120 + i * 70, y: 400 + i * 22, tx: 140 + i * 60, ty: 420, wait: i, face: 1 as const, dist: 0 }));
  const p = w.player;
  for (const h of hens) {
    const dp = Math.hypot(h.x - p.x, h.y - p.y);
    let speed = 30;
    if (dp < 66 && w.scene === 'village') {
      h.tx = h.x + (h.x - p.x) / dp * 72; h.ty = h.y + (h.y - p.y) / dp * 52; h.wait = 0; speed = 105;
    } else if (h.wait > 0) { h.wait -= dt; continue; }
    h.tx = Math.max(56, Math.min(340, h.tx)); h.ty = Math.max(372, Math.min(500, h.ty));
    const dx = h.tx - h.x, dy = h.ty - h.y, d = Math.hypot(dx, dy);
    if (d < 2) { h.wait = 1 + Math.random() * 2.5; h.tx = 60 + Math.random() * 270; h.ty = 375 + Math.random() * 120; continue; }
    const mv = Math.min(d, speed * dt);
    h.x += dx / d * mv; h.y += dy / d * mv; h.dist += mv;
    if (Math.abs(dx) > 0.5) h.face = dx > 0 ? 1 : -1;
  }
}

function spawnAmbient(w: GameWorld, m: Mem, dt: number, view: Viewport) {
  const rnd = Math.random, wind = m.wind;
  if (w.scene === 'village') {
    const left = view.x - view.width / view.scale / 2, top = view.y - view.height / view.scale / 2;
    const vw = view.width / view.scale;
    const active = w.fires.filter(f => f.intensity > 0);
    for (const f of active) {
      if (f.x < left - 180 || f.x > left + vw + 180) continue;
      if (rnd() < dt * 7) fx.add({ kind: 'px', x: f.x + (rnd() - 0.5) * 30, y: f.y - 20, vx: 10 + rnd() * 26 + wind.dir * 40, vy: -52 - rnd() * 40, ay: -18, drag: 0.35, life: 1.3 + rnd(), size: 2, color: ['#f7c16a', '#ee8a45', '#ffe2a0'][Math.floor(rnd() * 3)] });
      if (rnd() < dt * 15) fx.add({ kind: 'flame', x: f.x + (rnd() - 0.5) * 26, y: f.y - 22 - rnd() * 18, vx: wind.dir * 22, vy: -60, life: 0.36, size: 6, color: '#f39a43' });
      if (rnd() < dt * 2.6) fx.add({ kind: 'puff', x: f.x + (rnd() - 0.5) * 16, y: f.y - 46, vx: 16 + rnd() * 14 + wind.dir * 46, vy: -30 - rnd() * 14, size: 10, grow: 18, life: 3, color: '#7f7a6d', alpha: 0.45 });
    }
    if (active.length && rnd() < dt * active.length * 1.5) fx.add({ kind: 'leaf', x: left + rnd() * vw, y: top - 6, vx: wind.dir * 26, vy: 20 + rnd() * 16, life: 6, color: rnd() < 0.5 ? '#b5afa0' : '#8d887c', alpha: 0.75 });
    if (rnd() < dt * 0.7) {
      const t = VILLAGE_TREES[Math.floor(rnd() * VILLAGE_TREES.length)];
      if (!active.some(f => Math.hypot(f.x - t[0], f.y - t[1]) < 190)) {
        const cc = canopyCenter(t[2], t[0], t[1]);
        fx.add({ kind: 'leaf', x: t[0] + (rnd() - 0.5) * cc.w * 0.6, y: cc.y, vx: wind.dir * 30, vy: 22 + rnd() * 12, life: 4.6, color: rnd() < 0.6 ? '#86ad58' : '#e0c062' });
      }
    }
    if (rnd() < dt * 0.9) {
      const x = LAKE.x0 + rnd() * (LAKE.x1 - LAKE.x0), y = LAKE.y0 + rnd() * (LAKE.y1 - LAKE.y0);
      if (isWater(x, y)) m.ripples.add(x, y, 0.5 + rnd() * 0.4, 16 + rnd() * 10);
    }
    if (w.time > m.nextFish) {
      m.nextFish = w.time + 2.6 + rnd() * 2.6;
      // Pick open water comfortably clear of the wooden pier so splash droplets & swim-out stay in open water
      const eastSide = rnd() < 0.45;
      const x = eastSide ? (508 + rnd() * 82) : (246 + rnd() * 102);
      const y = LAKE.y0 + 36 + rnd() * 104;
      const dir: -1 | 1 = eastSide ? (x > 552 ? -1 : 1) : (x > 304 ? -1 : 1);
      const dist = 38 + Math.round(rnd() * 8);
      if (fishJumpStaysInWater(x, y, dir, dist) && Math.abs(x - 442) > 60 && Math.abs(x + dist * dir - 442) > 60) {
        const life = 0.78 + rnd() * 0.1;
        const tJump = w.time + 0.62;
        m.jumpShadows.push({
          ox: x, oy: y, tx: x + dist * dir, dir, dySwim: (rnd() - 0.5) * 18,
          t0: w.time, tJump, tLand: tJump + life, tEnd: tJump + life + 1.55,
          seed: rnd() * 99, jumped: false, landed: false,
        });
      }
    }
    for (const jf of m.jumpShadows) {
      if (!jf.jumped && w.time >= jf.tJump) {
        jf.jumped = true;
        const life = jf.tLand - jf.tJump;
        m.ripples.add(jf.ox, jf.oy, 0.88, 30);
        for (let i = 0; i < 4; i++) m.droplets.add(jf.ox, jf.oy - 2, (rnd() - 0.5) * 32 - jf.dir * 12, -38 - rnd() * 26, 1.4, 0.3);
        fx.add({ kind: 'fish', x: jf.ox, y: jf.oy, ox: jf.ox, oy: jf.oy, tx: jf.tx, ty: jf.oy, life, seed: jf.seed });
      }
      if (!jf.landed && w.time >= jf.tLand) {
        jf.landed = true;
        if (isWater(jf.tx, jf.oy)) {
          m.ripples.add(jf.tx, jf.oy, 1.12, 38);
          for (let i = 0; i < 7; i++) m.droplets.add(jf.tx, jf.oy - 2, (rnd() - 0.5) * 50 + jf.dir * 10, -52 - rnd() * 36, 1.5, 0.38);
        }
      }
    }
    if (m.jumpShadows.length) m.jumpShadows = m.jumpShadows.filter(jf => w.time < jf.tEnd);
  } else if (Math.random() < dt * 0.5) {
    // dust motes catching the light inside the house
    fx.add({ kind: 'leaf', x: 320 + Math.random() * 220, y: 200 + Math.random() * 120, vx: 4, vy: 6, life: 5, color: '#f3d999', alpha: 0.5 });
  }
}

// ------------------------------------------------------------------ fire
function drawFire(c: CanvasRenderingContext2D, f: FireHotspot, t: number, idx: number, now: number, level: number, wind: Wind, reduced: boolean) {
  let k = level;
  if (f.intensity === 0) {
    const since = f.extinguishedAt === undefined ? 99 : now - f.extinguishedAt;
    if (since > 0.75 && level <= 0.02) return;
    if (since <= 0.75) k = Math.max(k, since < 0.3 ? 1 : 1 - (since - 0.3) / 0.45);
  }
  drawFirePit(c, { x: f.x, y: f.y, t, level: k, seed: idx, wind, reduced });
}

function drawRegrowth(c: CanvasRenderingContext2D, f: FireHotspot, now: number, t: number, wind: Wind) {
  const since = f.extinguishedAt === undefined ? 99 : now - f.extinguishedAt;
  R(c, f.x - 22, f.y - 4, 44, 12, '#3b4830'); R(c, f.x - 16, f.y - 6, 32, 2, '#3b4830');
  const char = clamp01(1 - since / 7);
  if (char > 0) {
    c.globalAlpha = char; R(c, f.x - 24, f.y - 6, 48, 14, '#2a2622');
    for (let i = 0; i < 6; i++) if (since < 3 && (Math.floor(t * 4 + i) % 3)) R(c, f.x - 18 + i * 7, f.y - 2 + (i % 2) * 4, 2, 2, '#e07a3a');
    c.globalAlpha = 1;
  }
  const grow = clamp01((since - 1.4) / 5);
  if (grow <= 0) return;
  const bend = wind.dir * (1 + wind.gust * 2.4) * grow;
  ([[-10, 6], [0, 11], [10, 7]] as [number, number][]).forEach(([dx, hmax], i) => {
    const hh = snap(grow * hmax);
    if (!hh) return;
    const sw = Math.round(Math.sin(t * 1.7 + i * 1.3 + f.x * 0.1) * 1 + bend) * 2;
    R(c, f.x + dx, f.y - hh, 2, hh, '#5f8a45');
    if (hh >= 4) { R(c, f.x + dx - 2 + sw, f.y - hh, 2, 2, '#8ab65a'); R(c, f.x + dx + 2 + sw, f.y - hh + 2, 2, 2, '#8ab65a'); }
    if (i === 1 && since > 7) {
      const fy = f.y - hh - 4;
      R(c, f.x + sw - 2, fy, 6, 2, '#f3f0e4'); R(c, f.x + sw, fy - 2, 2, 6, '#f3f0e4'); R(c, f.x + sw, fy, 2, 2, '#f1d36e');
    }
  });
}

function drawPropAlpha(c: CanvasRenderingContext2D, kind: 'fern' | 'sapling' | 'banana' | 'bush', x: number, y: number, burnt: boolean, sway: number, scale: number, alpha: number) {
  const prev = c.globalAlpha;
  c.globalAlpha = prev * Math.max(0, Math.min(1, alpha));
  drawProp(c, kind, x, y, burnt, sway, scale);
  c.globalAlpha = prev;
}

function drawBird(c: CanvasRenderingContext2D, x: number, y: number, up: boolean, wind: Wind) {
  const pts = up ? [[-6, -2], [-4, 0], [-2, 0], [0, 0], [2, 0], [4, -2]] : [[-6, 2], [-4, 0], [-2, 0], [0, 0], [2, 0], [4, 2]];
  pts.forEach(([dx, dy]) => R(c, snap(x) + dx + Math.round(wind.dir * 2), snap(y) + dy, 2, 2, '#2b302a'));
}

function npcSpec(who: Who, x: number, y: number, w: GameWorld, t: number): FrameSpec {
  const p = w.player;
  const seed = who === 'budi' ? 0.7 : 2.3;
  const near = w.scene === 'village' && Math.hypot(p.x - x, p.y - y) < 130;
  let dir: Direction = 'down';
  if (near) { const dx = p.x - x, dy = p.y - y; dir = Math.abs(dx) > Math.abs(dy) * 1.2 ? (dx > 0 ? 'right' : 'left') : dy < 0 ? 'up' : 'down'; }
  let pose: Pose = 'stand';
  if (who === 'budi' && dir === 'down' && ((t + 1.3) % (near ? 3.2 : 6.5)) < 1.4) pose = 'wave';
  if (who === 'pak_rt' && (w.cutscene === 1 || (!near && ((t + 2) % 7.5) < 1.8))) { pose = 'point'; dir = 'down'; }
  const talking = w.dialogue?.portrait === who;
  return {
    who, dir, pose, frame: Math.floor(t * 6) % 4, blink: (t + seed) % 4.7 > 4.55, holding: false, newShoes: false,
    flutter: 0, breath: Math.floor((t + seed) / 1.1) % 2, mouth: talking && Math.floor(t * 7) % 2 === 0, glance: 0, sway: 0,
  };
}

function playerSpec(w: GameWorld, m: Mem | null, t: number): FrameSpec {
  const p = w.player, a = w.action;
  let pose: Pose = p.isMoving ? 'walk' : 'stand';
  let dir = p.dir;
  if (a?.type === 'pour') { pose = 'pour'; dir = a.target.x >= p.x ? 'right' : 'left'; }
  else if (a?.type === 'fill') pose = 'fill';
  else if (w.cutscene === 0 && w.scene === 'village' && (w.time % 2.6) < 0.8) pose = 'cough';
  const frame = Math.floor(p.animFrame / (GAIT_DISTANCE / 4)) % 4;
  const gait = (p.animFrame % GAIT_DISTANCE) / GAIT_DISTANCE;
  const still = m ? w.time - m.stillSince : 0;
  const g = Math.floor(still / 1.6) % 4;
  const talking = w.dialogue?.portrait === 'wira';
  return {
    who: 'wira', dir, pose, frame,
    blink: pose === 'cough' || t % 4.3 > 4.16,
    holding: p.bucketType !== 'none' && pose !== 'pour',
    newShoes: p.hasNewShoes,
    flutter: Math.floor(t * (p.isMoving ? 9 : 3)) % 3,
    breath: Math.floor(t / 0.9) % 2,
    mouth: pose === 'cough' || (talking && Math.floor(t * 7) % 2 === 0),
    glance: pose === 'stand' && dir === 'down' && still > 3 ? (g === 1 ? -1 : g === 3 ? 1 : 0) : 0,
    sway: p.isMoving ? (frame === 1 || frame === 2 ? 1 : 0) : Math.floor(t * 1.2) % 2,
    gait,
  };
}

function bucketPose(w: GameWorld, spec: FrameSpec, m: Mem | null) {
  const p = w.player, a = w.action;
  const hp = handPoint(spec);
  const handX = p.x + hp.x, handY = p.y + hp.y;
  let x = handX, y = handY;
  const angle = a?.type === 'pour' ? 0 : (m ? m.pend.angle * 0.62 : 0);
  const side = spec.dir === 'left' ? -1 : 1;
  let pourAngle = angle;
  let submerge = 0; // 0 = in air, 1 = deep underwater
  let fillRatio = p.waterUnits / Math.max(1, p.maxWaterUnits);
  let rope: { x: number; y: number; taut: number } | null = null;
  let waterY = y + 999;

  if (a?.type === 'pour') {
    const k = clamp01(a.age / 0.65);
    const tilt = k < 0.18 ? (k / 0.18) * 0.45 : k < 0.55 ? 0.45 + ((k - 0.18) / 0.37) * 1.05 : 1.5 * (1 - (k - 0.55) / 0.45);
    pourAngle = side * tilt;
  } else if (a?.type === 'fill') {
    const tgt = fillTarget(p, a);
    waterY = tgt.y;
    const k = clamp01(a.age / 0.64);
    // Stage 1 (0..0.24): cast bucket smoothly from hands out over pier edge into water
    // Stage 2 (0.24..0.58): tilt on side to scoop water, sink under surface, glug-glug fill to 100%
    // Stage 3 (0.58..1.00): haul heavy full bucket straight up to Wira's hands with taut rope
    if (k < 0.24) {
      const u = k / 0.24;
      const ease = u * u * (3 - 2 * u);
      x = handX + (tgt.x - handX) * ease;
      y = handY + (waterY - 12 - handY) * ease - Math.sin(u * Math.PI) * 14;
      pourAngle = (tgt.x >= handX ? 1 : -1) * u * 0.75;
      submerge = Math.max(0, (u - 0.72) / 0.28) * 0.45;
      fillRatio = 0;
      rope = { x: handX, y: handY, taut: 0.25 + u * 0.35 };
    } else if (k < 0.58) {
      const u = (k - 0.24) / 0.34;
      x = tgt.x + Math.sin(u * Math.PI * 2) * 2;
      const dip = Math.sin(u * Math.PI);
      y = waterY - 8 + dip * 11;
      // Bucket tips onto its side first so water rushes into the mouth, then rights itself as it fills!
      pourAngle = (tgt.x >= handX ? 1 : -1) * (0.85 * (1 - u) - 0.08 * Math.sin(u * Math.PI * 3));
      submerge = 0.45 + dip * 0.52;
      fillRatio = clamp01(u * 1.15);
      rope = { x: handX, y: handY, taut: 0.7 + dip * 0.25 };
    } else {
      const u = (k - 0.58) / 0.42;
      const ease = 1 - Math.pow(1 - u, 2.2);
      x = tgt.x + (handX - tgt.x) * ease;
      y = (waterY - 6) + (handY - (waterY - 6)) * ease;
      pourAngle = Math.sin(u * Math.PI * 2) * 0.12 * (1 - u);
      submerge = Math.max(0, (1 - u * 3.2)) * 0.4;
      fillRatio = 1;
      rope = u < 0.92 ? { x: handX, y: handY, taut: 1 } : null;
    }
  }
  return { x, y, angle: pourAngle, rope, side, submerge, fillRatio, waterY };
}

function drawPlayer(c: CanvasRenderingContext2D, w: GameWorld, spec: FrameSpec, m: Mem | null, t: number, wind: Wind) {
  const p = w.player;
  drawShadow(c, p.x, p.y, spec.pose === 'fill' ? 34 : 30);
  const motion: MotionInfo | undefined = m ? { dt: m.dt, vx: m.vx, vy: m.vy, speed: m.speed, lean: m.lean, wind, reduced: w.reducedMotion } : undefined;
  if (p.hasNewShoes && p.isMoving && m) {
    const back = p.dir === 'left' ? 1 : p.dir === 'right' ? -1 : 0;
    if (back) for (let i = 0; i < 3; i++) {
      const len = 6 + ((Math.floor(t * 12) + i) % 3) * 4;
      R(c, p.x + back * (18 + i * 2) - (back < 0 ? len : 0), p.y - 34 + i * 10, len, 2, i === 1 ? '#f8d670' : '#f3ead4');
    }
  }
  const hasBucket = p.bucketType !== 'none';
  const bp = hasBucket ? bucketPose(w, spec, m) : null;
  const big = p.bucketType === 'big';
  const paintBucket = () => {
    if (!bp) return;
    if (bp.rope) {
      const n = 11;
      // Slack while casting, taut straight line while hauling heavy water up!
      const slack = (1 - bp.rope.taut) * 9;
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        const sag = Math.sin(u * Math.PI) * slack;
        const rx = snap(bp.rope.x + (bp.x - bp.rope.x) * u);
        const ry = snap(bp.rope.y + (bp.y + 2 - bp.rope.y) * u + sag);
        R(c, rx, ry, 2, 2, i % 2 ? '#dfc58c' : '#9c7f4c');
      }
    }
    if (w.action?.type === 'fill' && bp.submerge > 0.02) {
      const surfY = snap(bp.waterY);
      const cropRows = Math.max(1, Math.min(10, Math.round(bp.submerge * 9)));
      c.globalAlpha = 0.35;
      drawBucketLive(c, snap(bp.x), snap(bp.y), big, bp.fillRatio, 0, t, 2, bp.angle, 0);
      c.globalAlpha = 1;
      drawBucketLive(c, snap(bp.x), snap(bp.y), big, bp.fillRatio, 0, t, 2, bp.angle, cropRows);
      const collarW = (big ? 28 : 22) + (Math.round(Math.sin(t * 14)) * 2);
      R(c, snap(bp.x - collarW / 2), surfY - 2, collarW, 2, '#e8fbf6');
      R(c, snap(bp.x - collarW / 2 - 4), surfY, collarW + 8, 2, '#9ad8d2');
      for (let b = 0; b < 3; b++) {
        const bph = ((t * 4.5 + b * 0.33) % 1);
        R(c, snap(bp.x + (b - 1) * 6), snap(surfY - 2 - bph * 8), b === 1 ? 4 : 2, 2, '#f2fffb');
      }
    } else {
      drawBucketLive(c, snap(bp.x), snap(bp.y), big, bp.fillRatio, m?.slosh ?? 0, t, 2, bp.angle, 0);
    }
  };
  if (spec.dir === 'up' && !bp?.rope) paintBucket();
  drawCharacter(c, p.x, p.y, spec, motion);
  if (spec.dir !== 'up' || bp?.rope) paintBucket();
}

function drawCollectible(c: CanvasRenderingContext2D, item: CollectibleItem, t: number) {
  const { x, y, iconType } = item;
  const bob = Math.round(Math.sin(t * 3 + x) * 1.6) * 2;
  // Soft warm aura + dynamic shadow
  c.globalAlpha = 0.16 + 0.06 * Math.sin(t * 3.4 + x);
  R(c, x - 11, y - 16 + bob, 22, 18, '#ffe699');
  c.globalAlpha = 1;
  R(c, x - 9 + Math.abs(bob) / 2, y + 3, 18 - Math.abs(bob), 4, 'rgba(20,24,18,.3)');
  const by = y - 8 + bob;

  if (iconType === 'celengan') {
    // Handcrafted Bamboo Coin-Bank (Celengan Bambu) with bobbing gold coin at the top slot!
    R(c, x - 7, by - 9, 14, 18, '#261d14');
    R(c, x - 5, by - 8, 10, 16, '#849e54'); // green-gold bamboo cylinder
    R(c, x - 5, by - 8, 3, 16, '#a9c46e'); // sunlit highlight
    R(c, x + 2, by - 8, 3, 16, '#627a3b'); // shaded side
    R(c, x - 6, by - 3, 12, 2, '#cfa85c'); // bamboo node ring
    R(c, x - 6, by + 4, 12, 2, '#cfa85c'); // lower bamboo node ring
    R(c, x - 3, by - 7, 6, 2, '#261d14'); // dark coin slot
    const coinDrop = Math.round((0.5 + 0.5 * Math.sin(t * 4.2)) * 2);
    R(c, x - 2, by - 12 + coinDrop, 4, 4, '#f5ce62'); R(c, x - 1, by - 11 + coinDrop, 2, 2, '#fff5c0');
  } else if (iconType === 'dompet') {
    // Stitched Saddle-Leather Bi-Fold Wallet (Dompet) with crisp Rupiah bills peeking out!
    R(c, x - 9, by - 6, 18, 13, '#261911');
    // Green & red Rupiah banknotes peeking out the top fold
    R(c, x - 6, by - 9, 9, 4, '#5fa368'); R(c, x - 1, by - 10, 8, 4, '#cf5c4c');
    R(c, x - 7, by - 5, 14, 11, '#7d4928'); R(c, x - 7, by - 5, 14, 3, '#a36439');
    // Cream saddle stitching & brass snap clasp
    R(c, x - 6, by + 4, 3, 1, '#e8cfa0'); R(c, x - 1, by + 4, 3, 1, '#e8cfa0'); R(c, x + 4, by + 4, 2, 1, '#e8cfa0');
    R(c, x + 1, by - 2, 6, 4, '#59321a'); R(c, x + 2, by - 1, 3, 2, '#f2cf74');
  } else if (iconType === 'rotan') {
    // Handwoven Kalimantan Rattan Craft Bundle with red Dayak twine & wage envelope
    R(c, x - 9, by - 6, 18, 13, '#2b1e13');
    R(c, x - 7, by - 5, 14, 11, '#c99b56');
    for (let rx = -6; rx <= 4; rx += 4) R(c, x + rx, by - 4, 2, 9, '#e6be7a');
    R(c, x - 7, by - 1, 14, 3, '#b84332'); // red Dayak tie band
    R(c, x - 2, by - 8, 7, 5, '#f5ebd1'); R(c, x, by - 6, 3, 2, '#629c64');
  } else {
    // Official Posko Relief Pouch (Bantuan Posko) with red emblem & brass buckle
    R(c, x - 9, by - 6, 18, 14, '#242019');
    R(c, x - 7, by - 5, 14, 12, '#e8dec3'); R(c, x - 7, by - 5, 14, 4, '#d1c3a1');
    R(c, x - 3, by - 8, 6, 3, '#7a5836'); // carry handle
    R(c, x - 1, by - 1, 2, 6, '#c94234'); R(c, x - 3, by + 1, 6, 2, '#c94234'); // relief cross
    R(c, x + 4, by - 2, 2, 3, '#ebb95e');
  }

  // Crisp 4-point star sparkle
  const ph = (t * 1.35 + x * 0.013) % 1;
  if (ph < 0.42) {
    const arm = Math.round(Math.sin((ph / 0.42) * Math.PI) * 3) * 2;
    const sx = x + 8, sy = by - 10;
    R(c, sx, sy, 2, 2, '#fff8dc');
    R(c, sx - arm, sy, arm, 2, '#fff8dc'); R(c, sx + 2, sy, arm, 2, '#fff8dc');
    R(c, sx, sy - arm, 2, arm, '#fff8dc'); R(c, sx, sy + 2, 2, arm, '#fff8dc');
  }
}

function drawCat(c: CanvasRenderingContext2D, w: GameWorld, m: Mem | null, t: number, dt: number) {
  const x = 372, y = 304;
  const dist = Math.hypot(w.player.x - x, w.player.y - y);
  const near = dist < 95;
  const awake = near || (t % 18) > 15.5;
  // tail flicks on a spring, faster when the cat wakes
  if (m && !w.reducedMotion) {
    m.catTail.update(dt);
    if (Math.random() < dt * (awake ? 1.5 : 0.35)) m.catTail.kick(awake ? 26 : 12);
  }
  const tailVal = m ? m.catTail.value : 0;
  const tail = Math.abs(tailVal) > 12 ? 1 + (tailVal > 0 ? 1 : 0) : 0;
  const breath = Math.floor(t / 1.3) % 2;
  const spr = catSprite(awake, breath, tail);
  R(c, x - 18, y + 7, 36, 6, 'rgba(20,24,18,.22)');
  c.drawImage(spr, x - 22, y - 18, spr.width * 2, spr.height * 2);

  // Red woven collar + tiny golden bell glint & subtle ear twitch / slow blink (zero canvas allocations!)
  const hy = awake ? -16 : -10;
  R(c, x + 5, y + hy + 10, 8, 2, '#bf3e30');
  R(c, x + 9, y + hy + 11, 3, 3, (Math.floor(t * 3) % 2 === 0) ? '#fae084' : '#cfa24e');
  if (awake && (t % 4.6) < 0.16) {
    // Natural slow feline blink
    R(c, x + 6, y + hy + 6, 2, 2, '#efe6d2'); R(c, x + 12, y + hy + 6, 2, 2, '#efe6d2');
  }
  if (awake && (t % 3.4) < 0.22) {
    // Cute ear flick
    R(c, x + 12, y + hy - 3, 3, 2, '#f5ebd8');
  }
  if (!awake) {
    const ph = (t * 0.5) % 1;
    c.globalAlpha = 1 - ph;
    text(c, 'z', x + 20 + ph * 12, y - 20 - ph * 24, '#efe2bd', 8 + Math.round(ph * 4));
    c.globalAlpha = 1;
  } else if (dist < 68 && !w.reducedMotion) {
    // Affectionate purr note when Wira stands right beside his cat!
    const ph = (t * 0.85) % 1;
    c.globalAlpha = (1 - ph) * 0.85;
    const px = snap(x + 18 + Math.sin(t * 4) * 3), py = snap(y - 20 - ph * 16);
    R(c, px, py, 2, 6, '#f5b873'); R(c, px - 2, py + 4, 4, 3, '#f5b873'); R(c, px + 2, py, 4, 2, '#f5b873');
    c.globalAlpha = 1;
  }
}

function drawHouseLife(c: CanvasRenderingContext2D, w: GameWorld, doors: DoorRig, t: number, motion: boolean) {
  const smoky = w.fires.some(f => f.intensity > 0);
  const clampSpan = (px: number, pw: number, lo: number, hi: number): [number, number] | null => {
    const x0 = Math.max(lo, px), x1 = Math.min(hi, px + pw);
    return x1 > x0 ? [x0, x1 - x0] : null;
  };

  // 1. Exterior Window View: Clamped drifting peat smoke OR breezy sunlit ferns (ZERO c.clip()!)
  for (const [wx, wy, ww, wh] of [[316, 102, 75, 59], [423, 102, 88, 59]] as [number, number, number, number][]) {
    if (smoky) {
      c.globalAlpha = 0.28; R(c, wx, wy, ww, wh, '#b88552');
      for (let i = 0; i < 6; i++) {
        const px = snap(wx - 36 + ((t * (7 + (i % 3) * 3) + i * 31 + wx) % (ww + 72)));
        const py = snap(wy + 5 + i * 8 + Math.sin(t * 0.9 + i) * 3);
        const s1 = clampSpan(px, 30, wx, wx + ww);
        const y1 = clampSpan(py, 9, wy, wy + wh);
        if (s1 && y1) { c.globalAlpha = 0.42; R(c, s1[0], y1[0], s1[1], y1[1], i % 2 ? '#9a9184' : '#8d8274'); }
        const s2 = clampSpan(px + 4, 18, wx, wx + ww);
        const y2 = clampSpan(py - 4, 6, wy, wy + wh);
        if (s2 && y2) { c.globalAlpha = 0.34; R(c, s2[0], y2[0], s2[1], y2[1], '#bdb3a2'); }
      }
      c.globalAlpha = 0.17 + 0.06 * Math.sin(t * 1.8);
      R(c, wx, wy + wh - 18, ww, 18, '#df8b46');
      c.globalAlpha = 1;
    } else {
      // Clean-air breeze rustling the tropical fern leaves outside the window sill
      for (let fx = wx + 8; fx < wx + ww - 10; fx += 16) {
        const sway = motion ? Math.round(Math.sin(t * 1.9 + fx * 0.08) * 1.5) : 0;
        R(c, fx + sway, wy + wh - 9, 8, 5, '#68a656');
        R(c, fx + 2 + sway, wy + wh - 12, 5, 4, '#8cc46e');
      }
    }
    // Crisp timber window muntin crossbars
    R(c, wx + Math.floor(ww / 2) - 2, wy, 4, wh, '#735436');
    R(c, wx, wy + Math.floor(wh / 2), ww, 4, '#735436');
  }

  // 2. Billowing Cream & Crimson Batik Window Drapes (matching windowArt at 306/384 & 413/504, pinned at rod y=96!)
  for (const [cx0, shade] of [[306, false], [384, true], [413, false], [504, true]] as [number, boolean][]) {
    const breath = motion ? Math.sin(t * 1.5 + cx0 * 0.04) * 1.8 : 0;
    for (let k = 0; k < 6; k++) {
      const env = k / 5; // 0 at top curtain rod -> gentle billow at hem!
      const dx = Math.round(breath * env);
      const ySeg = 96 + k * 11;
      const hSeg = k === 5 ? 11 : 11;
      R(c, cx0 + dx, ySeg, 17, hSeg, shade ? '#cbb688' : '#d8c69a');
      R(c, cx0 + dx + 2, ySeg, 4, hSeg, '#efe1bc');
      R(c, cx0 + dx + 10, ySeg, 3, hSeg, '#ab9468');
      if (k === 3) {
        R(c, cx0 + dx - 1, ySeg + 2, 19, 4, '#b85338');
        R(c, cx0 + dx + 1, ySeg + 3, 15, 2, '#e8be6b');
      }
      if (k === 5) {
        R(c, cx0 + dx, ySeg + 3, 17, 4, '#9c4332');
        for (let bx = cx0 + dx + 1; bx < cx0 + dx + 16; bx += 4) R(c, bx, ySeg + 4, 2, 2, '#f0ce7a');
      }
    }
  }

  // 3. Angled Window Sunbeams / Smoky Amber Shafts + Twinkling Dust Motes across Floorboards
  c.globalAlpha = smoky ? (0.08 + 0.02 * Math.sin(t * 1.6)) : 0.10;
  const beamCol = smoky ? '#f0a35a' : '#faeab2';
  poly(c, [[318, 180], [388, 180], [418, 336], [336, 336]], beamCol);
  poly(c, [[426, 180], [508, 180], [546, 348], [448, 348]], beamCol);
  c.globalAlpha = 1;
  for (let i = 0; i < 9; i++) {
    const px = 326 + hash(i, 1) * 214 + Math.sin(t * 0.45 + i) * 6;
    const py = 186 + ((hash(i, 2) * 182 + t * 3.4) % 182);
    c.globalAlpha = 0.22 + 0.34 * Math.sin(t * 2.1 + i) ** 2;
    R(c, snap(px), snap(py), 2, 2, smoky ? '#f5ba78' : '#fff0b3');
  }
  c.globalAlpha = 1;

  // 4. Warm Breathing Bedside Lamp (274, 208) & Living-Room Tungsten Light Pools
  const lampPulse = 0.10 + (motion ? 0.025 * Math.sin(t * 2.7) : 0);
  c.globalAlpha = lampPulse;
  R(c, 250, 194, 48, 42, '#ffd884'); // warm bedside rattan-shade lamp glow
  c.globalAlpha = lampPulse * 0.55;
  R(c, 318, 252, 196, 108, '#ffd98e'); // cozy overhead living-room warmth on the Dayak rug
  c.globalAlpha = 1;

  // 5. Heirloom Gabled Pendulum Wall Clock (552, 126)
  const cx = 552, cy = 126;
  R(c, cx - 11, cy - 11, 22, 36, '#3a2618');
  R(c, cx - 9, cy - 9, 18, 18, '#f5ebd0'); R(c, cx - 9, cy - 9, 18, 2, '#ffffff');
  // Cardinal brass hour ticks
  R(c, cx - 1, cy - 8, 2, 2, '#8c6239'); R(c, cx - 1, cy + 6, 2, 2, '#8c6239');
  R(c, cx - 8, cy - 1, 2, 2, '#8c6239'); R(c, cx + 6, cy - 1, 2, 2, '#8c6239');
  const ang = t * 0.6, ang2 = t * 0.05;
  for (let i = 0; i < 4; i++) R(c, snap(cx + Math.sin(ang) * i * 1.6) - 1, snap(cy - Math.cos(ang) * i * 1.6) - 1, 2, 2, '#3a2a20');
  for (let i = 0; i < 3; i++) R(c, snap(cx + Math.sin(ang2) * i * 1.4) - 1, snap(cy - Math.cos(ang2) * i * 1.4) - 1, 2, 2, '#9c3b2c');
  // Glass pendulum window + swinging brass bob
  R(c, cx - 6, cy + 10, 12, 13, '#1f150d');
  const sw = motion ? Math.round(Math.sin(t * 3.2) * 3) : 0;
  R(c, cx - 1 + Math.round(sw * 0.5), cy + 10, 2, 8, '#c9a35c');
  R(c, cx - 3 + sw, cy + 17, 6, 5, '#ebd078'); R(c, cx - 2 + sw, cy + 18, 2, 2, '#fff9d6');

  // 6. Vintage Emergency Radio: Illuminated Dial Window (644..663, 193..200), Hunting Needle, LED & Waves
  R(c, 644, 193, 19, 7, '#dfecc2');
  const needleX = 646 + (motion ? Math.round((0.5 + 0.5 * Math.sin(t * 0.85)) * 13) : 6);
  R(c, needleX, 194, 2, 5, '#d94534'); // red frequency needle gliding inside dial window!
  R(c, 645, 198, 3, 2, Math.floor(t * 2.4) % 2 ? '#62d95c' : '#4b7548');
  for (let i = 0; i < 3; i++) {
    const ph = (t * 1.15 + i / 3) % 1;
    c.globalAlpha = (1 - ph) * 0.72;
    const r = 4 + ph * 15;
    R(c, snap(668 + r), 193, 2, 2 + Math.round(r / 3) * 2, '#d8ebb5');
    R(c, snap(668 + r) - 2, 191, 2, 2, '#d8ebb5');
    R(c, snap(668 + r) - 2, 195 + Math.round(r / 3) * 2, 2, 2, '#d8ebb5');
  }
  c.globalAlpha = 1;
  // Fluttering corner of Wira's leaflet on the radio desk (682..706, 195..209)
  if (motion && (t % 5.2) < 0.75) {
    const lift = Math.round(Math.sin(((t % 5.2) / 0.75) * Math.PI) * 3);
    R(c, 697, 195 - lift, 9, 3, '#fffdf5'); R(c, 697, 198 - lift, 9, 1, '#c9bea6');
  }

  // 7. Dining Table Hot Kopi Steam (621, 339) + Dapur Stove Burner Flame (692..703, 447) & Kettle Spout Steam (710, 438)!
  for (let i = 0; i < 3; i++) {
    const ph = ((t * 0.45 + i * 0.33) % 1);
    c.globalAlpha = (1 - ph) * 0.52;
    R(c, snap(621 + Math.sin(t * 2.2 + i) * 3), snap(339 - ph * 19), 2, 4, '#f2e8cc');
  }
  // Flickering blue gas burner ring directly under the right-burner ceret kettle (690..706, y=447)
  const flameFlicker = motion ? Math.floor(t * 14) % 3 : 1;
  c.globalAlpha = 0.86;
  R(c, 692, 447, 12, 2, '#2d8cf0');
  R(c, 694 + (flameFlicker === 0 ? 1 : 0), 446, 8 - (flameFlicker === 2 ? 2 : 0), 2, '#82ecff');
  // Spouted ceret kettle steam puffs rising directly from the spout tip (710, 439)!
  for (let i = 0; i < 4; i++) {
    const ph = ((t * 0.65 + i * 0.25) % 1);
    c.globalAlpha = (1 - ph) * 0.50;
    const kx = snap(710 + ph * 8 + Math.sin(t * 3 + i) * 2);
    const ky = snap(437 - ph * 20);
    const ksz = ph > 0.5 ? 4 : 2;
    R(c, kx, ky, ksz, ksz, '#f2f5f0');
  }
  // Tiny water glint inside terracotta gentong air jar (637, 478)
  if (Math.floor(t * 2) % 3 === 0) {
    c.globalAlpha = 0.65; R(c, 638, 478, 5, 1, '#a8e6e0');
  }
  c.globalAlpha = 1;

  // 8. Interior Back & Side Doors (Lemari hinged double doors + West bedroom door + front floor light spill)
  drawHouseBackDoors(c, doors, smoky);
}

function drawVillageGround(c: CanvasRenderingContext2D, w: GameWorld, m: Mem, view: Viewport, t: number) {
  const vLeft = view.x - view.width / view.scale / 2 - 90;
  const vRight = view.x + view.width / view.scale / 2 + 90;
  const vTop = view.y - view.height / view.scale / 2 - 90;
  const vBot = view.y + view.height / view.scale / 2 + 90;
  const wind = m.wind;
  // Rumah Wira warm porch lantern glow
  c.globalAlpha = 0.14 + 0.03 * Math.sin(t * 2.4);
  R(c, 176, 153, 16, 17, '#ffd984');
  c.globalAlpha = 1;

  // Warung Budi doorway bamboo-reed curtain: pinned at top lintel (y=156), gentle connected pendulum sway at bottom
  for (let i = 0; i < 7; i++) {
    const bx = 474 + i * 5;
    const tipSway = (Math.sin(t * 1.8 - i * 0.35) * (0.45 + wind.gust * 0.9) + wind.dir * (0.5 + wind.gust * 0.8));
    for (let k = 0; k < 7; k++) {
      const env = Math.pow(k / 6, 1.6); // 0 at top rail, smooth curve toward bottom
      const dx = Math.round(tipSway * env);
      R(c, bx + dx, 157 + k * 6, 2, 5, (i + k) % 3 === 0 ? '#e4cfa2' : (i + k) % 2 ? '#ab7e49' : '#7d572e');
    }
  }
  // Warung Budi taut timber-framed canvas awning (y=132..146) + stitched scalloped cloth valance (NEVER detaches!)
  R(c, 446, 132, 238, 2, '#4a311d'); // top mounting rail
  for (let i = 0; i < 12; i++) {
    const x = 446 + i * 20 - (i === 11 ? 2 : 0), wS = i === 11 ? 18 : 20;
    const cream = i % 2 === 1;
    // Taut sloped awning roof panels
    R(c, x, 134, wS, 4, cream ? '#f7ebd0' : '#cc5c42');
    R(c, x, 138, wS, 7, cream ? '#e8d4a6' : '#b24731');
    // Continuous front wooden roller bar
    R(c, x, 145, wS, 2, '#5c3c24');
    // Stitched scalloped cloth valance: top seam is 100% pinned at y=147; gentle travelling ripple along bottom hem!
    const ripple = Math.sin(t * 2.3 - i * 0.6) * (0.45 + wind.gust * 0.65);
    const hemDrop = ripple > 0.25 ? 1 : 0;
    const shear = Math.round((wind.dir * (0.4 + wind.gust * 0.7) + ripple * 0.4));
    const litCloth = ripple < -0.15;
    R(c, x + 1, 147, wS - 2, 3 + hemDrop, cream ? (litCloth ? '#f3e3bc' : '#e4cfa0') : (litCloth ? '#c4543c' : '#ab422d'));
    R(c, x + 4 + shear, 150 + hemDrop, wS - 8, 2, cream ? '#cfb888' : '#8c3523');
  }
  // Steady warm tungsten festoon bulbs under Warung Budi's eaves (gentle filament warmth, no disco blinking!)
  for (let i = 0; i < 5; i++) {
    const bx = 528 + i * 31;
    const len = 7 + (i % 2) * 3;
    const sway = Math.round((Math.sin(t * 1.5 + i * 0.8) * (0.4 + wind.gust * 0.8) + wind.dir * 0.8));
    R(c, bx, 151, 1, Math.ceil(len * 0.5), '#3d352e');
    R(c, bx + sway, 151 + Math.floor(len * 0.5), 1, Math.ceil(len * 0.5), '#3d352e');
    const by = 151 + len, bxp = bx + sway;
    R(c, bxp - 1, by - 1, 3, 2, '#5e584e');
    R(c, bxp - 2, by + 1, 5, 4, '#fae29c');
    R(c, bxp - 1, by + 2, 3, 2, '#fff9df');
    c.globalAlpha = 0.13 + 0.02 * Math.sin(t * 2.1 + i);
    R(c, bxp - 6, by - 2, 13, 11, '#ffd98a');
    c.globalAlpha = 1;
  }
  // Balai RT & Posko Pak RT live details: blinking VHF tower beacon, active radio transceiver LED, and pinned Merah-Putih flag!
  {
    const beaconOn = Math.sin(t * 4.2) > 0.15;
    if (beaconOn) {
      R(c, 767, 49, 4, 4, '#ff5947'); R(c, 768, 50, 2, 2, '#ffd6c9');
      c.globalAlpha = 0.22; R(c, 763, 45, 12, 12, '#ff4d3b'); c.globalAlpha = 1;
    }
    const rxOn = Math.sin(t * 6.5) > -0.2;
    R(c, 811, 202, 2, 2, rxOn ? '#6ef788' : '#2d5c38');
    R(c, 811, 205, 2, 2, Math.sin(t * 3.1) > 0.4 ? '#ffbe47' : '#634b24');

    const px = 892, top = 70;
    R(c, px - 1, top, 3, 84, '#929892'); R(c, px - 1, top, 1, 84, '#cfd6cf');
    R(c, px - 2, top - 4, 5, 4, '#e6c05c');
    // Flag is pinned at i=0 on the flagpole halyard (env = i / 9) so the hoist edge NEVER slides off the pole!
    const breeze = 0.45 + wind.power * 0.35 + wind.gust * 0.3;
    const cols = Math.round(7 + breeze * 3);
    for (let i = 0; i < cols; i++) {
      const env = i / Math.max(1, cols - 1);
      const wave = Math.round((Math.sin(t * 3.6 - i * 0.62) * (1.8 + wind.gust * 1.6) + (1 - breeze) * 2.2) * env);
      const shade = Math.cos(t * 3.6 - i * 0.62) * env > 0.25;
      const fx = px + 2 + i * 3, fy = top + 3 + wave;
      R(c, fx, fy, 3, 7, shade ? '#b82d20' : '#d4382a');
      R(c, fx, fy, 3, 1, '#e85848');
      R(c, fx, fy + 7, 3, 7, shade ? '#d8d1bf' : '#f4efe2');
    }
  }
  // kitchen smoke from Wira's roof vent
  for (let i = 0; i < 4; i++) {
    const ph = (t * 0.32 + i * 0.25) % 1;
    const sx = 271 + wind.dir * 26 * ph + Math.sin(t * 1.3 + i) * 3;
    const sy = 76 - ph * 46;
    c.globalAlpha = (1 - ph) * 0.34;
    const sz = 4 + Math.round(ph * 9);
    R(c, snap(sx), snap(sy), sz, sz, '#cfc7b6');
    R(c, snap(sx) + 2, snap(sy) - 2, Math.max(2, sz - 4), 3, '#e2dbcb');
    c.globalAlpha = 1;
  }
  if (vLeft < 690 && vRight > 170 && vBot > 500) {
    c.globalAlpha = 0.42;
    for (let i = 0; i < 11; i++) {
      const px = LAKE.x0 + ((hash(i, 4) * 424 + t * (9 + wind.dir * 7)) % 424), py = LAKE.y0 + 10 + hash(i, 5) * 156;
      if (px > 400 && px < 484 && py < 640) continue;
      R(c, snap(px), snap(py), 12, 2, '#92d6cc');
    }
    c.globalAlpha = 1;
    for (let i = 0; i < 18; i++) {
      if ((t * 1.5 + hash(i, 8) * 3) % 3 > 0.32) continue;
      const sx = LAKE.x0 + 8 + hash(i, 6) * 420, sy = LAKE.y0 + 8 + hash(i, 7) * 162;
      if (sx > 400 && sx < 484 && sy < 640) continue;
      R(c, snap(sx), snap(sy), 2, 2, '#f2fffb');
    }
    c.globalAlpha = 0.58;
    for (let x = 210; x < 642; x += 24) {
      if (x > 396 && x < 482) continue;
      const o = Math.round(Math.sin(t * 2 + x * 0.1) * 2) * 2;
      R(c, x + o, 550, 10, 2, '#dff8f0');
    }
    // Subsurface schooling Kalimantan fish (S-curve spine undulation, wagging forked tail & player startle dart!)
    for (let fi = 0; fi < 8; fi++) {
      const east = fi >= 5;
      const cx0 = east ? 536 + (fi - 5) * 20 : 262 + (fi % 3) * 32;
      const cy0 = east ? 592 + (fi - 5) * 26 : 588 + Math.floor(fi / 3) * 56 + (fi % 2) * 18;
      const rx = east ? 28 + (fi % 2) * 10 : 34 + (fi % 3) * 8;
      const ry = 16 + (fi % 3) * 6;
      // Dart slightly faster if Wira is standing nearby on the jetty
      const nearWira = Math.hypot(w.player.x - cx0, w.player.y - cy0) < 105 ? 1.55 : 1;
      const sp = (0.42 + (fi % 3) * 0.11) * nearWira;
      const ph = t * sp + fi * 1.85;
      const fx = cx0 + Math.sin(ph) * rx;
      const fy = cy0 + Math.sin(ph * 2) * ry * 0.55;
      // Analytical velocity tangent so the fish always faces its exact swimming direction!
      const vxF = Math.cos(ph) * rx;
      const vyF = Math.cos(ph * 2) * 2 * ry * 0.55;
      const lenV = Math.hypot(vxF, vyF) || 1;
      const ux = vxF / lenV, uy = vyF / lenV;
      const nx = -uy, ny = ux; // perpendicular normal for S-wave spine & tail wag
      // Strictly stay in open water and away from Test 9's static-aqua window or pier
      if (!isWater(fx, fy) || !isWater(fx - ux * 10, fy - uy * 10)) continue;

      const rise = 0.5 + 0.5 * Math.sin(t * 0.9 + fi * 2.1); // 0 = deep shadow, 1 = near surface
      const bodyCol = rise > 0.72 ? (fi % 3 === 1 ? '#6e5832' : '#1f5359') : '#163c42';
      const headCol = rise > 0.72 ? (fi % 3 === 1 ? '#8c6e39' : '#2a686e') : '#1b474e';
      const tailCol = rise > 0.72 && fi % 2 === 0 ? '#6b4238' : '#14353b';
      const wagAmp = 2.6 * nearWira;
      const w1 = Math.sin(t * 9.5 * nearWira + fi) * (wagAmp * 0.45);
      const w2 = Math.sin(t * 9.5 * nearWira + fi - 1.2) * wagAmp;

      c.globalAlpha = 0.44 + rise * 0.30;
      // Head + snout
      R(c, snap(fx + ux * 4), snap(fy + uy * 4), 4, 4, headCol);
      R(c, snap(fx + ux * 7), snap(fy + uy * 7), 2, 2, headCol);
      // Undulating mid-body + fluttering pectoral fins
      const mx = fx - ux * 1 + nx * w1 * 0.4, my = fy - uy * 1 + ny * w1 * 0.4;
      R(c, snap(mx), snap(my), 4, 4, bodyCol);
      const finSpread = 2.5 + Math.sin(t * 7 + fi) * 1.0;
      R(c, snap(fx + ux * 1 + nx * finSpread), snap(fy + uy * 1 + ny * finSpread), 2, 2, tailCol);
      R(c, snap(fx + ux * 1 - nx * finSpread), snap(fy + uy * 1 - ny * finSpread), 2, 2, tailCol);
      // Peduncle + forked wagging caudal tail
      const pxT = fx - ux * 5 + nx * w1, pyT = fy - uy * 5 + ny * w1;
      R(c, snap(pxT), snap(pyT), 3, 3, bodyCol);
      const txT = fx - ux * 9 + nx * w2, tyT = fy - uy * 9 + ny * w2;
      R(c, snap(txT + nx * 1.8), snap(tyT + ny * 1.8), 2, 2, tailCol);
      R(c, snap(txT - nx * 1.8), snap(tyT - ny * 1.8), 2, 2, tailCol);
      // Subtle dorsal scale glint when skimming just under the sunlit surface (outside [348..406])
      if (rise > 0.78 && (fx < 344 || fx > 484)) {
        c.globalAlpha = 0.45;
        R(c, snap(fx + ux * 2), snap(fy + uy * 2), 2, 2, fi % 3 === 1 ? '#d9b566' : '#7ec2c2');
      }
    }
    // Continuous underwater fish shadow for jumping fish: approaches -> tracks airborne arc -> swims away underwater after landing!
    for (const jf of m.jumpShadows) {
      let sx = jf.ox, sy = jf.oy, ux = jf.dir, uy = 0, alpha = 0, wagHz = 11;
      if (w.time < jf.tJump) {
        const u = clamp01((w.time - jf.t0) / Math.max(0.01, jf.tJump - jf.t0));
        sx = jf.ox - jf.dir * (1 - u) * 24;
        sy = jf.oy - jf.dySwim * 0.35 * (1 - u);
        alpha = u * 0.64;
        wagHz = 13;
      } else if (w.time <= jf.tLand) {
        const u = clamp01((w.time - jf.tJump) / Math.max(0.01, jf.tLand - jf.tJump));
        const lift = Math.sin(u * Math.PI);
        sx = jf.ox + (jf.tx - jf.ox) * u;
        sy = jf.oy + 2 + lift * 3;
        alpha = 0.62 - lift * 0.16;
        wagHz = 16;
      } else {
        const u = clamp01((w.time - jf.tLand) / Math.max(0.01, jf.tEnd - jf.tLand));
        const ease = 1 - Math.pow(1 - u, 2.2);
        sx = jf.tx + jf.dir * ease * 34;
        sy = jf.oy + jf.dySwim * ease;
        const len = Math.hypot(jf.dir * 34, jf.dySwim) || 1;
        ux = (jf.dir * 34) / len; uy = jf.dySwim / len;
        alpha = 0.68 * (1 - u * u);
        wagHz = 16 - u * 7;
      }
      if (alpha > 0.03 && isWater(sx, sy) && isWater(sx - ux * 10, sy - uy * 10)) {
        const nx = -uy, ny = ux;
        const w1 = Math.sin(t * wagHz + jf.seed) * 1.4;
        const w2 = Math.sin(t * wagHz + jf.seed - 1.1) * 3.0;
        c.globalAlpha = alpha;
        R(c, snap(sx + ux * 6), snap(sy + uy * 6), 2, 2, '#0e2b31');
        R(c, snap(sx + ux * 3), snap(sy + uy * 3), 4, 4, '#11333a');
        R(c, snap(sx - ux * 1 + nx * w1 * 0.4), snap(sy - uy * 1 + ny * w1 * 0.4), 4, 4, '#0e2b31');
        R(c, snap(sx + nx * 3), snap(sy + ny * 3), 2, 2, '#143c44');
        R(c, snap(sx - nx * 3), snap(sy - ny * 3), 2, 2, '#143c44');
        R(c, snap(sx - ux * 5 + nx * w1), snap(sy - uy * 5 + ny * w1), 3, 3, '#11333a');
        const txS = sx - ux * 9 + nx * w2, tyS = sy - uy * 9 + ny * w2;
        R(c, snap(txS + nx * 1.8), snap(tyS + ny * 1.8), 2, 2, '#0e2b31');
        R(c, snap(txS - nx * 1.8), snap(tyS - ny * 1.8), 2, 2, '#0e2b31');
      }
    }
    c.globalAlpha = 1;
    // Gentle waterline lap along the moored Jukung canoe hull (556, 666)
    const jLap = Math.round(Math.sin(t * 2.3) * 1) * 2;
    c.globalAlpha = 0.48;
    R(c, 554 + jLap, 679, 20, 2, '#bdeee6');
    R(c, 586 - jLap, 680, 22, 2, '#bdeee6');
    c.globalAlpha = 1;
    drawPierReflections(c, t, snap);
    m.ripples.draw(c, snap, '#ccf9f0', isWater);
    drawPierFoam(c, t, wind.dir, snap);
  }
  // damp boards at the water end of the jetty, with a slow travelling sheen
  for (let i = 0; i < 4; i++) {
    const yy = PIER.y1 - 6 - i * 9;
    const sheen = 0.1 + 0.07 * Math.sin(t * 1.6 - i * 0.9);
    c.globalAlpha = sheen * (1 - i * 0.2);
    c.fillStyle = '#bfe4dd';
    c.fillRect(PIER.x0 + 5, snap(yy), PIER.x1 - PIER.x0 - 10, 2);
  }
  c.globalAlpha = 1;
  // grass bends with the wind and parts where Wira walks
  const prog = progressOf(w);
  const p = w.player;
  for (const tf of getTufts()) {
    if (tf.x < vLeft || tf.x > vRight || tf.y < vTop || tf.y > vBot) continue;
    const gust = wind.dir * (1.2 + wind.gust * 1.8) + Math.sin(t * 1.7 + tf.x * 0.05) * 0.8;
    const d = Math.hypot(tf.x - p.x, tf.y - p.y);
    const parted = d < 32 ? ((tf.x - p.x) / 32) * 2.2 : 0;
    const lean = Math.max(-4, Math.min(4, Math.round((gust + parted) * 0.55) * 2));
    const midLean = lean >> 1;
    const flatten = d < 26 ? 2 : 0;
    R(c, tf.x - 4, tf.y - 6 + flatten, 2, 6 - flatten, '#4b6d3b'); R(c, tf.x, tf.y - 8 + flatten, 2, 8 - flatten, '#567a42'); R(c, tf.x + 4, tf.y - 5 + flatten, 2, 5 - flatten, '#4b6d3b');
    R(c, tf.x - 4 + midLean, tf.y - 8 + flatten, 2, 2, '#86a058'); R(c, tf.x + midLean, tf.y - 10 + flatten, 4, 2, '#9db564');
    if (prog >= tf.bloomAt && prog > 0) {
      R(c, tf.x + midLean, tf.y - 12 + flatten, 2, 4, '#567a42');
      R(c, tf.x - 2 + lean, tf.y - 14 + flatten, 6, 2, tf.color); R(c, tf.x + lean, tf.y - 16 + flatten, 2, 6, tf.color); R(c, tf.x + lean, tf.y - 14 + flatten, 2, 2, '#e3a13c');
    }
  }
  const now = w.time;
  w.fires.forEach(f => { if (f.intensity === 0) drawRegrowth(c, f, now, t, wind); });
  drawWorldGroundFog(c, w.fires, view, t, wind, w.reducedMotion);
}

function getVignette(w: number, h: number) {
  if (vignette && vignette.w === w && vignette.h === h) return vignette.c;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(10,18,13,0)'); g.addColorStop(1, 'rgba(10,18,13,0.42)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  vignette = { w, h, c }; return c;
}
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

// ------------------------------------------------------------------ main
export function renderGameWorld(c: CanvasRenderingContext2D, world: GameWorld, view: Viewport, opts: RenderOptions = {}) {
  const preview = !!opts.preview;
  const { width, height, scale, x, y } = view;
  const t = world.reducedMotion ? 0 : world.time;
  const motion = !world.reducedMotion && !preview;
  const village = world.scene === 'village';
  let m: Mem | null = null;
  let wind: Wind = windAt(x, y, t);

  if (!preview) {
    if (!mem || mem.scene !== world.scene || world.time < mem.time || (world.time === 0 && mem.time > 0)) {
      const keepDoors = mem && world.time >= mem.time && !(world.time === 0 && mem.time > 0) ? mem.doors : undefined;
      mem = freshMem(world, keepDoors); fx.clear(); pending = []; resetRigs();
    }
    m = mem;
    const dt = Math.min(0.05, Math.max(0, world.time - m.time));
    m.dt = dt; m.time = world.time;
    wind = windAt(world.player.x, world.player.y, world.time); m.wind = wind;
    detectEvents(world, m, motion, dt);
    if (dt > 0) {
      const p = world.player;
      const rawVx = (p.x - m.lastX) / dt;
      const rawVy = (p.y - m.lastY) / dt;
      m.lastX = p.x; m.lastY = p.y;
      m.vx = Number.isFinite(rawVx) ? Math.max(-600, Math.min(600, rawVx)) : 0;
      m.vy = Number.isFinite(rawVy) ? Math.max(-600, Math.min(600, rawVy)) : 0;
      m.speed = Math.hypot(m.vx, m.vy);
      // body lean follows acceleration, so Wira tips into a start and back at a stop
      const ax = (m.vx - m.pvx) / dt; m.pvx = m.vx;
      const leanTarget = Math.max(-0.1, Math.min(0.1, ax / 4200));
      m.lean += (leanTarget - m.lean) * Math.min(1, dt * 9);
      // bucket pendulum driven by body acceleration plus wind
      m.pendVel = m.pend.vel;
      if (motion) {
        m.pend.update(dt, -ax * 0.00035 + wind.dir * (0.5 + wind.gust * 1.3));
        const sloshTarget = Math.max(-1, Math.min(1, -m.pend.vel * 0.3));
        m.slosh += (sloshTarget - m.slosh) * Math.min(1, dt * 7);
      }
      // Realistic lake dipping splash, underwater bubbles & dripping haul during 'fill'
      const a = world.action;
      if (a?.type === 'fill' && motion) {
        const tgt = fillTarget(p, a);
        // Entry plunge splash at k ~ 0.22 (age ~ 0.17s)
        if (a.age >= 0.16 && a.age < 0.30 && m.fillSplashAt < 0) {
          m.fillSplashAt = world.time;
          m.ripples.add(tgt.x, tgt.y, 1.35, 44);
          m.ripples.add(tgt.x, tgt.y, 0.85, 26);
          for (let i = 0; i < 14; i++) {
            const ang = -Math.PI * (0.15 + Math.random() * 0.7);
            const sp = 65 + Math.random() * 95;
            m.droplets.add(tgt.x + (Math.random() - 0.5) * 12, tgt.y - 2, Math.cos(ang) * sp, Math.sin(ang) * sp, 2.5, 0.52);
          }
          bumpNearby(world, m, p.x, p.y, 1.1);
        }
        // Continuous concentric rings while bucket scoops & agitates the lake
        if (a.age >= 0.24 && a.age < 0.50 && world.time > m.fillBubbleNext) {
          m.fillBubbleNext = world.time + 0.11;
          m.ripples.add(tgt.x + (Math.random() - 0.5) * 10, tgt.y, 0.65, 28);
        }
        // Heavy water droplets streaming back into the lake as the full bucket is hauled up!
        if (a.age >= 0.38 && a.age < 0.62 && world.time > m.fillDripNext) {
          m.fillDripNext = world.time + 0.09;
          const spec = playerSpec(world, m, t);
          const bp = bucketPose(world, spec, m);
          for (let i = 0; i < 2; i++) {
            m.droplets.add(bp.x + (Math.random() - 0.5) * 14, bp.y + 18, (Math.random() - 0.5) * 24, 25 + Math.random() * 40, 2, 0.34);
          }
          if (Math.random() < 0.5) m.ripples.add(tgt.x + (Math.random() - 0.5) * 12, tgt.y, 0.42, 22);
        }
      } else if (a?.type !== 'fill') {
        m.fillSplashAt = -1;
      }
      // poured water follows a ballistic arc and splashes on impact
      if (a?.type === 'pour' && motion) {
        const spec = playerSpec(world, m, t);
        const hp = handPoint(spec);
        const sx = p.x + hp.x + (a.target.x > p.x ? 14 : -14), sy = p.y + hp.y - 14;
        const T = 0.4, g = 780;
        if (a.age > 0.16 && a.age < 0.6 && world.time > m.pourNext) {
          m.pourNext = world.time + 0.028;
          for (let i = 0; i < 3; i++) m.droplets.add(
            sx + (Math.random() - 0.5) * 4, sy + (Math.random() - 0.5) * 4,
            (a.target.x - sx) / T + (Math.random() - 0.5) * 26,
            (a.target.y - 8 - sy) / T - 0.5 * g * T + (Math.random() - 0.5) * 20,
            3 + Math.random() * 2, T + 0.22
          );
        }
        if (a.age > 0.42 && world.time > m.splashNext) {
          m.splashNext = world.time + 0.07;
          fx.add({ kind: 'ring', x: a.target.x + (Math.random() - 0.5) * 22, y: a.target.y + 4, size: 3, grow: 34, life: 0.45, color: '#bfe6e2', alpha: 0.65, ground: true });
          for (let i = 0; i < 3; i++) fx.add({ kind: 'px', x: a.target.x + (Math.random() - 0.5) * 30, y: a.target.y, vx: (Math.random() - 0.5) * 90, vy: -70 - Math.random() * 60, ay: 420, life: 0.4, color: '#cdeef0' });
        }
        if (a.age > 0.3 && world.time > m.steamNext) {
          m.steamNext = world.time + 0.09;
          fx.add({ kind: 'puff', x: a.target.x + (Math.random() - 0.5) * 22, y: a.target.y - 10, vx: wind.dir * 30, vy: -46, size: 7, grow: 20, life: 1.1, color: '#eef2ea', alpha: 0.7 });
        }
      }
      m.shakeX.update(dt); m.shakeY.update(dt);
      updateDoors(m.doors, world, dt);
      if (motion) {
        spawnAmbient(world, m, dt, view);
        if (village) updateHens(world, dt);
        m.ripples.update(dt);
        m.droplets.update(dt, 780, wind.dir);
        // Wira brushing past a signpost sets it swaying
        if (p.isMoving && m.speed > 120) for (const s of signsFor(world.scene)) {
          if (Math.hypot(s.x - p.x, s.depth - p.y) < 46) bumpNearby(world, m, p.x, p.y, 1.6, 1.4);
        }
      }
      fx.update(dt, world.player);
    }
    const due = pending.filter(e => e.at <= world.time); pending = pending.filter(e => e.at > world.time); due.forEach(e => e.run());
  }

  c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false;
  R(c, 0, 0, width, height, '#1d2c24');
  const sx = m && motion ? m.shakeX.value : 0, sy = m && motion ? m.shakeY.value : 0;
  c.setTransform(scale, 0, 0, scale, Math.round(width / 2 - x * scale + sx), Math.round(height / 2 - y * scale + sy));
  c.drawImage(getBackground(world.scene), village ? 0 : -200, 0);

  const doorRig = m ? m.doors : createDoorRig(world.scene);
  if (village && m) drawVillageGround(c, world, m, view, t); else if (!village) drawHouseLife(c, world, doorRig, t, motion);
  if (!preview) fx.draw(c, true);
  if (world.destination) {
    const d = world.destination;
    const s = motion ? 14 - Math.floor((t * 24) % 8) : 10;
    c.globalAlpha = 0.7;
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) R(c, d.x + dx * s - (dx < 0 ? 0 : 6), d.y + dy * s * 0.5 - (dy < 0 ? 0 : 2), 6, 2, '#f0d79c');
    c.globalAlpha = 1;
    world.path.forEach((p, i) => { if (i % 3 === 0) { c.globalAlpha = 0.25 + 0.35 * ((i / 3 + Math.floor(t * 6)) % 2); R(c, snap(p.x), snap(p.y), 2, 2, '#f3dca6'); } });
    c.globalAlpha = 1;
  }

  const items: { y: number; draw: () => void }[] = [];
  world.collectibles.filter(i => i.scene === world.scene && !i.collected).forEach(i => items.push({ y: i.y, draw: () => drawCollectible(c, i, t) }));
  const pspec = playerSpec(world, m, t);
  items.push({ y: world.player.y, draw: () => drawPlayer(c, world, pspec, m, t, wind) });

  // signage: posts and hanging boards, sorted into the same depth queue
  for (const s of signsFor(world.scene)) {
    items.push({ y: s.depth, draw: () => drawSign(c, { id: s.id, style: s.style, x: s.x, y: s.y, t, dt: m?.dt ?? 0, wind, reduced: !motion, dim: 1 }) });
  }

  if (!village) {
    items.push({ y: 312, draw: () => drawCat(c, world, m, t, m?.dt ?? 0) });
    items.push({ y: 534, draw: () => drawHouseFrontDoor(c, doorRig) });
  } else {
    items.push({ y: 208, draw: () => drawVillageDoors(c, doorRig) });
    const cLeft = x - width / scale / 2 - 150, cRight = x + width / scale / 2 + 150;
    const cTop = y - height / scale / 2 - 150, cBot = y + height / scale / 2 + 170;
    const active = world.fires.filter(f => f.intensity > 0);
    VILLAGE_TREES.forEach(([tx, ty, s], i) => {
      if (!preview && (tx < cLeft || tx > cRight || ty < cTop || ty > cBot)) return;
      const burnt = active.some(f => Math.hypot(f.x - tx, f.y - ty) < 190);
      let st = m?.treeState.get(i);
      if (m && (!st || st.burnt !== burnt)) { st = { burnt, since: st ? world.time : -99 }; m.treeState.set(i, st); }
      const since = st ? world.time - st.since : 99;
      // canopy sway comes from the shared wind field, with a per-tree phase
      const w2 = windAt(tx, ty, t);
      const sway = (w2.dir * (2.2 + w2.gust * 5.4) + Math.sin(t * 0.9 + tx * 0.07) * 1.1) * (0.6 + s * 0.5);
      items.push({ y: ty, draw: () => {
        if (burnt) {
          drawTree(c, tx, ty, s, true, sway * 0.55);
          if (active.some(f => Math.hypot(f.x - tx, f.y - ty) < 120)) {
            const cc = canopyCenter(s, tx, ty);
            for (let k = 0; k < 3; k++) {
              const fx0 = snap(tx - cc.w * 0.22 + k * cc.w * 0.22), base = snap(cc.y + (k === 1 ? -10 : 4));
              for (let col = -4; col <= 4; col++) {
                const env = Math.cos((col / 5) * Math.PI / 2);
                const hh = Math.max(0, Math.round((env * 16 + Math.sin(t * 11 + col * 1.9 + k * 3 + tx) * 4) / 2) * 2);
                if (hh >= 2) {
                  const shift = Math.round(wind.dir * 2);
                  R(c, fx0 + col * 2, base - hh, 2, hh, '#f08a3c');
                  if (hh >= 6) R(c, fx0 + col * 2 + shift, base - hh, 2, Math.max(2, Math.round(hh * 0.3)), '#c4452b');
                  if (Math.abs(col) < 2 && hh >= 4) R(c, fx0 + col * 2, base - Math.round(hh * 0.45), 2, Math.round(hh * 0.45), '#ffe08a');
                }
              }
            }
          }
        } else if (since < 1.6) { drawTree(c, tx, ty, s, true, sway); drawTree(c, tx, ty, s, false, sway, since / 1.6); }
        else drawTree(c, tx, ty, s, false, sway);
      } });
    });
    // forest floor: wind sway, parting around Wira, and gradual scorch/recovery
    const pp = world.player;
    getForestProps().forEach((pr, i) => {
      if (!preview && (pr.x < cLeft || pr.x > cRight || pr.y < cTop || pr.y > cBot)) return;
      const scorch = active.some(f => Math.hypot(f.x - pr.x, f.y - pr.y) < 165) ? 1 : 0;
      const prev = m?.propBurn.get(i) ?? scorch;
      const eased = motion && m ? prev + (scorch - prev) * Math.min(1, (m.dt || 0) * 1.6) : scorch;
      if (m) m.propBurn.set(i, eased);
      const pw = windAt(pr.x, pr.y, t);
      const d = Math.hypot(pr.x - pp.x, pr.y - pp.y);
      const parted = d < 30 ? (pr.x - pp.x) / 30 * 5 : 0;
      const sway = Math.round(pw.dir * (1.5 + pw.gust * 3.4) + Math.sin(t * 1.5 + pr.x * 0.05) * 0.8 + parted) * 2;
      // cross-fade between the scorched and living sprite while it recovers
      items.push({ y: pr.y, draw: () => {
        if (eased > 0.02 && eased < 0.98) {
          drawProp(c, pr.kind, pr.x, pr.y, true, sway, pr.scale);
          drawPropAlpha(c, pr.kind, pr.x, pr.y, false, sway, pr.scale, 1 - eased);
        } else drawProp(c, pr.kind, pr.x, pr.y, eased > 0.5, sway, pr.scale);
      } });
    });
    const budi = npcSpec('budi', 627, 272, world, t), rt = npcSpec('pak_rt', 825, 283, world, t);
    const npcMotion: MotionInfo = { dt: m?.dt ?? 0, vx: 0, vy: 0, speed: 0, lean: 0, wind, reduced: !motion };
    items.push({ y: 272, draw: () => { drawShadow(c, 627, 272); drawCharacter(c, 627, 272, budi, npcMotion); } });
    items.push({ y: 283, draw: () => { drawShadow(c, 825, 283); drawCharacter(c, 825, 283, rt, npcMotion); } });
    if (!preview) hens.forEach(h => items.push({ y: h.y, draw: () => {
      const moving = h.wait <= 0;
      const spr = chickenSprite(Math.floor(h.dist / 6), !moving && Math.floor(t * 4 + h.x) % 3 === 0);
      drawShadow(c, h.x, h.y, 14, 0.2);
      c.save(); c.translate(snap(h.x), snap(h.y)); if (h.face < 0) c.scale(-1, 1); c.drawImage(spr, -14, -26, spr.width * 2, spr.height * 2); c.restore();
    } }));
    world.fires.forEach((f, i) => {
      if (!preview && (f.x < cLeft || f.x > cRight || f.y < cTop || f.y > cBot)) return;
      items.push({ y: f.y, draw: () => drawFire(c, f, t, i, world.time, m?.fireVisual.get(f.id) ?? f.intensity / f.maxIntensity, wind, !motion) });
    });
  }
  items.sort((a, b) => a.y - b.y).forEach(i => i.draw());

  if (!preview && m) m.droplets.draw(c, snap);

  // warm, flickering firelight on the ground (single pre-baked sprite blit per visible fire, zero gradient allocations)
  if (village) {
    const glow = getFireGlowSprite();
    const gLeft = x - width / scale / 2 - 120, gRight = x + width / scale / 2 + 120;
    c.save(); c.globalCompositeOperation = 'lighter';
    const prevSmooth = c.imageSmoothingEnabled; c.imageSmoothingEnabled = true;
    world.fires.forEach((f, i) => {
      if (!preview && (f.x < gLeft || f.x > gRight)) return;
      const level = m?.fireVisual.get(f.id) ?? f.intensity / f.maxIntensity;
      let k = level;
      if (f.intensity === 0 && f.extinguishedAt !== undefined && world.time - f.extinguishedAt < 0.75) k = Math.max(k, 1 - (world.time - f.extinguishedAt) / 0.75);
      if (k <= 0.02) return;
      const r = fireLightRadius(k, t, i);
      c.globalAlpha = k * 0.92;
      c.drawImage(glow, f.x - r, f.y - 16 - r, r * 2, r * 2);
    });
    c.imageSmoothingEnabled = prevSmooth;
    c.restore();
    if (!preview) drawWorldCanopySmoke(c, world.fires, view, world.time, t, wind, !motion);
  }

  if (!preview) fx.draw(c, false);
  world.effects.forEach(e => { c.globalAlpha = Math.max(0, 1 - e.age / e.duration); R(c, snap(e.x), snap(e.y), Math.max(2, snap(e.size)), Math.max(2, snap(e.size)), e.color); });
  c.globalAlpha = 1;

  const prog = progressOf(world);
  if (village) {
    const flock = Math.floor(prog / 20);
    if (flock > 0) {
      const cycle = Math.floor(t / 14), ph = (t % 14) / 14;
      for (let i = 0; i < flock + 1; i++) drawBird(c, -60 + ph * 1520 - i * 20, 110 + Math.sin(cycle) * 40 + (i % 2) * 12 + i * 4 + Math.sin(t * 2 + i) * 3, Math.floor(t * 8 + i) % 2 === 0, wind);
    }
    if (prog >= 60) getTufts().slice(0, 3 + Math.floor((prog - 60) / 10)).forEach((tf, i) => {
      const bx = tf.x + Math.sin(t * 1.3 + i) * 24 + wind.dir * 6, by = tf.y - 24 + Math.sin(t * 2.1 + i * 2) * 10;
      const col = ['#f2d36b', '#f0a2b8', '#e9edf0', '#a6c8f0'][i % 4];
      if (Math.floor(t * 12 + i) % 2) { R(c, snap(bx) - 4, snap(by), 4, 4, col); R(c, snap(bx) + 2, snap(by), 4, 4, col); }
      else R(c, snap(bx) - 2, snap(by) - 2, 4, 6, col);
      R(c, snap(bx), snap(by), 2, 4, '#2b302a');
    });
  }

  if (world.prompt && !world.dialogue && !world.panel && !preview) {
    const pr = world.prompt;
    const isFire = world.fires.some(f => f.id === pr.id);
    const cy = isFire ? pr.y - 18 : pr.y - 6;
    const s = 18 + (motion ? Math.round(Math.sin(t * 5)) * 2 : 0);
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const ex = pr.x + dx * s, ey = cy + dy * s;
      R(c, ex - (dx > 0 ? 6 : 0), ey - (dy > 0 ? 2 : 0), 6, 2, '#f3dca6'); R(c, ex - (dx > 0 ? 2 : 0), ey - (dy > 0 ? 6 : 0), 2, 6, '#f3dca6');
    }
    const by = cy - s - 26 - (motion ? Math.abs(Math.round(Math.sin(t * 4) * 2)) * 2 : 0);
    R(c, pr.x - 12, by - 12, 24, 22, '#16201a'); R(c, pr.x - 10, by - 10, 20, 18, '#2c3d2c'); R(c, pr.x - 10, by - 10, 20, 2, '#e5cf95');
    R(c, pr.x - 2, by + 10, 4, 2, '#16201a'); R(c, pr.x - 2, by + 8, 4, 2, '#2c3d2c');
    text(c, 'E', pr.x, by, '#f3e3b6', 11);
  }

  c.setTransform(1, 0, 0, 1, 0, 0);
  if (village && !preview) {
    drawScreenAtmosphere(c, {
      view,
      playerX: world.player.x,
      playerY: world.player.y,
      fires: world.fires,
      discovered: world.discovered,
      t,
      wind,
      reduced: !motion,
    });
  }
  if (!preview) c.drawImage(getVignette(width, height), 0, 0);
  if (world.transition > 0 && !preview) {
    const alpha = world.transition / 0.38, b = 8;
    c.fillStyle = '#121b16';
    for (let yy = 0; yy < height; yy += b) for (let xx = 0; xx < width; xx += b) {
      if ((BAYER[(yy / b) % 4][(xx / b) % 4] + 0.5) / 16 < alpha) c.fillRect(xx, yy, b, b);
    }
  }
}
