import type { SceneType } from '../types/gameTypes';
import { drawTree } from './trees';

const cache = new Map<SceneType, HTMLCanvasElement>();
export const R = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => {
  c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};
export const hash = (x: number, y: number) => {
  const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return v - Math.floor(v);
};
export function poly(c: CanvasRenderingContext2D, points: number[][], color: string) {
  c.fillStyle = color; c.beginPath();
  points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fill();
}
export function text(c: CanvasRenderingContext2D, label: string, x: number, y: number, color = '#f4e3bd', size = 11) {
  c.font = `500 ${size}px "IBM Plex Mono", monospace`; c.fillStyle = color;
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, x, y);
}
function shadow(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  R(c, x + 7, y + 7, w, h, '#00000024');
}
export function leafCluster(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  R(c, x + 8, y, w - 16, h, color); R(c, x + 4, y + 5, w - 8, h - 10, color); R(c, x, y + 10, w, h - 20, color);
}
function plant(c: CanvasRenderingContext2D, x: number, y: number, large = false) {
  const s = large ? 1.5 : 1;
  c.save(); c.translate(x, y); c.scale(s, s);
  shadow(c, -12, -8, 24, 15);
  R(c, -12, -12, 24, 6, '#c38d56'); R(c, -10, -6, 20, 16, '#9b603d');
  R(c, -8, -4, 5, 12, '#bb8050'); R(c, -7, 10, 14, 3, '#503b2d');
  R(c, -2, -43, 3, 34, '#57733e');
  [[-26,-35,22,10],[-20,-25,20,9],[0,-42,22,10],[2,-26,24,9],[-12,-53,15,13]].forEach(([x1,y1,w,h],i) => {
    R(c, x1 + 3, y1, w - 6, h, i % 2 ? '#729149' : '#4d743e');
    R(c, x1, y1 + 3, w, h - 6, i % 2 ? '#729149' : '#4d743e');
    R(c, x1 + 3, y1 + 3, w - 6, 2, '#9aaa63');
  }); c.restore();
}
function cabinet(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  shadow(c, x, y, w, h); R(c, x, y, w, h, '#533b2c');
  R(c, x + 3, y + 3, w - 6, h - 9, '#88613c'); R(c, x + 5, y + 4, w - 10, 6, '#bb8b51');
  for (let row = 15; row < h - 5; row += 21) {
    R(c, x + 5, y + row, w - 10, 17, '#6d4b31');
    R(c, x + 7, y + row + 2, w - 14, 12, '#9a7045');
    R(c, x + w / 2 - 4, y + row + 7, 8, 3, '#d2ab65');
  }
  R(c, x + 6, y + h, 8, 7, '#4b3529'); R(c, x + w - 14, y + h, 8, 7, '#4b3529');
}
function windowArt(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  R(c, x - 6, y - 6, w + 12, h + 15, '#402d25');
  R(c, x - 3, y - 3, w + 6, h + 8, '#d0a467');
  R(c, x, y, w, h, '#b8bf8c');
  R(c, x, y + 20, w, h - 20, '#889c6d');
  poly(c, [[x,y+h],[x,y+40],[x+14,y+34],[x+14,y+23],[x+23,y+18],[x+29,y+30],[x+40,y+29],[x+54,y+47],[x+w,y+34],[x+w,y+h]], '#536e4c');
  R(c, x + w / 2 - 2, y, 4, h, '#735436'); R(c, x, y + h / 2, w, 4, '#735436');
  R(c, x - 9, y - 7, 17, h + 7, '#d4c49a'); R(c, x - 9, y - 7, 4, h + 7, '#ebdcb6');
  R(c, x + w - 8, y - 7, 17, h + 7, '#cfbb8c'); R(c, x + w + 2, y - 7, 4, h + 7, '#ebdcb6');
  R(c, x - 9, y + h - 10, 17, 4, '#a17a4e'); R(c, x + w - 8, y + h - 10, 17, 4, '#a17a4e');
}
function houseBackground(c: CanvasRenderingContext2D) {
  R(c, -200, 0, 1280, 620, '#213029');
  for (let y = 0; y < 620; y += 12) for (let x = -200; x < 1080; x += 12) {
    const v = hash(x, y);
    if (v > .6) R(c, x, y, 3 + Math.floor(v * 6), 2, v > .8 ? '#3f4f30' : '#2c3d2b');
  }
  R(c, 412, 520, 60, 100, '#8c7950');
  for (let i = 0; i < 32; i++) R(c, 414 + hash(i, 3) * 54, 554 + hash(i, 4) * 65, 4, 3, '#aa9767');
  [[-107,93,1.3],[-51,251,1.15],[-64,459,1.1],[48,119,1.1],[832,134,1.1],[40,342,1.15],[843,395,1.15],[67,575,.8],[822,610,1],[967,170,1.3],[947,479,1.2],[1008,684,1.4]].forEach(([x,y,s]) => drawTree(c,x,y,s));
  shadow(c, 93, 87, 704, 476);
  R(c, 91, 77, 698, 478, '#2c2520');
  R(c, 101, 82, 678, 463, '#65482e');
  R(c, 111, 167, 658, 367, '#a67b4d');
  // Seeded wood grain is cached once, not generated on every animation frame.
  for (let row = 0; row < 18; row++) {
    const y = 170 + row * 20;
    R(c, 111, y, 658, 2, '#6e5137'); R(c, 111, y + 2, 658, 2, '#c59860');
    for (let x = 111 - (row % 3) * 57; x < 770; x += 114) {
      const left = Math.max(111, x), w = Math.min(x + 112, 767) - left;
      if (w < 0) continue;
      R(c, left, y + 4, w, 14, ['#a67b4d','#b28652','#9f7549','#ad8050'][Math.floor(hash(row,x)*4)]);
      R(c, left, y + 4, 2, 14, '#805c3c');
      for (let k=0;k<3;k++) R(c, left + 10 + hash(k+x,row)*Math.max(0,w-35), y + 6 + k*3, 10 + hash(k,row)*16, 1, '#8a633b70');
    }
  }
  // North wall and exposed ceiling beams.
  R(c, 105, 78, 670, 101, '#67432e');
  for (let y = 83; y < 174; y += 15) {
    R(c, 109, y, 662, 12, '#805639'); R(c, 110, y + 1, 660, 2, '#987044');
    for (let x = 115; x < 768; x += 82) R(c, x + (y % 2) * 8, y, 2, 13, '#5d3d2b');
  }
  R(c, 102, 75, 676, 10, '#ba8c55'); R(c, 103, 85, 674, 5, '#4e3527');
  R(c, 105, 171, 670, 9, '#513a2b'); R(c, 107, 172, 666, 3, '#c1955b');
  for (const x of [108, 279, 555, 762]) { R(c,x,80,9,100,'#563b29'); R(c,x,80,3,95,'#bc8a52'); }
  windowArt(c, 316, 102, 75, 59); windowArt(c, 423, 102, 88, 59);
  // Woven wall hanging and landscape print.
  R(c, 622, 102, 60, 46, '#432e25'); R(c, 626, 106, 52, 38, '#b69863');
  R(c, 629, 109, 46, 32, '#89977a');
  poly(c, [[629,141],[629,130],[640,116],[649,133],[659,122],[675,141]], '#395744');
  R(c, 663, 113, 6, 6, '#eac88c');
  // Tall storage cabinet and books.
  cabinet(c, 139, 127, 110, 65);
  R(c, 144, 119, 100, 13, '#a97d49');
  const bookColors = ['#7b8d6a','#b56544','#dbbb7f','#7b8d6a','#655c47','#b5784c'];
  for (let i=0;i<8;i++) { R(c,150+i*9,101,7,18+(i%3)*2,bookColors[i%6]); R(c,152+i*9,104,3,2,'#dfcd9b'); }
  // Bed with linen, folded quilt, seams and timber legs.
  shadow(c, 139, 206, 108, 163);
  R(c, 139, 200, 108, 161, '#563c2a'); R(c, 143, 198, 100, 12, '#bc8d57');
  R(c, 146, 214, 94, 142, '#d9c89e'); R(c, 151, 219, 84, 34, '#f2dfb5');
  R(c, 155, 222, 76, 24, '#e4d5ac'); R(c, 159, 224, 66, 3, '#f7eac9');
  R(c, 146, 258, 94, 89, '#546f53'); R(c, 148, 258, 91, 11, '#80916a');
  for (let y=274;y<340;y+=18) for(let x=153;x<234;x+=18) {
    R(c,x,y,8,3,'#9eab7c'); R(c,x+3,y-3,3,9,'#9eab7c');
  }
  R(c, 144, 345, 98, 12, '#b58a50'); R(c, 142, 357, 9, 14, '#513b2a'); R(c, 233, 357, 9, 14, '#513b2a');
  // Bedside stool and lamp.
  cabinet(c, 259, 230, 32, 25);
  R(c, 270, 212, 7, 16, '#c39c55'); R(c, 262, 202, 23, 14, '#e1bf7a'); R(c, 266, 198, 15, 5, '#f4d796');
  // Handwoven rug with repeating diamond motifs and tassels.
  shadow(c, 305, 278, 253, 174);
  R(c,305,275,253,173,'#683c30'); R(c,309,279,245,165,'#b17345'); R(c,315,285,233,153,'#d2b073');
  R(c,321,291,221,141,'#8a4d37'); R(c,327,297,209,129,'#b76d49');
  for (let y=305;y<421;y+=6) R(c,327,y,209,1,'#99583c');
  for (let x=333;x<530;x+=39) for(let y=312;y<414;y+=39) {
    poly(c, [[x+13,y],[x+26,y+13],[x+13,y+26],[x,y+13]], '#e0bc7c');
    poly(c, [[x+13,y+6],[x+20,y+13],[x+13,y+20],[x+6,y+13]], '#6d4534');
    R(c,x+11,y+11,4,4,'#d2a35c');
  }
  for(let x=310;x<553;x+=8) { R(c,x,268,3,8,'#c8ab72'); R(c,x,447,3,8,'#c8ab72'); }
  // Radio desk and a small green chair.
  cabinet(c, 583, 214, 148, 49);
  R(c, 579, 206, 156, 13, '#cf9e5d'); R(c,582,208,150,3,'#e0b878');
  R(c, 612, 190, 55, 24, '#493c2d'); R(c,615,192,49,19,'#92703f');
  for(let x=619;x<641;x+=3) R(c,x,195,1,13,'#463f2c');
  R(c,646,195,12,6,'#a8b88c'); R(c,648,204,4,4,'#dabc76'); R(c,659,170,2,21,'#c0b48c');
  R(c, 693, 194, 20, 14, '#cdba8d'); R(c,695,196,15,2,'#968057');
  // Table, tea and tabungan.
  shadow(c, 606, 336, 116, 73);
  R(c,611,389,9,27,'#5a3d2c'); R(c,706,389,9,27,'#5a3d2c');
  R(c,602,332,124,66,'#6c482e'); R(c,605,333,118,58,'#b78c53'); R(c,608,335,112,4,'#d9b071');
  for(let y=345;y<390;y+=14) R(c,607,y,115,2,'#956a42');
  R(c,614,346,20,16,'#e6d2a1'); R(c,617,348,14,10,'#694632'); R(c,634,349,4,7,'#e6d2a1');
  R(c,684,365,24,12,'#f3dbac'); R(c,687,368,18,6,'#ba7b47');
  // Kitchen stove, basket, floor plants and a pair of slippers.
  cabinet(c, 653, 463, 87, 43); R(c,658,451,77,17,'#657066');
  R(c,674,443,31,15,'#323e38'); R(c,670,440,39,5,'#889487'); R(c,683,436,13,4,'#48554a');
  plant(c, 162, 470, true); plant(c, 735, 205); plant(c, 561, 167);
  R(c, 232, 446, 33, 27, '#ad8450');
  for(let y=448;y<470;y+=5) R(c,232,y,33,2,'#dab678');
  for(let x=234;x<263;x+=6) R(c,x,447,2,26,'#785b3a');
  R(c, 497, 487, 10, 19, '#514934'); R(c,512,487,10,19,'#514934'); R(c,499,491,6,4,'#b89554'); R(c,514,491,6,4,'#b89554');
  // Cutaway wall edges and an open front doorway.
  R(c,101,174,12,360,'#4c3527'); R(c,103,174,4,357,'#bb8b52');
  R(c,767,174,12,360,'#4c3527'); R(c,770,174,4,357,'#b78950');
  R(c,102,533,302,12,'#513a29'); R(c,476,533,303,12,'#513a29');
  R(c,103,533,300,4,'#ba8d52'); R(c,477,533,297,4,'#ba8d52');
  for(let y=534;y<574;y+=9) { R(c,404,y,72,7,'#ac8953'); R(c,406,y,68,2,'#d0b078'); }
  // Window light follows the pixel grid and stays subtle enough to read sprites.
  poly(c, [[423,180],[511,180],[581,283],[471,283]], '#f6d68a15');
  poly(c, [[316,180],[391,180],[444,256],[349,256]], '#f6d68a13');
}

/* ---------- shared building parts ---------- */
function shingles(c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, base: string, dark: string, light: string) {
  const rows = Math.max(3, Math.round((y1 - y0) / 7));
  for (let r = 0; r < rows; r++) {
    const u = r / (rows - 1);
    const y = Math.round(y0 + u * (y1 - y0 - 7));
    const inset = Math.round((1 - u) * (x1 - x0) * 0.15);
    const a = x0 + inset, b = x1 - inset;
    R(c, a, y, b - a, 8, base);
    for (let x = a; x < b; x += 7) { R(c, x, y + 6, 6, 2, dark); R(c, x + 3, y, 1, 6, dark); }
    R(c, a, y, b - a, 2, light);
    R(c, a, y + 2, 2, 4, light); R(c, b - 2, y + 2, 2, 5, dark);
  }
  R(c, x0 - 3, y1 - 2, x1 - x0 + 6, 4, dark);
  R(c, x0 - 3, y1 - 2, x1 - x0 + 6, 1, base);
}
function ridge(c: CanvasRenderingContext2D, x0: number, x1: number, y: number, col: string) {
  R(c, x0, y, x1 - x0, 5, col);
  R(c, x0, y, x1 - x0, 2, '#e2bb7c');
  R(c, x0, y + 4, x1 - x0, 1, '#3a2a1d');
  // crossed hornbill finials, a Kalimantan roof signature
  for (const s of [x0, x1]) {
    R(c, s - 3, y - 9, 5, 10, col);
    R(c, s - 6, y - 14, 4, 6, col); R(c, s + 1, y - 14, 4, 6, col);
    R(c, s - 6, y - 14, 4, 2, '#e2bb7c'); R(c, s + 1, y - 14, 4, 2, '#e2bb7c');
    R(c, s - 2, y - 8, 3, 8, '#a97b45');
  }
}
function bambooWall(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  R(c, x, y, w, h, '#a9834f');
  for (let yy = y + 2; yy < y + h; yy += 6) { R(c, x, yy, w, 2, '#7d5c37'); R(c, x, yy + 2, w, 1, '#c9a46c'); }
  for (let xx = x + 4; xx < x + w; xx += 9) { R(c, xx, y, 2, h, '#c9a46c'); R(c, xx + 2, y, 1, h, '#7d5c37'); }
  R(c, x, y, w, 2, '#d8b57c'); R(c, x, y + h - 2, w, 2, '#5f4529');
  R(c, x, y, 2, h, '#c9a46c'); R(c, x + w - 2, y, 2, h, '#6b4d2e');
}
function plankWall(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, base: string, dark: string, light: string) {
  R(c, x, y, w, h, base);
  for (let yy = y; yy < y + h; yy += 9) {
    R(c, x, yy, w, 7, base); R(c, x, yy + 7, w, 2, dark); R(c, x, yy, w, 1, light);
    for (let xx = x + ((yy / 9) % 2) * 17; xx < x + w; xx += 34) R(c, xx, yy, 2, 7, dark);
    for (let i = 0; i < 3; i++) {
      const gx = x + Math.floor(hash(xx0(yy, i), y) * (w - 12));
      R(c, gx, yy + 2 + i, 8 + Math.floor(hash(i, yy) * 10), 1, i % 2 ? dark : light);
    }
  }
  R(c, x, y, 2, h, light); R(c, x + w - 2, y, 2, h, dark);
}
const xx0 = (a: number, b: number) => a * 7.3 + b * 13.7;
function stilt(c: CanvasRenderingContext2D, x: number, y0: number, y1: number) {
  R(c, x - 4, y0, 8, y1 - y0, '#4a3524');
  R(c, x - 4, y0, 3, y1 - y0, '#7d5c39');
  R(c, x - 1, y0, 1, y1 - y0, '#96714a');
  R(c, x + 3, y0, 1, y1 - y0, '#2f2118');
  R(c, x - 6, y1 - 3, 12, 3, '#33241a');
  R(c, x - 5, y0 + 6, 10, 2, '#5f4529');
}
function shutter(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, open: boolean) {
  R(c, x - 3, y - 3, w + 6, h + 6, '#4a3524');
  R(c, x, y, w, h, open ? '#2c3a33' : '#8a6a42');
  if (open) {
    R(c, x, y, w, 3, '#5d7a68'); R(c, x, y + h - 3, w, 3, '#1d2a24');
    R(c, x + w / 2 - 1, y, 2, h, '#40301f');
  } else {
    for (let yy = y + 2; yy < y + h; yy += 5) R(c, x, yy, w, 2, '#6d4f30');
  }
  // hinged shutters folded back against the wall
  R(c, x - 9, y - 2, 7, h + 4, '#7d5c39'); R(c, x - 8, y, 5, h, '#a9834f');
  R(c, x + w + 2, y - 2, 7, h + 4, '#6b4d2e'); R(c, x + w + 3, y, 5, h, '#96714a');
  R(c, x - 7, y + 3, 1, 3, '#d8c08a'); R(c, x + w + 5, y + 3, 1, 3, '#d8c08a');
}
function crate(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col = '#a07a48') {
  R(c, x, y, w, h, col); R(c, x, y, w, 2, '#c9a46c'); R(c, x, y + h - 2, w, 2, '#6b4d2e');
  R(c, x, y, 2, h, '#c9a46c'); R(c, x + w - 2, y, 2, h, '#6b4d2e');
  R(c, x + 3, y + h / 2 - 1, w - 6, 2, '#7d5c37');
}
function sack(c: CanvasRenderingContext2D, x: number, y: number, col = '#cbb98d') {
  R(c, x, y + 4, 16, 14, col); R(c, x + 2, y + 2, 12, 4, col);
  R(c, x + 4, y, 8, 3, '#a89468'); R(c, x + 5, y - 1, 6, 2, '#8d7a52');
  R(c, x + 2, y + 6, 3, 9, '#e0d2ac'); R(c, x + 12, y + 8, 3, 8, '#a89468');
  R(c, x + 4, y + 9, 8, 1, '#8d7a52');
}
function barrel(c: CanvasRenderingContext2D, x: number, y: number, col = '#4a6f7a') {
  R(c, x, y, 20, 30, col); R(c, x + 2, y, 4, 30, '#6d94a0'); R(c, x + 15, y, 4, 30, '#2f4d56');
  R(c, x, y + 5, 20, 3, '#33454c'); R(c, x, y + 20, 20, 3, '#33454c');
  R(c, x, y, 20, 3, '#7fa8b3'); R(c, x + 2, y + 1, 16, 1, '#2b4149');
  R(c, x - 1, y + 28, 22, 3, '#26383e');
}

/* ---------- Rumah Wira: a Kalimantan stilt house ---------- */
function rumahWira(c: CanvasRenderingContext2D) {
  const x0 = 118, x1 = 302, yRoof = 72, yBody = 134, yFloor = 210, yGround = 258;
  R(c, x0 - 10, yGround - 4, x1 - x0 + 22, 10, '#101a1245');
  // shaded space beneath the floor: stored firewood, baskets and a folded boat
  R(c, x0 - 4, yFloor + 4, x1 - x0 + 8, yGround - yFloor - 4, '#2b2018');
  R(c, x0 - 4, yFloor + 4, x1 - x0 + 8, 3, '#1c150f');
  for (let i = 0; i < 7; i++) R(c, x0 + 6 + i * 9, yGround - 12, 8, 9, i % 2 ? '#6b4d2e' : '#553c24');
  R(c, x0 + 8, yGround - 14, 58, 4, '#7d5c39');
  crate(c, x1 - 46, yGround - 20, 30, 18, '#8d6a42');
  R(c, x1 - 42, yGround - 17, 22, 4, '#a9834f');
  for (const sx of [134, 176, 224, 266, 296]) stilt(c, sx, yFloor, yGround);
  R(c, 134, 232, 162, 4, '#4a3524'); R(c, 134, 232, 162, 1, '#6d4f30');
  // floor platform and its exposed joists
  R(c, x0 - 10, yFloor - 8, x1 - x0 + 20, 13, '#5d4129');
  R(c, x0 - 10, yFloor - 8, x1 - x0 + 20, 3, '#96714a');
  R(c, x0 - 10, yFloor + 3, x1 - x0 + 20, 2, '#33241a');
  for (let x = x0 - 6; x < x1 + 6; x += 13) R(c, x, yFloor - 5, 2, 8, '#43301f');
  // woven bamboo body
  bambooWall(c, x0, yBody, x1 - x0, yFloor - yBody - 8);
  // corner posts and a mid post
  for (const px of [x0 - 4, x1 - 3, 208]) { R(c, px, yBody - 6, 8, yFloor - yBody + 2, '#5d4129'); R(c, px, yBody - 6, 2, yFloor - yBody, '#96714a'); }
  shutter(c, 132, 164, 30, 26, true);
  shutter(c, 258, 164, 30, 26, false);
  // doorway: dark opening with a hanging woven blind
  R(c, 192, 160, 38, 50, '#241a13');
  R(c, 194, 162, 34, 46, '#3a2a1e');
  for (let yy = 162; yy < 190; yy += 5) R(c, 194, yy, 34, 3, '#8d6a42');
  R(c, 192, 158, 38, 4, '#6d4f30'); R(c, 192, 158, 38, 1, '#a9834f');
  // tiered shingle roof with a ridge and finials
  shingles(c, 106, yRoof + 8, 314, yBody - 2, '#8a4a33', '#5d2f20', '#b8704c');
  ridge(c, 128, 292, yRoof, '#6d3826');
  R(c, 150, yRoof + 6, 120, 3, '#a35c3d');
  // ladder down to the yard
  R(c, 190, yFloor + 4, 44, 6, '#5d4129');
  for (let yy = yFloor + 8; yy < 266; yy += 9) { R(c, 192, yy, 40, 6, '#a9834f'); R(c, 192, yy, 40, 2, '#c9a46c'); R(c, 192, yy + 5, 40, 1, '#6d4f30'); }
  R(c, 188, yFloor + 4, 5, 62, '#6d4f30'); R(c, 231, yFloor + 4, 5, 62, '#5d4129');
  // a woven basket and drying cloth hung on the wall
  R(c, 240, 148, 14, 10, '#a9834f'); R(c, 240, 148, 14, 2, '#c9a46c');
  for (let xx = 242; xx < 254; xx += 3) R(c, xx, 150, 1, 8, '#7d5c37');
  R(c, 150, 146, 2, 12, '#8d6a42');
  R(c, 143, 152, 16, 12, '#cbb98d'); R(c, 143, 152, 16, 2, '#e0d2ac');
  R(c, 145, 158, 12, 1, '#a89468');
}

/* ---------- Warung Budi ---------- */
function warungBudi(c: CanvasRenderingContext2D) {
  const x0 = 462, x1 = 668, yRoof = 74, yWall = 114;
  R(c, x0 - 8, 244, x1 - x0 + 16, 10, '#101a1245');
  shingles(c, x0 - 12, yRoof + 6, x1 + 12, yWall - 6, '#7d4630', '#4f2b1d', '#a8603f');
  ridge(c, x0 + 16, x1 - 16, yRoof - 2, '#5f3323');
  // fascia board the main sign is bolted to
  R(c, x0 - 6, yWall - 8, x1 - x0 + 12, 10, '#5d4129');
  R(c, x0 - 6, yWall - 8, x1 - x0 + 12, 2, '#96714a');
  plankWall(c, x0, yWall, x1 - x0, 30, '#a07a48', '#6b4d2e', '#c9a46c');
  // awning rail: the BUKA sign and lantern hang from it
  R(c, x0 - 8, 142, x1 - x0 + 16, 9, '#4a3524');
  R(c, x0 - 8, 142, x1 - x0 + 16, 2, '#8d6a42');
  R(c, x0 - 8, 149, x1 - x0 + 16, 2, '#2f2118');
  for (let x = x0 - 4; x < x1 + 4; x += 26) R(c, x, 143, 3, 7, '#6d4f30');
  // shaded shop interior behind the counter
  R(c, x0, 151, x1 - x0, 52, '#2f2620');
  R(c, x0, 151, x1 - x0, 3, '#1d1712');
  // left bay: doorway with a beaded curtain
  R(c, x0 + 8, 156, 40, 47, '#241d17');
  R(c, x0 + 8, 156, 40, 3, '#3a2f26');
  // right bay: shelves stacked with goods
  for (const sy of [160, 176, 192]) {
    R(c, 524, sy, 136, 4, '#8d6a42'); R(c, 524, sy, 136, 1, '#c9a46c'); R(c, 524, sy + 3, 136, 1, '#4a3524');
    for (let i = 0; i < 11; i++) {
      const gx = 528 + i * 12, kind = (i + sy) % 4;
      if (kind === 0) { R(c, gx, sy - 11, 6, 11, '#5d8a6a'); R(c, gx + 1, sy - 13, 4, 3, '#a9834f'); R(c, gx + 1, sy - 9, 2, 6, '#8fbf9a'); }
      else if (kind === 1) { R(c, gx, sy - 9, 8, 9, '#c9483a'); R(c, gx, sy - 9, 8, 2, '#e8836a'); R(c, gx + 2, sy - 6, 4, 3, '#f0d2a8'); }
      else if (kind === 2) { R(c, gx, sy - 8, 9, 8, '#d8c07a'); R(c, gx + 1, sy - 7, 7, 2, '#f0e2b0'); R(c, gx + 3, sy - 4, 3, 3, '#a08a4a'); }
      else { R(c, gx, sy - 12, 5, 12, '#6d7fa8'); R(c, gx + 1, sy - 14, 3, 3, '#9aa8c4'); R(c, gx, sy - 8, 5, 1, '#c9d2e4'); }
    }
  }
  // sacks and crates on the floor of the shop
  sack(c, 612, 186); sack(c, 634, 188, '#b8a678');
  crate(c, 528, 196, 26, 8, '#8d6a42');
  // timber counter with a worn top and a cash box
  R(c, x0 - 4, 212, x1 - x0 + 8, 32, '#6b4d2e');
  R(c, x0 - 4, 208, x1 - x0 + 8, 7, '#c9a46c');
  R(c, x0 - 4, 208, x1 - x0 + 8, 2, '#e0c08a');
  R(c, x0 - 4, 214, x1 - x0 + 8, 2, '#8d6a42');
  for (let x = x0; x < x1; x += 18) R(c, x, 216, 2, 26, '#553c24');
  R(c, x0 - 4, 242, x1 - x0 + 8, 3, '#33241a');
  crate(c, 486, 196, 24, 14, '#a07a48');
  R(c, 520, 196, 16, 11, '#8d6a42'); R(c, 522, 198, 12, 3, '#c9a46c');
  R(c, 600, 197, 14, 10, '#4a5f4a'); R(c, 602, 199, 10, 3, '#c9a46c'); R(c, 606, 194, 3, 4, '#a9834f');
  // jars of sweets and a stack of tins on the counter
  for (const [jx, col] of [[548, '#c9483a'], [566, '#e0a13c'], [584, '#5d8a6a']] as [number, string][]) {
    R(c, jx, 196, 12, 13, '#d8e0d4'); R(c, jx + 1, 198, 10, 10, col);
    R(c, jx, 194, 12, 3, '#a9834f'); R(c, jx + 2, 197, 2, 8, '#ffffff55');
  }
  R(c, 630, 200, 18, 9, '#8a6a3c'); R(c, 632, 197, 14, 4, '#c9a46c');
  // corner posts
  R(c, x0 - 6, 142, 7, 104, '#5d4129'); R(c, x0 - 6, 142, 2, 104, '#96714a');
  R(c, x1 - 1, 142, 7, 104, '#4a3524'); R(c, x1 - 1, 142, 2, 104, '#7d5c39');
}

/* ---------- Posko Siaga Karhutla ---------- */
function poskoSiaga(c: CanvasRenderingContext2D) {
  const x0 = 756, x1 = 892, yTop = 112;
  R(c, x0 - 8, 246, x1 - x0 + 16, 9, '#101a1245');
  // canvas canopy with a scalloped valance
  R(c, x0 - 10, yTop, x1 - x0 + 20, 34, '#5f6b45');
  R(c, x0 - 10, yTop, x1 - x0 + 20, 4, '#8a9463');
  for (let x = x0 - 10; x < x1 + 10; x += 17) { R(c, x, yTop + 6, 15, 26, (x / 17) % 2 ? '#6d7a4f' : '#57633f'); R(c, x, yTop + 6, 15, 2, '#98a26d'); }
  for (let x = x0 - 10; x < x1 + 10; x += 17) R(c, x + 3, yTop + 32, 9, 5, (x / 17) % 2 ? '#57633f' : '#4a5537');
  R(c, x0 - 12, yTop + 34, x1 - x0 + 24, 4, '#3c4630');
  // tarp back wall
  R(c, x0, yTop + 38, x1 - x0, 108, '#3f4a36');
  R(c, x0, yTop + 38, x1 - x0, 3, '#5d6b4c');
  for (let yy = yTop + 44; yy < yTop + 144; yy += 12) R(c, x0, yy, x1 - x0, 1, '#343d2c');
  // poles
  R(c, x0 - 4, yTop + 34, 7, 116, '#6b5136'); R(c, x0 - 4, yTop + 34, 2, 116, '#96714a');
  R(c, x1 - 3, yTop + 34, 7, 116, '#5d4129'); R(c, x1 - 3, yTop + 34, 2, 116, '#8d6a42');
  // supplies below the sign: drums, sandbags, hose reel, crates, notice board
  barrel(c, 764, 210); barrel(c, 786, 214, '#4f6b52');
  for (let i = 0; i < 3; i++) for (let j = 0; j < 4 - i; j++) {
    R(c, 812 + j * 15 + i * 7, 236 - i * 9, 14, 9, '#b8a678');
    R(c, 812 + j * 15 + i * 7, 236 - i * 9, 14, 2, '#d8c89a');
    R(c, 814 + j * 15 + i * 7, 239 - i * 9, 4, 3, '#a8946a');
  }
  crate(c, 872, 224, 20, 22, '#8d6a42');
  R(c, 874, 228, 16, 3, '#c9a46c'); R(c, 878, 234, 8, 6, '#a9834f');
  // coiled hose on a stake
  R(c, 762, 246, 4, 12, '#5d4129');
  for (let r = 0; r < 3; r++) { R(c, 754 + r * 2, 240 + r * 3, 20 - r * 4, 4, r % 2 ? '#a8442f' : '#c25a3d'); }
  // notice board with a hand-drawn fire map
  R(c, 838, 196, 30, 24, '#cbb98d'); R(c, 838, 196, 30, 2, '#e0d2ac'); R(c, 838, 218, 30, 2, '#a8946a');
  R(c, 842, 202, 9, 7, '#7d9a6a'); R(c, 854, 204, 8, 6, '#c9483a'); R(c, 846, 212, 14, 2, '#8a7a52');
  R(c, 841, 200, 1, 18, '#a8946a'); R(c, 866, 200, 1, 18, '#a8946a');
  // canvas creases and stitched seams
  for (let x = x0 + 8; x < x1 - 6; x += 23) { R(c, x, yTop + 42, 2, 100, '#374029'); R(c, x + 2, yTop + 42, 1, 100, '#4c5940'); }
  R(c, x0, yTop + 60, x1 - x0, 1, '#4c5940');
  R(c, x0 + 4, yTop + 38, x1 - x0 - 8, 1, '#6d7a55');
  // stretcher leaning against the left pole
  R(c, x0 + 4, 196, 5, 50, '#8d6a42'); R(c, x0 + 20, 196, 5, 50, '#8d6a42');
  R(c, x0 + 4, 200, 21, 26, '#cbb98d'); R(c, x0 + 6, 202, 17, 22, '#a8946a');
  R(c, x0 + 4, 208, 21, 2, '#8a7a52'); R(c, x0 + 4, 218, 21, 2, '#8a7a52');
  // two water buckets and a coiled rope
  R(c, 866, 240, 12, 14, '#4a6f7a'); R(c, 866, 240, 12, 3, '#7fa8b3'); R(c, 868, 244, 3, 8, '#6d94a0');
  R(c, 864, 236, 16, 3, '#8d8f86');
  R(c, 852, 244, 11, 11, '#b8a06a'); R(c, 854, 246, 7, 7, '#8d7a4a'); R(c, 856, 248, 3, 3, '#cbb98d');
  // helmets resting on the crate
  for (const hx of [874, 884]) { R(c, hx, 218, 9, 5, '#d8a03c'); R(c, hx + 1, 216, 7, 3, '#e8bc5c'); R(c, hx - 1, 222, 11, 2, '#a8782c'); }
  // tarp guy-ropes pegged to the ground
  R(c, x0 - 12, 148, 9, 2, '#a8946a'); R(c, x1 + 3, 148, 9, 2, '#a8946a');
  R(c, x0 - 14, 148, 3, 6, '#6b5136'); R(c, x1 + 11, 148, 3, 6, '#6b5136');
}

/* ---------- deep forest behind the burn zone ---------- */
function forestBackdrop(c: CanvasRenderingContext2D) {
  R(c, 945, 75, 425, 670, '#5b4c33');
  R(c, 969, 96, 391, 634, '#4c4129');
  // damp peat: root mats, cracks and old ash
  for (let i = 0; i < 420; i++) {
    const x = 950 + hash(i, 13) * 410, y = 90 + hash(i, 23) * 640;
    R(c, x, y, 5 + hash(i, 3) * 9, 2, i % 3 ? '#3b3325' : '#67593c');
  }
  for (let i = 0; i < 40; i++) {
    const x = 960 + hash(i, 41) * 390, y = 100 + hash(i, 43) * 620;
    R(c, x, y, 2, 8 + hash(i, 47) * 14, '#332c20');
  }
  // leaf litter, root mats and damp hollows give the peat floor relief
  for (let i = 0; i < 260; i++) {
    const x = 950 + hash(i, 61) * 412, y = 96 + hash(i, 67) * 636;
    const t = hash(i, 71);
    R(c, x, y, 4 + t * 14, 3, t > 0.72 ? '#7a6540' : t > 0.4 ? '#4f4530' : '#6b5a3a');
    if (t > 0.86) R(c, x + 2, y - 2, 3, 2, '#8d7a4e');
  }
  for (let i = 0; i < 34; i++) {
    const x = 956 + hash(i, 83) * 400, y = 104 + hash(i, 89) * 620;
    for (let k = 0; k < 5; k++) R(c, x + k * 4, y + Math.round(Math.sin(k * 1.1 + i) * 4), 5, 2, '#3a3225');
  }
  for (let i = 0; i < 12; i++) {
    const x = 962 + hash(i, 97) * 390, y = 120 + hash(i, 101) * 590;
    R(c, x, y, 26 + hash(i, 3) * 26, 14, '#332c20');
    R(c, x + 3, y + 2, 18, 8, '#2a2419');
  }
  // three receding tree lines, each lighter and hazier than the last
  const bands: [number, number, string, string, number][] = [
    [214, 96, '#2c3a2c', '#3d4d3a', 91], [252, 74, '#33442f', '#46593c', 137], [292, 58, '#3b4d33', '#527044', 173],
  ];
  for (const [base, hh, col, lit, seed] of bands) {
    for (let x = 926; x < 1404; x += 13) {
      const th = hh * (0.5 + hash(x, seed) * 0.7);
      const w = 15 + hash(x + 5, seed) * 11;
      R(c, x - w / 2, base - th, w, th, col);
      R(c, x - w / 2 + 3, base - th - 6, w - 6, 7, col);
      R(c, x - w / 2 + 6, base - th - 10, w - 12, 5, col);
      // sun catches the upper-left of every distant crown
      R(c, x - w / 2 + 4, base - th - 8, Math.max(3, w * 0.4), 4, lit);
      R(c, x - w / 2 + 5, base - th + 3, 3, th * 0.4, lit);
      R(c, x - 2, base - th * 0.6, 4, th * 0.6, '#241f18');
    }
    R(c, 926, base - 4, 478, 8, col);
    R(c, 926, base - 4, 478, 2, lit);
  }
  R(c, 926, 110, 478, 190, '#7d8a6a22');
  // charred stumps and a blackened burn scar toward the active fire front
  for (const [sx, sy] of [[1012, 300], [1178, 420], [1268, 556], [1096, 660]] as [number, number][]) {
    R(c, sx, sy, 14, 10, '#2b241d'); R(c, sx + 2, sy - 2, 10, 4, '#3d332a');
    R(c, sx + 4, sy - 1, 6, 2, '#6b5b48'); R(c, sx - 3, sy + 8, 20, 3, '#221c16');
  }
  R(c, 1150, 180, 210, 470, '#2a211833');
  // baked ground clutter: fallen logs, rocks and leaf litter
  for (const [lx, ly] of [[1002, 664], [1176, 632], [1288, 236], [1064, 486], [1310, 452]] as [number, number][]) {
    R(c, lx, ly, 34, 9, '#4a3a28'); R(c, lx, ly, 34, 3, '#6b5136'); R(c, lx - 2, ly - 1, 5, 11, '#8a6a42');
    R(c, lx - 1, ly + 1, 3, 7, '#c2a67e'); R(c, lx + 30, ly - 1, 5, 11, '#6b5136');
  }
  for (const [rx, ry] of [[1042, 300], [1198, 520], [1266, 664], [978, 424]] as [number, number][]) {
    R(c, rx, ry, 16, 10, '#5f6560'); R(c, rx + 1, ry - 2, 13, 11, '#6d736c');
    R(c, rx + 3, ry - 3, 8, 4, '#8b918a'); R(c, rx, ry + 8, 16, 3, '#454a45');
  }
}

/* ---------- village decoration ---------- */
function bambooFence(c: CanvasRenderingContext2D, x: number, y: number, len: number) {
  R(c, x, y + 12, len, 3, '#00000026');
  R(c, x, y - 2, len, 3, '#8d6a42'); R(c, x, y + 7, len, 3, '#7d5c37');
  for (let i = 0; i <= len; i += 11) {
    const h = 20 + ((i / 11) % 3) * 3;
    R(c, x + i, y - h + 12, 5, h, '#a9834f');
    R(c, x + i, y - h + 12, 2, h, '#c9a46c');
    R(c, x + i + 4, y - h + 12, 1, h, '#6d4f30');
    R(c, x + i, y - h + 12, 5, 2, '#d8b57c');
    for (let k = 4; k < h; k += 7) R(c, x + i, y - h + 12 + k, 5, 1, '#7d5c37');
  }
}
function villageWell(c: CanvasRenderingContext2D, x: number, y: number) {
  R(c, x - 22, y + 6, 46, 8, '#00000030');
  // stone ring
  R(c, x - 20, y - 10, 40, 18, '#6d736c');
  R(c, x - 18, y - 12, 36, 5, '#8b918a');
  R(c, x - 15, y - 9, 30, 8, '#26332f');
  R(c, x - 13, y - 7, 26, 5, '#1d3a3e');
  for (let i = 0; i < 6; i++) { R(c, x - 19 + i * 7, y - 2, 6, 5, i % 2 ? '#5f6560' : '#787e77'); R(c, x - 19 + i * 7, y - 2, 6, 1, '#9aa09a'); }
  R(c, x - 20, y + 6, 40, 3, '#454a45');
  // posts and a little shingled roof
  R(c, x - 17, y - 40, 5, 32, '#7d5c39'); R(c, x - 17, y - 40, 2, 32, '#a9834f');
  R(c, x + 12, y - 40, 5, 32, '#6b4d2e'); R(c, x + 12, y - 40, 2, 32, '#8d6a42');
  R(c, x - 22, y - 46, 44, 7, '#8a4a33'); R(c, x - 22, y - 46, 44, 2, '#b8704c');
  R(c, x - 16, y - 51, 32, 6, '#7d4630'); R(c, x - 16, y - 51, 32, 2, '#a8603f');
  for (let i = 0; i < 6; i++) R(c, x - 20 + i * 7, y - 41, 5, 2, '#5d2f20');
  // windlass, rope and bucket
  R(c, x - 15, y - 30, 30, 4, '#8d6a42'); R(c, x - 15, y - 30, 30, 1, '#c9a46c');
  R(c, x + 15, y - 32, 3, 8, '#6d4f30'); R(c, x + 17, y - 34, 5, 3, '#a9834f');
  R(c, x - 1, y - 26, 2, 14, '#c9b48c');
  R(c, x - 5, y - 13, 10, 9, '#4a6f7a'); R(c, x - 5, y - 13, 10, 2, '#7fa8b3');
  R(c, x - 4, y - 11, 3, 6, '#6d94a0');
}
function laundryLine(c: CanvasRenderingContext2D, x0: number, x1: number, y: number) {
  R(c, x0, y - 26, 4, 30, '#7d5c39'); R(c, x0, y - 26, 2, 30, '#a9834f');
  R(c, x1, y - 26, 4, 30, '#6b4d2e'); R(c, x1, y - 26, 2, 30, '#8d6a42');
  R(c, x0, y - 27, 4, 2, '#c9a46c'); R(c, x1, y - 27, 4, 2, '#c9a46c');
  for (let x = x0 + 3; x < x1; x += 2) {
    const sag = Math.round(Math.sin(((x - x0) / (x1 - x0)) * Math.PI) * 7);
    R(c, x, y - 24 + sag, 2, 1, '#4a4438');
  }
  const cloths: [number, number, number, string, string][] = [
    [0.18, 16, 20, '#c9483a', '#e8836a'], [0.38, 13, 24, '#e7d4a5', '#f6ecd0'],
    [0.58, 18, 17, '#4f7d55', '#72a06c'], [0.78, 12, 21, '#6d7fa8', '#9aa8c4'],
  ];
  for (const [u, w, h, col, lit] of cloths) {
    const cx = Math.round(x0 + (x1 - x0) * u);
    const sag = Math.round(Math.sin(u * Math.PI) * 7);
    const top = y - 23 + sag;
    R(c, cx - w / 2, top, w, h, col);
    R(c, cx - w / 2, top, w, 2, lit);
    R(c, cx - w / 2, top, 2, h, lit);
    R(c, cx + w / 2 - 2, top, 2, h, '#00000030');
    R(c, cx - w / 2 + 2, top + h - 3, w - 4, 1, '#00000026');
    R(c, cx - 3, top - 2, 2, 3, '#c9b48c'); R(c, cx + 2, top - 2, 2, 3, '#c9b48c');
  }
}
function handCart(c: CanvasRenderingContext2D, x: number, y: number) {
  R(c, x - 26, y + 8, 56, 7, '#00000030');
  // bed and side rails
  R(c, x - 24, y - 12, 48, 16, '#8d6a42');
  R(c, x - 24, y - 12, 48, 3, '#c9a46c');
  for (let i = 0; i < 6; i++) R(c, x - 22 + i * 8, y - 9, 6, 12, i % 2 ? '#7d5c37' : '#a9834f');
  R(c, x - 24, y + 2, 48, 3, '#5d4129');
  // shafts
  R(c, x + 22, y - 8, 22, 4, '#7d5c39'); R(c, x + 22, y - 8, 22, 1, '#a9834f');
  R(c, x + 40, y - 12, 4, 10, '#6b4d2e');
  // spoked wheel
  const wx = x - 8, wy = y + 6;
  R(c, wx - 11, wy - 11, 22, 22, '#3d2f24');
  R(c, wx - 9, wy - 9, 18, 18, '#6b4d2e');
  R(c, wx - 7, wy - 7, 14, 14, '#2b2018');
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI;
    for (let k = -6; k <= 6; k++) R(c, wx + Math.round(Math.cos(a) * k), wy + Math.round(Math.sin(a) * k), 2, 2, '#8d6a42');
  }
  R(c, wx - 3, wy - 3, 6, 6, '#a9834f'); R(c, wx - 1, wy - 1, 2, 2, '#4a3524');
  // load: folded sacks
  R(c, x - 16, y - 20, 20, 9, '#cbb98d'); R(c, x - 16, y - 20, 20, 2, '#e0d2ac');
  R(c, x - 2, y - 18, 16, 7, '#b8a678'); R(c, x - 2, y - 18, 16, 2, '#d8c89a');
}
function chickenCoop(c: CanvasRenderingContext2D, x: number, y: number) {
  R(c, x - 24, y + 6, 50, 7, '#00000030');
  for (const sx of [x - 20, x + 16]) { R(c, sx, y - 6, 5, 14, '#6b4d2e'); R(c, sx, y - 6, 2, 14, '#8d6a42'); }
  R(c, x - 22, y - 30, 44, 26, '#a9834f');
  for (let yy = y - 28; yy < y - 5; yy += 6) { R(c, x - 22, yy, 44, 4, '#96714a'); R(c, x - 22, yy + 4, 44, 2, '#6d4f30'); }
  R(c, x - 22, y - 30, 44, 2, '#c9a46c');
  // dark doorway with a little ramp
  R(c, x - 7, y - 20, 14, 16, '#241d17');
  R(c, x - 9, y - 4, 18, 4, '#8d6a42');
  R(c, x - 11, y, 22, 4, '#7d5c37'); R(c, x - 11, y, 22, 1, '#a9834f');
  // nesting box and perch
  R(c, x + 10, y - 24, 10, 9, '#7d5c37'); R(c, x + 11, y - 23, 8, 7, '#3a2f26');
  R(c, x + 12, y - 20, 6, 3, '#cbb98d');
  // shingled lean-to roof
  R(c, x - 26, y - 38, 52, 9, '#8a4a33'); R(c, x - 26, y - 38, 52, 2, '#b8704c');
  for (let i = 0; i < 7; i++) R(c, x - 24 + i * 7, y - 31, 5, 2, '#5d2f20');
  R(c, x - 20, y - 43, 40, 6, '#7d4630'); R(c, x - 20, y - 43, 40, 2, '#a8603f');
  // scattered feed
  for (let i = 0; i < 9; i++) R(c, x - 26 + i * 6, y + 6 + (i % 3) * 3, 2, 2, '#d8b57c');
}
function bicycle(c: CanvasRenderingContext2D, x: number, y: number) {
  const wheel = (wx: number) => {
    R(c, wx - 9, y - 9, 18, 18, '#2b2622');
    R(c, wx - 7, y - 7, 14, 14, '#4a4438');
    R(c, wx - 5, y - 5, 10, 10, '#6d736c');
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI; for (let k = -5; k <= 5; k++) R(c, wx + Math.round(Math.cos(a) * k), y + Math.round(Math.sin(a) * k), 1, 1, '#9aa09a'); }
    R(c, wx - 2, y - 2, 4, 4, '#8b918a');
  };
  R(c, x - 20, y + 8, 42, 5, '#00000030');
  wheel(x - 12); wheel(x + 12);
  R(c, x - 12, y - 2, 24, 3, '#a8442f');
  R(c, x - 4, y - 14, 3, 14, '#a8442f');
  R(c, x - 12, y - 12, 12, 3, '#c25a3d');
  R(c, x + 8, y - 16, 3, 16, '#8d8f86');
  R(c, x + 3, y - 18, 12, 3, '#4a4438');
  R(c, x - 8, y - 17, 9, 4, '#3d2f24');
  R(c, x - 2, y - 6, 5, 5, '#6d736c');
}
function pottedRow(c: CanvasRenderingContext2D, x: number, y: number, n: number) {
  for (let i = 0; i < n; i++) {
    const px = x + i * 22;
    R(c, px - 8, y + 8, 17, 4, '#00000026');
    R(c, px - 7, y - 2, 14, 12, '#a8603f');
    R(c, px - 8, y - 4, 16, 4, '#c2764c');
    R(c, px - 6, y, 3, 9, '#c98a5e');
    R(c, px - 7, y + 8, 14, 2, '#6d3a24');
    const g = i % 3;
    if (g === 0) { R(c, px - 1, y - 16, 2, 13, '#4f7a3c'); R(c, px - 7, y - 14, 6, 4, '#6b9a48'); R(c, px + 1, y - 18, 6, 4, '#6b9a48'); R(c, px - 2, y - 21, 4, 4, '#86ad58'); }
    else if (g === 1) { R(c, px - 1, y - 13, 2, 10, '#4f7a3c'); for (let k = 0; k < 3; k++) { R(c, px - 6 + k * 5, y - 17 - (k % 2) * 3, 4, 4, k % 2 ? '#e8836a' : '#f1d36e'); R(c, px - 5 + k * 5, y - 16 - (k % 2) * 3, 2, 2, '#fff0c0'); } }
    else { for (let k = 0; k < 5; k++) R(c, px - 6 + k * 3, y - 12 - (k % 2) * 5, 2, 10 + (k % 2) * 5, k % 2 ? '#5d8a4a' : '#7aa856'); }
  }
}
function weatherBuilding(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number) {
  // rain streaks under the eaves, moss at the damp base, sun bleach on top
  for (let i = 0; i < 9; i++) {
    const sx = x + 4 + Math.floor(hash(i, seed) * (w - 8));
    const len = 8 + Math.floor(hash(i, seed + 3) * 22);
    R(c, sx, y, 1, len, '#00000018');
    R(c, sx + 1, y, 1, Math.floor(len * 0.6), '#00000010');
  }
  for (let i = 0; i < 12; i++) {
    const mx = x + Math.floor(hash(i, seed + 7) * w);
    const my = y + h - 2 - Math.floor(hash(i, seed + 11) * 7);
    R(c, mx, my, 2 + Math.floor(hash(i, seed + 13) * 4), 2, i % 2 ? '#5d7a44' : '#7a9a52');
  }
}

function villageBackground(c: CanvasRenderingContext2D) {
  R(c, 0, 0, 1400, 820, '#647b49');
  for (let y = 0; y < 820; y += 10) for (let x = 0; x < 1400; x += 10) {
    const n = hash(x, y);
    if (n > .68) { R(c, x, y, 3, 4, n > .9 ? '#8a9656' : '#526d40'); R(c, x + 3, y + 3, 3, 2, '#76884d'); }
  }
  forestBackdrop(c);
  // roads: an east-west village road and a spur down to the pier
  R(c, 174, 281, 825, 69, '#a78e5c'); R(c, 182, 287, 809, 56, '#c5ab73');
  R(c, 411, 313, 65, 240, '#a78e5c'); R(c, 418, 315, 51, 238, '#c5ab73');
  for (let i = 0; i < 190; i++) { const x = 190 + hash(i, 9) * 788, y = 291 + hash(i, 11) * 46; R(c, x, y, 3 + hash(i, 5) * 5, 2, '#af935f'); }
  for (let i = 0; i < 40; i++) R(c, 423 + hash(i, 2) * 40, 350 + hash(i, 7) * 177, 4, 2, '#af935f');
  // stepping stones off the road and a worn apron in front of each building
  for (const [sx, sy] of [[330, 268], [352, 262], [700, 266], [722, 260], [900, 268]] as [number, number][]) R(c, sx, sy, 12, 6, '#b3a277');
  R(c, 168, 258, 88, 24, '#b8a274'); R(c, 520, 246, 96, 36, '#b8a274'); R(c, 786, 248, 78, 34, '#b8a274');
  // lake: bank, shallows, deep water, lilies, reeds, pier and a moored boat
  const lake = [[202,516],[630,516],[630,526],[665,526],[665,546],[681,546],[681,733],[655,733],[655,761],[614,761],[614,774],[225,774],[225,762],[190,762],[190,735],[173,735],[173,557],[188,557],[188,530],[202,530]];
  poly(c, lake, '#c2b27b');
  poly(c, lake.map(([x, y]) => [x + (x < 426 ? 8 : -8), y + (y < 640 ? 8 : -8)]), '#6faaa0');
  R(c, 202, 549, 448, 185, '#4c8b8e'); R(c, 224, 566, 402, 153, '#417e85');
  R(c, 246, 588, 358, 110, '#3a737a');
  for (let i = 0; i < 85; i++) R(c, 210 + hash(i, 8) * 425, 558 + hash(i, 9) * 168, 8 + hash(i, 2) * 13, 2, '#539a9970');
  for (const [lx, ly] of [[258, 600], [561, 679], [343, 714], [600, 596], [292, 686]] as [number, number][]) {
    leafCluster(c, lx, ly, 25, 20, '#497243'); R(c, lx + 12, ly + 1, 2, 10, '#a1b06b'); R(c, lx + 4, ly - 3, 7, 5, '#d5ac88');
  }
  for (const [x, y] of [[160, 610], [692, 587], [212, 787], [652, 754], [176, 700]] as [number, number][]) {
    for (let i = 0; i < 7; i++) { R(c, x + i * 4, y - 21 - (i % 3) * 7, 2, 25, '#527247'); R(c, x + i * 4, y - 24 - (i % 3) * 7, 3, 6, '#a3ab65'); }
  }
  // submerged log and a moored jukung
  R(c, 300, 640, 46, 6, '#4a3a28'); R(c, 300, 640, 46, 2, '#6b5136');
  R(c, 566, 668, 54, 14, '#7d5c39'); R(c, 566, 668, 54, 3, '#a9834f');
  R(c, 560, 672, 8, 8, '#6b4d2e'); R(c, 618, 672, 8, 8, '#6b4d2e');
  R(c, 572, 674, 42, 6, '#4a3524'); R(c, 588, 664, 3, 10, '#8d6a42');
  R(c, 566, 682, 54, 3, '#2f4d56');
  // pier with railings, posts and a water ladder
  R(c, 405, 504, 74, 130, '#5a5034');
  for (let y = 505; y < 625; y += 12) { R(c, 410, y, 65, 9, '#af8a54'); R(c, 412, y + 1, 61, 2, '#d2b077'); R(c, 410, y + 8, 65, 2, '#7d5c39'); }
  for (const x of [406, 474]) { R(c, x, 527, 6, 104, '#685034'); R(c, x - 2, 525, 10, 7, '#c9a76d'); }
  for (let y = 520; y < 620; y += 26) { R(c, 402, y, 4, 4, '#c9a76d'); R(c, 478, y, 4, 4, '#c9a76d'); }
  R(c, 400, 512, 4, 40, '#8d6a42'); R(c, 480, 512, 4, 40, '#8d6a42');
  R(c, 398, 508, 8, 6, '#c9a76d'); R(c, 478, 508, 8, 6, '#c9a76d');
  for (let y = 626; y < 660; y += 8) { R(c, 428, y, 26, 5, '#a9834f'); R(c, 428, y, 26, 2, '#c9a46c'); }
  // buildings and their yard planting
  rumahWira(c); warungBudi(c); poskoSiaga(c);
  plant(c, 300, 252); plant(c, 654, 250);
  // banana plants and bushes tucked against the buildings
  R(c, 112, 236, 4, 20, '#6f8a45'); R(c, 100, 226, 26, 12, '#4f7a3c'); R(c, 104, 220, 18, 10, '#6b9a48');
  R(c, 306, 240, 4, 16, '#6f8a45'); R(c, 296, 230, 22, 11, '#4f7a3c'); R(c, 300, 224, 15, 9, '#6b9a48');
  // a low wood pile and water jar beside the shop
  for (let i = 0; i < 5; i++) R(c, 672 + (i % 2) * 3, 236 - i * 5, 20, 5, i % 2 ? '#6b4d2e' : '#8d6a42');
  R(c, 694, 224, 16, 22, '#6d7f8a'); R(c, 694, 224, 16, 3, '#9aa8b0'); R(c, 696, 228, 4, 14, '#8fa0aa');
  R(c, 698, 220, 8, 5, '#a9834f');
  // weathering pass ties the buildings to the same damp climate
  weatherBuilding(c, 118, 134, 184, 76, 3);
  weatherBuilding(c, 462, 114, 206, 30, 9);
  weatherBuilding(c, 756, 150, 136, 96, 17);
  // yard life: fence, well, washing line, cart, coop, bicycle, potted plants
  bambooFence(c, 40, 300, 121);
  bambooFence(c, 690, 452, 110);
  villageWell(c, 372, 430);
  laundryLine(c, 316, 424, 236);
  handCart(c, 706, 392);
  chickenCoop(c, 104, 372);
  bicycle(c, 908, 246);
  pottedRow(c, 486, 268, 3);
  pottedRow(c, 618, 268, 2);
  // stone path from the well to the road
  for (let i = 0; i < 5; i++) R(c, 366 + (i % 2) * 5, 396 - i * 13, 13, 7, i % 2 ? '#b3a277' : '#a89468');
}

export function getBackground(scene: SceneType) {
  const previous=cache.get(scene); if(previous) return previous;
  const canvas=document.createElement('canvas'); canvas.width=scene==='house'?1280:1400; canvas.height=scene==='house'?620:820;
  const c=canvas.getContext('2d')!; c.imageSmoothingEnabled=false;
  if(scene==='house') { c.translate(200,0); houseBackground(c); } else villageBackground(c);
  cache.set(scene,canvas); return canvas;
}

