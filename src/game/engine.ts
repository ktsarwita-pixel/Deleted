import { soundEngine } from '../audio/soundEngine';
import { canStand, CUTSCENE, HOUSE_INTERACTIONS, HOUSE_SIZE, INITIAL_COLLECTIBLES, INITIAL_FIRE_HOTSPOTS, VILLAGE_INTERACTIONS, VILLAGE_SIZE } from '../canvas/worldData';
import { renderGameWorld } from '../canvas/pixelRenderer';
import { warmupSprites } from '../canvas/sprites';
import { warmupTrees } from '../canvas/trees';
import type { Direction, PlayerState, ShopItem } from '../types/gameTypes';
import { formatRupiah } from '../utils/formatRupiah';
import { findPath } from './pathfinding';
import { SHOP_ITEMS, type Destination, type GameSnapshot, type GameWorld, type Interaction, type Panel, type Point, type Viewport } from './model';

const SAVE_KEY = 'karhutla-wira-v3';
export const WALK_SPEED = 225;
const initialPlayer = (): PlayerState => ({ x: 435, y: 365, dir: 'down', isMoving: false, animFrame: 0, rupiah: 12000, bucketType: 'none', ownsNormalBucket: false, ownsBigBucket: false, hasNewShoes: false, waterUnits: 0, maxWaterUnits: 0, totalWaterPoured: 0 });
const freshWorld = (): GameWorld => ({
  scene: 'house', player: initialPlayer(), fires: INITIAL_FIRE_HOTSPOTS.map(f => ({ ...f })),
  collectibles: INITIAL_COLLECTIBLES.map(c => ({ ...c })), discovered: false, cutscene: -1,
  dialogue: null, panel: null, prompt: null, path: [], destination: null, effects: [], action: null,
  time: 0, transition: 0, muted: false, reducedMotion: false, notice: null,
});

export class GameEngine {
  world = freshWorld();
  view: Viewport = { x: 440, y: 310, scale: 1, width: 880, height: 620 };
  private listeners = new Set<() => void>();
  private snapshot: GameSnapshot;
  private keys = new Set<string>();
  private analog = { x: 0, y: 0 };
  private queued: string | null = null;
  private raf = 0;
  private lastFrame = 0;
  private saveClock = 0;
  private noticeTimer: ReturnType<typeof setTimeout> | null = null;
  private saved = false;
  private canvas: HTMLCanvasElement | null = null;
  private reducedQuery: MediaQueryList | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.world.reducedMotion = this.reducedQuery.matches;
      this.restore();
    }
    this.snapshot = this.makeSnapshot();
  }

  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getSnapshot = () => this.snapshot;
  get progress() { return this.world.fires.filter(f => f.intensity === 0).length * 10; }
  get blocked() { return !!this.world.panel || !!this.world.dialogue || !!this.world.action; }

  private makeSnapshot(): GameSnapshot {
    const w = this.world;
    return { scene: w.scene, player: { ...w.player }, progress: this.progress, discovered: w.discovered, cutscene: w.cutscene,
      dialogue: w.dialogue, panel: w.panel, prompt: w.prompt ? { id: w.prompt.id, label: w.prompt.label } : null,
      walking: w.path.length > 0, muted: w.muted, reducedMotion: w.reducedMotion, notice: w.notice, saved: this.saved };
  }
  private publish(save = false) {
    if (save) this.save();
    this.snapshot = this.makeSnapshot();
    this.listeners.forEach(fn => fn());
  }

  private save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        version: 3, scene: this.world.scene, player: this.world.player, discovered: this.world.discovered,
        cutscene: this.world.cutscene, extinguished: this.world.fires.filter(f => f.intensity === 0).map(f => f.id),
        collected: this.world.collectibles.filter(c => c.collected).map(c => c.id), muted: this.world.muted,
        reducedMotion: this.world.reducedMotion,
      }));
      this.saved = true;
    } catch { this.saved = false; }
  }
  private restore() {
    try {
      const data = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null');
      if (data?.version !== 3 || !data.player || !['house', 'village'].includes(data.scene) || !Number.isFinite(data.player.rupiah)) return;
      const p = { ...initialPlayer(), ...data.player, isMoving: false } as PlayerState;
      if (!['none', 'normal', 'big'].includes(p.bucketType)) return;
      p.maxWaterUnits = p.bucketType === 'big' ? 2 : p.bucketType === 'normal' ? 1 : 0;
      p.waterUnits = Math.max(0, Math.min(p.maxWaterUnits, Number(p.waterUnits) || 0));
      p.rupiah = Math.max(0, Math.floor(p.rupiah));
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !canStand(data.scene, p.x, p.y)) {
        p.x = data.scene === 'house' ? 435 : 210; p.y = data.scene === 'house' ? 365 : 310;
      }
      this.world.scene = data.scene; this.world.player = p;
      this.world.discovered = !!data.discovered;
      this.world.cutscene = Number.isInteger(data.cutscene) && data.cutscene >= 0 && data.cutscene < CUTSCENE.length ? data.cutscene : -1;
      this.world.dialogue = this.world.cutscene >= 0 ? CUTSCENE[this.world.cutscene].dialogue : null;
      this.world.fires.forEach(f => { if (Array.isArray(data.extinguished) && data.extinguished.includes(f.id)) f.intensity = 0; });
      this.world.collectibles.forEach(c => { c.collected = Array.isArray(data.collected) && data.collected.includes(c.id); });
      this.world.muted = !!data.muted; soundEngine.muted = this.world.muted;
      this.world.reducedMotion = this.world.reducedMotion || !!data.reducedMotion;
      this.saved = true;
    } catch { /* A damaged or unavailable save must never prevent the game from starting. */ }
  }

  mount(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false })!;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width)); canvas.height = Math.max(1, Math.round(rect.height));
      this.view.width = canvas.width; this.view.height = canvas.height;
      this.updateCamera(1, true);
    };
    const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
    const blur = () => { this.clearKeys(); this.world.player.isMoving = false; };
    const visibility = () => { blur(); this.lastFrame = 0; };
    const saveOnExit = () => this.save();
    const onMotionPref = (e: MediaQueryListEvent) => { this.world.reducedMotion = e.matches; this.publish(true); };
    window.addEventListener('blur', blur); window.addEventListener('pagehide', saveOnExit);
    document.addEventListener('visibilitychange', visibility);
    this.reducedQuery?.addEventListener?.('change', onMotionPref);
    const tick = (now: number) => {
      const dt = this.lastFrame ? Math.min((now - this.lastFrame) / 1000, .04) : 0;
      this.lastFrame = now;
      if (!document.hidden) {
        this.update(dt); this.updateCamera(dt);
        // a panel freezes the world and covers the canvas, so skip the repaint
        if (!this.world.panel) renderGameWorld(ctx, this.world, this.view);
      }
      this.raf = requestAnimationFrame(tick);
    };
    setTimeout(() => { warmupSprites(); warmupTrees(); }, 16);
    this.lastFrame = 0; this.raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(this.raf); observer.disconnect(); this.clearKeys(); this.canvas = null;
      window.removeEventListener('blur', blur); window.removeEventListener('pagehide', saveOnExit);
      document.removeEventListener('visibilitychange', visibility);
      this.reducedQuery?.removeEventListener?.('change', onMotionPref);
      if (this.noticeTimer) clearTimeout(this.noticeTimer);
    };
  }

  private updateCamera(dt: number, snap = false) {
    const { width, height } = this.view;
    const isHouse = this.world.scene === 'house';
    const size = isHouse ? HOUSE_SIZE : VILLAGE_SIZE;
    const fit = Math.min(width / 840, height / 570);
    this.view.scale = isHouse ? Math.max(width >= 600 ? .65 : .72, fit) : width < 600 ? .9 : 1.08;
    const halfW = width / this.view.scale / 2, halfH = height / this.view.scale / 2;
    const cameraTarget = this.world.cutscene >= 0 ? CUTSCENE[this.world.cutscene].camera : this.world.player;
    const clamp = (v: number, half: number, total: number) => total <= half * 2 ? total / 2 : Math.max(half, Math.min(total - half, v));
    const tx = clamp(cameraTarget.x, halfW, size.width), ty = clamp(cameraTarget.y - (isHouse ? 25 : 0), halfH, size.height);
    const lerp = snap || this.world.reducedMotion ? 1 : 1 - Math.exp(-dt * (this.world.cutscene >= 0 ? 3.5 : 13));
    this.view.x += (tx - this.view.x) * lerp; this.view.y += (ty - this.view.y) * lerp;
  }

  // Mutable world data stays out of React; only meaningful UI changes publish snapshots.
  update(dt: number) {
    const w = this.world, p = w.player;
    if (w.panel) { p.isMoving = false; return; }
    w.time += dt;
    w.transition = Math.max(0, w.transition - dt);
    if (w.action) {
      w.action.age += dt;
      const dur = w.action.type === 'fill' ? .64 : .60;
      if (w.action.age >= dur) {
        const doneType = w.action.type;
        w.action = null;
        if (doneType === 'pour' && this.progress === 100) { w.panel = 'victory'; soundEngine.playVictoryFanfare(); }
        this.publish(true);
      }
    }
    w.effects = w.effects.filter(e => {
      e.age += dt; e.x += e.vx * dt; e.y += e.vy * dt; e.vy += e.gravity * dt;
      return e.age < e.duration;
    });
    if (this.blocked) { p.isMoving = false; return; }
    let dx = Number(this.keys.has('d') || this.keys.has('arrowright')) - Number(this.keys.has('a') || this.keys.has('arrowleft'));
    let dy = Number(this.keys.has('s') || this.keys.has('arrowdown')) - Number(this.keys.has('w') || this.keys.has('arrowup'));
    if (!dx && !dy) { dx = this.analog.x; dy = this.analog.y; }
    let travel = WALK_SPEED * (p.hasNewShoes ? 1.2 : 1) * dt;
    if (dx || dy) { if (w.path.length) this.cancelWalk(); }
    else if (w.path.length) {
      const goal = w.path[0], dist = Math.hypot(goal.x - p.x, goal.y - p.y);
      if (dist < .7) {
        w.path.shift();
        if (!w.path.length) {
          w.destination = null; p.isMoving = false;
          const action = this.queued; this.queued = null;
          this.refreshPrompt(); this.publish();
          if (action) this.interact(action);
        }
        return;
      }
      dx = goal.x - p.x; dy = goal.y - p.y; travel = Math.min(travel, dist);
    }
    const len = Math.hypot(dx, dy);
    if (len) {
      const strength = !this.keys.size && (this.analog.x || this.analog.y) ? Math.min(1, len) : 1;
      dx = dx / len * travel * strength; dy = dy / len * travel * strength;
      const prevX = p.x, prevY = p.y;
      if (canStand(w.scene, p.x + dx, p.y)) p.x += dx;
      if (canStand(w.scene, p.x, p.y + dy)) p.y += dy;
      const moved = Math.hypot(p.x - prevX, p.y - prevY);
      p.isMoving = moved > .01; p.animFrame += moved;
      p.dir = Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'down' : 'up';
      if (p.isMoving) soundEngine.playStep(p.hasNewShoes);
      if (!p.isMoving && w.path.length) this.cancelWalk();
      if (w.scene === 'house' && p.y > 512 && Math.abs(p.x - 440) < 30) { this.exitHouse(); return; }
    } else p.isMoving = false;
    this.refreshPrompt();
    this.saveClock += dt;
    if (this.saveClock > 5) { this.saveClock = 0; const wasSaved = this.saved; this.save(); if (wasSaved !== this.saved) this.publish(); }
  }

  setKey(key: string, down: boolean) {
    const k = key.toLowerCase();
    if (down && !this.world.panel && !this.world.dialogue) this.keys.add(k); else this.keys.delete(k);
  }
  setAnalog(x: number, y: number) {
    if (this.world.panel || this.world.dialogue) { this.analog = { x: 0, y: 0 }; return; }
    const length = Math.hypot(x, y);
    this.analog = length < 0.12 ? { x: 0, y: 0 } : length > 1 ? { x: x / length, y: y / length } : { x, y };
  }
  clearKeys() { this.keys.clear(); this.analog = { x: 0, y: 0 }; }
  private cancelWalk() { this.world.path = []; this.world.destination = null; this.queued = null; this.publish(); }

  interactions(): Interaction[] {
    const w = this.world;
    const base = w.scene === 'house' ? HOUSE_INTERACTIONS : VILLAGE_INTERACTIONS;
    const list = base.filter(i => i.kind !== 'collect' || !w.collectibles.find(c => c.id === i.id)?.collected);
    if (w.scene === 'village') {
      w.collectibles.filter(c => c.scene === 'village' && !c.collected).forEach(c => list.push({ ...c, kind: 'collect', label: c.id === 'rattan' ? 'Ambil upah rotan' : 'Ambil bantuan', stand: { x: c.x, y: c.y }, radius: 52 }));
      w.fires.filter(f => f.intensity > 0).forEach(f => list.push({ ...f, kind: 'fire', label: 'Siram titik api', stand: { x: f.x - 60, y: f.y + 15 }, radius: 120 }));
    }
    return list;
  }
  private refreshPrompt() {
    const p = this.world.player;
    const near = this.interactions().filter(i => Math.hypot(i.x - p.x, i.y - p.y) < i.radius)
      .sort((a,b) => Math.hypot(a.x - p.x,a.y-p.y) - Math.hypot(b.x-p.x,b.y-p.y))[0] ?? null;
    if (near?.id !== this.world.prompt?.id) { this.world.prompt = near; this.publish(); }
  }
  walkTo(point: Point, interactId: string | null = null) {
    if (this.world.panel || this.world.dialogue) return;
    this.clearKeys();
    const path = findPath(this.world.scene, this.world.player, point);
    if (!path.length) {
      if (interactId) this.interact(interactId);
      return;
    }
    this.world.path = path; this.world.destination = path[path.length - 1]; this.queued = interactId;
    this.publish();
  }
  clickCanvas(clientX: number, clientY: number, touch = false) {
    if (!this.canvas || this.blocked) return;
    const rect = this.canvas.getBoundingClientRect();
    const point = { x: (clientX - rect.left - this.view.width / 2) / this.view.scale + this.view.x,
      y: (clientY - rect.top - this.view.height / 2) / this.view.scale + this.view.y };
    const clicked = this.interactions().filter(i => Math.hypot(i.x-point.x,i.y-point.y)<(touch ? 72 : 43))
      .sort((a,b)=>Math.hypot(a.x-point.x,a.y-point.y)-Math.hypot(b.x-point.x,b.y-point.y))[0];
    // Signs live on walls or beside paths, away from the interaction's feet position.
    const signAnchors = this.world.scene === 'house'
      ? [{ id: 'exit', x: 351, y: 511 }, { id: 'radio', x: 640, y: 250 }]
      : [{ id: 'home', x: 210, y: 144 }, { id: 'shop', x: 565, y: 111 },
        { id: 'shop', x: 491, y: 174 }, { id: 'chief', x: 825, y: 171 },
        { id: 'lake', x: 522, y: 454 }, { id: 'fire', x: 884, y: 362 }];
    const signRadius = touch ? 58 : 42;
    const sign = !clicked ? signAnchors.find(s => Math.hypot(s.x - point.x, s.y - point.y) < signRadius) : null;
    if (sign?.id === 'fire' && this.progress === 100) {
      this.notify('Semua titik api sudah padam. Hutan kembali aman!', 'success');
      return;
    }
    const target = sign ? sign.id === 'fire'
      ? this.interactions().filter(i => i.kind === 'fire').sort((a, b) => Math.hypot(a.x - point.x, a.y - point.y) - Math.hypot(b.x - point.x, b.y - point.y))[0]
      : this.interactions().find(i => i.id === sign.id) : clicked;
    if (target) this.walkTo(target.stand, target.id); else this.walkTo(point);
  }
  go(destination: Destination) {
    this.world.panel = null;
    if (this.world.cutscene >= 0) { this.notify('Selesaikan cerita atau pilih Lewati cerita terlebih dahulu.'); return; }
    this.world.dialogue = null;
    let target = this.interactions().find(i => i.id === destination);
    if (destination === 'fire') {
      const p = this.world.player;
      target = this.interactions().filter(i => i.kind === 'fire').sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
    }
    if (!target) { this.notify('Tujuan ini belum tersedia. Jelajahi lingkungan sekitarmu dahulu.', 'info'); return; }
    this.walkTo(target.stand, target.id);
  }

  private exitHouse() {
    const w = this.world;
    this.clearKeys(); w.path = []; w.destination = null; this.queued = null;
    w.scene = 'village'; w.player.x = 210; w.player.y = 315; w.player.isMoving = false; w.player.dir = 'down';
    w.transition = w.reducedMotion ? 0 : .38; w.prompt = null;
    soundEngine.playDoorOpen();
    if (!w.discovered) { w.discovered = true; w.cutscene = 0; w.dialogue = CUTSCENE[0].dialogue; soundEngine.playCutsceneAlert(); }
    this.updateCamera(1, true); this.publish(true);
  }
  advanceDialogue = () => {
    if (this.world.cutscene >= 0) {
      this.world.cutscene++;
      if (this.world.cutscene >= CUTSCENE.length) { this.world.cutscene = -1; this.world.dialogue = null; }
      else this.world.dialogue = CUTSCENE[this.world.cutscene].dialogue;
    } else this.world.dialogue = null;
    this.clearKeys(); soundEngine.playBlip(420); this.publish(true);
  };
  skipCutscene = () => { this.world.cutscene = -1; this.world.dialogue = null; this.clearKeys(); this.publish(true); };

  interact = (id?: string) => {
    if (this.world.dialogue) { this.advanceDialogue(); return; }
    if (this.world.panel || this.world.action) return;
    const target = id ? this.interactions().find(i => i.id === id) : this.world.prompt;
    const w = this.world, p = w.player;
    if (!target || Math.hypot(target.x-p.x,target.y-p.y)>target.radius+5) return;
    this.clearKeys(); w.path=[]; w.destination=null; this.queued=null; p.isMoving=false;
    if (target.kind === 'collect') {
      const item = w.collectibles.find(c => c.id === target.id);
      if (item && !item.collected) {
        item.collected=true; p.rupiah+=item.rupiahValue; this.burst(item.x,item.y,14,'#eac477');
        soundEngine.playCoinCollect(); this.notify(`${item.name}: +${formatRupiah(item.rupiahValue)}`, 'success');
      }
    } else if (target.kind === 'exit') { this.exitHouse(); return; }
    else if (target.kind === 'home') {
      w.scene='house'; p.x=440; p.y=480; p.dir='up'; w.prompt=null; w.transition=w.reducedMotion?0:.38;
      soundEngine.playDoorOpen(); this.updateCamera(1,true);
    } else if (target.kind === 'shop') w.panel='shop';
    else if (target.kind === 'radio') {
      w.dialogue={speaker:'Radio desa',role:'Siaran Kalimantan',portrait:'radio',text:'Musim kemarau tiba. Waspadai asap dan kebakaran lahan. Jika melihat kebakaran, jauhi asap dan segera hubungi petugas setempat.'};
    } else if (target.kind === 'window') {
      w.dialogue={speaker:'Wira',role:'Warga Desa Rantau',portrait:'wira',text:w.discovered?'Dari sini aku bisa melihat desa. Aku harus tetap menjaga hutan kita.':'Langitnya tidak seperti biasanya. Ada kabut asap di luar. Aku harus keluar dan memeriksanya.'};
    } else if (target.kind === 'chief') {
      w.dialogue={speaker:'Pak RT Daman',role:'Ketua RT',portrait:'pak_rt',text:`Sudah ${this.progress}% titik api padam. Semangat, Wira! Setiap titik api yang kamu padamkan mendapat bantuan Rp 6.000,00 untuk perlengkapan.`};
    } else if (target.kind === 'lake') {
      if (p.bucketType==='none') { this.notify('Beli ember di Warung Budi terlebih dahulu.', 'error'); return; }
      if (p.waterUnits===p.maxWaterUnits) { this.notify('Ember sudah penuh. Saatnya menuju titik api.', 'info'); return; }
      // Face open water naturally: off pier end if at tip, otherwise nearest left/right side of pier or south shore
      let tx = p.x, ty = p.y + 38;
      if (p.y >= 546 && p.x >= 405 && p.x <= 479) {
        if (p.y >= 604) { p.dir = 'down'; tx = p.x; ty = 652; }
        else if (p.x <= 442) { p.dir = 'left'; tx = 386; ty = p.y + 10; }
        else { p.dir = 'right'; tx = 498; ty = p.y + 10; }
      } else {
        p.dir = 'down'; tx = Math.max(230, Math.min(620, p.x)); ty = Math.max(564, p.y + 34);
      }
      p.waterUnits = p.maxWaterUnits;
      w.action={type:'fill',age:0,target:{x:tx,y:ty}};
      soundEngine.playWaterFill();
      this.notify(`Menimba air danau: ${p.maxWaterUnits} takar penuh!`, 'success');
    } else if (target.kind === 'fire') {
      if (p.bucketType==='none') { this.notify('Kamu memerlukan ember dari Warung Budi.', 'error'); return; }
      if (p.waterUnits===0) { this.notify('Air habis. Isi kembali ember di danau.', 'error'); return; }
      const f=w.fires.find(f=>f.id===target.id);
      if (f?.intensity) {
        f.intensity=0; f.extinguishedAt=w.time; p.waterUnits--; p.totalWaterPoured++; p.rupiah+=6000;
        p.dir = target.x>p.x?'right':'left'; w.action={type:'pour',age:0,target:{x:f.x,y:f.y}};
        this.burst(f.x,f.y-15,22,'#d1dfca'); soundEngine.playWaterPour();
        if (this.progress === 30 || this.progress === 60 || this.progress === 90) setTimeout(() => soundEngine.playMilestone(), 260);
        this.notify(`Titik api padam! +10% pemadaman dan +${formatRupiah(6000)}.`, 'success');
      }
    }
    this.refreshPrompt(); this.publish(true);
  };

  private burst(x:number,y:number,count:number,color:string) {
    if(this.world.reducedMotion) return;
    for(let i=0;i<count;i++) this.world.effects.push({x,y,vx:(Math.random()-.5)*85,vy:-30-Math.random()*45,age:0,duration:.5+Math.random()*.5,size:2+Math.floor(Math.random()*3),color,gravity:65});
    this.world.effects=this.world.effects.slice(-100);
  }
  notify(text: string, tone: 'info' | 'success' | 'error' = 'info') {
    if(this.noticeTimer) clearTimeout(this.noticeTimer);
    this.world.notice={id:Date.now(),text,tone};
    if(tone==='error') soundEngine.playError();
    this.publish();
    this.noticeTimer=setTimeout(()=>{this.world.notice=null;this.publish();},3500);
  }
  nearShop() { const p=this.world.player; return this.world.scene==='village' && Math.hypot(p.x-565,p.y-230)<98; }
  buy = (id: ShopItem['id']): { ok: boolean; message: string } => {
    const p=this.world.player, item=SHOP_ITEMS.find(i=>i.id===id)!;
    const owned=id==='normal_bucket'?(p.ownsNormalBucket||p.ownsBigBucket):id==='big_bucket'?p.ownsBigBucket:p.hasNewShoes;
    if(owned) return {ok:false,message:'Perlengkapan ini sudah kamu miliki.'};
    if(!this.nearShop()) return {ok:false,message:'Kunjungi Warung Budi di desa untuk membeli perlengkapan.'};
    if(p.rupiah<item.price) return {ok:false,message:'Uang Wira belum cukup. Kumpulkan tabungan atau bantuan pemadaman.'};
    p.rupiah-=item.price;
    if(id==='normal_bucket') {p.ownsNormalBucket=true;if(!p.ownsBigBucket){p.bucketType='normal';p.maxWaterUnits=1;}}
    if(id==='big_bucket') {p.ownsBigBucket=true;p.bucketType='big';p.maxWaterUnits=2;}
    if(id==='new_boots') p.hasNewShoes=true;
    soundEngine.playBuySuccess();this.publish(true);
    return {ok:true,message:`${item.name} berhasil dibeli dan langsung dipakai, Wira!`};
  };
  setPanel = (panel: Panel) => { this.clearKeys(); this.world.player.isMoving=false; this.world.panel=panel; this.publish(); };
  toggleMute = () => {this.world.muted=!this.world.muted;soundEngine.muted=this.world.muted;this.publish(true);};
  toggleMotion = () => {this.world.reducedMotion=!this.world.reducedMotion;this.publish(true);};
  reset = () => {
    const {muted,reducedMotion}=this.world;
    this.world=freshWorld();this.world.muted=muted;this.world.reducedMotion=reducedMotion;
    this.world.notice=null;this.clearKeys();this.queued=null;if(this.noticeTimer){clearTimeout(this.noticeTimer);this.noticeTimer=null;}
    this.updateCamera(1,true);this.publish(true);
  };
  face(direction: Direction) { this.world.player.dir=direction; }
}