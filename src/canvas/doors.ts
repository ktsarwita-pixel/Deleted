/* High-craft 2.5D pixel-art doors, animated latches & doorway interior sprites for Rumah Wira. */
import type { GameWorld } from '../game/model';
import { R, poly } from './backgrounds';
import { soundEngine } from '../audio/soundEngine';

interface DoorSpring {
  angle: number;
  vel: number;
  wasOpen: boolean;
  latchFlash: number; // brief glint when brass latch clicks home
}

export interface DoorRig {
  scene: string;
  prevX: number;
  prevY: number;
  houseFront: DoorSpring;
  lemariLeft: DoorSpring;
  lemariRight: DoorSpring;
  houseBedroom: DoorSpring;
  villageHome: DoorSpring;
}

const OUTLINE = '#22150d';

const mkSpring = (angle: number, wasOpen: boolean): DoorSpring => ({
  angle,
  vel: 0,
  wasOpen,
  latchFlash: 0,
});

export function createDoorRig(scene: string): DoorRig {
  const inHouse = scene === 'house';
  return {
    scene,
    prevX: inHouse ? 435 : 210,
    prevY: inHouse ? 365 : 310,
    // Start open on scene entry so Wira sees the heavy timber door swing shut behind him!
    houseFront: mkSpring(inHouse ? 1.24 : 0, inHouse),
    lemariLeft: mkSpring(0, false),
    lemariRight: mkSpring(inHouse ? 0.44 : 0, false),
    houseBedroom: mkSpring(0, false),
    villageHome: mkSpring(!inHouse ? 1.20 : 0, !inHouse),
  };
}

/**
 * Critically-damped weighted timber door physics (zeta ~ 0.96) + subtle draft sway when ajar/open.
 */
function stepDoor(
  d: DoorSpring,
  target: number,
  dt: number,
  omega: number,
  playLatch = false,
  openThreshold = 0.5,
) {
  if (dt <= 0) return;
  d.latchFlash = Math.max(0, d.latchFlash - dt * 3.2);
  const h = Math.min(dt, 1 / 30);
  const steps = 2;
  const sh = h / steps;
  const k = omega * omega;
  const c = 2 * 0.96 * omega;
  const prevAngle = d.angle;
  for (let i = 0; i < steps; i++) {
    const acc = (target - d.angle) * k - d.vel * c;
    d.vel += acc * sh;
    d.angle += d.vel * sh;
  }
  if (Math.abs(target - d.angle) < 0.003 && Math.abs(d.vel) < 0.008) {
    d.angle = target;
    d.vel = 0;
  }
  d.angle = Math.max(0, Math.min(1.34, d.angle));

  // Trigger a tiny brass latch glint right as a closing door seats into the strike plate
  if (prevAngle >= 0.05 && d.angle < 0.05 && target === 0) {
    d.latchFlash = 1;
  }

  const nowOpen = target > openThreshold;
  if (nowOpen !== d.wasOpen) {
    d.wasOpen = nowOpen;
    if (playLatch) soundEngine.playDoorLatch(nowOpen);
  }
}

export function updateDoors(rig: DoorRig, w: GameWorld, dt: number) {
  const walletLeft = !w.collectibles.find(c => c.id === 'wallet')?.collected;
  const p = w.player;

  if (rig.scene !== w.scene) {
    const enteredVillage = w.scene === 'village';
    rig.scene = w.scene;
    rig.prevX = p.x;
    rig.prevY = p.y;
    if (enteredVillage) {
      rig.villageHome.angle = 1.22;
      rig.villageHome.vel = 0;
      rig.villageHome.wasOpen = true;
    } else {
      rig.houseFront.angle = 1.25;
      rig.houseFront.vel = 0;
      rig.houseFront.wasOpen = true;
      rig.lemariLeft.angle = 0;
      rig.lemariLeft.vel = 0;
      rig.lemariRight.angle = walletLeft ? 0.44 : 0;
      rig.lemariRight.vel = 0;
    }
  }

  // Compute gentle look-ahead position (~0.18s ahead of Wira's stride) so doors open proactively!
  const vx = dt > 0 ? Math.max(-260, Math.min(260, (p.x - rig.prevX) / dt)) : 0;
  const vy = dt > 0 ? Math.max(-260, Math.min(260, (p.y - rig.prevY) / dt)) : 0;
  rig.prevX = p.x;
  rig.prevY = p.y;
  const leadX = p.x + vx * 0.18;
  const leadY = p.y + vy * 0.18;
  const canSound = w.time > 0.45;
  const t = w.time;

  if (w.reducedMotion) {
    if (w.scene === 'house') {
      rig.houseFront.angle = Math.hypot(p.x - 440, p.y - 520) < 126 ? 1.26 : 0;
      const nearWardrobe = Math.hypot(p.x - 214, p.y - 204) < 92;
      rig.lemariLeft.angle = nearWardrobe ? 1.16 : 0;
      rig.lemariRight.angle = nearWardrobe ? 1.22 : (walletLeft ? 0.44 : 0);
      rig.houseBedroom.angle = Math.hypot(p.x - 126, p.y - 414) < 84 ? 0.72 : 0;
    } else {
      rig.villageHome.angle = Math.hypot(p.x - 210, p.y - 278) < 114 ? 1.22 : 0;
    }
    return;
  }

  // Gentle breeze micro-sway when a door is held open or cracked ajar
  const draft = Math.sin(t * 1.9) * 0.022;

  if (w.scene === 'house') {
    // 1. Front Double Doors (Pintu Kupu-Tarung Kayu Ulin)
    const headingExit =
      w.prompt?.id === 'exit' ||
      (w.destination ? Math.hypot(w.destination.x - 440, w.destination.y - 518) < 30 : false);
    const distExit = Math.min(Math.hypot(p.x - 440, p.y - 522), Math.hypot(leadX - 440, leadY - 522));
    const openFront = distExit < 128 || (headingExit && distExit < 190);
    stepDoor(rig.houseFront, openFront ? 1.28 + draft : 0, dt, 9.5, canSound, 0.5);

    // 2. North-West Lemari Pakaian Hinged Double Doors
    const headingWallet =
      w.prompt?.id === 'wallet' ||
      (w.destination ? Math.hypot(w.destination.x - 254, w.destination.y - 207) < 32 : false);
    const distWardrobe = Math.min(Math.hypot(p.x - 214, p.y - 204), Math.hypot(leadX - 214, leadY - 204));
    const openWardrobe = distWardrobe < (walletLeft ? 100 : 76) || headingWallet;
    stepDoor(rig.lemariLeft, openWardrobe ? 1.16 - draft * 0.6 : 0, dt, 10.4, false, 0.6);
    stepDoor(
      rig.lemariRight,
      openWardrobe ? 1.22 + draft * 0.6 : (walletLeft ? 0.44 + draft * 0.5 : 0),
      dt,
      11.2,
      canSound,
      0.6,
    );

    // 3. West Cutaway Bedroom Door
    const distBedDoor = Math.min(Math.hypot(p.x - 126, p.y - 414), Math.hypot(leadX - 126, leadY - 414));
    const openBed = distBedDoor < 88;
    stepDoor(rig.houseBedroom, openBed ? 0.74 + draft : 0, dt, 9.0, false, 0.35);
  } else {
    // Village Exterior Rumah Wira Carved Front Door
    const headingHome =
      w.prompt?.id === 'home' ||
      (w.destination ? Math.hypot(w.destination.x - 210, w.destination.y - 293) < 30 : false);
    const distHome = Math.min(Math.hypot(p.x - 210, p.y - 278), Math.hypot(leadX - 210, leadY - 278));
    const openHome = distHome < 116 || (headingHome && distHome < 180);
    stepDoor(rig.villageHome, openHome ? 1.22 + draft : 0, dt, 9.2, canSound, 0.5);
  }
}

/** Outlined polygon helper for crisp hand-pixeled door silhouettes (zero allocations). */
function outlinedQuad(
  c: CanvasRenderingContext2D,
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number,
  fill: string,
) {
  poly(c, [[x0 - 1, y0 - 1], [x1 + 1, y1 - 1], [x2 + 1, y2 + 1], [x3 - 1, y3 + 1]], OUTLINE);
  poly(c, [[x0, y0], [x1, y1], [x2, y2], [x3, y3]], fill);
}

/** Picks an angle-shaded timber hex from 3 steps (0=lit face, 1=mid swing, 2=angled deep). */
function swingTone(angle: number, c0: string, c1: string, c2: string): string {
  return angle < 0.38 ? c0 : angle < 0.88 ? c1 : c2;
}

/**
 * Draws a single hinged Lemari wardrobe door leaf with dark pixel outline, louvers, keyhole & brass knob.
 */
function drawLemariLeaf(
  c: CanvasRenderingContext2D,
  hingeX: number,
  yTop: number,
  fullW: number,
  h: number,
  dir: 1 | -1, // +1 = left door, -1 = right door
  sp: DoorSpring,
) {
  const angle = sp.angle;
  const projW = Math.max(5, Math.round(fullW * Math.cos(angle)));
  const outY = Math.round(Math.sin(angle) * 8);
  const freeX = hingeX + dir * projW;
  const lx = Math.min(hingeX, freeX);
  const rx = Math.max(hingeX, freeX);
  const ly = dir > 0 ? yTop : yTop + outY;
  const ry = dir > 0 ? yTop + outY : yTop;

  // Soft cast shadow on wardrobe sill & floor when swung open
  if (angle > 0.06) {
    c.globalAlpha = 0.26 * Math.min(1, angle);
    poly(c, [
      [hingeX, yTop + h],
      [freeX, yTop + h + outY + 4],
      [freeX, yTop + h + outY + 8],
      [hingeX, yTop + h + 4],
    ], '#120b06');
    c.globalAlpha = 1;
  }

  const bodyCol = dir > 0
    ? swingTone(angle, '#8a5f3a', '#7d5533', '#6e492b')
    : swingTone(angle, '#825835', '#754e2e', '#664327');

  // Outlined carved teak door leaf
  outlinedQuad(c, lx, ly, rx, ry, rx, ry + h, lx, ly + h, bodyCol);

  // Sunlit top 3D thickness bevel
  poly(c, [[lx, ly], [rx, ry], [rx, ry + 2], [lx, ly + 2]], '#d8ab6e');

  // Recessed upper louvered panel & lower raised-field panel (foreshortens continuously across all angles)
  {
    const kW = projW / Math.max(1, fullW);
    const pad = Math.max(1, Math.round(4 * kW));
    const pLx = lx + pad;
    const pRx = Math.max(pLx + 1, rx - pad);
    const pLy = ly + Math.round((ry - ly) * (pad / Math.max(1, projW)));
    const pRy = ry - Math.round((ry - ly) * (pad / Math.max(1, projW)));

    // Upper louvered vent box
    poly(c, [[pLx, pLy + 5], [pRx, pRy + 5], [pRx, pRy + 26], [pLx, pLy + 26]], '#4f331d');
    for (let s = 7; s <= 23; s += 4) {
      poly(c, [[pLx, pLy + s], [pRx, pRy + s], [pRx, pRy + s + 2], [pLx, pLy + s + 2]], '#a67749');
      poly(c, [[pLx, pLy + s], [pRx, pRy + s], [pRx, pRy + s + 1], [pLx, pLy + s + 1]], '#c99762');
    }

    // Lower raised-field carved panel + foreshortened center Dayak diamond emblem
    poly(c, [[pLx, pLy + 30], [pRx, pRy + 30], [pRx, pRy + 47], [pLx, pLy + 47]], '#5c3b22');
    if (pRx - pLx >= 3) {
      poly(c, [[pLx + 1, pLy + 32], [pRx - 1, pRy + 32], [pRx - 1, pRy + 45], [pLx + 1, pLy + 45]], '#a17346');
      poly(c, [[pLx + 1, pLy + 32], [pRx - 1, pRy + 32], [pRx - 1, pRy + 33], [pLx + 1, pLy + 33]], '#cfa068');
    }
    const mx = Math.round((lx + rx) * 0.5);
    const my = Math.round((ly + ry) * 0.5) + 38;
    const rxD = Math.max(1, Math.round(4 * kW));
    const skewD = Math.round((ry - ly) * 0.16);
    poly(c, [[mx, my - 4], [mx + rxD, my + skewD], [mx, my + 4], [mx - rxD, my - skewD]], '#f0d488');
    if (rxD >= 2) R(c, mx - 1, my - 1, 2, 2, '#bd4834');
  }

  // Solid 2px meeting-stile thickness face & spring latch bolt when open
  if (angle > 0.08) {
    const edgeX = dir > 0 ? freeX - 2 : freeX;
    R(c, edgeX, yTop + outY, 2, h, '#422a18');
    // Tiny brass latch tongue on right door edge
    if (dir < 0) R(c, edgeX, yTop + outY + 27, 2, 3, '#e8c468');
  }

  // Brass pivot barrel hinges on outer jamb stile
  const hPinX = dir > 0 ? hingeX - 1 : hingeX - 1;
  R(c, hPinX, yTop + 7, 2, 5, '#dfb864');
  R(c, hPinX, yTop + h - 12, 2, 5, '#dfb864');

  // Brass keyhole escutcheon & pull knob (unlatching handle drop when opening!)
  if (projW >= 9) {
    const drop = sp.vel > 0.14 ? 1 : 0;
    const kx = freeX - dir * 5;
    const ky = yTop + 26 + Math.round(outY * 0.85);
    R(c, kx - 1, ky, 3, 6, '#8f6932');
    R(c, kx - 1, ky + drop, 3, 3, sp.latchFlash > 0.3 ? '#ffffff' : '#fae08c');
  }
}

/**
 * Draws House Interior Back & Side Doors + threshold floor light spill:
 * 1) Layered golden/smoky floor light rays from Front Double Doors
 * 2) North-West Lemari Pakaian Hinged Double Doors
 * 3) West Cutaway Wall 2.5D Upright Bedroom Door & Bedroom Interior Sprite
 */
export function drawHouseBackDoors(c: CanvasRenderingContext2D, rig: DoorRig, smokyOutside: boolean) {
  // --- 1. Layered Floor Light Wedge from Front Threshold Double Doors ---
  {
    const openRatio = Math.min(1, rig.houseFront.angle / 1.15);
    if (openRatio > 0.03) {
      const spread = Math.round(16 + openRatio * 26);
      const reach = Math.round(20 + openRatio * 38);
      const outerCol = smokyOutside ? '#eb9b4d' : '#ffefab';
      const coreCol = smokyOutside ? '#f7ba72' : '#fff8d4';
      c.globalAlpha = (smokyOutside ? 0.16 : 0.20) * openRatio;
      poly(c, [[404, 531], [476, 531], [476 + spread, 531 - reach], [404 - spread, 531 - reach]], outerCol);
      c.globalAlpha = (smokyOutside ? 0.10 : 0.13) * openRatio;
      poly(c, [[414, 531], [466, 531], [466 + Math.round(spread * 0.55), 531 - Math.round(reach * 0.65)], [414 - Math.round(spread * 0.55), 531 - Math.round(reach * 0.65)]], coreCol);
      c.globalAlpha = 1;
    }
  }

  // --- 2. North-West Lemari Pakaian Hinged Double Doors (x=144..244, y=131..184) ---
  drawLemariLeaf(c, 144, 131, 49, 53, 1, rig.lemariLeft);
  drawLemariLeaf(c, 244, 131, 49, 53, -1, rig.lemariRight);

  // --- 3. West Cutaway Wall 2.5D Upright Bedroom Door & Bedroom Inside Sprite (y_floor=390..442) ---
  {
    const sp = rig.houseBedroom;
    const a = sp.angle;
    const doorH = 38;

    // Bedroom Inside Sprite (visible through the open West doorway x=99..112, y=352..442!)
    R(c, 98, 352, 15, 38, '#543721'); // warm bedroom wainscot wall
    R(c, 99, 360, 13, 2, '#9e7044');
    R(c, 100, 366, 8, 14, '#754e2e'); R(c, 101, 367, 6, 3, '#cfa266'); // corner of bedroom chest
    // Honey ulin bedroom floorboards + dowel joints
    R(c, 98, 390, 15, 52, '#a47849');
    for (let py = 396; py < 438; py += 12) {
      R(c, 98, py, 15, 2, '#6b4a2b');
      R(c, 98, py + 2, 15, 2, '#cc9d64');
    }
    // Woven emerald pandan bedroom rug & terracotta house slippers peeking inside!
    R(c, 98, 402, 9, 26, '#3b6950'); R(c, 105, 404, 2, 22, '#f0d28a');
    R(c, 101, 430, 8, 4, '#c44d38'); R(c, 102, 431, 5, 2, '#f2cf7e');

    // North upright cutaway carved doorjamb post (outlined)
    R(c, 98, 348, 16, 43, OUTLINE);
    R(c, 99, 349, 14, 41, '#473020');
    R(c, 101, 351, 5, 37, '#9c6e42');
    R(c, 99, 348, 14, 3, '#d4a66a');
    // Rabbeted brass-trimmed threshold sill strip
    R(c, 110, 390, 3, 52, '#5e3f24'); R(c, 112, 412, 1, 8, '#ebd07e');

    // Layered warm amber bedroom lamp cone spilling onto living-room runner when ajar!
    if (a > 0.03) {
      const openK = Math.min(1, a / 0.74);
      const reach = Math.round(16 + openK * 40);
      c.globalAlpha = 0.22 * openK;
      poly(c, [[113, 391], [113 + reach, 383], [113 + reach, 449], [113, 441]], '#ffd98a');
      c.globalAlpha = 0.12 * openK;
      poly(c, [[113, 398], [113 + Math.round(reach * 0.6), 394], [113 + Math.round(reach * 0.6), 438], [113, 434]], '#fff3c4');
      c.globalAlpha = 1;
    }

    // Upright 2.5D Bedroom Door Leaf (hinged at North jamb hx=111, hyBot=391, height=38px)
    const spanY = 49;
    const tx = 111 + Math.round(Math.sin(a) * 27);
    const tyBot = 391 + Math.round(Math.cos(a) * spanY);
    const hyBot = 391;
    const hyTop = hyBot - doorH;
    const tyTop = tyBot - doorH;

    if (a > 0.05) {
      c.globalAlpha = 0.26;
      poly(c, [[111, hyBot + 1], [tx + 3, tyBot + 2], [tx - 1, tyBot + 5], [111, hyBot + 3]], '#140d08');
      c.globalAlpha = 1;
    }

    const bedFaceCol = swingTone(a, '#785130', '#875c37', '#94673f');
    // Outlined upright wooden door quad
    poly(c, [[107, hyTop - 1], [tx + 1, tyTop - 1], [tx + 1, tyBot + 1], [110, hyBot + 1]], OUTLINE);
    poly(c, [[111, hyTop], [tx, tyTop], [tx, tyBot], [111, hyBot]], bedFaceCol);

    // Twin recessed carved panels on the swinging face
    if (a > 0.07) {
      const p0x = Math.round(111 + (tx - 111) * 0.16), p0y = Math.round(hyBot + (tyBot - hyBot) * 0.16);
      const p1x = Math.round(111 + (tx - 111) * 0.84), p1y = Math.round(hyBot + (tyBot - hyBot) * 0.84);
      poly(c, [[p0x, p0y - 33], [p1x, p1y - 33], [p1x, p1y - 20], [p0x, p0y - 20]], '#a47649');
      poly(c, [[p0x, p0y - 16], [p1x, p1y - 16], [p1x, p1y - 5], [p0x, p0y - 5]], '#96693f');
    }

    // Sunlit 3px top wooden thickness rail + free-stile solid edge
    poly(c, [[108, hyTop], [tx - 3, tyTop], [tx, tyTop], [111, hyTop]], '#d9ab6e');
    poly(c, [[tx - 3, tyTop], [tx, tyTop], [tx, tyBot], [tx - 3, tyBot]], '#472e1b');

    // Depressing brass lever handle & latch tongue
    const handleDrop = sp.vel > 0.12 ? 1 : 0;
    const kx = Math.round(111 + (tx - 111) * 0.82);
    const ky = Math.round(hyBot + (tyBot - hyBot) * 0.82) - 17;
    R(c, kx - 1, ky - 1, 3, 5, '#b88c42');
    R(c, kx - 1, ky + handleDrop, 5, 2, '#fff2b2');

    // South cutaway jamb cap (seats the closed door cleanly into the cutaway wall!)
    R(c, 98, 438, 16, 9, OUTLINE);
    R(c, 99, 439, 14, 7, '#473020');
    R(c, 101, 439, 10, 3, '#c49458');
  }
}

/**
 * Draws a single 36px-tall upright 2.5D Kalimantan Carved Ulin Front Door Leaf
 * with crisp pixel outline, vertical plank seams, Dayak sun-shield relief, brass kickplate & animated lever!
 */
function drawUprightFrontLeaf(
  c: CanvasRenderingContext2D,
  hx: number,
  hyBot: number,
  dx: number,
  dy: number,
  side: 1 | -1, // +1 = left leaf, -1 = right leaf
  sp: DoorSpring,
) {
  const angle = sp.angle;
  const doorH = 36;
  const tx = hx + dx;
  const tyBot = hyBot + dy;
  const hyTop = hyBot - doorH;
  const tyTop = tyBot - doorH;
  const lx = side > 0 ? hx : tx;
  const rx = side > 0 ? tx : hx;
  const lyTop = side > 0 ? hyTop : tyTop;
  const ryTop = side > 0 ? tyTop : hyTop;
  const lyBot = side > 0 ? hyBot : tyBot;
  const ryBot = side > 0 ? tyBot : hyBot;

  // Cast angled door shadow onto the veranda landing & steps
  c.globalAlpha = 0.28;
  poly(c, [
    [hx, hyBot + 2],
    [tx, tyBot + 2],
    [tx + side * 3, tyBot + 8],
    [hx, hyBot + 7],
  ], '#120c07');
  c.globalAlpha = 1;

  // Dynamic timber lighting as the door turns from indoor warm light into outdoor veranda light
  const faceCol = side > 0
    ? swingTone(angle, '#785030', '#6b4629', '#5c3b22')
    : swingTone(angle, '#704a2c', '#634025', '#54361f');

  // Crisp dark pixel-art silhouette around entire upright leaf + top bevel!
  poly(c, [
    [lx - 1, lyTop - 4],
    [rx + 1, ryTop - 4],
    [rx + 1, ryBot + 1],
    [lx - 1, lyBot + 1],
  ], OUTLINE);

  // Upright carved ironwood door face
  poly(c, [[lx, lyTop], [rx, ryTop], [rx, ryBot], [lx, lyBot]], faceCol);

  // Vertical plank grain, recessed panels & 3D-foreshortened Dayak Sun-Shield Medallion (continuous across ALL swing angles!)
  {
    const absDx = Math.abs(dx);
    if (absDx >= 9) {
      for (const f of [0.33, 0.66]) {
        const gx = Math.round(hx + dx * f);
        const gyB = Math.round(hyBot + dy * f);
        R(c, gx, gyB - doorH + 2, 1, doorH - 5, '#4c311c');
      }
    }

    const p0x = Math.round(hx + dx * 0.15), p0y = Math.round(hyBot + dy * 0.15);
    const p1x = Math.round(hx + dx * 0.85), p1y = Math.round(hyBot + dy * 0.85);
    // Upper recessed carved panel + inner gold-ochre bevel
    poly(c, [[p0x, p0y - 31], [p1x, p1y - 31], [p1x, p1y - 18], [p0x, p0y - 18]], '#4d321d');
    if (absDx >= 6) {
      poly(c, [[p0x + side, p0y - 30], [p1x - side, p1y - 30], [p1x - side, p1y - 19], [p0x + side, p0y - 19]], '#9e6f43');
    }

    // 3D-foreshortened Kalimantan Dayak Sun-Shield Medallion pinned to the angled leaf tangent (0.34..0.66) so it NEVER disappears!
    const mLx = Math.round(hx + dx * 0.35), mLy = Math.round(hyBot + dy * 0.35) - 24;
    const mCx = Math.round(hx + dx * 0.50), mCy = Math.round(hyBot + dy * 0.50) - 24;
    const mRx = Math.round(hx + dx * 0.65), mRy = Math.round(hyBot + dy * 0.65) - 24;
    poly(c, [[mCx, mCy - 5], [mRx, mRy], [mCx, mCy + 5], [mLx, mLy]], '#f0d488');
    const iLx = Math.round(hx + dx * 0.41), iLy = Math.round(hyBot + dy * 0.41) - 24;
    const iRx = Math.round(hx + dx * 0.59), iRy = Math.round(hyBot + dy * 0.59) - 24;
    poly(c, [[mCx, mCy - 3], [iRx, iRy], [mCx, mCy + 3], [iLx, iLy]], '#bd4834');
    R(c, mCx - (absDx >= 12 ? 1 : 0), mCy - 1, absDx >= 12 ? 2 : 1, 2, '#fff6cc');

    // Lower recessed carved panel
    poly(c, [[p0x, p0y - 14], [p1x, p1y - 14], [p1x, p1y - 5], [p0x, p0y - 5]], '#4d321d');
    if (absDx >= 6) {
      poly(c, [[p0x + side, p0y - 13], [p1x - side, p1y - 13], [p1x - side, p1y - 6], [p0x + side, p0y - 6]], '#8c6039');
    }

    // Protective weathered brass kickplate along bottom rail!
    poly(c, [[p0x, p0y - 3], [p1x, p1y - 3], [p1x, p1y - 1], [p0x, p0y - 1]], '#c49b50');
  }

  // Sunlit 3px top wooden thickness rail + bright inner bevel highlight
  poly(c, [[lx, lyTop - 3], [rx, ryTop - 3], [rx, ryTop], [lx, lyTop]], '#d9ab6e');
  poly(c, [[lx, lyTop - 3], [rx, ryTop - 3], [rx, ryTop - 2], [lx, lyTop - 2]], '#f2cf98');

  // Solid 3px meeting-stile thickness face & retracting spring latch bolt when open
  if (angle > 0.07) {
    const edgeX = side > 0 ? tx - 2 : tx - 1;
    R(c, edgeX, tyTop - 2, 3, doorH + 2, '#3b2514');
    // Gleaming brass spring-latch bolt protruding from meeting stile (retracts while unlatching!)
    if (sp.vel <= 0.18) {
      R(c, side > 0 ? tx : tx - 2, tyBot - 17, 2, 3, '#f7dc88');
    }
  } else {
    // Crisp center meeting seam at x=440 when closed flush
    R(c, 439, hyTop - 3, 2, doorH + 3, OUTLINE);
  }

  // Wrought-iron & brass pivot strap hinges on outer jamb
  const hX = side > 0 ? hx : hx - 4;
  R(c, hX, hyTop + 6, 4, 4, '#362c26'); R(c, side > 0 ? hx : hx - 2, hyTop + 7, 2, 2, '#e8c468');
  R(c, hX, hyBot - 10, 4, 4, '#362c26'); R(c, side > 0 ? hx : hx - 2, hyBot - 9, 2, 2, '#e8c468');

  // Animated Brass Escutcheon & Lever Handle (tilts downward on unlatch + glints when latching shut!)
  const handleDrop = sp.vel > 0.14 ? 2 : 0;
  const kx = Math.round(hx + dx * 0.82);
  const ky = Math.round(hyBot + dy * 0.82) - 17;
  R(c, kx - 2, ky - 3, 4, 8, '#9e7638');
  R(c, kx - 3, ky - 1 + handleDrop, 6, 3, sp.latchFlash > 0.3 ? '#ffffff' : '#fff0ad');
  R(c, kx - 1, ky + 3, 2, 2, '#362214'); // keyhole
}

/**
 * Draws the Foreground 2.5D Cutaway Threshold Jamb Posts, Sill & Upright Double Doors (depth y=534).
 */
export function drawHouseFrontDoor(c: CanvasRenderingContext2D, rig: DoorRig) {
  const sp = rig.houseFront;
  const a = sp.angle;

  // Stepped ironwood doorway threshold sill + recessed rabbet + gleaming brass strike plate
  R(c, 401, 529, 78, 8, OUTLINE);
  R(c, 402, 530, 76, 6, '#593c23');
  R(c, 404, 530, 72, 3, '#c4965a');
  R(c, 404, 533, 72, 2, '#3d2716');
  R(c, 435, 530, 10, 3, sp.latchFlash > 0.3 ? '#fff9d6' : '#f2cf78');
  R(c, 439, 531, 2, 2, '#6e4c24'); // center bolt socket

  // Upright 48px-tall Carved Kayu Ulin Doorway Jamb Posts (with dark pixel outlines & Dayak scroll inlays!)
  for (const jx of [393, 475]) {
    R(c, jx, 496, 12, 50, OUTLINE);
    R(c, jx + 1, 498, 10, 47, '#4c321e');
    R(c, jx + 3, 500, 6, 43, '#8f6239');
    R(c, jx + 4, 506, 4, 28, '#b3814e');
    // Carved Dayak diamond & scroll inlay on each jamb post
    R(c, jx + 5, 514, 2, 10, '#f0d284');
    R(c, jx + 4, 518, 4, 2, '#c44b35');
    // Beveled cutaway post cap + highlight
    R(c, jx, 495, 12, 4, OUTLINE);
    R(c, jx + 1, 496, 10, 3, '#dfa668');
    R(c, jx + 2, 496, 8, 1, '#fae0b0');
  }

  // Twin 36px-wide x 36px-tall carved Kalimantan door leaves swinging outward onto veranda!
  const leafSpan = 36;
  const dx = Math.round(Math.cos(a) * leafSpan);
  const dy = Math.round(Math.sin(a) * 20);

  drawUprightFrontLeaf(c, 404, 534, dx, dy, 1, sp);
  drawUprightFrontLeaf(c, 476, 534, -dx, dy, -1, sp);
}

/**
 * Draws Village Exterior Rumah Wira Carved Front Door, Transom Fanlight & Miniature Foyer Inside Sprite.
 */
export function drawVillageDoors(c: CanvasRenderingContext2D, rig: DoorRig) {
  const sp = rig.villageHome;
  const a = sp.angle;
  const fullW = 34, x0 = 193, yTop = 161, h = 41; // y=161..202 beneath carved transom fanlight (154..161)

  // Outer dark doorway rabbet
  R(c, x0 - 1, 154, fullW + 2, 49, OUTLINE);

  // --- 1. Carved Kalimantan Transom Fanlight Window above Door (y=154..160, glowing warmly!) ---
  R(c, x0, 154, fullW, 6, '#4a311d');
  for (let fx = x0 + 2; fx < x0 + fullW - 3; fx += 6) {
    R(c, fx, 155, 4, 4, '#f5d484'); // warm indoor lamp glow through transom panes!
    R(c, fx + 1, 156, 2, 2, '#fff5c8');
  }
  R(c, x0, 160, fullW, 2, '#8c6139'); // transom mullion bar

  // --- 2. Miniature 2.5D Foyer Inside Sprite (revealed when door swings inward!) ---
  R(c, x0, yTop, fullW, h, '#21150d');
  if (a > 0.03) {
    // Warm interior back wall wainscot + glowing pendant ceiling lamp
    R(c, x0 + 2, yTop + 1, fullW - 4, 17, '#634126');
    R(c, x0 + 2, yTop + 16, fullW - 4, 2, '#3d2817');
    R(c, x0 + 8, yTop + 2, fullW - 16, 11, '#b57e42');
    R(c, x0 + 16, yTop + 1, 2, 3, '#3d2817'); // lamp cord
    R(c, x0 + 13, yTop + 3, 8, 5, '#ffe89e');
    R(c, x0 + 15, yTop + 4, 4, 3, '#fffbe0');

    // Perspective ulin floorboards inside foyer (y=179..202)
    R(c, x0 + 1, yTop + 18, fullW - 2, 23, '#a47446');
    for (let py = yTop + 22; py < yTop + 40; py += 6) {
      R(c, x0 + 1, py, fullW - 2, 1, '#6b492b');
      R(c, x0 + 1, py + 1, fullW - 2, 1, '#c89660');
    }
    // Wira's crimson-and-gold Dayak ikat medallion rug visible inside the foyer!
    poly(c, [[x0 + 6, yTop + 24], [x0 + fullW - 6, yTop + 24], [x0 + fullW - 3, yTop + 37], [x0 + 3, yTop + 37]], '#ad4633');
    poly(c, [[x0 + 9, yTop + 26], [x0 + fullW - 9, yTop + 26], [x0 + fullW - 7, yTop + 34], [x0 + 7, yTop + 34]], '#f0d48c');
    R(c, x0 + 14, yTop + 29, 6, 3, '#385c47');

    // Warm indoor foyer light spilling onto the front porch planks & top stair!
    const spillA = Math.min(1, a);
    c.globalAlpha = 0.24 * spillA;
    poly(c, [
      [x0, yTop + h],
      [x0 + fullW, yTop + h],
      [x0 + fullW + 10, yTop + h + 12],
      [x0 - 6, yTop + h + 12],
    ], '#ffd984');
    c.globalAlpha = 1;
  }

  // --- 3. 3D Foreshortened Carved Kayu Ulin Front Door Leaf (hinged on left jamb x=193, swings inward) ---
  const leafW = Math.max(4, Math.round(fullW * Math.cos(a)));
  const persp = Math.round(Math.sin(a) * 5);
  const doorFaceCol = swingTone(a, '#785030', '#694528', '#593920');

  // Outlined inward-swinging door quad
  poly(c, [
    [x0 - 1, yTop - 1],
    [x0 + leafW + 1, yTop + persp - 1],
    [x0 + leafW + 1, yTop + h - persp + 1],
    [x0 - 1, yTop + h + 1],
  ], OUTLINE);
  poly(c, [
    [x0, yTop],
    [x0 + leafW, yTop + persp],
    [x0 + leafW, yTop + h - persp],
    [x0, yTop + h],
  ], doorFaceCol);

  // Left hinge-stile highlight & warm foyer-lit solid-wood inner thickness edge when open!
  R(c, x0, yTop, 2, h, '#b88652');
  if (a > 0.08) {
    R(c, x0 + leafW, yTop + persp, 2, h - persp * 2, '#dfb272'); // inner stile catching warm foyer lamp!
    R(c, x0 + leafW + 2, yTop + persp + 1, 1, h - persp * 2 - 2, OUTLINE);
  }

  // Recessed carved teak panels, foreshortened Dayak center emblem & brass handle across ALL swing angles!
  {
    const kW = leafW / fullW;
    const padX = Math.max(1, Math.round(4 * kW));
    const inW = Math.max(2, leafW - padX * 2 + 1);
    const pUp = Math.round(persp * 0.75);

    // Upper recessed carved teak panel
    poly(c, [
      [x0 + padX, yTop + 4],
      [x0 + padX + inW, yTop + 4 + pUp],
      [x0 + padX + inW, yTop + 18 + Math.round(pUp * 0.4)],
      [x0 + padX, yTop + 18],
    ], '#4d321d');
    if (inW >= 4) {
      poly(c, [
        [x0 + padX + 1, yTop + 5],
        [x0 + padX + inW - 1, yTop + 5 + pUp],
        [x0 + padX + inW - 1, yTop + 17 + Math.round(pUp * 0.4)],
        [x0 + padX + 1, yTop + 17],
      ], '#96683e');
    }

    // Lower recessed carved teak panel + brass kickplate
    poly(c, [
      [x0 + padX, yTop + 23],
      [x0 + padX + inW, yTop + 23 - Math.round(pUp * 0.3)],
      [x0 + padX + inW, yTop + 36 - pUp],
      [x0 + padX, yTop + 36],
    ], '#4d321d');
    if (inW >= 4) {
      poly(c, [
        [x0 + padX + 1, yTop + 24],
        [x0 + padX + inW - 1, yTop + 24 - Math.round(pUp * 0.3)],
        [x0 + padX + inW - 1, yTop + 35 - pUp],
        [x0 + padX + 1, yTop + 35],
      ], '#875c36');
    }
    R(c, x0 + Math.max(1, padX - 1), yTop + h - persp - 3, Math.max(2, leafW - padX * 2 + 2), 2, '#bd944c');

    // Foreshortened Dayak sun-diamond middle icon — scales smoothly with leafW/fullW so it NEVER disappears mid-swing!
    const cx = x0 + Math.max(2, Math.round(leafW * 0.52));
    const cy = yTop + 11 + Math.round(pUp * 0.42);
    const rxOuter = Math.max(1, Math.round(5 * kW));
    const rxInner = Math.max(1, Math.round(3 * kW));
    const dSkew = Math.round(pUp * 0.25);
    poly(c, [
      [cx, cy - 4],
      [cx + rxOuter, cy + dSkew],
      [cx, cy + 4],
      [cx - rxOuter, cy - dSkew],
    ], '#f2d688');
    poly(c, [
      [cx, cy - 2],
      [cx + rxInner, cy + Math.round(dSkew * 0.6)],
      [cx, cy + 2],
      [cx - rxInner, cy - Math.round(dSkew * 0.6)],
    ], '#bd4834');
    R(c, cx, cy, Math.max(1, Math.round(2 * kW)), 1, '#fff8d4');

    // Depressing brass lever handle & keyhole escutcheon
    const drop = sp.vel > 0.14 ? 1 : 0;
    const hx = x0 + Math.max(2, leafW - Math.max(2, Math.round(5 * kW)));
    const hy = yTop + 19 + Math.round(persp * 0.15);
    R(c, hx, hy, Math.max(2, Math.round(3 * kW)), 6, '#9c7436');
    R(c, Math.max(x0 + 1, hx - 1), hy + 1 + drop, Math.max(2, Math.round(4 * kW)), 2, sp.latchFlash > 0.3 ? '#ffffff' : '#fff0ad');
  }

  // Wrought-iron strap hinges with brass pivot pins on left jamb
  R(c, x0 - 1, yTop + 6, 4, 3, '#332b26'); R(c, x0, yTop + 7, 2, 1, '#e8c468');
  R(c, x0 - 1, yTop + 31, 4, 3, '#332b26'); R(c, x0, yTop + 32, 2, 1, '#e8c468');
}
