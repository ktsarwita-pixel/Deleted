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
  // Cast eave drop-shadow onto wall below
  R(c, x0 - 2, y1, x1 - x0 + 4, 6, '#14100c55');
  const rows = Math.max(4, Math.round((y1 - y0) / 6));
  for (let r = 0; r < rows; r++) {
    const u = r / (rows - 1);
    const y = Math.round(y0 + u * (y1 - y0 - 6));
    const inset = Math.round((1 - u) * (x1 - x0) * 0.14);
    const a = x0 + inset, b = x1 - inset;
    R(c, a, y, b - a, 7, base);
    // Staggered sirap ulin (ironwood shingle) courses
    const step = 8, off = (r % 2) * 4;
    for (let x = a + off; x < b - 2; x += step) {
      R(c, x, y + 5, step - 1, 2, dark);
      R(c, x, y + 1, 1, 5, dark);
      if ((x + r) % 3 === 0) R(c, x + 2, y + 1, step - 3, 3, light);
    }
    R(c, a, y, b - a, 1, light);
    R(c, a, y, 3, 6, light);
    R(c, b - 3, y, 3, 6, dark);
  }
  // Carved Kalimantan fascia eave trim + exposed rafter tails
  R(c, x0 - 4, y1 - 3, x1 - x0 + 8, 5, dark);
  R(c, x0 - 4, y1 - 3, x1 - x0 + 8, 2, light);
  for (let x = x0; x < x1; x += 8) {
    R(c, x, y1 - 1, 3, 2, '#dfb974');
    R(c, x + 4, y1 + 2, 2, 2, '#3a2518');
  }
}

function ridge(c: CanvasRenderingContext2D, x0: number, x1: number, y: number, col: string) {
  R(c, x0 - 2, y + 1, x1 - x0 + 4, 6, '#2e1c12');
  R(c, x0, y, x1 - x0, 5, col);
  R(c, x0, y, x1 - x0, 2, '#e8c584');
  for (let x = x0 + 6; x < x1 - 6; x += 10) R(c, x, y + 2, 4, 2, '#c89b58');
  // Crossed Dayak hornbill/naga roof finials (unjuk-unjuk)
  for (const [s, dir] of [[x0, -1], [x1, 1]] as [number, number][]) {
    R(c, s - 3, y - 10, 6, 11, col);
    R(c, s - 2, y - 9, 2, 9, '#cfa05e');
    R(c, s + dir * 2 - 2, y - 15, 5, 6, col);
    R(c, s + dir * 5 - 2, y - 18, 4, 4, '#e8c584');
    R(c, s - dir * 4 - 1, y - 13, 4, 4, '#cfa05e');
  }
}

function bambooWall(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  R(c, x, y, w, h, '#ad8650');
  // Woven herringbone anyaman bambu pattern
  for (let yy = y + 2; yy < y + h - 2; yy += 4) {
    const shift = ((yy / 4) & 1) * 4;
    for (let xx = x + 2 + shift; xx < x + w - 4; xx += 8) {
      R(c, xx, yy, 4, 2, '#c9a56d');
      R(c, xx + 4, yy, 4, 2, '#876339');
      R(c, xx + 2, yy + 2, 4, 2, '#be9860');
    }
  }
  // Wainscot timber dado & top shadow under eaves
  R(c, x, y, w, 4, '#5a3e26');
  R(c, x, y + h - 10, w, 10, '#7c5935');
  R(c, x, y + h - 11, w, 2, '#cfa970');
  R(c, x, y + h - 2, w, 2, '#4f3721');
  R(c, x, y, 2, h, '#cfa970'); R(c, x + w - 2, y, 2, h, '#5e4228');
}

function plankWall(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, base: string, dark: string, light: string) {
  R(c, x, y, w, h, base);
  for (let yy = y; yy < y + h; yy += 7) {
    R(c, x, yy, w, 5, base); R(c, x, yy + 5, w, 2, dark); R(c, x, yy, w, 1, light);
    for (let xx = x + ((yy / 7) % 2) * 19; xx < x + w; xx += 38) R(c, xx, yy, 2, 5, dark);
    for (let i = 0; i < 3; i++) {
      const gx = x + Math.floor(hash(xx0(yy, i), y) * (w - 12));
      R(c, gx, yy + 2 + (i % 2), 8 + Math.floor(hash(i, yy) * 10), 1, i % 2 ? dark : light);
    }
  }
  R(c, x, y, 2, h, light); R(c, x + w - 2, y, 2, h, dark);
}
const xx0 = (a: number, b: number) => a * 7.3 + b * 13.7;

function stilt(c: CanvasRenderingContext2D, x: number, y0: number, y1: number) {
  R(c, x - 4, y0, 9, y1 - y0, '#463120');
  R(c, x - 4, y0, 3, y1 - y0, '#7e5c39');
  R(c, x - 1, y0, 2, y1 - y0, '#9c754b');
  R(c, x + 3, y0, 2, y1 - y0, '#2a1d13');
  // Stone footing pad so ironwood posts don't rot in damp soil
  R(c, x - 7, y1 - 4, 15, 4, '#5f6560');
  R(c, x - 6, y1 - 5, 13, 2, '#8b928b');
  R(c, x - 5, y0 + 5, 11, 2, '#5f4529');
}

function shutter(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, open: boolean) {
  R(c, x - 4, y - 4, w + 8, h + 8, '#4a3321');
  R(c, x - 3, y - 3, w + 6, 2, '#9e774c');
  R(c, x, y, w, h, open ? '#22332d' : '#8a6840');
  if (open) {
    // Warm interior reflection + mullion crossbars + curtains
    R(c, x + 1, y + 1, w - 2, h - 2, '#283b34');
    R(c, x + 2, y + 2, 7, h - 5, '#466457');
    R(c, x + w - 8, y + 2, 6, h - 4, '#d8c292');
    R(c, x, y, w, 3, '#172420');
    R(c, x + w / 2 - 1, y, 2, h, '#5c412a');
    R(c, x, y + Math.floor(h * 0.52), w, 2, '#5c412a');
  } else {
    for (let yy = y + 2; yy < y + h - 1; yy += 4) {
      R(c, x + 1, yy, w - 2, 2, '#684b2c');
      R(c, x + 1, yy - 1, w - 2, 1, '#ad8654');
    }
    R(c, x + w / 2 - 1, y, 2, h, '#4a3321');
  }
  // Louvered side shutters with brass latches
  R(c, x - 10, y - 2, 7, h + 4, '#6e4e30'); R(c, x - 9, y, 5, h, '#9f794d');
  R(c, x + w + 3, y - 2, 7, h + 4, '#5e4228'); R(c, x + w + 4, y, 5, h, '#8f6b42');
  for (let yy = y + 3; yy < y + h - 2; yy += 4) {
    R(c, x - 8, yy, 3, 1, '#5a3e26'); R(c, x + w + 5, yy, 3, 1, '#4a3321');
  }
  // Window sill planter box
  R(c, x - 5, y + h + 2, w + 10, 4, '#6e472b');
  R(c, x - 5, y + h + 2, w + 10, 1, '#b07b50');
  for (let px = x - 1; px < x + w - 2; px += 6) {
    R(c, px, y + h - 1, 4, 3, '#4c7a3c');
    if (px % 12 === 0) R(c, px + 1, y + h - 2, 2, 2, '#e89072');
  }
}

function crate(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col = '#a07a48') {
  R(c, x, y, w, h, col); R(c, x, y, w, 2, '#cfa86e'); R(c, x, y + h - 2, w, 2, '#5c4025');
  R(c, x, y, 2, h, '#cfa86e'); R(c, x + w - 2, y, 2, h, '#5c4025');
  R(c, x + 2, y + Math.floor(h / 2) - 1, w - 4, 2, '#755331');
  R(c, x + 3, y + 3, 2, 2, '#3d2c1d'); R(c, x + w - 5, y + 3, 2, 2, '#3d2c1d');
}

function sack(c: CanvasRenderingContext2D, x: number, y: number, col = '#cbb98d') {
  R(c, x - 1, y + 16, 18, 3, '#00000028');
  R(c, x, y + 4, 16, 14, col); R(c, x + 2, y + 2, 12, 4, col);
  R(c, x + 4, y, 8, 3, '#a89468'); R(c, x + 5, y - 1, 6, 2, '#c9483a');
  R(c, x + 2, y + 6, 3, 9, '#e4d6b0'); R(c, x + 12, y + 7, 3, 9, '#9c885e');
  R(c, x + 4, y + 9, 8, 1, '#8d7a52');
}

function barrel(c: CanvasRenderingContext2D, x: number, y: number, col = '#43707d') {
  R(c, x - 1, y + 28, 22, 4, '#00000030');
  R(c, x, y, 20, 30, col); R(c, x + 2, y, 4, 30, '#72a0ad'); R(c, x + 15, y, 4, 30, '#2a4952');
  R(c, x - 1, y + 6, 22, 3, '#2d3d44'); R(c, x - 1, y + 20, 22, 3, '#2d3d44');
  R(c, x, y, 20, 3, '#8eb8c2'); R(c, x + 2, y + 1, 16, 1, '#263c44');
}

/* ---------- Rumah Wira: Kalimantan Rumah Panggung (stilt house) ---------- */
function rumahWira(c: CanvasRenderingContext2D) {
  const x0 = 118, x1 = 302, yRoof = 70, yBody = 132, yFloor = 210, yGround = 258;
  R(c, x0 - 12, yGround - 4, x1 - x0 + 26, 12, '#0f19114a');
  // Shaded under-croft (kolong rumah) with cross-bracing, stacked firewood & woven mats
  R(c, x0 - 4, yFloor + 4, x1 - x0 + 8, yGround - yFloor - 4, '#241a13');
  R(c, x0 - 4, yFloor + 4, x1 - x0 + 8, 4, '#16100b');
  for (let row = 0; row < 3; row++) for (let i = 0; i < 6 - row; i++) {
    const lx = x0 + 10 + i * 9 + row * 4, ly = yGround - 8 - row * 5;
    R(c, lx, ly, 8, 5, (i + row) % 2 ? '#735232' : '#5c4026');
    R(c, lx + 2, ly + 1, 4, 3, '#b89464');
  }
  crate(c, x1 - 48, yGround - 21, 30, 19, '#8d6a42');
  sack(c, x1 - 68, yGround - 20);
  for (const sx of [128, 168, 210, 252, 292]) stilt(c, sx, yFloor, yGround);
  R(c, 128, 232, 164, 4, '#4a3524'); R(c, 128, 232, 164, 1, '#7a5938');

  // Raised ulin timber deck & carved Kalimantan band
  R(c, x0 - 10, yFloor - 8, x1 - x0 + 20, 13, '#5c3f26');
  R(c, x0 - 10, yFloor - 8, x1 - x0 + 20, 3, '#ad8453');
  R(c, x0 - 10, yFloor + 3, x1 - x0 + 20, 2, '#302015');
  for (let x = x0 - 6; x < x1 + 6; x += 10) R(c, x, yFloor - 4, 4, 6, '#3f2b1b');

  // Woven bamboo & ironwood timber body
  bambooWall(c, x0, yBody, x1 - x0, yFloor - yBody - 8);
  // Decorative Dayak geometric frieze under the eaves
  R(c, x0 + 4, yBody + 4, x1 - x0 - 8, 5, '#593b24');
  for (let x = x0 + 8; x < x1 - 10; x += 12) {
    R(c, x, yBody + 5, 4, 3, '#e0b86e');
    R(c, x + 5, yBody + 6, 3, 2, '#b85038');
  }
  // Structural ulin posts
  for (const px of [x0 - 4, 178, 236, x1 - 4]) {
    R(c, px, yBody - 4, 7, yFloor - yBody + 2, '#543923');
    R(c, px, yBody - 4, 2, yFloor - yBody, '#9c744a');
  }
  shutter(c, 132, 160, 30, 26, true);
  shutter(c, 256, 160, 30, 26, true);

  // Carved front doorway with warm indoor lamp glow & rolled rotan blind
  R(c, 190, 152, 42, 52, '#4a321f');
  R(c, 192, 150, 38, 3, '#b88d58');
  R(c, 194, 155, 34, 48, '#231811');
  R(c, 197, 158, 28, 44, '#3b2819');
  R(c, 202, 166, 18, 26, '#593b20'); // warm interior doorway light
  for (let yy = 156; yy < 174; yy += 4) { R(c, 194, yy, 34, 2, '#a88250'); R(c, 194, yy + 2, 34, 1, '#6b4e2e'); }
  // Warm porch lantern beside door
  R(c, 182, 158, 6, 8, '#f5d88e'); R(c, 181, 156, 8, 2, '#4a3321'); R(c, 181, 166, 8, 2, '#4a3321');

  // Front veranda wooden balustrade (left and right of stairs)
  for (const [bx0, bx1] of [[x0 - 6, 188], [234, x1 + 6]] as [number, number][]) {
    R(c, bx0, yFloor - 22, bx1 - bx0, 3, '#7a5634');
    R(c, bx0, yFloor - 22, bx1 - bx0, 1, '#c49b63');
    for (let bx = bx0 + 3; bx < bx1 - 3; bx += 7) {
      R(c, bx, yFloor - 19, 3, 12, '#8f6840');
      R(c, bx, yFloor - 19, 1, 12, '#c49b63');
    }
  }

  // Tiered sirap ulin gabled roof with central dormer vent
  shingles(c, 104, yRoof + 8, 316, yBody - 1, '#8c4930', '#592c1d', '#bf744e');
  ridge(c, 126, 294, yRoof, '#6b3624');
  // Roof smoke vent (dapur)
  R(c, 258, yRoof + 12, 26, 11, '#5c3422');
  R(c, 255, yRoof + 9, 32, 5, '#a86240'); R(c, 255, yRoof + 9, 32, 2, '#d48d64');

  // Wide ironwood front stairs with twin handrails & stone landing pad
  R(c, 186, 260, 50, 8, '#9e9278'); R(c, 188, 261, 46, 5, '#bdb094');
  R(c, 189, yFloor + 2, 44, 56, '#47311f');
  for (let yy = yFloor + 6; yy < 262; yy += 8) {
    R(c, 191, yy, 40, 6, '#ab8350');
    R(c, 191, yy, 40, 2, '#d6b17a');
    R(c, 191, yy + 5, 40, 2, '#5e4127');
  }
  R(c, 186, yFloor - 10, 5, 72, '#7d5936'); R(c, 186, yFloor - 10, 2, 72, '#c49b63');
  R(c, 231, yFloor - 10, 5, 72, '#6b4b2d'); R(c, 231, yFloor - 10, 2, 72, '#b08954');
}

/* ---------- Warung Budi: Kalimantan Village Provision Shop ---------- */
function warungBudi(c: CanvasRenderingContext2D) {
  const x0 = 462, x1 = 668, yRoof = 72, yWall = 114;
  R(c, x0 - 10, 244, x1 - x0 + 20, 11, '#0f19114a');
  // Paved stone shop apron
  for (let sx = x0 - 2; sx < x1 - 4; sx += 18) {
    R(c, sx, 245, 16, 6, (sx / 18) % 2 ? '#9c8f73' : '#afa184');
    R(c, sx + 1, 245, 14, 2, '#c7ba9c');
  }

  shingles(c, x0 - 14, yRoof + 6, x1 + 14, yWall - 5, '#7a442e', '#4c291b', '#ad6544');
  ridge(c, x0 + 14, x1 - 14, yRoof - 2, '#5e3221');

  // Fascia board & carved trim
  R(c, x0 - 8, yWall - 8, x1 - x0 + 16, 10, '#543a24');
  R(c, x0 - 8, yWall - 8, x1 - x0 + 16, 2, '#ad8452');
  plankWall(c, x0, yWall, x1 - x0, 30, '#a27b48', '#694b2c', '#cfa86e');

  // Awning rail beam
  R(c, x0 - 10, 142, x1 - x0 + 20, 9, '#463120');
  R(c, x0 - 10, 142, x1 - x0 + 20, 2, '#9c744a');
  R(c, x0 - 10, 149, x1 - x0 + 20, 2, '#2a1d13');

  // Deep shop interior
  R(c, x0, 151, x1 - x0, 57, '#261e18');
  R(c, x0, 151, x1 - x0, 4, '#17120e');
  // Left doorway with warm interior depth
  R(c, x0 + 8, 155, 42, 52, '#1c1510');
  R(c, x0 + 6, 153, 46, 3, '#7a5938');

  // Hanging golden banana bunches (pisang) & kerupuk packets under the eaves
  for (const bx of [516, 650]) {
    R(c, bx + 3, 151, 2, 6, '#6d5838');
    R(c, bx, 156, 9, 5, '#ecc854'); R(c, bx - 1, 160, 11, 5, '#deb43c');
    R(c, bx + 1, 156, 7, 2, '#fae282');
  }

  // Back shelves stocked with colourful provisions, buckets & bottles
  for (const sy of [162, 178, 194]) {
    R(c, 524, sy, 134, 4, '#8d6a42'); R(c, 524, sy, 134, 1, '#cfa86e'); R(c, 524, sy + 3, 134, 1, '#432e1d');
    for (let i = 0; i < 10; i++) {
      const gx = 528 + i * 13, kind = (i + sy) % 4;
      if (kind === 0) { R(c, gx, sy - 11, 7, 11, '#4f8664'); R(c, gx + 1, sy - 13, 5, 3, '#b88d58'); R(c, gx + 1, sy - 9, 2, 6, '#8ac49d'); }
      else if (kind === 1) { R(c, gx, sy - 9, 9, 9, '#cc4737'); R(c, gx, sy - 9, 9, 2, '#ee8870'); R(c, gx + 2, sy - 6, 5, 3, '#f5dbb2'); }
      else if (kind === 2) { R(c, gx, sy - 9, 9, 9, '#deb954'); R(c, gx + 1, sy - 8, 7, 2, '#f7e49c'); R(c, gx + 3, sy - 5, 3, 3, '#9c7830'); }
      else { R(c, gx, sy - 11, 8, 11, '#3f8fa3'); R(c, gx, sy - 11, 8, 2, '#8cd2d9'); R(c, gx + 1, sy - 8, 2, 6, '#6cb8c4'); }
    }
  }

  // Equipment display rack on left counter: blue Ember, brass Ember Besar & red Sepatu Baru!
  R(c, 474, 195, 13, 13, '#3f8fa3'); R(c, 473, 194, 15, 3, '#8ad0d6'); // Ember air
  R(c, 492, 192, 16, 16, '#c7934c'); R(c, 491, 191, 18, 3, '#ebd88c'); R(c, 492, 198, 16, 2, '#7d5628'); // Ember besar
  R(c, 512, 200, 13, 8, '#c9412d'); R(c, 512, 206, 14, 2, '#f3ead4'); R(c, 515, 202, 4, 2, '#f5c650'); // Sepatu baru

  // Front panelled ulin counter + glass etalase display case
  R(c, x0 - 4, 212, x1 - x0 + 8, 32, '#694a2b');
  R(c, x0 - 4, 207, x1 - x0 + 8, 7, '#cfa86e');
  R(c, x0 - 4, 207, x1 - x0 + 8, 2, '#ebd09e');
  R(c, x0 - 4, 213, x1 - x0 + 8, 2, '#47311d');
  for (let x = x0 + 4; x < x1 - 12; x += 24) {
    R(c, x, 217, 18, 21, '#593d23');
    R(c, x + 2, 219, 14, 17, '#7a5634');
    R(c, x + 2, 219, 14, 1, '#9e7449');
  }
  R(c, x0 - 5, 242, x1 - x0 + 10, 3, '#2e1f13');

  // Glass etalase & kerupuk jars on the counter
  R(c, 598, 191, 44, 17, '#a8cfd4'); R(c, 600, 193, 40, 13, '#3b4a47');
  R(c, 603, 199, 10, 6, '#e2a84b'); R(c, 616, 198, 10, 7, '#7ab068'); R(c, 629, 199, 9, 6, '#de6c4e');
  R(c, 602, 194, 12, 2, '#ffffff66'); R(c, 598, 190, 44, 2, '#cfa86e');
  for (const [jx, col] of [[542, '#d44b3a'], [558, '#e6ab3c'], [574, '#569468']] as [number, string][]) {
    R(c, jx, 195, 12, 13, '#dce8e2'); R(c, jx + 1, 198, 10, 9, col);
    R(c, jx, 193, 12, 3, '#c9483a'); R(c, jx + 2, 196, 2, 9, '#ffffff70');
  }

  // Corner timber posts
  R(c, x0 - 6, 142, 7, 104, '#543923'); R(c, x0 - 6, 142, 2, 104, '#9c744a');
  R(c, x1 - 1, 142, 7, 104, '#46301d'); R(c, x1 - 1, 142, 2, 104, '#87633b');
}

/* ---------- Posko Siaga Karhutla: Field Command Post ---------- */
function poskoSiaga(c: CanvasRenderingContext2D) {
  const x0 = 756, x1 = 892, yTop = 110;
  R(c, x0 - 10, 246, x1 - x0 + 20, 10, '#0f19114a');

  // Radio mast rising behind Posko command tent
  R(c, 770, 74, 3, 42, '#7d8580'); R(c, 770, 74, 1, 42, '#bac2bc');
  R(c, 764, 82, 15, 2, '#9aa39d'); R(c, 767, 90, 9, 2, '#9aa39d');
  R(c, 770, 71, 3, 3, '#e04838');

  // Layered olive canvas command canopy with ridge & red-white Posko valance stripe
  poly(c, [[x0 - 14, yTop + 32], [x0 + 12, yTop], [x1 - 12, yTop], [x1 + 14, yTop + 32]], '#586941');
  poly(c, [[x0 - 10, yTop + 30], [x0 + 14, yTop + 3], [x0 + 68, yTop + 3], [x0 + 68, yTop + 30]], '#687a4c');
  R(c, x0 + 12, yTop, x1 - x0 - 24, 3, '#97a874');
  // Red-and-white Indonesian BNPB/Posko Siaga trim band
  R(c, x0 - 14, yTop + 31, x1 - x0 + 28, 4, '#c83e2e');
  R(c, x0 - 14, yTop + 35, x1 - x0 + 28, 3, '#ece6d8');
  for (let x = x0 - 12; x < x1 + 10; x += 16) {
    R(c, x + 2, yTop + 38, 10, 4, (x / 16) % 2 ? '#4d5c38' : '#3e4b2d');
  }

  // Shaded command interior + canvas back wall + rolled side curtains
  R(c, x0, yTop + 40, x1 - x0, 106, '#2d3627');
  for (let x = x0 + 16; x < x1 - 10; x += 24) { R(c, x, yTop + 42, 2, 100, '#232b1e'); R(c, x + 2, yTop + 42, 1, 100, '#3e4a35'); }
  // Rolled-up tent flaps tied at left & right posts
  R(c, x0 + 1, yTop + 42, 12, 6, '#7a8a5c'); R(c, x1 - 13, yTop + 42, 12, 6, '#7a8a5c');

  // Timber support posts + guy ropes
  R(c, x0 - 5, yTop + 34, 7, 114, '#6b4f33'); R(c, x0 - 5, yTop + 34, 2, 114, '#a67e53');
  R(c, x1 - 2, yTop + 34, 7, 114, '#594028'); R(c, x1 - 2, yTop + 34, 2, 114, '#8f6b44');
  R(c, x0 - 14, 150, 9, 2, '#b8a478'); R(c, x1 + 5, 150, 9, 2, '#b8a478');
  R(c, x0 - 16, 150, 3, 6, '#6b5136'); R(c, x1 + 13, 150, 3, 6, '#6b5136');

  // Tactical map board on back wall showing Lake (blue), Village (green) & East Burn Zone (red/orange)
  R(c, 824, 162, 52, 34, '#594028');
  R(c, 826, 164, 48, 30, '#e4d6b3');
  R(c, 829, 168, 18, 12, '#6fa062'); R(c, 831, 181, 14, 9, '#4c8f96');
  R(c, 851, 168, 19, 22, '#cf5338'); R(c, 855, 173, 10, 11, '#f29d38');
  R(c, 829, 166, 42, 1, '#9c8a68');

  // Field command desk with radio transceiver + lantern
  R(c, 808, 214, 58, 10, '#a8804e'); R(c, 808, 214, 58, 2, '#d6b07a');
  R(c, 811, 224, 5, 22, '#5c4026'); R(c, 858, 224, 5, 22, '#5c4026');
  R(c, 814, 203, 12, 11, '#323c38'); R(c, 816, 205, 5, 4, '#88c478'); R(c, 823, 195, 2, 9, '#9aa59f'); // VHF radio
  R(c, 846, 204, 14, 10, '#f2e6c9'); R(c, 848, 206, 10, 2, '#c84b38'); // logbook

  // Emergency water drums, sandbags, fire hose reel & yellow safety helmets
  barrel(c, 762, 212, '#3b7385'); barrel(c, 784, 215, '#467052');
  for (let i = 0; i < 2; i++) for (let j = 0; j < 3 - i; j++) {
    const sx = 812 + j * 15 + i * 7, sy = 237 - i * 8;
    R(c, sx, sy, 14, 8, '#c2af80'); R(c, sx, sy, 14, 2, '#e0d0a2'); R(c, sx + 3, sy + 3, 4, 2, '#99865c');
  }
  crate(c, 869, 224, 21, 22, '#8d6a42');
  for (const hx of [870, 881]) {
    R(c, hx, 218, 9, 5, '#e6ac35'); R(c, hx + 1, 216, 7, 3, '#f8ce64'); R(c, hx - 1, 222, 11, 2, '#ab791e');
  }
  // Coiled red canvas fire hose
  for (let r = 0; r < 3; r++) R(c, 756 + r * 2, 240 + r * 3, 20 - r * 4, 4, r % 2 ? '#a63e2a' : '#cf583c');
}

/* ---------- Organic Kalimantan Peat-Forest Floor & Perimeter Canopy ---------- */
function forestBackdrop(c: CanvasRenderingContext2D) {
  // 1. Organic mossy transition zone feathering village meadow (#647b49) into forest edge (#4d6639)
  const outerEdge = [
    [930, 0], [1400, 0], [1400, 820], [948, 820],
    [934, 742], [952, 668], [926, 594], [946, 518],
    [922, 444], [954, 368], [966, 316], [938, 256],
    [918, 182], [936, 108], [916, 44],
  ];
  poly(c, outerEdge, '#4e673a');

  // 2. Deeper shaded rainforest understory (#3e5430)
  const midWood = [
    [966, 0], [1400, 0], [1400, 820], [982, 820],
    [968, 735], [988, 650], [958, 575], [978, 495],
    [956, 420], [986, 348], [992, 305], [968, 238],
    [952, 160], [972, 85],
  ];
  poly(c, midWood, '#3f5531');

  // 3. Organic Kalimantan peatland (tanah gambut) basin under the fire hotspots — NO hard boxes!
  const peatOuter = [
    [994, 152], [1070, 134], [1165, 146], [1278, 138], [1376, 164],
    [1392, 285], [1386, 445], [1390, 610], [1362, 706],
    [1246, 724], [1118, 708], [1014, 688], [982, 612],
    [996, 520], [978, 430], [1002, 344], [984, 246],
  ];
  poly(c, peatOuter, '#4b432e');

  const peatInner = [
    [1022, 178], [1115, 162], [1238, 168], [1346, 192],
    [1366, 330], [1358, 505], [1334, 668], [1210, 686],
    [1086, 672], [1012, 634], [1018, 515], [1004, 412],
    [1024, 315], [1008, 228],
  ];
  poly(c, peatInner, '#413726');

  // 4. Dappled mossy hummocks & living fern islands scattered naturally across the peatland
  for (let i = 0; i < 48; i++) {
    const mx = 948 + hash(i, 17) * 420, my = 96 + hash(i, 29) * 660;
    const mw = 18 + Math.floor(hash(i, 31) * 28), mh = 10 + Math.floor(hash(i, 37) * 14);
    const col = mx < 1015 ? '#556f3e' : (i % 3 === 0 ? '#485c33' : '#4f442f');
    R(c, mx, my, mw, mh, col);
    R(c, mx + 3, my - 2, mw - 6, mh + 4, col);
  }

  // 5. Winding dirt ranger trail branching off the village road (x=985, y=314) into the forest clearings
  const trailPts: [number, number, number][] = [
    [982, 308, 26], [1004, 306, 22], [1028, 300, 18], [1052, 296, 16], [1076, 302, 15],
    [1044, 326, 15], [1056, 354, 14], [1062, 384, 14], [1058, 416, 14], [1066, 446, 13],
    [1074, 478, 13], [1082, 510, 12], [1086, 540, 12],
  ];
  for (const [tx, ty, tw] of trailPts) {
    R(c, tx - tw / 2, ty - 6, tw, 12, '#75603f');
    R(c, tx - tw / 2 + 3, ty - 4, tw - 6, 8, '#8a724c');
  }

  // 6. Peatland shallow water hollows (rawa gambut), root networks & leaf litter texture
  for (const [wx, wy, ww, wh] of [[1074, 248, 30, 13], [1188, 382, 34, 14], [1062, 636, 32, 13], [1292, 528, 28, 12]] as [number, number, number, number][]) {
    R(c, wx - 2, wy - 1, ww + 4, wh + 2, '#30291d');
    R(c, wx, wy, ww, wh, '#2c4a4c');
    R(c, wx + 4, wy + 2, ww - 8, wh - 4, '#396063');
    R(c, wx + 6, wy + 3, 8, 2, '#6ea3a4');
  }
  for (let i = 0; i < 240; i++) {
    const x = 940 + hash(i, 61) * 440, y = 84 + hash(i, 67) * 700;
    const t = hash(i, 71);
    R(c, x, y, 4 + t * 9, 2, t > 0.72 ? '#6c5a3b' : t > 0.38 ? '#362e21' : '#526639');
  }
  // Buttress roots & fallen mossy logs
  for (const [lx, ly] of [[1002, 664], [1176, 632], [1288, 236], [1064, 486], [1310, 452]] as [number, number][]) {
    R(c, lx - 2, ly + 8, 38, 3, '#1c181255');
    R(c, lx, ly, 34, 9, '#4e3c29'); R(c, lx, ly, 34, 3, '#755a3c');
    R(c, lx - 2, ly - 1, 5, 11, '#8d6c45'); R(c, lx - 1, ly + 1, 3, 7, '#c7ab80');
    R(c, lx + 8, ly - 1, 9, 2, '#587c3e'); R(c, lx + 21, ly, 6, 2, '#587c3e');
  }
  for (const [sx, sy] of [[1012, 300], [1178, 420], [1268, 556], [1096, 660]] as [number, number][]) {
    R(c, sx - 3, sy + 8, 20, 3, '#1e1913');
    R(c, sx, sy, 14, 10, '#362b21'); R(c, sx + 2, sy - 2, 10, 4, '#524233');
    R(c, sx + 3, sy - 1, 7, 2, '#8c7458');
  }
  for (const [rx, ry] of [[1042, 300], [1198, 520], [1266, 664], [978, 424]] as [number, number][]) {
    R(c, rx, ry + 8, 17, 3, '#282c28');
    R(c, rx, ry, 16, 10, '#5a625c'); R(c, rx + 1, ry - 2, 13, 10, '#727b73');
    R(c, rx + 3, ry - 3, 8, 3, '#969f96'); R(c, rx + 1, ry + 6, 6, 3, '#4f733d');
  }

  // 7. Dense distant rainforest canopy ONLY along the unreachable north & far-east map rim (y < 76, x > 1366)
  R(c, 0, 0, 1400, 48, '#283c28');
  for (let x = -10; x < 1410; x += 22) {
    const r = 16 + Math.floor(hash(x, 19) * 12);
    const cy = 38 + Math.floor(hash(x, 23) * 16);
    R(c, x, cy - r, r * 2, r + 10, '#2f472d');
    R(c, x + 3, cy - r + 2, r * 2 - 6, r + 8, '#3d5c38');
    R(c, x + 5, cy - r + 3, Math.max(6, r), 6, '#567c49');
    if (x > 900) R(c, x + 6, cy - r + 1, Math.max(5, r - 3), 4, '#6d9456');
  }
  for (let y = 44; y < 820; y += 24) {
    const r = 15 + Math.floor(hash(y, 31) * 10);
    R(c, 1374, y, 30, r * 1.6, '#2d442b');
    R(c, 1378, y + 3, 24, r * 1.3, '#3f5e39');
    R(c, 1380, y + 4, 10, 6, '#597f4b');
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
  R(c, x - 20, y - 10, 40, 18, '#6d736c');
  R(c, x - 18, y - 12, 36, 5, '#8b918a');
  R(c, x - 15, y - 9, 30, 8, '#26332f');
  R(c, x - 13, y - 7, 26, 5, '#1d3a3e');
  for (let i = 0; i < 6; i++) { R(c, x - 19 + i * 7, y - 2, 6, 5, i % 2 ? '#5f6560' : '#787e77'); R(c, x - 19 + i * 7, y - 2, 6, 1, '#9aa09a'); }
  R(c, x - 20, y + 6, 40, 3, '#454a45');
  R(c, x - 17, y - 40, 5, 32, '#7d5c39'); R(c, x - 17, y - 40, 2, 32, '#a9834f');
  R(c, x + 12, y - 40, 5, 32, '#6b4d2e'); R(c, x + 12, y - 40, 2, 32, '#8d6a42');
  R(c, x - 22, y - 46, 44, 7, '#8a4a33'); R(c, x - 22, y - 46, 44, 2, '#b8704c');
  R(c, x - 16, y - 51, 32, 6, '#7d4630'); R(c, x - 16, y - 51, 32, 2, '#a8603f');
  for (let i = 0; i < 6; i++) R(c, x - 20 + i * 7, y - 41, 5, 2, '#5d2f20');
  R(c, x - 15, y - 30, 30, 4, '#8d6a42'); R(c, x - 15, y - 30, 30, 1, '#c9a46c');
  R(c, x + 15, y - 32, 3, 8, '#6d4f30'); R(c, x + 17, y - 34, 5, 3, '#a9834f');
  R(c, x - 1, y - 26, 2, 14, '#c9b48c');
  R(c, x - 5, y - 13, 10, 9, '#4a6f7a'); R(c, x - 5, y - 13, 10, 2, '#7fa8b3');
  R(c, x - 4, y - 11, 3, 6, '#6d94a0');
}
function laundryLine(c: CanvasRenderingContext2D, x0: number, x1: number, y: number) {
  R(c, x0, y - 26, 4, 30, '#7d5c39'); R(c, x0, y - 26, 2, 30, '#a9834f');
  R(c, x1, y - 26, 4, 30, '#7d5c39'); R(c, x1, y - 26, 2, 30, '#a9834f');
  R(c, x0 - 2, y + 3, 8, 3, '#00000026'); R(c, x1 - 2, y + 3, 8, 3, '#00000026');
  const span = x1 - x0;
  for (let i = 0; i <= span; i += 2) {
    const sag = Math.round(Math.sin((i / span) * Math.PI) * 5);
    R(c, x0 + i, y - 23 + sag, 2, 1, '#cbb98d');
  }
  const cloths: [number, number, number, string, string][] = [
    [0.18, 16, 20, '#c9483a', '#e8836a'], [0.38, 13, 24, '#e7d4a5', '#f6ecd0'],
    [0.58, 18, 17, '#4f7d55', '#72a06c'], [0.78, 12, 21, '#6d7fa8', '#9aa8c4'],
  ];
  for (const [u, w, h, col, lit] of cloths) {
    const cx = Math.round(x0 + u * span - w / 2);
    const cy = y - 22 + Math.round(Math.sin(u * Math.PI) * 5);
    R(c, cx + 1, y + 2, w - 2, 3, '#0000001f');
    R(c, cx, cy, w, h, col);
    R(c, cx, cy, w, 2, lit);
    R(c, cx + 2, cy + 2, 3, h - 4, lit);
    R(c, cx + w - 3, cy + 3, 2, h - 4, '#00000022');
    R(c, cx + 2, cy - 2, 2, 3, '#c9a46c'); R(c, cx + w - 4, cy - 2, 2, 3, '#c9a46c');
  }
}
function handCart(c: CanvasRenderingContext2D, x: number, y: number) {
  R(c, x - 24, y + 10, 52, 6, '#0000002b');
  R(c, x + 20, y - 4, 18, 3, '#7d5c39'); R(c, x + 20, y + 3, 18, 3, '#6b4d2e');
  R(c, x + 36, y - 5, 3, 12, '#8d6a42');
  R(c, x - 20, y - 12, 42, 16, '#96714a');
  R(c, x - 20, y - 12, 42, 2, '#c9a46c');
  for (let xx = x - 16; xx < x + 20; xx += 8) R(c, xx, y - 10, 2, 13, '#6d4f30');
  R(c, x - 20, y + 2, 42, 3, '#5d4129');
  const wx = x - 2, wy = y + 6;
  R(c, wx - 9, wy - 9, 18, 18, '#4a3524');
  R(c, wx - 7, wy - 7, 14, 14, '#6b4d2e');
  R(c, wx - 5, wy - 5, 10, 10, '#647b49');
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI;
    for (let k = -6; k <= 6; k++) R(c, wx + Math.round(Math.cos(a) * k), wy + Math.round(Math.sin(a) * k), 2, 2, '#8d6a42');
  }
  R(c, wx - 3, wy - 3, 6, 6, '#a9834f'); R(c, wx - 1, wy - 1, 2, 2, '#4a3524');
  R(c, x - 16, y - 20, 20, 9, '#cbb98d'); R(c, x - 16, y - 20, 20, 2, '#e0d2ac');
  R(c, x - 2, y - 18, 16, 7, '#b8a678'); R(c, x - 2, y - 18, 16, 2, '#d8c89a');
}
function chickenCoop(c: CanvasRenderingContext2D, x: number, y: number) {
  R(c, x - 24, y + 6, 50, 7, '#00000030');
  for (const sx of [x - 20, x + 16]) { R(c, sx, y - 6, 5, 14, '#6b4d2e'); R(c, sx, y - 6, 2, 14, '#8d6a42'); }
  R(c, x - 22, y - 30, 44, 26, '#a9834f');
  for (let yy = y - 28; yy < y - 5; yy += 6) { R(c, x - 22, yy, 44, 4, '#96714a'); R(c, x - 22, yy + 4, 44, 2, '#6d4f30'); }
  R(c, x - 22, y - 30, 44, 2, '#c9a46c');
  R(c, x - 7, y - 20, 14, 16, '#241d17');
  R(c, x - 9, y - 4, 18, 4, '#8d6a42');
  R(c, x - 11, y, 22, 4, '#7d5c37'); R(c, x - 11, y, 22, 1, '#a9834f');
  R(c, x + 10, y - 24, 10, 9, '#7d5c37'); R(c, x + 11, y - 23, 8, 7, '#3a2f26');
  R(c, x + 12, y - 20, 6, 3, '#cbb98d');
  R(c, x - 26, y - 38, 52, 9, '#8a4a33'); R(c, x - 26, y - 38, 52, 2, '#b8704c');
  for (let i = 0; i < 7; i++) R(c, x - 24 + i * 7, y - 31, 5, 2, '#5d2f20');
  R(c, x - 20, y - 43, 40, 6, '#7d4630'); R(c, x - 20, y - 43, 40, 2, '#a8603f');
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
  for (let i = 0; i < 8; i++) {
    const sx = x + 4 + Math.floor(hash(i, seed) * (w - 8));
    const len = 6 + Math.floor(hash(i, seed + 3) * 16);
    R(c, sx, y, 1, len, '#00000014');
  }
  for (let i = 0; i < 10; i++) {
    const mx = x + Math.floor(hash(i, seed + 7) * w);
    const my = y + h - 2 - Math.floor(hash(i, seed + 11) * 5);
    R(c, mx, my, 2 + Math.floor(hash(i, seed + 13) * 4), 2, i % 2 ? '#5d7a44' : '#7a9a52');
  }
}

/* ---------- Danau Rantau: Kalimantan Lake, Lotus Shallows, Jukung & Ulin Jetty ---------- */
function drawDanauRantau(c: CanvasRenderingContext2D) {
  const bankOuter = [
    [196, 510], [636, 510], [644, 520], [672, 524], [688, 546],
    [690, 736], [662, 766], [618, 780], [220, 780], [184, 766],
    [167, 738], [167, 554], [182, 526],
  ];
  const sandBank = [
    [202, 516], [630, 516], [630, 526], [665, 526], [665, 546],
    [681, 546], [681, 733], [655, 733], [655, 761], [614, 761],
    [614, 774], [225, 774], [225, 762], [190, 762], [190, 735],
    [173, 735], [173, 557], [188, 557], [188, 530], [202, 530],
  ];
  // Grassy embankment lip -> warm river sand -> pebble wet-sand rim
  poly(c, bankOuter, '#536d3c');
  poly(c, sandBank, '#ccb982');
  poly(c, sandBank.map(([x, y]) => [x + (x < 426 ? 5 : -5), y + (y < 640 ? 5 : -5)]), '#b09b68');

  // 5-tier organic tropical lake depth contours (exact WATER bounds 202..650 x 549..734 preserved!)
  poly(c, sandBank.map(([x, y]) => [x + (x < 426 ? 9 : -9), y + (y < 640 ? 9 : -9)]), '#75b9b0');
  R(c, 202, 549, 448, 185, '#549a9c');
  poly(c, [[214, 556], [638, 556], [646, 574], [644, 716], [622, 728], [226, 728], [206, 714], [206, 572]], '#468a8f');
  poly(c, [[232, 570], [618, 570], [628, 596], [624, 698], [596, 714], [250, 714], [224, 694], [224, 594]], '#3b7b82');
  poly(c, [[262, 590], [588, 590], [598, 618], [590, 682], [556, 696], [286, 696], [254, 678], [254, 616]], '#316a73');

  // Shoreline foam lace & subtle subsurface caustic ribbons
  for (let x = 212; x < 636; x += 14) {
    if (x > 400 && x < 484) continue;
    R(c, x, 550 + (x % 3), 9, 2, '#a8e0d8');
    R(c, x + 2, 730 - (x % 3), 8, 2, '#8ecac4');
  }
  for (let i = 0; i < 65; i++) {
    const wx = 212 + hash(i, 8) * 420, wy = 560 + hash(i, 9) * 162;
    if (wx > 346 && wx < 406 && wy < 654) continue; // keep piling ripple measurement zone crystal clean
    R(c, wx, wy, 8 + hash(i, 2) * 12, 2, i % 2 ? '#5ca6a670' : '#29596260');
  }

  // Smooth river boulders & pebbles tucked along the sandy banks
  for (const [bx, by, s] of [[194, 540, 1.1], [238, 524, 0.85], [646, 536, 1.0], [664, 642, 0.9], [200, 748, 1.05], [626, 756, 0.95]] as [number, number, number][]) {
    const w = Math.round(16 * s), h = Math.round(10 * s);
    R(c, bx - 1, by + h - 1, w + 2, 3, '#3b352655');
    R(c, bx, by, w, h, '#636b66'); R(c, bx + 2, by - 2, w - 4, h, '#7d8680');
    R(c, bx + 3, by - 2, Math.max(4, w - 8), 3, '#a4ada6');
  }

  // Detailed floating lotus pads (teratai) with V-notches & blooming pink/cream lotus flowers
  for (const [lx, ly, bloom] of [[254, 604, true], [292, 688, false], [336, 712, true], [534, 616, false], [602, 594, true], [548, 704, false]] as [number, number, boolean][]) {
    R(c, lx - 9, ly + 2, 20, 11, '#234c5270');
    R(c, lx - 8, ly - 3, 18, 12, '#3d703e');
    R(c, lx - 6, ly - 5, 14, 15, '#4f8849');
    R(c, lx - 4, ly - 4, 9, 5, '#6ca359');
    R(c, lx + 5, ly - 1, 5, 3, '#3b7b82'); // lily pad notch
    if (bloom) {
      R(c, lx - 3, ly - 6, 7, 5, '#e890a8');
      R(c, lx - 2, ly - 8, 5, 5, '#f8bfd0');
      R(c, lx - 1, ly - 6, 3, 2, '#fbe078');
    }
  }

  // Lush shoreline cattail reeds (typha) with seed spikes
  for (const [rx, ry] of [[162, 612], [684, 592], [210, 784], [648, 756], [174, 702], [674, 706]] as [number, number][]) {
    for (let i = 0; i < 7; i++) {
      const sx = rx + i * 4, h = 20 + (i % 3) * 7;
      R(c, sx, ry - h, 2, h, i % 2 ? '#476b3d' : '#5b8249');
      if (i % 2 === 1) {
        R(c, sx - 1, ry - h - 5, 3, 6, '#6b4629');
        R(c, sx, ry - h - 7, 1, 3, '#a89f68');
      }
    }
  }

  // Traditional Kalimantan Jukung canoe moored near southeast bank (with pointed bow/stern & wooden paddle)
  {
    const jx = 556, jy = 666;
    // Water reflection & hull shadow
    poly(c, [[jx - 10, jy + 10], [jx + 64, jy + 10], [jx + 52, jy + 19], [jx + 2, jy + 19]], '#22474f');
    // Pointed wooden canoe hull
    poly(c, [[jx - 10, jy + 5], [jx + 4, jy], [jx + 50, jy], [jx + 64, jy + 5], [jx + 52, jy + 13], [jx + 2, jy + 13]], '#785030');
    // Kalimantan painted gunwale trim (red-ochre & gold stripe)
    R(c, jx + 2, jy + 1, 50, 2, '#d9a84e');
    R(c, jx, jy + 3, 54, 2, '#b8432e');
    // Canoe interior hollow + 3 cross thwarts (seats)
    R(c, jx + 6, jy + 4, 42, 5, '#3d2818');
    for (const tx of [jx + 13, jx + 26, jx + 39]) R(c, tx, jy + 3, 4, 6, '#b58952');
    // Upturned carved bow & stern finials
    R(c, jx - 11, jy + 2, 5, 4, '#9c6e42'); R(c, jx + 60, jy + 2, 5, 4, '#9c6e42');
    // Wooden paddle (pengayuh) resting diagonally across hull
    R(c, jx + 14, jy + 5, 26, 2, '#d6b278'); R(c, jx + 38, jy + 4, 9, 4, '#c49a5c');
    // Mooring post & rope
    R(c, jx + 68, jy - 4, 4, 16, '#5c4026'); R(c, jx + 68, jy - 4, 4, 2, '#b58952');
    R(c, jx + 62, jy + 2, 7, 2, '#cbb98d');
  }

  // Kayu Ulin Jetty / Dermaga (exact PIER bounds 405..479 x 504..634 preserved!)
  // Stone abutment where road meets pier
  R(c, 401, 500, 82, 10, '#6c7068'); R(c, 403, 501, 78, 4, '#989c92');
  // Under-deck timber stringers & shadow
  R(c, 405, 504, 74, 130, '#3e3020');
  R(c, 411, 504, 6, 130, '#523c26'); R(c, 467, 504, 6, 130, '#523c26');

  // Individual ironwood deck planks with wood grain, bevels & iron nail heads
  for (let y = 505; y < 631; y += 9) {
    const shade = ((y / 9) | 0) % 3;
    const base = shade === 0 ? '#b38c56' : shade === 1 ? '#a67f4b' : '#ba945e';
    R(c, 408, y, 68, 7, base);
    R(c, 409, y, 66, 2, '#d6b47e');
    R(c, 408, y + 6, 68, 2, '#5c4128');
    R(c, 413, y + 3, 2, 2, '#3d2c1d'); R(c, 469, y + 3, 2, 2, '#3d2c1d');
    const gx = 420 + Math.floor(hash(y, 5) * 32);
    R(c, gx, y + 3, 12, 1, '#8c683c');
  }
  // Pier head bumper beam
  R(c, 405, 629, 74, 5, '#6e4e30'); R(c, 405, 629, 74, 2, '#cfa972');

  // Heavy ironwood pilings + hanging rope handrail along left & right edges (leaving pier tip open for scooping!)
  for (const px of [404, 474]) {
    R(c, px, 506, 6, 126, '#5e4329');
    R(c, px + 1, 506, 2, 126, '#9c744a');
  }
  for (const py of [508, 536, 564, 592, 620]) {
    for (const px of [402, 472]) {
      R(c, px, py - 6, 9, 10, '#543b24');
      R(c, px, py - 8, 9, 3, '#d4b27a');
      R(c, px + 1, py - 5, 3, 7, '#8f6940');
    }
  }
  // Coiled rope & brass mooring lantern on right pier bollard + ironwood water ladder at tip
  R(c, 464, 620, 9, 7, '#cbb788'); R(c, 466, 622, 5, 3, '#968258');
  R(c, 473, 608, 6, 8, '#f6db92'); R(c, 472, 606, 8, 2, '#4a3321');
  R(c, 429, 632, 3, 24, '#6e4e30'); R(c, 452, 632, 3, 24, '#6e4e30');
  for (let y = 635; y < 655; y += 6) { R(c, 431, y, 22, 3, '#b58d56'); R(c, 431, y, 22, 1, '#dab882'); }
}

function villageBackground(c: CanvasRenderingContext2D) {
  R(c, 0, 0, 1400, 820, '#647b49');
  for (let y = 0; y < 820; y += 10) for (let x = 0; x < 1400; x += 10) {
    const n = hash(x, y);
    if (n > .66) { R(c, x, y, 4, 4, n > .89 ? '#869654' : '#536d40'); R(c, x + 3, y + 3, 3, 2, '#75884c'); }
  }
  forestBackdrop(c);
  // Village dirt road with soft grass-verge borders, wheel ruts & pebbles
  R(c, 172, 279, 822, 73, '#7d6c47');
  R(c, 176, 282, 814, 67, '#a88e5c'); R(c, 182, 287, 802, 56, '#c5ab73');
  R(c, 409, 313, 69, 194, '#7d6c47');
  R(c, 412, 313, 63, 192, '#a88e5c'); R(c, 418, 315, 51, 190, '#c5ab73');
  for (let i = 0; i < 190; i++) { const x = 190 + hash(i, 9) * 782, y = 291 + hash(i, 11) * 46; R(c, x, y, 3 + hash(i, 5) * 5, 2, '#af935f'); }
  for (let i = 0; i < 36; i++) R(c, 423 + hash(i, 2) * 40, 348 + hash(i, 7) * 148, 4, 2, '#af935f');
  for (const [sx, sy] of [[330, 268], [352, 262], [700, 266], [722, 260], [900, 268]] as [number, number][]) {
    R(c, sx, sy + 5, 13, 2, '#4a422e'); R(c, sx, sy, 12, 6, '#b5a479'); R(c, sx + 2, sy + 1, 8, 2, '#cfc098');
  }
  R(c, 168, 258, 88, 24, '#b8a274'); R(c, 516, 246, 104, 36, '#b8a274'); R(c, 782, 248, 86, 34, '#b8a274');

  drawDanauRantau(c);

  // Kalimantan Village Buildings
  rumahWira(c); warungBudi(c); poskoSiaga(c);
  plant(c, 304, 252); plant(c, 658, 250);
  R(c, 112, 236, 4, 20, '#6f8a45'); R(c, 100, 226, 26, 12, '#4f7a3c'); R(c, 104, 220, 18, 10, '#6b9a48');
  R(c, 308, 240, 4, 16, '#6f8a45'); R(c, 298, 230, 22, 11, '#4f7a3c'); R(c, 302, 224, 15, 9, '#6b9a48');
  for (let i = 0; i < 5; i++) R(c, 672 + (i % 2) * 3, 236 - i * 5, 20, 5, i % 2 ? '#6b4d2e' : '#8d6a42');
  R(c, 694, 224, 16, 22, '#4b7482'); R(c, 694, 224, 16, 3, '#8fb8c4'); R(c, 696, 228, 4, 14, '#729eab');
  R(c, 698, 220, 8, 5, '#a9834f');
  weatherBuilding(c, 118, 132, 184, 78, 3);
  weatherBuilding(c, 462, 114, 206, 30, 9);
  weatherBuilding(c, 756, 150, 136, 96, 17);
  bambooFence(c, 40, 300, 121);
  bambooFence(c, 690, 452, 110);
  villageWell(c, 372, 430);
  laundryLine(c, 316, 424, 236);
  handCart(c, 706, 392);
  chickenCoop(c, 104, 372);
  bicycle(c, 908, 246);
  pottedRow(c, 482, 268, 3);
  pottedRow(c, 622, 268, 2);
  for (let i = 0; i < 5; i++) R(c, 366 + (i % 2) * 5, 396 - i * 13, 13, 7, i % 2 ? '#b3a277' : '#a89468');
}

export function getBackground(scene: SceneType) {
  const previous=cache.get(scene); if(previous) return previous;
  const canvas=document.createElement('canvas'); canvas.width=scene==='house'?1280:1400; canvas.height=scene==='house'?620:820;
  const c=canvas.getContext('2d')!; c.imageSmoothingEnabled=false;
  if(scene==='house') { c.translate(200,0); houseBackground(c); } else villageBackground(c);
  cache.set(scene,canvas); return canvas;
}

