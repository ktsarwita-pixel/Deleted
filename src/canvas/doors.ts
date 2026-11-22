/* Spring-hinged 3D pixel-art doors for Rumah Wira (interior & exterior) and Warung Budi. */
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
  houseWardrobe: DoorSpring;
  houseBedroom: DoorSpring;
  villageHome: DoorSpring;
  villageShop: DoorSpring;
}

export function createDoorRig(scene: string): DoorRig {
  return {
    scene,
    // Start open when entering/spawning so the player sees the door swing shut behind them!
    houseFront: { angle: scene === 'house' ? 0.95 : 0, vel: 0, wasOpen: scene === 'house' },
    houseWardrobe: { angle: scene === 'house' ? 0.36 : 0, vel: 0, wasOpen: false },
    houseBedroom: { angle: 0, vel: 0, wasOpen: false },
    villageHome: { angle: scene === 'village' ? 1.05 : 0, vel: 0, wasOpen: scene === 'village' },
    villageShop: { angle: 0, vel: 0, wasOpen: false },
  };
}

function stepDoor(d: DoorSpring, target: number, dt: number, stiffness: number, damping: number, playLatch = false) {
  if (dt <= 0) return;
  const h = Math.min(dt, 1 / 30);
  const steps = 2;
  const sh = h / steps;
  for (let i = 0; i < steps; i++) {
    const acc = (target - d.angle) * stiffness - d.vel * damping;
    d.vel += acc * sh;
    d.angle += d.vel * sh;
  }
  d.angle = Math.max(0, Math.min(1.32, d.angle));
  const nowOpen = target > 0.25;
  if (nowOpen !== d.wasOpen) {
    d.wasOpen = nowOpen;
    if (playLatch) soundEngine.playDoorLatch(nowOpen);
  }
}

export function updateDoors(rig: DoorRig, w: GameWorld, dt: number) {
  if (rig.scene !== w.scene) {
    const enteredVillage = w.scene === 'village';
    rig.scene = w.scene;
    if (enteredVillage) {
      rig.villageHome.angle = 1.12; rig.villageHome.vel = 0; rig.villageHome.wasOpen = true;
    } else {
      rig.houseFront.angle = 1.08; rig.houseFront.vel = 0; rig.houseFront.wasOpen = true;
    }
  }
  if (w.reducedMotion) {
    const p = w.player;
    if (w.scene === 'house') {
      rig.houseFront.angle = Math.hypot(p.x - 440, p.y - 522) < 118 ? 1.12 : 0;
      rig.houseWardrobe.angle = Math.hypot(p.x - 204, p.y - 198) < 88 ? 0.92 : 0;
      rig.houseBedroom.angle = Math.hypot(p.x - 122, p.y - 412) < 78 ? 0.42 : 0;
    } else {
      rig.villageHome.angle = Math.hypot(p.x - 210, p.y - 275) < 108 ? 1.05 : 0;
      rig.villageShop.angle = Math.hypot(p.x - 492, p.y - 246) < 92 ? 0.72 : 0;
    }
    return;
  }

  const p = w.player;
  if (w.scene === 'house') {
    const headingExit = w.destination ? Math.hypot(w.destination.x - 440, w.destination.y - 518) < 24 : false;
    const distExit = Math.hypot(p.x - 440, p.y - 524);
    const wantFront = (distExit < 122 || (headingExit && distExit < 175)) ? 1.15 : 0;
    stepDoor(rig.houseFront, wantFront, dt, 145, 13.5, w.time > 0.45);

    const walletLeft = !w.collectibles.find(c => c.id === 'wallet')?.collected;
    const headingWallet = w.prompt?.id === 'wallet' || (w.destination ? Math.hypot(w.destination.x - 254, w.destination.y - 207) < 28 : false);
    const distWardrobe = Math.hypot(p.x - 214, p.y - 204);
    const wantWardrobe = (distWardrobe < (walletLeft ? 98 : 74) || headingWallet) ? 0.98 : (walletLeft ? 0.36 : 0);
    stepDoor(rig.houseWardrobe, wantWardrobe, dt, 165, 15, w.time > 0.45);

    const distBedDoor = Math.hypot(p.x - 124, p.y - 412);
    stepDoor(rig.houseBedroom, distBedDoor < 82 ? 0.46 : 0, dt, 130, 14, false);
  } else {
    const headingHome = w.destination ? Math.hypot(w.destination.x - 210, w.destination.y - 293) < 24 : false;
    const distHome = Math.hypot(p.x - 210, p.y - 276);
    const wantHome = (distHome < 112 || (headingHome && distHome < 165)) ? 1.08 : 0;
    stepDoor(rig.villageHome, wantHome, dt, 140, 13.5, w.time > 0.45);

    const distShop = Math.hypot(p.x - 494, p.y - 252);
    stepDoor(rig.villageShop, distShop < 95 ? 0.78 : 0, dt, 150, 14, false);
  }
}

/**
 * Draws the House Interior doors:
 * 1) Wardrobe (Lemari) hinged double doors on the North-West cabinet
 * 2) West wall Bedroom/Dapur recessed side door
 * 3) Front Threshold Double Doors (Pintu Kupu-Tarung Kayu Ulin) + sunlit floor spill
 */
export function drawHouseBackDoors(c: CanvasRenderingContext2D, rig: DoorRig, smokyOutside: boolean) {
  // Warm daylight / smoky amber light wedge spilling inward across the threshold mat as the front doors swing open!
  {
    const openRatio = Math.min(1, rig.houseFront.angle / 1.05);
    if (openRatio > 0.03) {
      const spread = Math.round(18 + openRatio * 24);
      const reach = Math.round(22 + openRatio * 42);
      c.globalAlpha = (smokyOutside ? 0.20 : 0.24) * openRatio;
      poly(c, [
        [404, 533], [476, 533],
        [476 + spread, 533 - reach], [404 - spread, 533 - reach],
      ], smokyOutside ? '#f2a85c' : '#fff0ab');
      c.globalAlpha = 1;
    }
  }
  // --- 1. North-West Lemari Wardrobe Hinged Double Doors (x=144..244, y=140..186) ---
  {
    const a = rig.houseWardrobe.angle;
    // Interior wardrobe recess visible when doors swing open!
    if (a > 0.03) {
      R(c, 145, 141, 98, 44, '#2b1c12');
      R(c, 145, 162, 98, 3, '#6e4c2e'); // middle shelf
      // Neatly folded batik textiles & storage box inside the lemari!
      R(c, 150, 151, 20, 11, '#b84c38'); R(c, 152, 153, 16, 3, '#f2d084');
      R(c, 174, 153, 18, 9, '#3e7358'); R(c, 176, 155, 14, 2, '#cbe6d4');
      R(c, 208, 149, 24, 13, '#cfa362'); R(c, 212, 153, 16, 3, '#6e4929');
      R(c, 152, 170, 26, 13, '#496e7d'); R(c, 184, 172, 22, 11, '#d9b56c');
      R(c, 212, 169, 22, 14, '#8c4332');
    }
    const leafW = Math.max(6, Math.round(49 * Math.cos(a)));
    const skew = Math.round(14 * Math.sin(a));
    // Left cabinet leaf hinged at x=145
    poly(c, [[145, 141], [145 + leafW, 141 + skew], [145 + leafW, 185 + skew], [145, 185]], '#7d5634');
    poly(c, [[148, 144], [145 + Math.max(4, leafW - 3), 144 + skew], [145 + Math.max(4, leafW - 3), 182 + skew], [148, 182]], '#9e7246');
    // Right cabinet leaf hinged at x=243
    poly(c, [[243, 141], [243 - leafW, 141 + skew], [243 - leafW, 185 + skew], [243, 185]], '#734e2f');
    poly(c, [[240, 144], [243 - Math.max(4, leafW - 3), 144 + skew], [243 - Math.max(4, leafW - 3), 182 + skew], [240, 182]], '#94693f');
    // Brass hinges & handles
    R(c, 144, 146, 3, 5, '#d9b468'); R(c, 144, 176, 3, 5, '#d9b468');
    R(c, 241, 146, 3, 5, '#d9b468'); R(c, 241, 176, 3, 5, '#d9b468');
    if (leafW > 10) {
      R(c, 145 + leafW - 5, 161 + skew, 3, 6, '#f0ce7a');
      R(c, 243 - leafW + 2, 161 + skew, 3, 6, '#f0ce7a');
    }
    // Door thickness edge when open
    if (a > 0.12) {
      R(c, 145 + leafW, 141 + skew, 2, 44, '#4a311c');
      R(c, 241 - leafW, 141 + skew, 2, 44, '#4a311c');
    }
  }

  // --- 2. West Cutaway Wall Side Bedroom Door (x=101..113, y=378..444) ---
  {
    const a = rig.houseBedroom.angle;
    // Carved side doorframe in West cutaway wall
    R(c, 99, 374, 15, 74, '#3a2618');
    R(c, 101, 377, 11, 68, '#23170e'); // dark bedroom doorway recess
    if (a > 0.04) {
      // Warm amber bedroom lamp sliver spilling across the ulin floor when door cracks open!
      const spill = Math.round(a * 48);
      c.globalAlpha = 0.22 * (a / 0.46);
      poly(c, [[112, 380], [112 + spill, 372], [112 + spill, 448], [112, 442]], '#ffd88a');
      c.globalAlpha = 1;
    }
    // Hinged side door leaf (hinged at top y=378, swinging slightly into room)
    const swingX = Math.round(Math.sin(a) * 18);
    const lenY = Math.round(66 * Math.cos(a * 0.35));
    poly(c, [[104, 378], [111 + swingX, 378 + Math.round(swingX * 0.25)], [111 + swingX, 378 + lenY], [104, 378 + lenY]], '#8f643c');
    R(c, 105, 379, 3, lenY - 2, '#bd8e56');
    R(c, 109 + swingX, 408, 3, 5, '#efd080'); // brass lever handle
  }

}

export function drawHouseFrontDoor(c: CanvasRenderingContext2D, rig: DoorRig) {
  // --- 3. Front Threshold Double Doors (Pintu Kupu-Tarung Kayu Ulin, x=404..476, y=533) ---
  {
    const a = rig.houseFront.angle;

    // Carved Ulin Door Jambs & Threshold Sill Plate
    R(c, 396, 529, 10, 19, '#3b2618'); R(c, 398, 530, 6, 16, '#8f643b');
    R(c, 474, 529, 10, 19, '#3b2618'); R(c, 476, 530, 6, 16, '#8f643b');
    R(c, 404, 533, 72, 4, '#6e4d2e'); R(c, 404, 534, 72, 1, '#cfa468'); // brass-trimmed sill

    // Twin 36px carved Kalimantan door leaves swinging OUTWARD onto the front veranda steps!
    const leafSpan = 36;
    const dx = Math.round(Math.cos(a) * leafSpan);
    const dy = Math.round(Math.sin(a) * leafSpan * 0.72); // outward south swing (+y)

    // Cast door shadows onto the veranda steps
    c.globalAlpha = 0.28;
    poly(c, [[404, 540], [404 + dx, 540 + dy], [404 + dx, 546 + dy], [404, 546]], '#120d09');
    poly(c, [[476, 540], [476 - dx, 540 + dy], [476 - dx, 546 + dy], [476, 546]], '#120d09');
    c.globalAlpha = 1;

    // Left Door Leaf (hinged at 404, 535)
    drawThresholdLeaf(c, 404, 532, dx, dy, 1, a);
    // Right Door Leaf (hinged at 476, 535)
    drawThresholdLeaf(c, 476, 532, -dx, dy, -1, a);

    // Wrought-iron strap hinge pins on both jambs
    R(c, 402, 533, 4, 4, '#d9b566'); R(c, 474, 533, 4, 4, '#d9b566');
  }
}

function drawThresholdLeaf(
  c: CanvasRenderingContext2D, hx: number, hy: number, dx: number, dy: number, side: 1 | -1, angle: number,
) {
  const tx = hx + dx, ty = hy + dy;
  const thick = 8; // visible top-down + cutaway leaf thickness
  // Dark ironwood door body
  poly(c, [[hx, hy], [tx, ty], [tx, ty + thick], [hx, hy + thick]], '#593b22');
  // Top beveled timber edge (catches warm indoor lamp light)
  poly(c, [[hx, hy], [tx, ty], [tx, ty + 3], [hx, hy + 3]], '#bd8e54');
  // Recessed carved gold-ochre Dayak panel insert along the face
  const p0x = Math.round(hx + dx * 0.18), p0y = Math.round(hy + dy * 0.18);
  const p1x = Math.round(hx + dx * 0.82), p1y = Math.round(hy + dy * 0.82);
  poly(c, [[p0x, p0y + 3], [p1x, p1y + 3], [p1x, p1y + 6], [p0x, p0y + 6]], '#8f6239');
  // Carved Dayak diamond medallion in center of leaf
  const mx = Math.round(hx + dx * 0.5), my = Math.round(hy + dy * 0.5);
  R(c, mx - 2, my + 3, 4, 3, '#e8be70');
  // Meeting-stile thickness face when swung open
  if (angle > 0.12) {
    R(c, side > 0 ? tx - 2 : tx, ty, 3, thick + 1, '#3b2616');
  }
  // Gleaming brass ring handle & latch bolt near the meeting edge (85% along leaf)
  const kx = Math.round(hx + dx * 0.84), ky = Math.round(hy + dy * 0.84);
  R(c, kx - 2, ky - 1, 4, 3, '#f5d782'); // indoor brass lever
  R(c, kx - 2, ky + thick - 1, 4, 3, '#e3be68'); // outdoor brass lever
}

/**
 * Draws Village Exterior animated doors on Rumah Wira (193..227, 154..203) & Warung Budi (470..508, 182..208).
 */
export function drawVillageDoors(c: CanvasRenderingContext2D, rig: DoorRig) {
  // --- 1. Rumah Wira Exterior Carved Ulin Front Door (hinged on left jamb x=193, y=155..202) ---
  {
    const a = rig.villageHome.angle;
    const fullW = 34, h = 47, x0 = 193, y0 = 155;
    // Warm indoor room visible inside doorway when door swings open!
    R(c, x0, y0, fullW, h, '#24170e');
    if (a > 0.05) {
      // Glowing interior floorboards, Dayak rug glimpse & warm ceiling lamp inside Rumah Wira!
      R(c, x0 + 2, y0 + 4, fullW - 4, h - 6, '#5c3c20');
      R(c, x0 + 5, y0 + 8, fullW - 10, 24, '#8f5d30');
      R(c, x0 + 8, y0 + 12, fullW - 16, 12, '#bd8244'); // warm indoor lamp glow
      R(c, x0 + 6, y0 + 34, fullW - 12, 10, '#a84734'); // Dayak rug glimpse!
      R(c, x0 + 10, y0 + 36, fullW - 20, 4, '#ebd08e');
      // Warm light spilling onto the front porch deck!
      c.globalAlpha = 0.24 * Math.min(1, a);
      poly(c, [[x0, y0 + h], [x0 + fullW, y0 + h], [x0 + fullW + 10, y0 + h + 12], [x0 - 6, y0 + h + 12]], '#ffd884');
      c.globalAlpha = 1;
    }

    // 3D foreshortened carved Kalimantan Ulin Door Leaf (swings inward-left into foyer)
    const leafW = Math.max(5, Math.round(fullW * Math.cos(a)));
    const perspUp = Math.round(Math.sin(a) * 7); // inward perspective rise at free edge
    poly(c, [
      [x0, y0],
      [x0 + leafW, y0 + perspUp],
      [x0 + leafW, y0 + h - perspUp],
      [x0, y0 + h],
    ], '#6e492b');
    // Outer stile highlight & dark door-edge thickness
    R(c, x0, y0, 2, h, '#ad7e4c');
    if (a > 0.1) R(c, x0 + leafW, y0 + perspUp, 2, h - perspUp * 2, '#362214');

    if (leafW >= 10) {
      // Upper & lower recessed teak panels + carved Dayak sun-diamond medallion
      const inW = Math.max(3, leafW - 7);
      poly(c, [
        [x0 + 4, y0 + 5],
        [x0 + 4 + inW, y0 + 5 + Math.round(perspUp * 0.7)],
        [x0 + 4 + inW, y0 + 21 + Math.round(perspUp * 0.7)],
        [x0 + 4, y0 + 21],
      ], '#8c6139');
      poly(c, [
        [x0 + 4, y0 + 26],
        [x0 + 4 + inW, y0 + 26 + Math.round(perspUp * 0.3)],
        [x0 + 4 + inW, y0 + 42 - Math.round(perspUp * 0.7)],
        [x0 + 4, y0 + 42],
      ], '#825833');
      if (leafW >= 16) {
        const cx = x0 + Math.round(leafW * 0.52), cy = y0 + 13 + Math.round(perspUp * 0.35);
        poly(c, [[cx, cy - 5], [cx + 5, cy], [cx, cy + 5], [cx - 5, cy]], '#dfb66c');
        R(c, cx - 2, cy - 2, 4, 4, '#b54632');
      }
      // Brass ring handle & keyhole escutcheon
      const hx = x0 + leafW - 5, hy = y0 + 24;
      R(c, hx, hy, 3, 6, '#f5d782'); R(c, hx + 1, hy + 2, 2, 2, '#6e492b');
    }
    // Iron strap hinges on left jamb
    R(c, x0 - 1, y0 + 7, 4, 3, '#3b3530'); R(c, x0 - 1, y0 + 36, 4, 3, '#3b3530');
  }

  // --- 2. Warung Budi Shopkeeper Half-Door / Dutch Gate (hinged at x=470, y=184..207) ---
  {
    const a = rig.villageShop.angle;
    const fullW = 38, h = 23, x0 = 470, y0 = 184;
    const leafW = Math.max(6, Math.round(fullW * Math.cos(a)));
    const skew = Math.round(Math.sin(a) * 5);
    poly(c, [
      [x0, y0], [x0 + leafW, y0 + skew],
      [x0 + leafW, y0 + h - skew], [x0, y0 + h],
    ], '#7c5633');
    R(c, x0, y0, leafW, 2, '#cfa468');
    if (leafW > 12) {
      for (let lx = x0 + 4; lx < x0 + leafW - 4; lx += 6) R(c, lx, y0 + 4, 3, h - 8, '#5c3e23');
      R(c, x0 + leafW - 4, y0 + 8 + skew, 3, 5, '#efd080');
    }
  }
}
