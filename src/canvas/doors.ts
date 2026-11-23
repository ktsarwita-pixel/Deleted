/* Critically-damped 2.5D pixel-art doors & doorway interior sprites for Rumah Wira. */
import type { GameWorld } from '../game/model';
import { R, poly } from './backgrounds';
import { soundEngine } from '../audio/soundEngine';

interface DoorSpring {
  angle: number;
  vel: number;
  wasOpen: boolean;
}

export interface DoorRig {
  scene: string;
  houseFront: DoorSpring;
  lemariLeft: DoorSpring;
  lemariRight: DoorSpring;
  houseBedroom: DoorSpring;
  villageHome: DoorSpring;
}

export function createDoorRig(scene: string): DoorRig {
  const inHouse = scene === 'house';
  return {
    scene,
    // Start open on scene entry so Wira sees the door smoothly swing shut behind him!
    houseFront: { angle: inHouse ? 1.22 : 0, vel: 0, wasOpen: inHouse },
    lemariLeft: { angle: 0, vel: 0, wasOpen: false },
    lemariRight: { angle: inHouse ? 0.42 : 0, vel: 0, wasOpen: false },
    houseBedroom: { angle: 0, vel: 0, wasOpen: false },
    villageHome: { angle: !inHouse ? 1.18 : 0, vel: 0, wasOpen: !inHouse },
  };
}

/**
 * Critically-damped second-order spring (zeta ~ 0.96) so heavy wooden doors
 * accelerate smoothly and settle cleanly onto their latch with zero rubbery bounce.
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
  const h = Math.min(dt, 1 / 30);
  const steps = 2;
  const sh = h / steps;
  const k = omega * omega;
  const c = 2 * 0.96 * omega;
  for (let i = 0; i < steps; i++) {
    const acc = (target - d.angle) * k - d.vel * c;
    d.vel += acc * sh;
    d.angle += d.vel * sh;
  }
  if (Math.abs(target - d.angle) < 0.004 && Math.abs(d.vel) < 0.01) {
    d.angle = target;
    d.vel = 0;
  }
  d.angle = Math.max(0, Math.min(1.32, d.angle));

  const nowOpen = target > openThreshold;
  if (nowOpen !== d.wasOpen) {
    d.wasOpen = nowOpen;
    if (playLatch) soundEngine.playDoorLatch(nowOpen);
  }
}

export function updateDoors(rig: DoorRig, w: GameWorld, dt: number) {
  const walletLeft = !w.collectibles.find(c => c.id === 'wallet')?.collected;

  if (rig.scene !== w.scene) {
    const enteredVillage = w.scene === 'village';
    rig.scene = w.scene;
    if (enteredVillage) {
      rig.villageHome.angle = 1.22;
      rig.villageHome.vel = 0;
      rig.villageHome.wasOpen = true;
    } else {
      rig.houseFront.angle = 1.24;
      rig.houseFront.vel = 0;
      rig.houseFront.wasOpen = true;
      rig.lemariLeft.angle = 0;
      rig.lemariLeft.vel = 0;
      rig.lemariRight.angle = walletLeft ? 0.42 : 0;
      rig.lemariRight.vel = 0;
    }
  }

  const p = w.player;
  const canSound = w.time > 0.45;

  if (w.reducedMotion) {
    if (w.scene === 'house') {
      rig.houseFront.angle = Math.hypot(p.x - 440, p.y - 520) < 124 ? 1.26 : 0;
      const nearWardrobe = Math.hypot(p.x - 214, p.y - 204) < 92;
      rig.lemariLeft.angle = nearWardrobe ? 1.16 : 0;
      rig.lemariRight.angle = nearWardrobe ? 1.20 : (walletLeft ? 0.42 : 0);
      rig.houseBedroom.angle = Math.hypot(p.x - 126, p.y - 414) < 84 ? 0.68 : 0;
    } else {
      rig.villageHome.angle = Math.hypot(p.x - 210, p.y - 278) < 114 ? 1.22 : 0;
    }
    return;
  }

  if (w.scene === 'house') {
    // 1. Front Double Doors: swing wide open smoothly when approaching threshold or pathing to 'exit'
    const headingExit =
      w.prompt?.id === 'exit' ||
      (w.destination ? Math.hypot(w.destination.x - 440, w.destination.y - 518) < 28 : false);
    const distExit = Math.hypot(p.x - 440, p.y - 522);
    const wantFront = distExit < 126 || (headingExit && distExit < 185) ? 1.28 : 0;
    stepDoor(rig.houseFront, wantFront, dt, 9.2, canSound, 0.5);

    // 2. North-West Lemari Wardrobe Doors: right leaf rests ajar (0.42) over wallet tray until collected;
    //    both leaves swing wide open when Wira approaches to inspect/collect!
    const headingWallet =
      w.prompt?.id === 'wallet' ||
      (w.destination ? Math.hypot(w.destination.x - 254, w.destination.y - 207) < 30 : false);
    const distWardrobe = Math.hypot(p.x - 214, p.y - 204);
    const openWardrobe = distWardrobe < (walletLeft ? 98 : 74) || headingWallet;
    stepDoor(rig.lemariLeft, openWardrobe ? 1.16 : 0, dt, 10.2, false, 0.6);
    stepDoor(rig.lemariRight, openWardrobe ? 1.22 : (walletLeft ? 0.42 : 0), dt, 11.0, canSound, 0.6);

    // 3. West Cutaway Bedroom Door: cracks smoothly inward when Wira walks along the West side
    const distBedDoor = Math.hypot(p.x - 126, p.y - 414);
    stepDoor(rig.houseBedroom, distBedDoor < 86 ? 0.72 : 0, dt, 8.8, false, 0.35);
  } else {
    // Village Exterior Rumah Wira Front Door
    const headingHome =
      w.prompt?.id === 'home' ||
      (w.destination ? Math.hypot(w.destination.x - 210, w.destination.y - 293) < 28 : false);
    const distHome = Math.hypot(p.x - 210, p.y - 278);
    const wantHome = distHome < 114 || (headingHome && distHome < 175) ? 1.22 : 0;
    stepDoor(rig.villageHome, wantHome, dt, 9.0, canSound, 0.5);
  }
}

/**
 * Draws a single hinged Lemari wardrobe door leaf in 2.5D perspective (with louvers, panel & 3D edge).
 */
function drawLemariLeaf(
  c: CanvasRenderingContext2D,
  hingeX: number,
  yTop: number,
  fullW: number,
  h: number,
  dir: 1 | -1, // +1 = left door (hinged at left), -1 = right door (hinged at right)
  angle: number,
) {
  const projW = Math.max(5, Math.round(fullW * Math.cos(angle)));
  const outY = Math.round(Math.sin(angle) * 8); // outward swing toward viewer (+y)
  const freeX = hingeX + dir * projW;
  const xMin = Math.min(hingeX, freeX);

  // Soft cast shadow on wardrobe frame when swung open
  if (angle > 0.06) {
    c.globalAlpha = 0.24 * Math.min(1, angle);
    poly(c, [
      [hingeX, yTop + h],
      [freeX, yTop + h + outY + 3],
      [freeX, yTop + h + outY + 7],
      [hingeX, yTop + h + 3],
    ], '#120b06');
    c.globalAlpha = 1;
  }

  // Main carved teak door leaf polygon
  poly(c, [
    [hingeX, yTop],
    [freeX, yTop + outY],
    [freeX, yTop + h + outY],
    [hingeX, yTop + h],
  ], dir > 0 ? '#855b37' : '#7c5432');

  // Top 3D thickness edge catching overhead room light
  poly(c, [
    [hingeX, yTop],
    [freeX, yTop + outY],
    [freeX, yTop + outY + 2],
    [hingeX, yTop + 2],
  ], '#cfa266');

  // Recessed upper louvered panel & lower solid panel (when face is wide enough)
  if (projW >= 11) {
    const pad = 4;
    const p0x = hingeX + dir * pad;
    const p1x = freeX - dir * pad;
    const p0y = yTop + Math.round(outY * (pad / fullW));
    const p1y = yTop + Math.round(outY * ((fullW - pad) / fullW));

    // Upper panel recess + tropical louver slats
    poly(c, [[p0x, p0y + 5], [p1x, p1y + 5], [p1x, p1y + 26], [p0x, p0y + 26]], '#6b472a');
    for (let ly = 8; ly <= 23; ly += 4) {
      poly(c, [[p0x + dir, p0y + ly], [p1x - dir, p1y + ly], [p1x - dir, p1y + ly + 2], [p0x + dir, p0y + ly + 2]], '#9e7044');
    }
    // Lower recessed panel
    poly(c, [[p0x, p0y + 30], [p1x, p1y + 30], [p1x, p1y + 47], [p0x, p0y + 47]], '#996c42');
    poly(c, [[p0x, p0y + 30], [p1x, p1y + 30], [p1x, p1y + 32], [p0x, p0y + 32]], '#634126');
  }

  // Solid 2px meeting-stile thickness edge when open
  if (angle > 0.08) {
    R(c, dir > 0 ? freeX - 2 : freeX, yTop + outY, 2, h, '#472e1b');
  }

  // Wrought-iron barrel hinges on outer stile
  R(c, dir > 0 ? hingeX - 1 : hingeX - 1, yTop + 7, 2, 5, '#d4af62');
  R(c, dir > 0 ? hingeX - 1 : hingeX - 1, yTop + h - 12, 2, 5, '#d4af62');

  // Gleaming brass pull knob near meeting edge
  if (projW >= 8) {
    const kx = freeX - dir * 5;
    const ky = yTop + 27 + Math.round(outY * 0.85);
    R(c, Math.max(xMin, kx - 1), ky, 3, 4, '#f7d882');
    R(c, Math.max(xMin, kx), ky + 1, 2, 2, '#fff5cc');
  }
}

/**
 * Draws House Interior Back & Side Doors + threshold light spill (rendered before collectibles & player):
 * 1) Floor light wedge from Front Threshold Double Doors
 * 2) North-West Lemari Wardrobe Hinged Double Doors (over rich hanging-batik & shelf interior!)
 * 3) West Cutaway Wall 2.5D Upright Bedroom Door + Bedroom Interior Glimpse
 */
export function drawHouseBackDoors(c: CanvasRenderingContext2D, rig: DoorRig, smokyOutside: boolean) {
  // --- 1. Warm Daylight / Smoky Amber Floor Light Wedge from Front Doorway ---
  {
    const openRatio = Math.min(1, rig.houseFront.angle / 1.15);
    if (openRatio > 0.03) {
      const spread = Math.round(16 + openRatio * 24);
      const reach = Math.round(18 + openRatio * 36);
      c.globalAlpha = (smokyOutside ? 0.18 : 0.22) * openRatio;
      poly(c, [
        [404, 531], [476, 531],
        [476 + spread, 531 - reach], [404 - spread, 531 - reach],
      ], smokyOutside ? '#f2a456' : '#fff0ad');
      c.globalAlpha = 1;
    }
  }

  // --- 2. North-West Lemari Pakaian Hinged Double Doors (x=144..244, y=131..184) ---
  // Note: When ajar/open, the detailed hanging batik shirts & cubby shelves in backgrounds.ts are revealed!
  drawLemariLeaf(c, 144, 131, 49, 53, 1, rig.lemariLeft.angle);
  drawLemariLeaf(c, 244, 131, 49, 53, -1, rig.lemariRight.angle);

  // --- 3. West Cutaway Wall 2.5D Upright Bedroom Door & Inside Bedroom Sprite (y_floor=390..442) ---
  {
    const a = rig.houseBedroom.angle;
    const doorH = 36;

    // Inside Bedroom Glimpse (visible inside the West doorway opening x=99..112, y=354..442!)
    R(c, 99, 354, 14, 36, '#593b24'); // warm bedroom inner wainscot wall
    R(c, 100, 362, 12, 2, '#9c6e42');
    // Honey ulin bedroom floorboards continuing west through doorway
    R(c, 99, 390, 14, 52, '#9e7244');
    for (let py = 396; py < 438; py += 12) {
      R(c, 99, py, 14, 2, '#6b4a2b');
      R(c, 99, py + 2, 14, 2, '#c79860');
    }
    // Cozy corner of bedroom pandan mat & indoor slippers peeking inside doorway!
    R(c, 99, 404, 8, 24, '#3e6950'); R(c, 105, 406, 2, 20, '#ebd08a');
    R(c, 102, 430, 7, 4, '#bf4d38'); // slipper toe peek

    // North & South 2.5D upright carved doorjamb posts on West cutaway wall
    R(c, 99, 350, 14, 40, '#3d2819'); R(c, 101, 351, 5, 38, '#9c6e42'); R(c, 99, 349, 14, 3, '#cfa266'); // North jamb post
    R(c, 110, 390, 3, 52, '#69472a'); // Flush brass-trimmed threshold strip

    // Warm amber bedroom lamp light spilling across the living room runner when ajar!
    if (a > 0.03) {
      const openK = Math.min(1, a / 0.72);
      const reach = Math.round(14 + openK * 38);
      c.globalAlpha = 0.22 * openK;
      poly(c, [
        [113, 391],
        [113 + reach, 384],
        [113 + reach, 448],
        [113, 441],
      ], '#ffd98a');
      c.globalAlpha = 1;
    }

    // Upright 2.5D Bedroom Door Leaf (hinged at North jamb hx=111, hyBot=391, height=36px)
    const spanY = 49;
    const tx = 111 + Math.round(Math.sin(a) * 26);
    const tyBot = 391 + Math.round(Math.cos(a) * spanY);
    const hyBot = 391;
    const hyTop = hyBot - doorH;
    const tyTop = tyBot - doorH;

    // Floor shadow under swinging door leaf
    if (a > 0.05) {
      c.globalAlpha = 0.25;
      poly(c, [[111, hyBot + 1], [tx + 3, tyBot + 2], [tx - 1, tyBot + 4], [111, hyBot + 3]], '#140d08');
      c.globalAlpha = 1;
    }

    // Door room-facing wooden leaf (36px tall upright quad!)
    poly(c, [[111, hyTop], [tx, tyTop], [tx, tyBot], [111, hyBot]], '#7d5533');
    // Recessed carved panel on door face
    if (a > 0.08) {
      const p0x = Math.round(111 + (tx - 111) * 0.18), p0yB = Math.round(hyBot + (tyBot - hyBot) * 0.18);
      const p1x = Math.round(111 + (tx - 111) * 0.82), p1yB = Math.round(hyBot + (tyBot - hyBot) * 0.82);
      poly(c, [[p0x, p0yB - 30], [p1x, p1yB - 30], [p1x, p1yB - 6], [p0x, p0yB - 6]], '#9e7044');
    }
    // Bright 3px top beveled wooden thickness rail + free-stile edge
    poly(c, [[108, hyTop], [tx - 3, tyTop], [tx, tyTop], [111, hyTop]], '#cfa266');
    poly(c, [[tx - 3, tyTop], [tx, tyTop], [tx, tyBot], [tx - 3, tyBot]], '#4a311c');
    // Brass lever handle at waist height
    const kx = Math.round(111 + (tx - 111) * 0.82);
    const ky = Math.round(hyBot + (tyBot - hyBot) * 0.82) - 16;
    R(c, kx - 1, ky, 4, 3, '#f7d882');

    // South cutaway jamb cap (drawn in front of closed door tip so the door seats cleanly into the wall!)
    R(c, 99, 438, 14, 8, '#473020'); R(c, 101, 438, 10, 3, '#c49458');
  }
}

/**
 * Draws a single 34px-tall upright 2.5D Kalimantan Carved Ulin Front Door Leaf
 * swinging outward onto the front veranda steps.
 */
function drawUprightFrontLeaf(
  c: CanvasRenderingContext2D,
  hx: number,
  hyBot: number,
  dx: number,
  dy: number,
  side: 1 | -1, // +1 = left leaf, -1 = right leaf
  angle: number,
) {
  const doorH = 34;
  const tx = hx + dx;
  const tyBot = hyBot + dy;
  const hyTop = hyBot - doorH;
  const tyTop = tyBot - doorH;

  // Cast shadow onto the veranda landing & steps
  c.globalAlpha = 0.26;
  poly(c, [
    [hx, hyBot + 2],
    [tx, tyBot + 2],
    [tx + side * 2, tyBot + 7],
    [hx, hyBot + 7],
  ], '#120c07');
  c.globalAlpha = 1;

  // Upright wooden door body (34px tall!)
  poly(c, [
    [hx, hyTop],
    [tx, tyTop],
    [tx, tyBot],
    [hx, hyBot],
  ], side > 0 ? '#6e492b' : '#664327');

  // Upper & lower recessed carved Kalimantan panels + golden Dayak diamond medallion
  const span = Math.hypot(dx, dy);
  if (span >= 12) {
    const p0x = Math.round(hx + dx * 0.16), p0y = Math.round(hyBot + dy * 0.16);
    const p1x = Math.round(hx + dx * 0.84), p1y = Math.round(hyBot + dy * 0.84);
    // Upper recessed panel + diamond carving
    poly(c, [[p0x, p0y - 29], [p1x, p1y - 29], [p1x, p1y - 17], [p0x, p0y - 17]], '#96683e');
    const mx = Math.round((p0x + p1x) * 0.5), my = Math.round((p0y + p1y) * 0.5) - 23;
    poly(c, [[mx, my - 4], [mx + 4, my], [mx, my + 4], [mx - 4, my]], '#ebd084');
    R(c, mx - 1, my - 1, 2, 2, '#b84632');
    // Lower recessed panel
    poly(c, [[p0x, p0y - 13], [p1x, p1y - 13], [p1x, p1y - 4], [p0x, p0y - 4]], '#875c36');
  }

  // Sunlit 3px top thickness bevel (gives unmistakable 2.5D cutaway solidity!)
  poly(c, [
    [hx, hyTop - 3],
    [tx, tyTop - 3],
    [tx, tyTop],
    [hx, hyTop],
  ], '#d4a66a');

  // Solid 3px meeting-stile thickness face visible as the leaf swings open
  if (angle > 0.08) {
    const edgeX = side > 0 ? tx - 2 : tx - 1;
    R(c, edgeX, tyTop - 2, 3, doorH + 2, '#3d2716');
  } else {
    // Crisp dark center meeting seam when closed flush at x=440
    R(c, 439, hyTop - 2, 2, doorH + 2, '#362214');
  }

  // Wrought-iron strap hinges anchored to the doorpost
  R(c, side > 0 ? hx : hx - 3, hyTop + 6, 3, 4, '#d9b566');
  R(c, side > 0 ? hx : hx - 3, hyBot - 9, 3, 4, '#d9b566');

  // Brass escutcheon plate & lever handle at waist height
  const kx = Math.round(hx + dx * 0.82);
  const ky = Math.round(hyBot + dy * 0.82) - 16;
  R(c, kx - 2, ky - 2, 4, 7, '#cfa252');
  R(c, kx - 2, ky, 5, 3, '#fff0ad');
}

/**
 * Draws the Foreground 2.5D Cutaway Threshold Jamb Posts, Rabbeted Sill & Upright Double Doors (depth y=534).
 */
export function drawHouseFrontDoor(c: CanvasRenderingContext2D, rig: DoorRig) {
  const a = rig.houseFront.angle;

  // Rabbeted ironwood doorway threshold sill + gleaming central brass strike plate
  R(c, 402, 530, 76, 6, '#593c23');
  R(c, 404, 531, 72, 3, '#b88c52');
  R(c, 404, 534, 72, 2, '#422b18');
  R(c, 436, 531, 8, 3, '#f0ce78'); // brass latch strike plate

  // Upright 2.5D Carved Kayu Ulin Doorway Jamb Posts (flanking x=394..404 and x=476..486, height=44px)
  for (const jx of [394, 476]) {
    R(c, jx, 500, 10, 46, '#3b2618');
    R(c, jx + 2, 501, 6, 43, '#8c6038');
    R(c, jx + 3, 508, 4, 24, '#ad7b49'); // carved vertical stile relief
    R(c, jx + 4, 517, 2, 6, '#ebd084'); // Dayak post inlay
    // Beveled cutaway post cap
    R(c, jx - 1, 497, 12, 4, '#593b24');
    R(c, jx, 496, 10, 3, '#d4a66a');
  }

  // Twin 36px-wide x 34px-tall carved Kalimantan door leaves swinging outward onto veranda!
  const leafSpan = 36;
  const dx = Math.round(Math.cos(a) * leafSpan);
  const dy = Math.round(Math.sin(a) * 20);

  drawUprightFrontLeaf(c, 404, 534, dx, dy, 1, a);
  drawUprightFrontLeaf(c, 476, 534, -dx, dy, -1, a);
}

/**
 * Draws Village Exterior Rumah Wira Carved Front Door & Miniature Foyer Inside Sprite (x=193..227, y=155..202).
 */
export function drawVillageDoors(c: CanvasRenderingContext2D, rig: DoorRig) {
  const a = rig.villageHome.angle;
  const fullW = 34, x0 = 193, yTop = 160, h = 42; // y=160..202 beneath rolled rotan blind (155..160)

  // --- 1. Miniature 2.5D Foyer Inside Sprite (visible when door swings open!) ---
  R(c, x0, 155, fullW, 47, '#21150d');
  if (a > 0.03) {
    // Warm interior back wall wainscot + overhead tungsten lamp halo
    R(c, x0 + 2, yTop, fullW - 4, 18, '#5e3e24');
    R(c, x0 + 2, yTop + 16, fullW - 4, 2, '#3d2817'); // baseboard
    R(c, x0 + 9, yTop + 2, fullW - 18, 10, '#ad783e');
    R(c, x0 + 13, yTop + 3, 8, 5, '#fae298'); // warm indoor lamp glow
    // Perspective ulin floorboards inside foyer (y=178..202)
    R(c, x0 + 1, yTop + 18, fullW - 2, 24, '#9c6e42');
    for (let py = yTop + 22; py < yTop + 41; py += 6) {
      R(c, x0 + 1, py, fullW - 2, 1, '#6b492b');
    }
    // Glimpse of Wira's crimson-and-gold Dayak ikat medallion rug inside!
    poly(c, [[x0 + 6, yTop + 25], [x0 + fullW - 6, yTop + 25], [x0 + fullW - 3, yTop + 37], [x0 + 3, yTop + 37]], '#a84432');
    poly(c, [[x0 + 9, yTop + 27], [x0 + fullW - 9, yTop + 27], [x0 + fullW - 7, yTop + 34], [x0 + 7, yTop + 34]], '#ebd08a');
    R(c, x0 + 14, yTop + 29, 6, 3, '#385c47');

    // Warm indoor lamp light spilling onto the front porch deck!
    c.globalAlpha = 0.22 * Math.min(1, a);
    poly(c, [
      [x0, yTop + h],
      [x0 + fullW, yTop + h],
      [x0 + fullW + 9, yTop + h + 11],
      [x0 - 5, yTop + h + 11],
    ], '#ffd984');
    c.globalAlpha = 1;
  }

  // Neat rolled rotan sun-blind valance mounted at top of doorway (y=155..160, never overwritten!)
  R(c, x0, 155, fullW, 5, '#be955c');
  R(c, x0, 157, fullW, 1, '#785632');
  R(c, x0, 159, fullW, 2, '#593e22');

  // --- 2. 3D Foreshortened Carved Kayu Ulin Front Door Leaf (hinged on left jamb x=193, swings inward) ---
  const leafW = Math.max(4, Math.round(fullW * Math.cos(a)));
  const persp = Math.round(Math.sin(a) * 5); // inward perspective convergence at free edge

  poly(c, [
    [x0, yTop],
    [x0 + leafW, yTop + persp],
    [x0 + leafW, yTop + h - persp],
    [x0, yTop + h],
  ], '#6e492b');

  // Left hinge-stile highlight & lit solid-wood door thickness edge when open
  R(c, x0, yTop, 2, h, '#ad7e4c');
  if (a > 0.08) {
    R(c, x0 + leafW, yTop + persp, 2, h - persp * 2, '#cfa266'); // lit inner edge catching foyer lamp!
    R(c, x0 + leafW + 2, yTop + persp + 1, 1, h - persp * 2 - 2, '#3b2616');
  }

  if (leafW >= 10) {
    const inW = Math.max(3, leafW - 7);
    const pUp = Math.round(persp * 0.75);
    // Upper recessed teak panel + carved Dayak sun-diamond
    poly(c, [
      [x0 + 4, yTop + 4],
      [x0 + 4 + inW, yTop + 4 + pUp],
      [x0 + 4 + inW, yTop + 19 + Math.round(pUp * 0.4)],
      [x0 + 4, yTop + 19],
    ], '#8f6239');
    // Lower recessed teak panel
    poly(c, [
      [x0 + 4, yTop + 24],
      [x0 + 4 + inW, yTop + 24 - Math.round(pUp * 0.3)],
      [x0 + 4 + inW, yTop + 38 - pUp],
      [x0 + 4, yTop + 38],
    ], '#825833');

    if (leafW >= 16) {
      const cx = x0 + Math.round(leafW * 0.52), cy = yTop + 11 + Math.round(pUp * 0.35);
      poly(c, [[cx, cy - 4], [cx + 4, cy], [cx, cy + 4], [cx - 4, cy]], '#ebd084');
      R(c, cx - 1, cy - 1, 3, 3, '#b54632');
    }

    // Brass ring handle & keyhole escutcheon
    const hx = x0 + leafW - 5, hy = yTop + 20;
    R(c, hx, hy, 3, 6, '#f5d782');
    R(c, hx + 1, hy + 2, 2, 2, '#5c3c22');
  }

  // Wrought-iron strap hinges on left jamb
  R(c, x0 - 1, yTop + 6, 4, 3, '#3b3530');
  R(c, x0 - 1, yTop + 32, 4, 3, '#3b3530');
}
