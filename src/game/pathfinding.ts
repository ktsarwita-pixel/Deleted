import type { SceneType } from '../types/gameTypes';
import type { Point } from './model';
import { canStand } from '../canvas/worldData';

const CELL = 16;
const keyOf = (x: number, y: number) => `${x},${y}`;

// A* keeps click-to-walk out of furniture and water, including diagonal corners.
export function findPath(scene: SceneType, start: Point, end: Point): Point[] {
  const valid = (x: number, y: number) => canStand(scene, x * CELL, y * CELL);
  const sx = Math.round(start.x / CELL), sy = Math.round(start.y / CELL);
  let ex = Math.round(end.x / CELL), ey = Math.round(end.y / CELL);
  if (!valid(ex, ey)) {
    let closest: Point | null = null;
    let best = Infinity;
    for (let r = 1; r <= 16 && !closest; r++) {
      for (let x = ex - r; x <= ex + r; x++) for (let y = ey - r; y <= ey + r; y++) {
        const dist = Math.hypot(x * CELL - end.x, y * CELL - end.y);
        if (valid(x, y) && dist < best) { best = dist; closest = { x, y }; }
      }
    }
    if (!closest) return [];
    ex = closest.x; ey = closest.y;
  }
  type Node = { x: number; y: number; g: number; f: number; parent?: Node };
  const first: Node = { x: sx, y: sy, g: 0, f: 0 };
  const open = [first];
  const scores = new Map<string, number>([[keyOf(sx, sy), 0]]);
  const closed = new Set<string>();
  let count = 0;
  while (open.length && count++ < 18000) {
    let index = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[index].f) index = i;
    const node = open.splice(index, 1)[0];
    if (node.x === ex && node.y === ey) {
      const path: Point[] = [];
      let n: Node | undefined = node;
      while (n?.parent) { path.unshift({ x: n.x * CELL, y: n.y * CELL }); n = n.parent; }
      if (canStand(scene, end.x, end.y) && Math.hypot(ex * CELL - end.x, ey * CELL - end.y) < CELL) path.push(end);
      return path;
    }
    const nodeKey = keyOf(node.x, node.y);
    if (closed.has(nodeKey)) continue;
    closed.add(nodeKey);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      if (!dx && !dy) continue;
      const x = node.x + dx, y = node.y + dy, key = keyOf(x, y);
      if (closed.has(key) || !valid(x, y)) continue;
      if (dx && dy && (!valid(node.x + dx, node.y) || !valid(node.x, node.y + dy))) continue;
      const g = node.g + (dx && dy ? Math.SQRT2 : 1);
      if (g >= (scores.get(key) ?? Infinity)) continue;
      scores.set(key, g);
      open.push({ x, y, g, f: g + Math.hypot(ex - x, ey - y), parent: node });
    }
  }
  return [];
}