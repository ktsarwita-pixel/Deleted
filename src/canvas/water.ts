/* Lake geometry, water masking and surface effects shared by the renderer. */

/** Wooden jetty deck. Wira walks on top of it; ripples must never cross it. */
export const PIER = { x0: 405, x1: 479, y0: 504, y1: 634 };
/** The narrow strip Wira can actually stand on. */
export const PIER_WALK = { x0: 418, x1: 467, y1: 625 };
/** Open water bounds (inside the shoreline, before the deck is subtracted). */
export const WATER = { x0: 202, x1: 650, y0: 549, y1: 734 };
export const CANAL = { x0: 1350, x1: 1414, y0: 394, y1: 620 };
export const CANAL_BRIDGE = { x0: 1340, x1: 1424, y0: 476, y1: 524 };
/** Pilings driven into the lake bed: ripples radiate from these, not the deck. */
export const PIER_POSTS: [number, number][] = [
  [406, 552], [478, 552], [406, 586], [478, 586], [406, 620], [478, 620],
];

export const onPier = (x: number, y: number) =>
  (x > PIER_WALK.x0 - 14 && x < PIER_WALK.x1 + 14 && y > PIER.y0 - 4 && y < PIER_WALK.y1 + 10) ||
  (x >= CANAL_BRIDGE.x0 && x <= CANAL_BRIDGE.x1 && y >= CANAL_BRIDGE.y0 && y <= CANAL_BRIDGE.y1);

export const inDeck = (x: number, y: number) =>
  x >= PIER.x0 - 2 && x <= PIER.x1 + 2 && y >= PIER.y0 - 2 && y <= PIER.y1 + 2;

/** True only for visible open water: shoreline inset, deck excluded. */
export function isCanalWater(x: number, y: number) {
  if (x < CANAL.x0 || x > CANAL.x1 || y < CANAL.y0 || y > CANAL.y1) return false;
  if (y >= CANAL_BRIDGE.y0 - 2 && y <= CANAL_BRIDGE.y1 + 2) return false;
  return true;
}

export function isWater(x: number, y: number) {
  if (isCanalWater(x, y)) return true;
  if (x < WATER.x0 || x > WATER.x1 || y < WATER.y0 || y > WATER.y1) return false;
  // the shoreline steps in at the corners
  if (y < WATER.y0 + 12 && (x < WATER.x0 + 18 || x > WATER.x1 - 20)) return false;
  if (y > WATER.y1 - 14 && (x < WATER.x0 + 26 || x > WATER.x1 - 34)) return false;
  return !inDeck(x, y);
}

/** Small lake fish only jump when both the launch and landing water are open. */
export function fishJumpStaysInWater(x: number, y: number, direction: -1 | 1, distance = 36) {
  const tx = x + distance * direction, mx = x + distance * 0.5 * direction;
  return isWater(x, y) && isWater(mx, y) && isWater(tx, y);
}

/** Traces the open-water region so ripples can be clipped to it exactly. */
export function clipWater(c: CanvasRenderingContext2D) {
  const { x0, x1, y0, y1 } = WATER;
  c.beginPath();
  c.moveTo(x0 + 18, y0);
  c.lineTo(x1 - 20, y0);
  c.lineTo(x1 - 20, y0 + 12);
  c.lineTo(x1, y0 + 12);
  c.lineTo(x1, y1 - 14);
  c.lineTo(x1 - 34, y1 - 14);
  c.lineTo(x1 - 34, y1);
  c.lineTo(x0 + 26, y1);
  c.lineTo(x0 + 26, y1 - 14);
  c.lineTo(x0, y1 - 14);
  c.lineTo(x0, y0 + 12);
  c.lineTo(x0 + 18, y0 + 12);
  c.closePath();
  // Subtract the deck as an even-odd hole. It MUST be clamped to the water
  // rectangle: any part of the hole outside the outer path would flip to
  // *filled* under the even-odd rule and paint rings onto dry land.
  const hx0 = Math.max(x0, PIER.x0 - 2), hx1 = Math.min(x1, PIER.x1 + 2);
  const hy0 = Math.max(y0, PIER.y0 - 2), hy1 = Math.min(y1, PIER.y1 + 2);
  if (hx1 > hx0 && hy1 > hy0) {
    c.moveTo(hx0, hy0);
    c.lineTo(hx0, hy1);
    c.lineTo(hx1, hy1);
    c.lineTo(hx1, hy0);
    c.closePath();
  }
  c.clip('evenodd');
}

/** Nearest piling waterline on each side of the deck, at the walker's depth. */
export function pierRippleSpots(x: number, y: number): [number, number][] {
  const spots: [number, number][] = [];
  // the shore end of the jetty is over land: no water to disturb there
  if (y + 4 < WATER.y0) return spots;
  const wy = Math.min(PIER.y1 + 6, y + 4);
  const left = PIER.x0 - 7, right = PIER.x1 + 7;
  const bias = (x - (PIER.x0 + PIER.x1) / 2) / ((PIER.x1 - PIER.x0) / 2);
  spots.push([left, wy + 2]);
  spots.push([right, wy + 2]);
  // the nearer edge gets a second, tighter ring so the splash reads directional
  if (bias < -0.15) spots.push([left - 5, wy - 3]);
  else if (bias > 0.15) spots.push([right + 5, wy - 3]);
  return spots.filter(([sx, sy]) => isWater(sx, sy));
}

/** Vertical reflections of the jetty posts, wobbling on the surface. */
export function drawPierReflections(c: CanvasRenderingContext2D, t: number, snap: (v: number) => number) {
  const prev = c.globalAlpha;
  for (const [px, py] of PIER_POSTS) {
    if (py < WATER.y0) continue;
    for (let i = 0; i < 9; i++) {
      const wob = Math.round(Math.sin(t * 2.1 + i * 0.7 + px * 0.1) * (1 + i * 0.32)) * 2;
      c.globalAlpha = prev * (0.3 - i * 0.03);
      c.fillStyle = i % 3 === 0 ? '#2d4a4f' : '#37585c';
      c.fillRect(snap(px - 2 + wob), snap(py + 4 + i * 3), 5, 3);
    }
  }
  // the deck itself casts a soft dark band along its waterline
  c.globalAlpha = prev * 0.22;
  c.fillStyle = '#1d3438';
  c.fillRect(snap(PIER.x0 - 5), snap(PIER.y1 + 2), PIER.x1 - PIER.x0 + 10, 7);
  c.globalAlpha = prev;
}

/** Foam that laps against the jetty piles and the north shoreline. */
export function drawPierFoam(c: CanvasRenderingContext2D, t: number, windDir: number, snap: (v: number) => number) {
  const prev = c.globalAlpha;
  for (const [px, py] of PIER_POSTS) {
    if (py < WATER.y0 + 2) continue;
    const pulse = Math.sin(t * 2.4 + px * 0.2 + py * 0.1);
    c.globalAlpha = prev * (0.34 + pulse * 0.2);
    c.fillStyle = '#cfeee6';
    const w = 9 + Math.round(pulse * 2) * 2;
    c.fillRect(snap(px - w / 2), snap(py + 3), w, 2);
    c.globalAlpha = prev * (0.2 + pulse * 0.12);
    c.fillRect(snap(px - w / 2 - 2), snap(py + 6), w + 4, 2);
  }
  // a slow travelling swell line hugging the deck edges
  for (let i = 0; i < 7; i++) {
    const yy = WATER.y0 + 10 + i * 22;
    if (yy > PIER.y1 + 8) break;
    const off = Math.round(Math.sin(t * 1.7 - i * 0.8) * 2 + windDir * 2) * 2;
    c.globalAlpha = prev * 0.26;
    c.fillStyle = '#a9dcd6';
    c.fillRect(snap(PIER.x0 - 14 + off), snap(yy), 10, 2);
    c.fillRect(snap(PIER.x1 + 5 - off), snap(yy + 6), 10, 2);
  }
  c.globalAlpha = prev;
}
