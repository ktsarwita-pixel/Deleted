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
  // Heavy carved ulin outer frame + sill shadow
  R(c, x - 7, y - 7, w + 14, h + 17, '#3a271c');
  R(c, x - 4, y - 4, w + 8, h + 10, '#c89b5e');
  R(c, x - 4, y - 4, w + 8, 2, '#ebd09a');
  // Distant Kalimantan sky, misty hills & rainforest treeline outside the glass
  R(c, x, y, w, h, '#c9d4a6');
  R(c, x, y + 12, w, 16, '#a5ba8a');
  R(c, x, y + 26, w, h - 26, '#789464');
  poly(c, [[x, y + h], [x, y + 38], [x + 14, y + 31], [x + 25, y + 19], [x + 36, y + 29], [x + 50, y + 22], [x + 64, y + 35], [x + w, y + 28], [x + w, y + h]], '#496944');
  poly(c, [[x, y + h], [x, y + 46], [x + 22, y + 41], [x + 44, y + 48], [x + w, y + 40], [x + w, y + h]], '#355134');
  // Subtle diagonal window glass sheen
  R(c, x + 6, y + 5, 10, 2, '#ffffff55'); R(c, x + 4, y + 7, 6, 2, '#ffffff40');
  // Mullion crossbars
  R(c, x + Math.floor(w / 2) - 2, y, 4, h, '#694a2e'); R(c, x + Math.floor(w / 2) - 1, y, 1, h, '#ad8452');
  R(c, x, y + Math.floor(h / 2) - 1, w, 4, '#694a2e'); R(c, x, y + Math.floor(h / 2) - 1, w, 1, '#ad8452');
  // Wooden curtain rod + gathered batik-trimmed drapes tied with ochre sashes
  R(c, x - 12, y - 9, w + 24, 3, '#4f3622'); R(c, x - 12, y - 9, w + 24, 1, '#b88c54');
  for (const [cx0, shade] of [[x - 10, false], [x + w - 7, true]] as [number, boolean][]) {
    R(c, cx0, y - 6, 17, h + 7, shade ? '#cbb688' : '#d8c69a');
    R(c, cx0 + 2, y - 6, 4, h + 7, '#efe1bc');
    R(c, cx0 + 10, y - 6, 3, h + 7, '#ab9468');
    // Batik hem motif & tie-back sash
    R(c, cx0, y + h - 8, 17, 4, '#9c4332');
    for (let bx = cx0 + 1; bx < cx0 + 16; bx += 4) R(c, bx, y + h - 7, 2, 2, '#f0ce7a');
    R(c, cx0 - 1, y + Math.floor(h * 0.58), 19, 4, '#b85338');
    R(c, cx0 + 1, y + Math.floor(h * 0.58) + 1, 15, 2, '#e8be6b');
  }
  // Carved wooden window sill
  R(c, x - 9, y + h + 4, w + 18, 6, '#5c3f28');
  R(c, x - 9, y + h + 4, w + 18, 2, '#cfa468');
}

function houseBackground(c: CanvasRenderingContext2D) {
  //Lush village yard visible around the cutaway stilt house
  R(c, -200, 0, 1280, 620, '#233428');
  for (let y = 0; y < 620; y += 12) for (let x = -200; x < 1080; x += 12) {
    const v = hash(x, y);
    if (v > .58) R(c, x, y, 3 + Math.floor(v * 6), 2, v > .8 ? '#425634' : '#2d412d');
  }
  // Stone garden path outside front steps
  R(c, 408, 522, 68, 98, '#7d6c49'); R(c, 413, 524, 58, 96, '#9c885d');
  for (let sy = 562; sy < 616; sy += 14) {
    R(c, 420, sy, 44, 9, '#b5a788'); R(c, 422, sy + 1, 40, 3, '#cfc3a6');
  }
  [[-107,93,1.3],[-51,251,1.15],[-64,459,1.1],[48,119,1.1],[832,134,1.1],[40,342,1.15],[843,395,1.15],[67,575,.8],[822,610,1],[967,170,1.3],[947,479,1.2],[1008,684,1.4]].forEach(([x,y,s]) => drawTree(c,x,y,s));

  // Cutaway house outer shell & warm ulin wood floor
  shadow(c, 92, 86, 706, 478);
  R(c, 90, 75, 700, 481, '#261c15');
  R(c, 100, 80, 680, 466, '#5c3f28');
  R(c, 111, 168, 658, 366, '#a97d4e');
  // Tongue-and-groove Kalimantan ulin floorboards with wooden dowel pegs
  for (let row = 0; row < 18; row++) {
    const y = 170 + row * 20;
    R(c, 111, y, 658, 2, '#694b31'); R(c, 111, y + 2, 658, 2, '#c99c63');
    for (let x = 111 - (row % 3) * 57; x < 770; x += 114) {
      const left = Math.max(111, x), w = Math.min(x + 112, 767) - left;
      if (w < 0) continue;
      R(c, left, y + 4, w, 14, ['#a87c4d', '#b58854', '#9e7346', '#af8250'][Math.floor(hash(row, x) * 4)]);
      R(c, left, y + 4, 2, 14, '#785536');
      if (w > 18) { R(c, left + 5, y + 7, 2, 2, '#5e4128'); R(c, left + 5, y + 13, 2, 2, '#5e4128'); }
      for (let k = 0; k < 3; k++) R(c, left + 10 + hash(k + x, row) * Math.max(0, w - 35), y + 6 + k * 3, 10 + hash(k, row) * 16, 1, '#845d3670');
    }
  }
  // Soft perimeter wall-to-floor ambient shadow
  R(c, 111, 178, 658, 8, '#2b1b102e');
  R(c, 111, 178, 10, 354, '#2b1b1024'); R(c, 759, 178, 10, 354, '#2b1b1024');

  // North Wall: woven anyaman bambu upper frieze + horizontal ulin wainscot + exposed tie-beams
  R(c, 105, 78, 670, 101, '#5e3d28');
  bambooWall(c, 109, 82, 662, 34);
  for (let y = 116; y < 174; y += 14) {
    R(c, 109, y, 662, 12, '#7d5336'); R(c, 110, y + 1, 660, 2, '#9e7347');
    for (let x = 115; x < 768; x += 78) R(c, x + (y % 2) * 9, y, 2, 13, '#573926');
  }
  // Top crown beam & carved Dayak geometric wall border
  R(c, 102, 74, 676, 10, '#c29359'); R(c, 102, 74, 676, 2, '#e6c288'); R(c, 103, 84, 674, 4, '#472f20');
  R(c, 109, 114, 662, 4, '#472f20');
  for (let dx = 116; dx < 762; dx += 12) { R(c, dx, 115, 4, 2, '#e3ba72'); R(c, dx + 6, 115, 3, 2, '#b84b36'); }
  // Baseboard & structural vertical posts
  R(c, 105, 171, 670, 9, '#4c3424'); R(c, 107, 172, 666, 3, '#c79a5f');
  for (const x of [108, 279, 555, 762]) { R(c, x, 80, 9, 100, '#4f3523'); R(c, x, 80, 3, 96, '#c29056'); }

  // Twin casement windows looking out toward the forest
  windowArt(c, 316, 102, 75, 59); windowArt(c, 423, 102, 88, 59);

  // Carved Dayak Talawang ceremonial shield mounted on pillar bay (x=289..305)
  poly(c, [[297, 104], [305, 114], [305, 142], [297, 152], [289, 142], [289, 114]], '#8c3728');
  poly(c, [[297, 108], [302, 116], [302, 140], [297, 148], [292, 140], [292, 116]], '#522219');
  R(c, 295, 118, 4, 18, '#ebd08a'); R(c, 293, 125, 8, 4, '#df9c48');

  // Framed Kalimantan River & Bukit Raya Painting + Woven Rattan Wall Hats (caping)
  R(c, 618, 98, 68, 50, '#3d281b'); R(c, 621, 101, 62, 44, '#c79c60');
  R(c, 624, 104, 56, 38, '#d9cfa8');
  R(c, 624, 104, 56, 14, '#e8cfa0'); R(c, 664, 108, 7, 7, '#f5ad4c'); // warm Kalimantan sun
  poly(c, [[624, 134], [624, 124], [638, 112], [651, 126], [664, 115], [680, 134]], '#3f634b');
  R(c, 624, 133, 56, 9, '#4c8791'); R(c, 634, 136, 24, 2, '#9edce0'); // river reflection
  // Carved gabled wall-clock hood & brass weights around (552, 126)
  poly(c, [[537, 114], [552, 102], [567, 114]], '#4a311f');
  poly(c, [[540, 114], [552, 105], [564, 114]], '#8c6139');
  R(c, 547, 148, 3, 9, '#c9a35c'); R(c, 554, 148, 3, 11, '#b58d47'); // hanging brass clock weights

  // Woven rattan sun-hat (seraung Dayak) + trailing pothos vine wall shelf!
  poly(c, [[700, 124], [715, 110], [730, 124]], '#d4ad6a');
  poly(c, [[704, 124], [715, 114], [726, 124]], '#b84835');
  R(c, 713, 119, 4, 4, '#f2d994');
  R(c, 696, 142, 50, 4, '#8f643b'); R(c, 696, 142, 50, 1, '#cfa468');
  R(c, 704, 132, 12, 10, '#b85d3b'); R(c, 702, 130, 16, 3, '#d97e58');
  for (const [vx, vh] of [[700, 18], [706, 24], [713, 15], [718, 21]] as [number, number][]) {
    R(c, vx, 138, 3, vh, '#487a44');
    for (let ly = 140; ly < 138 + vh; ly += 5) R(c, vx - 1, ly, 5, 3, ly % 2 ? '#78b35c' : '#589149');
  }

  // === NORTH-WEST LEMARI ULIN HUTCH (obstacle + wallet at 204,176) ===
  cabinet(c, 138, 124, 112, 68);
  R(c, 136, 117, 116, 9, '#b88950'); R(c, 136, 117, 116, 2, '#e4be84');
  // Books, woven bakul basket & framed family portrait on top of lemari
  const bookColors = ['#4f7a5a', '#bf4d38', '#deb868', '#3e6e7d', '#7c5838', '#c97842', '#5d7a4c', '#b84b39'];
  for (let i = 0; i < 8; i++) {
    const bh = 16 + (i % 3) * 3;
    R(c, 144 + i * 8, 117 - bh, 7, bh, bookColors[i]);
    R(c, 145 + i * 8, 120 - bh, 5, 2, '#f2e4be');
  }
  // Woven rattan bakul + small framed family photo
  R(c, 214, 103, 16, 14, '#c79856'); R(c, 212, 101, 20, 4, '#e0b876'); R(c, 216, 107, 12, 2, '#8c3d2b');
  R(c, 234, 105, 12, 12, '#4a3220'); R(c, 236, 107, 8, 8, '#dce3d5'); R(c, 238, 109, 4, 4, '#b8533c');

  // === WIRA'S CARVED ULIN BED WITH BOLSTER (GULING) & DAYAK IKAT QUILT (obstacle 134..251, 212..371) ===
  shadow(c, 138, 206, 110, 164);
  R(c, 138, 199, 110, 163, '#4f3523');
  // Carved headboard + corner finials
  R(c, 140, 196, 106, 14, '#b5864e'); R(c, 140, 196, 106, 3, '#e2bc82');
  R(c, 137, 193, 8, 18, '#6e4a2e'); R(c, 241, 193, 8, 18, '#6e4a2e');
  R(c, 138, 191, 6, 4, '#dfb676'); R(c, 242, 191, 6, 4, '#dfb676');
  // Crisp cream mattress sheet, plump pillow & side guling bolster
  R(c, 145, 213, 96, 143, '#e4d5ae');
  R(c, 150, 217, 62, 28, '#f7ebd0'); R(c, 153, 220, 56, 20, '#efe0bc'); R(c, 155, 221, 50, 3, '#ffffffaa');
  R(c, 148, 217, 4, 28, '#b84c38'); R(c, 208, 217, 4, 28, '#b84c38'); // embroidered pillow ends
  // Indonesian guling bolster along right side of mattress
  R(c, 218, 220, 17, 72, '#f3e5c3'); R(c, 221, 220, 5, 72, '#fff6df'); R(c, 218, 254, 17, 3, '#c89c5c');
  // Handwoven Kalimantan emerald & terracotta ikat blanket
  R(c, 145, 254, 96, 94, '#3e664b');
  R(c, 145, 254, 96, 10, '#dfbe78'); R(c, 145, 262, 96, 4, '#b34734'); // folded top cuff
  for (let y = 274; y < 338; y += 18) for (let x = 152; x < 232; x += 18) {
    poly(c, [[x + 6, y - 4], [x + 12, y + 2], [x + 6, y + 8], [x, y + 2]], '#8eb37e');
    R(c, x + 5, y + 1, 3, 3, '#f2cf7e');
  }
  // Footboard & sturdy legs
  R(c, 141, 346, 104, 13, '#b5864e'); R(c, 141, 346, 104, 3, '#dfc089');
  R(c, 137, 343, 8, 28, '#543824'); R(c, 241, 343, 8, 28, '#543824');

  // Bedside table & warm glowing woven-rattan shade lamp
  R(c, 256, 246, 38, 22, '#f5d98e1c'); // warm floor glow around nightstand
  cabinet(c, 259, 230, 32, 25);
  R(c, 271, 213, 6, 17, '#c79c54'); R(c, 268, 227, 12, 3, '#8f6934');
  poly(c, [[260, 214], [266, 198], [282, 198], [288, 214]], '#eac67a');
  poly(c, [[263, 213], [268, 200], [280, 200], [285, 213]], '#fae3a4');
  R(c, 260, 213, 28, 2, '#b34a35');

  // === CENTERPIECE KALIMANTAN DAYAK IKAT MEDALLION RUG ===
  shadow(c, 304, 278, 255, 174);
  R(c, 303, 274, 255, 175, '#592e22');
  R(c, 307, 278, 247, 167, '#b54f38');
  R(c, 313, 284, 235, 155, '#dfc082');
  R(c, 318, 289, 225, 145, '#3b241c');
  R(c, 323, 294, 215, 135, '#9e4733');
  // Subtle horizontal handloom weft texture
  for (let y = 298; y < 426; y += 4) R(c, 323, y, 215, 1, '#873a28');
  // Geometric Dayak diamond medallions
  for (let x = 333; x < 526; x += 39) for (let y = 310; y < 412; y += 39) {
    poly(c, [[x + 14, y], [x + 28, y + 14], [x + 14, y + 28], [x, y + 14]], '#ecd094');
    poly(c, [[x + 14, y + 4], [x + 24, y + 14], [x + 14, y + 24], [x + 4, y + 14]], '#385c47');
    poly(c, [[x + 14, y + 8], [x + 20, y + 14], [x + 14, y + 20], [x + 8, y + 14]], '#d96b43');
    R(c, x + 13, y + 13, 3, 3, '#fff2c2');
  }
  // Top & bottom knotted cotton rug fringes
  for (let x = 308; x < 554; x += 7) {
    R(c, x, 266, 3, 8, '#e6d2a2'); R(c, x + 1, 266, 1, 8, '#ffffff80');
    R(c, x, 449, 3, 8, '#d8c290');
  }

  // === RADIO DESK & VINTAGE SHORTWAVE TRANSISTOR RADIO (obstacle 580..733, 203..269) ===
  cabinet(c, 583, 214, 148, 49);
  R(c, 578, 205, 158, 12, '#cf9e5d'); R(c, 578, 205, 158, 3, '#ebd09a'); R(c, 578, 215, 158, 2, '#6e4b2c');
  // Vintage wood-cased FM/SW Radio (indicator LED at 648,197 & sound waves at 670,194 in drawHouseLife!)
  R(c, 610, 187, 58, 24, '#3d2a1d'); R(c, 612, 189, 54, 20, '#8f6339'); R(c, 612, 189, 54, 2, '#c89862');
  // Speaker cloth grille (left) + illuminated analog tuning scale & brass knobs (right)
  R(c, 615, 193, 26, 13, '#2b2118');
  for (let x = 617; x < 640; x += 3) R(c, x, 194, 2, 11, '#b89b6a');
  R(c, 644, 193, 19, 7, '#dfecc2'); R(c, 651, 194, 2, 5, '#d94532'); // red frequency needle!
  R(c, 645, 202, 5, 5, '#e0bc72'); R(c, 655, 202, 5, 5, '#e0bc72'); // tuning & volume dials
  R(c, 659, 166, 2, 22, '#cfd6d2'); R(c, 658, 164, 4, 3, '#e8edea'); // telescopic whip antenna
  // Village Karhutla readiness leaflet & notebook beside radio
  R(c, 682, 195, 24, 14, '#f2e6c9'); R(c, 684, 197, 20, 3, '#c94534'); R(c, 684, 202, 15, 2, '#5c6b58');
  R(c, 588, 196, 14, 12, '#4a7a6c'); R(c, 590, 198, 10, 3, '#e8d8b0'); // pencil cup / mug

  // === LIVING TABLE, STEAMING KOPI TUBRUK & PISANG GORENG (obstacle 604..724, 335..409; savings at 660,356) ===
  shadow(c, 604, 336, 120, 74);
  R(c, 609, 390, 10, 26, '#4f3524'); R(c, 707, 390, 10, 26, '#4f3524');
  R(c, 601, 331, 126, 67, '#5e3e26'); R(c, 604, 333, 120, 60, '#ba8d54'); R(c, 606, 334, 116, 3, '#e4be82');
  for (let y = 347; y < 389; y += 14) R(c, 605, y, 118, 2, '#8f653c');
  // Handwoven batik table runner across center (under savings celengan at 660,356!)
  R(c, 642, 333, 44, 60, '#9e4332'); R(c, 645, 333, 38, 60, '#f0dfc0');
  for (let ty = 338; ty < 390; ty += 10) { R(c, 652, ty, 24, 4, '#3e6950'); R(c, 660, ty + 1, 8, 2, '#e3b456'); }
  // Ceramic saucer & steaming Kopi Kalimantan mug (aligned with steam at x=621, y=339!)
  R(c, 611, 353, 24, 8, '#d8ccb0'); R(c, 614, 344, 18, 14, '#f2e6c8');
  R(c, 616, 346, 14, 8, '#4a2c1a'); R(c, 632, 347, 4, 7, '#e6d8b5');
  // Enamel plate of golden pisang goreng on right
  R(c, 690, 364, 26, 15, '#e6efe9'); R(c, 692, 366, 22, 11, '#588c66'); // banana leaf liner
  R(c, 694, 367, 12, 5, '#e6a83e'); R(c, 699, 370, 12, 5, '#d4902a');

  // === INDONESIAN DAPUR KITCHEN COUNTER, GAS KOMPOR & KETTLES (obstacle 654..741, 464..507) ===
  cabinet(c, 653, 463, 88, 44);
  R(c, 651, 458, 92, 7, '#c7baa0'); R(c, 651, 458, 92, 2, '#ebe2ce'); // ceramic tile countertop
  // Two-burner blue enamel gas stove (kompor gas) + gleaming kettle & soup pot
  R(c, 662, 448, 48, 12, '#3a687d'); R(c, 662, 448, 48, 2, '#7cb2c7');
  R(c, 670, 453, 5, 4, '#1d292e'); R(c, 696, 453, 5, 4, '#1d292e'); // burner knobs
  // Stockpot with lid (left burner) + spouted aluminum kettle (right burner)
  R(c, 665, 437, 19, 11, '#b8c4c0'); R(c, 667, 439, 5, 8, '#e8f0ed'); R(c, 663, 435, 23, 3, '#889691'); R(c, 672, 433, 5, 2, '#3d2b1f');
  R(c, 690, 439, 16, 9, '#c7d2ce'); R(c, 705, 440, 5, 4, '#9aa6a2'); R(c, 693, 435, 10, 4, '#543c28');
  // Stack of clean plates & spice jar on right end of counter
  R(c, 716, 451, 18, 7, '#f2ede0'); R(c, 718, 448, 14, 4, '#dce6e2');

  // === LUSH CORNER PLANTS & WIRA'S RATTAN WEAVING CRAFT CORNER ===
  plant(c, 162, 470, true); plant(c, 738, 202); plant(c, 558, 168);
  // Woven pandan mat + coiled golden rotan rings & half-woven basket (224..272, 442..478)
  R(c, 222, 444, 50, 32, '#9c7848'); R(c, 224, 446, 46, 28, '#c8a368');
  for (let y = 448; y < 472; y += 4) R(c, 224, y, 46, 1, '#ab844c');
  // Coiled rattan cane rings + finished woven basket
  R(c, 229, 450, 18, 16, '#dfb870'); R(c, 233, 454, 10, 8, '#b38944');
  R(c, 251, 448, 16, 18, '#a6743d'); R(c, 249, 446, 20, 4, '#d9ab66'); R(c, 253, 453, 12, 2, '#8c3929');

  // Handwoven round rattan cat cushion on the rug under Wira's calico cat (372, 304)
  R(c, 350, 301, 44, 18, '#3b221844');
  R(c, 352, 298, 40, 18, '#8c3d2b'); R(c, 355, 296, 34, 21, '#c76d44');
  R(c, 359, 299, 26, 14, '#ecd29c'); R(c, 363, 302, 18, 8, '#dfba78');

  // Tucked-in wooden study chair at the radio desk (within obstacle 580..733, 203..269)
  R(c, 623, 252, 30, 15, '#47301e'); R(c, 625, 250, 26, 12, '#9e7244');
  R(c, 627, 252, 22, 6, '#3e6952'); R(c, 625, 247, 26, 4, '#cfa264');

  // Terracotta gentong air (traditional water jar) + woven tampah basket on kitchen wall
  R(c, 631, 483, 20, 22, '#9e4f33'); R(c, 633, 480, 16, 24, '#ba6342');
  R(c, 635, 484, 5, 14, '#dc8662'); R(c, 632, 478, 18, 4, '#6e3924'); R(c, 636, 476, 10, 3, '#cfa366');
  // Round woven bamboo tampah tray mounted by the kitchen
  R(c, 748, 416, 16, 24, '#b88b4d'); R(c, 750, 419, 12, 18, '#dfc084'); R(c, 753, 423, 6, 10, '#c7523a');

  // Small woven runner mat beside the West Bedroom Door (x=114..132, y=386..436)
  R(c, 114, 386, 18, 50, '#784830'); R(c, 116, 389, 14, 44, '#c89b5e');
  for (let ry = 394; ry < 430; ry += 9) R(c, 118, ry, 10, 4, '#3e664d');

  // === FRONT THRESHOLD: COIR WELCOME MAT, SAPU IJUK BROOM, SANDALS & CUTAWAY WALLS ===
  R(c, 410, 501, 60, 26, '#6e4c2c'); R(c, 413, 504, 54, 20, '#be935a');
  R(c, 417, 508, 46, 12, '#946a3b');
  for (let mx = 421; mx < 458; mx += 6) R(c, mx, 512, 4, 4, '#ecd096');
  // Traditional bamboo-handle sapu ijuk broom leaning in left doorway corner
  R(c, 387, 482, 3, 34, '#cfa462'); R(c, 382, 513, 13, 14, '#2d2620'); R(c, 383, 512, 11, 3, '#b84835');
  // Neatly parked pair of sandals (sandal jepit) beside the door
  for (const sx of [494, 509]) {
    R(c, sx, 492, 11, 20, '#3e5c4e'); R(c, sx + 1, 493, 9, 17, '#58826e');
    R(c, sx + 2, 497, 7, 3, '#e8c468'); R(c, sx + 4, 495, 3, 3, '#cf4b38');
  }
  // Thick 3D cutaway timber walls with mortised corner blocks & stepped front veranda treads
  R(c, 99, 174, 14, 202, '#473020'); R(c, 102, 174, 4, 200, '#c49458');
  R(c, 99, 446, 14, 90, '#473020'); R(c, 102, 446, 4, 88, '#c49458');
  R(c, 767, 174, 14, 362, '#473020'); R(c, 770, 174, 4, 358, '#bf8f54');
  R(c, 99, 532, 305, 14, '#473020'); R(c, 476, 532, 305, 14, '#473020');
  R(c, 101, 533, 301, 4, '#c49558'); R(c, 478, 533, 301, 4, '#c49558');
  // Mortise timber joint studs along cutaway wall tops
  for (let wx = 128; wx < 390; wx += 54) R(c, wx, 534, 6, 4, '#8c6239');
  for (let wx = 496; wx < 764; wx += 54) R(c, wx, 534, 6, 4, '#8c6239');
  // Exterior ironwood veranda steps below the front double doors
  for (let y = 538; y < 580; y += 10) {
    R(c, 402, y, 76, 8, '#ad864e'); R(c, 404, y, 72, 2, '#dbb87e'); R(c, 402, y + 7, 76, 2, '#543920');
  }
  // Subtle warm sunbeams angled across the ulin floor from both north windows
  poly(c, [[423, 180], [511, 180], [584, 286], [472, 286]], '#f7d98e16');
  poly(c, [[316, 180], [391, 180], [446, 258], [348, 258]], '#f7d98e14');
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

/* ---------- Rumah Wira: Kalimantan Rumah Panggung (Hero Stilt House) ---------- */
function rumahWira(c: CanvasRenderingContext2D) {
  const x0 = 116, x1 = 304, yRoof = 66, yBody = 130, yFloor = 210, yGround = 258;
  // Soft ground contact shadow & river-stone drip border around stilts
  R(c, x0 - 14, yGround - 5, x1 - x0 + 28, 13, '#0f191150');

  // Deep shaded kolong rumah (under-croft) with diagonal ulin cross-bracing, stacked split firewood & coiled rattan!
  R(c, x0 - 4, yFloor + 4, x1 - x0 + 8, yGround - yFloor - 4, '#211710');
  R(c, x0 - 4, yFloor + 4, x1 - x0 + 8, 5, '#130d09');
  // Diagonal timber cross-braces between stilts
  poly(c, [[132, 216], [136, 216], [168, 250], [164, 250]], '#3c291a');
  poly(c, [[168, 216], [172, 216], [136, 250], [132, 250]], '#3c291a');
  poly(c, [[252, 216], [256, 216], [288, 250], [284, 250]], '#3c291a');
  // Neatly stacked split firewood logs (left bay)
  for (let row = 0; row < 3; row++) for (let i = 0; i < 6 - row; i++) {
    const lx = x0 + 12 + i * 9 + row * 4, ly = yGround - 8 - row * 5;
    R(c, lx, ly, 8, 5, (i + row) % 2 ? '#785533' : '#5e4126');
    R(c, lx + 2, ly + 1, 4, 3, '#cfa872');
  }
  // Wira's coiled golden rattan bundles & storage crate (right bay)
  crate(c, x1 - 46, yGround - 21, 28, 19, '#916c42');
  R(c, x1 - 69, yGround - 18, 18, 15, '#d8b26a'); R(c, x1 - 65, yGround - 14, 10, 7, '#302014'); // coiled rotan!
  for (const sx of [126, 168, 210, 252, 294]) stilt(c, sx, yFloor, yGround);
  R(c, 126, 232, 168, 4, '#4d3623'); R(c, 126, 232, 168, 1, '#8c6640');

  // Raised ironwood serambi veranda deck + carved Kalimantan joist ends
  R(c, x0 - 10, yFloor - 8, x1 - x0 + 20, 13, '#5c3e24');
  R(c, x0 - 10, yFloor - 8, x1 - x0 + 20, 3, '#cfa56a');
  R(c, x0 - 10, yFloor + 3, x1 - x0 + 20, 2, '#2d1d12');
  for (let x = x0 - 6; x < x1 + 6; x += 10) { R(c, x, yFloor - 4, 4, 6, '#3b2717'); R(c, x + 1, yFloor - 3, 2, 2, '#9e7648'); }

  // Woven herringbone anyaman bambu walls + ulin timber framing
  bambooWall(c, x0, yBody, x1 - x0, yFloor - yBody - 8);
  // Ornate Dayak red-gold-ebony geometric frieze along upper wall
  R(c, x0 + 3, yBody + 3, x1 - x0 - 6, 6, '#472e1c');
  for (let x = x0 + 7; x < x1 - 10; x += 12) {
    R(c, x, yBody + 4, 4, 4, '#ecc478');
    R(c, x + 5, yBody + 5, 4, 2, '#c74835');
  }
  // Heavy ulin structural posts
  for (const px of [x0 - 4, 178, 236, x1 - 3]) {
    R(c, px, yBody - 4, 7, yFloor - yBody + 2, '#523620');
    R(c, px, yBody - 4, 2, yFloor - yBody, '#ad8354');
  }

  // Twin open casement windows with louvered teak shutters & blooming bougainvillea planter boxes
  shutter(c, 132, 159, 30, 26, true);
  shutter(c, 257, 159, 30, 26, true);

  // Carved Kalimantan front entrance doorway with warm golden indoor glow & rolled bamboo chick blind
  R(c, 188, 151, 44, 53, '#4a311e');
  R(c, 190, 149, 40, 3, '#d4aa6e');
  R(c, 193, 154, 34, 49, '#21160f');
  R(c, 196, 157, 28, 45, '#3b2718');
  R(c, 201, 165, 18, 30, '#6b4624'); // warm indoor lamp light
  R(c, 205, 170, 10, 18, '#8f5f31');
  // Rolled rotan sun-blind at top of doorway
  for (let yy = 155; yy < 171; yy += 4) { R(c, 193, yy, 34, 2, '#be955c'); R(c, 193, yy + 2, 34, 1, '#6e4f2d'); }
  // Warm brass porch lantern (left of door) + hanging woven rattan basket/charm (right of door)
  R(c, 181, 157, 6, 9, '#fae094'); R(c, 183, 159, 2, 5, '#fff9de');
  R(c, 180, 155, 8, 2, '#422c1b'); R(c, 180, 166, 8, 2, '#422c1b');
  R(c, 234, 154, 2, 6, '#9c7848'); R(c, 231, 160, 8, 7, '#cfa464'); R(c, 232, 162, 6, 2, '#a84230');

  // Front serambi veranda wooden balustrade + potted porch plant
  for (const [bx0, bx1] of [[x0 - 6, 186], [235, x1 + 6]] as [number, number][]) {
    R(c, bx0, yFloor - 23, bx1 - bx0, 3, '#7d5834');
    R(c, bx0, yFloor - 23, bx1 - bx0, 1, '#d6ad72');
    R(c, bx0, yFloor - 10, bx1 - bx0, 2, '#5c3f24');
    for (let bx = bx0 + 3; bx < bx1 - 3; bx += 7) {
      R(c, bx, yFloor - 20, 3, 11, '#966d43');
      R(c, bx, yFloor - 20, 1, 11, '#d6ad72');
    }
  }
  // Terracotta flower pot sitting on left porch corner
  R(c, 115, 196, 10, 8, '#b5633e'); R(c, 114, 194, 12, 3, '#d48258');
  R(c, 113, 187, 14, 7, '#4d7f3e'); R(c, 116, 184, 8, 5, '#76ab56'); R(c, 118, 186, 3, 2, '#f27d68');

  // Steep multi-pitched Kalimantan sirap ulin roof + central entrance gable pediment!
  shingles(c, 100, yRoof + 6, 320, yBody, '#8c472d', '#542819', '#c4764e');
  ridge(c, 122, 298, yRoof - 1, '#693320');
  // Central entrance dormer/fronton gable framing the 'RUMAH WIRA' sign (210, 144)
  poly(c, [[168, yBody + 1], [210, yRoof + 16], [252, yBody + 1]], '#542819');
  poly(c, [[173, yBody + 1], [210, yRoof + 20], [247, yBody + 1]], '#7a3f28');
  poly(c, [[178, yBody + 1], [210, yRoof + 24], [242, yBody + 1]], '#ad7d4c');
  // Ornate carved Dayak crest inside the gable peak
  R(c, 208, yRoof + 11, 4, 8, '#e8c584'); R(c, 206, yRoof + 14, 8, 3, '#cfa05e');
  R(c, 205, yBody - 14, 10, 6, '#b84632'); R(c, 207, yBody - 13, 6, 4, '#f2d084');
  // Kitchen roof smoke vent (dapur, aligned with live chimney smoke at sx=271, sy=76!)
  R(c, 258, yRoof + 12, 26, 12, '#542e1e');
  R(c, 255, yRoof + 9, 32, 5, '#ab613e'); R(c, 255, yRoof + 9, 32, 2, '#db9368');

  // Wide carved ulin front stairs with twin handrails, newel posts & river-stone landing pad
  R(c, 183, 259, 54, 9, '#8d826b'); R(c, 186, 260, 48, 6, '#b8ac92'); R(c, 188, 261, 44, 2, '#d4cab0');
  R(c, 189, yFloor + 2, 42, 56, '#422c1b');
  for (let yy = yFloor + 6; yy < 262; yy += 8) {
    R(c, 191, yy, 38, 6, '#b08652');
    R(c, 191, yy, 38, 2, '#deb982');
    R(c, 191, yy + 5, 38, 2, '#593c23');
  }
  // Twin sloped stair stringers/handrails + carved bottom newel posts
  R(c, 185, yFloor - 12, 5, 73, '#7d5834'); R(c, 185, yFloor - 12, 2, 73, '#cfa66c');
  R(c, 230, yFloor - 12, 5, 73, '#6b4a2b'); R(c, 230, yFloor - 12, 2, 73, '#ba9158');
  R(c, 184, 254, 7, 9, '#5c3f24'); R(c, 185, 252, 5, 3, '#dfc088');
  R(c, 229, 254, 7, 9, '#5c3f24'); R(c, 230, 252, 5, 3, '#dfc088');
}

/* ---------- Warung Budi: Kalimantan Village Provision & Perlengkapan Shop ---------- */
function warungBudi(c: CanvasRenderingContext2D) {
  const x0 = 462, x1 = 668, yRoof = 68, yWall = 108;
  // Ground contact shadow + stepped river-stone shop apron
  R(c, x0 - 16, 243, x1 - x0 + 32, 13, '#0f191152');
  R(c, x0 - 8, 244, x1 - x0 + 16, 9, '#7c7058');
  for (let sx = x0 - 6; sx < x1 + 4; sx += 18) {
    R(c, sx, 244, 16, 7, ((sx / 18) | 0) % 2 ? '#9e9074' : '#b2a384');
    R(c, sx + 1, 244, 14, 2, '#cdc0a2');
    R(c, sx, 250, 16, 2, '#5e5440');
  }

  // Side storage lean-to shed on left & stacked beras/provisions on right (within visual shop bay)
  R(c, x0 - 12, 168, 12, 76, '#5c4026');
  R(c, x0 - 14, 162, 15, 7, '#78442e'); R(c, x0 - 14, 162, 15, 2, '#b87350');
  for (let y = 174; y < 240; y += 11) { R(c, x0 - 11, y, 10, 2, '#3d2a18'); R(c, x0 - 11, y + 2, 10, 1, '#825d39'); }

  // Steep Kalimantan sirap ulin gabled main roof + carved Dayak bargeboards
  shingles(c, x0 - 18, yRoof + 6, x1 + 18, yWall - 2, '#7d432c', '#4c2618', '#b56946');
  ridge(c, x0 + 10, x1 - 10, yRoof - 2, '#5e301e');
  // Carved fascia & decorative golden-ochre Dayak tooth frieze
  R(c, x0 - 12, yWall - 4, x1 - x0 + 24, 9, '#4c321e');
  R(c, x0 - 12, yWall - 4, x1 - x0 + 24, 2, '#c89a5b');
  for (let fx = x0 - 8; fx < x1 + 6; fx += 8) R(c, fx, yWall + 1, 4, 3, '#dfb676');

  // Upper timber signboard wall + bespoke carved frame around 'WARUNG BUDI' sign (565, 111)
  plankWall(c, x0, yWall + 5, x1 - x0, 24, '#9c7444', '#634627', '#caa26a');
  // Ornate ulin backing frame behind 'WARUNG BUDI' plaque (x=501..629, y=97..128)
  R(c, 499, 96, 132, 33, '#3c2516');
  R(c, 501, 98, 128, 29, '#573721');
  R(c, 501, 98, 128, 2, '#d9b071'); R(c, 501, 125, 128, 2, '#875c36');
  // Flanking brass wall lanterns beside the main shop sign
  for (const lx of [478, 646]) {
    R(c, lx, 108, 8, 11, '#f7dc90'); R(c, lx + 2, 110, 4, 7, '#fff6d4');
    R(c, lx - 1, 106, 10, 2, '#3d2919'); R(c, lx - 1, 119, 10, 2, '#3d2919');
  }

  // Structural awning header beam (live striped canopy attaches at y=133..151 in pixelRenderer.ts)
  R(c, x0 - 12, 130, x1 - x0 + 24, 6, '#3e2919');
  R(c, x0 - 12, 130, x1 - x0 + 24, 2, '#9e7548');

  // Warm, deeply-lit Warung interior (unobstructed y=150..208!)
  R(c, x0, 148, x1 - x0, 61, '#2d1f15');
  R(c, x0 + 4, 152, x1 - x0 - 8, 55, '#38271a'); // warm tungsten-lit back planks
  for (let py = 158; py < 206; py += 8) R(c, x0 + 4, py, x1 - x0 - 8, 1, '#261a11');
  // Soft eave shadow just under the awning valance
  R(c, x0, 148, x1 - x0, 6, '#18100b');
  // Subtle warm ceiling lamp pool over shelves
  R(c, 526, 154, 128, 18, '#4a3320');

  // Left shopkeeper doorway (x=468..512) with carved threshold & warm backroom glow
  R(c, 467, 153, 45, 56, '#5e4126');
  R(c, 469, 155, 41, 54, '#1b130d');
  R(c, 474, 162, 31, 44, '#2c1e13');
  R(c, 480, 170, 18, 28, '#4d331c'); // warm back-room doorway light

  // === HERO DISPLAY BAY (x=515..568): Karhutla Perlengkapan Pegboard ===
  R(c, 515, 155, 52, 50, '#4f3822');
  R(c, 515, 155, 52, 2, '#c89f64'); R(c, 517, 158, 48, 45, '#66492d');
  for (let py = 162; py < 200; py += 6) for (let px = 521; px < 562; px += 6) R(c, px, py, 2, 2, '#47311d');
  // Shelf 1 (top): Sky-blue Ember Biasa + Reinforced Golden-Crimson Ember Besar
  R(c, 517, 179, 48, 3, '#b88e56');
  // Ember Biasa (sky-blue galvanized bucket)
  poly(c, [[520, 165], [534, 165], [532, 178], [522, 178]], '#3b92ab');
  R(c, 519, 164, 16, 2, '#9be0eb'); R(c, 522, 167, 3, 9, '#76cad9');
  R(c, 523, 160, 8, 2, '#cbd6d4'); R(c, 522, 161, 2, 4, '#cbd6d4'); R(c, 531, 161, 2, 4, '#cbd6d4');
  // Ember Besar (large 2-unit brass-banded crimson bucket)
  poly(c, [[539, 161], [559, 161], [556, 178], [542, 178]], '#c84833');
  R(c, 538, 160, 22, 3, '#f6dc8c'); R(c, 540, 168, 18, 2, '#e6b85c'); R(c, 541, 174, 16, 2, '#e6b85c');
  R(c, 543, 163, 3, 13, '#ee856e');
  R(c, 544, 156, 10, 2, '#e8dec3'); R(c, 543, 157, 2, 4, '#e8dec3'); R(c, 553, 157, 2, 4, '#e8dec3');
  // Shelf 2 (lower): Pair of sturdy Sepatu Baru trail boots with yellow laces & whitelug soles
  R(c, 517, 200, 48, 3, '#b88e56');
  for (const bx of [521, 541]) {
    R(c, bx, 188, 9, 10, '#c93d2b'); R(c, bx, 193, 15, 5, '#df4f3a');
    R(c, bx + 2, 189, 3, 5, '#8f2518');
    R(c, bx + 6, 190, 3, 2, '#f7d358'); R(c, bx + 7, 193, 3, 2, '#f7d358'); // yellow boot laces
    R(c, bx - 1, 198, 17, 2, '#f2ead7'); // white-cream rugged sole
  }

  // === WARUNG KELONTONG SHELVES (x=571..658): Groceries, Tins, Syrup Bottles & Rice Sacks ===
  for (const sy of [169, 185, 201]) {
    R(c, 571, sy, 86, 3, '#9a7346'); R(c, 571, sy, 86, 1, '#d6b078'); R(c, 571, sy + 2, 86, 1, '#4a331e');
  }
  // Top shelf: Emerald & ruby glass syrup bottles, Khong Guan red biscuit tins, tea boxes
  for (let i = 0; i < 7; i++) {
    const gx = 574 + i * 12;
    if (i % 3 === 0) { R(c, gx + 1, 156, 6, 13, '#3e8c61'); R(c, gx + 2, 153, 4, 3, '#d9b56c'); R(c, gx + 2, 158, 2, 8, '#85cfa3'); }
    else if (i % 3 === 1) { R(c, gx, 158, 10, 11, '#c93f31'); R(c, gx, 158, 10, 2, '#f3c868'); R(c, gx + 2, 162, 6, 4, '#f7ebd2'); }
    else { R(c, gx, 159, 9, 10, '#d9a43b'); R(c, gx + 1, 160, 7, 2, '#fae29c'); R(c, gx + 2, 164, 5, 3, '#7a4f21'); }
  }
  // Middle shelf: Stacked instant-noodle packs, condensed milk cans & spice jars
  for (let i = 0; i < 7; i++) {
    const gx = 574 + i * 12;
    if (i % 2 === 0) { R(c, gx, 174, 10, 11, '#e06d34'); R(c, gx + 1, 175, 8, 3, '#fbe39e'); R(c, gx + 2, 180, 6, 3, '#528a4e'); }
    else { R(c, gx + 1, 173, 8, 12, '#3b7fa1'); R(c, gx + 1, 173, 8, 2, '#cbe6ee'); R(c, gx + 2, 177, 6, 4, '#f5efe0'); }
  }
  // Lower shelf: Burlap beras sacks & cooking oil pouches
  for (let i = 0; i < 4; i++) {
    const sx = 574 + i * 21;
    R(c, sx, 190, 17, 11, i % 2 ? '#d8c396' : '#cbb382');
    R(c, sx + 2, 194, 13, 2, i % 2 ? '#c44534' : '#3f7852');
    R(c, sx + 1, 190, 15, 2, '#ede0be');
  }

  // Hanging Indonesian 'renceng' sachet strips + golden Pisang Kepok bunches!
  for (const [rx, c1, c2] of [[567, '#2d8a5e', '#76d49e'], [657, '#cf4432', '#f7b955']] as [number, string, string][]) {
    for (let k = 0; k < 5; k++) {
      R(c, rx, 154 + k * 7, 6, 6, k % 2 ? c1 : c2);
      R(c, rx + 1, 155 + k * 7, 4, 1, '#fff6dc');
    }
  }
  // Lush hanging golden banana bunch on right post
  R(c, 646, 152, 2, 7, '#6b5332');
  R(c, 641, 158, 12, 5, '#f0cb52'); R(c, 640, 162, 14, 5, '#dfb238'); R(c, 642, 166, 10, 4, '#c79928');
  R(c, 642, 158, 9, 2, '#fff099');

  // === COUNTERTOP PROPS: Pastel Kaleng Kerupuk, Brass Scale & Glass Etalase ===
  // Classic Indonesian Kaleng Kerupuk (pastel blue & rose tins with red lids & front glass window)
  for (const [jx, body, lid] of [[562, '#6bb0c4', '#c93e30'], [576, '#e6958e', '#b83528'], [590, '#78b57e', '#c93e30']] as [number, string, string][]) {
    R(c, jx, 193, 11, 15, body); R(c, jx + 1, 193, 3, 15, '#ffffff44');
    R(c, jx + 3, 197, 6, 8, '#f5deb0'); R(c, jx + 4, 198, 4, 6, '#e0b05c'); // visible kerupuk inside window!
    R(c, jx - 1, 191, 13, 3, lid); R(c, jx + 3, 189, 5, 2, lid);
  }
  // Glass Etalase Showcase (x=606..656, y=188..208) with aluminum frame & pastries
  R(c, 606, 188, 50, 20, '#d8e4e6'); // silver aluminum frame
  R(c, 608, 190, 46, 16, '#2b3b3d'); // dark glass interior
  R(c, 608, 198, 46, 1, '#9fb8bc'); // middle glass shelf
  // Treats on shelves
  R(c, 611, 193, 11, 5, '#e8a948'); R(c, 625, 193, 11, 5, '#6eb365'); R(c, 639, 193, 11, 5, '#df664a');
  R(c, 612, 201, 12, 5, '#f0d27a'); R(c, 627, 201, 12, 5, '#c95c3e'); R(c, 641, 201, 10, 5, '#86bf73');
  // Crisp diagonal specular glass highlights
  R(c, 611, 191, 8, 2, '#ffffff88'); R(c, 609, 193, 5, 2, '#ffffff66'); R(c, 636, 191, 6, 2, '#ffffff66');

  // === FRONT ULIN WOOD COUNTER WITH WOVEN BAMBOO PANELS & PRICE CHALKBOARD ===
  R(c, x0 - 6, 207, x1 - x0 + 12, 7, '#d4ab70');
  R(c, x0 - 6, 207, x1 - x0 + 12, 2, '#f2d9a7');
  R(c, x0 - 6, 212, x1 - x0 + 12, 2, '#73502d');
  R(c, x0 - 4, 214, x1 - x0 + 8, 30, '#664628');
  for (let x = x0 + 4; x < x1 - 18; x += 33) {
    R(c, x, 218, 26, 21, '#4a321b');
    bambooWall(c, x + 2, 220, 22, 17);
    R(c, x + 2, 220, 22, 1, '#cfa96e');
  }
  // Small green Warung chalkboard sign mounted on front counter ('EMBER / SEPATU')
  R(c, 536, 217, 34, 23, '#3b2615');
  R(c, 538, 219, 30, 19, '#244232');
  R(c, 541, 222, 18, 2, '#f5ecd2'); R(c, 541, 226, 24, 2, '#f5c767');
  R(c, 541, 230, 15, 2, '#92d6be'); R(c, 541, 234, 21, 2, '#f28d6b');
  R(c, x0 - 6, 242, x1 - x0 + 12, 3, '#2e1e12');

  // Heavy ulin corner & mid-bay posts with stone plinths
  for (const px of [x0 - 6, 512, x1 - 1]) {
    R(c, px, 134, 7, 110, '#523720');
    R(c, px, 134, 2, 110, '#a67c4e');
    R(c, px - 1, 238, 9, 7, '#8c8370'); R(c, px, 238, 7, 2, '#b8ae98');
  }
}

/* ---------- Balai RT & Posko Siaga Karhutla (Pak RT Daman's Command Building) ---------- */
function poskoSiaga(c: CanvasRenderingContext2D) {
  const x0 = 754, x1 = 894, yRoof = 96, yEave = 136;
  // Ground shadow & raised river-stone Balai plinth (within obstacle 752..896, 145..246)
  R(c, x0 - 12, 244, x1 - x0 + 24, 12, '#0f191150');
  R(c, x0 - 4, 238, x1 - x0 + 8, 10, '#787160');
  for (let sx = x0 - 2; sx < x1 + 2; sx += 16) {
    R(c, sx, 239, 14, 7, ((sx / 16) | 0) % 2 ? '#98907c' : '#aba28c');
    R(c, sx + 1, 239, 12, 2, '#c8bfa8');
  }
  // Central stone & ulin veranda steps leading directly toward Pak RT Daman (825, 283)
  R(c, 805, 242, 40, 10, '#635c4d');
  R(c, 807, 241, 36, 4, '#b8925b'); R(c, 807, 241, 36, 1, '#dfc08c');
  R(c, 807, 246, 36, 4, '#9c937e'); R(c, 809, 246, 32, 1, '#c7beaa');

  // Lattice VHF/UHF Emergency Radio Repeater Tower rising behind left gable
  R(c, 764, 58, 2, 54, '#727c78'); R(c, 772, 58, 2, 54, '#5a6360');
  for (let ty = 64; ty < 108; ty += 8) {
    R(c, 765, ty, 8, 2, '#8d9792');
    R(c, 766, ty + 3, 5, 2, '#66706c');
  }
  R(c, 757, 66, 24, 2, '#aeb8b3'); R(c, 760, 74, 18, 2, '#9ba5a0'); // VHF dipole cross-arms
  R(c, 768, 52, 2, 7, '#cad4cf'); R(c, 767, 49, 4, 4, '#e04232'); // top beacon housing

  // Dignified Kalimantan Balai RT hipped-gable sirap roof + central command pediment
  shingles(c, x0 - 14, yRoof + 6, x1 + 14, yEave, '#5a3a28', '#3b2418', '#8c5c3e');
  ridge(c, x0 + 12, x1 - 12, yRoof - 1, '#472c1e');
  // Central raised pediment gable framing the 'POSKO' sign (825, 136)
  poly(c, [[788, yEave + 2], [825, yRoof + 4], [862, yEave + 2]], '#4a3121');
  poly(c, [[792, yEave + 2], [825, yRoof + 8], [858, yEave + 2]], '#6b472f');
  R(c, 790, yEave, 70, 3, '#d4ac6e');

  // Crisp Indonesian Merah-Putih BNPB / Balai RT frieze banner across the eaves
  R(c, x0 - 10, yEave + 1, x1 - x0 + 20, 5, '#c93829');
  R(c, x0 - 10, yEave + 6, x1 - x0 + 20, 4, '#f2ede0');
  R(c, x0 - 10, yEave + 10, x1 - x0 + 20, 3, '#394a32');

  // Warm, brightly-lit Balai RT timber interior (x=758..890, y=149..238)
  R(c, x0 + 4, 149, x1 - x0 - 8, 89, '#3e2e20');
  plankWall(c, x0 + 6, 152, x1 - x0 - 12, 62, '#694e34', '#473320', '#8c6947');
  // Lower wainscot dado rail
  R(c, x0 + 6, 206, x1 - x0 - 12, 3, '#b89058');
  R(c, x0 + 6, 209, x1 - x0 - 12, 29, '#4a3522');
  // Overhead warm command light fixture (illuminates map & desk!)
  R(c, 804, 151, 42, 3, '#d8dfd9'); R(c, 806, 153, 38, 2, '#fff7cf');
  R(c, 796, 155, 58, 6, '#ffeaa024');

  // === LEFT WALL BAY (x=766..804): Papan Data RT 03 & Manggala Agni Gear Rack ===
  R(c, 767, 160, 34, 26, '#3a2717');
  R(c, 769, 162, 30, 22, '#2d523d'); // green RT notice board
  R(c, 771, 165, 11, 8, '#f5ebd0'); R(c, 784, 165, 12, 6, '#f7d47c'); // pinned notices
  R(c, 771, 175, 14, 7, '#e8eef0'); R(c, 787, 173, 9, 9, '#f29f67');
  // Hanging yellow safety helmets & orange backpack water-pumps (pompa punggung)
  for (const hx of [769, 783]) {
    R(c, hx, 191, 10, 5, '#ebb02d'); R(c, hx + 1, 189, 8, 3, '#ffda6b'); R(c, hx - 1, 195, 12, 2, '#a87718');
    R(c, hx + 1, 199, 8, 11, '#d95b2b'); R(c, hx + 3, 201, 4, 6, '#f5c558');
  }

  // === RIGHT WALL BAY (x=836..884): Kalimantan Karhutla Tactical Sector Map & Fire Danger Gauge ===
  R(c, 836, 158, 48, 34, '#3b2818');
  R(c, 838, 160, 44, 30, '#eadbc0'); // crisp parchment map
  R(c, 840, 162, 40, 2, '#8c7756'); // map header bar
  // Map terrain: green village west, blue Danau Rantau south-west, orange/red peat burn zone east!
  R(c, 841, 166, 16, 12, '#73a662');
  R(c, 842, 179, 15, 8, '#46929e'); R(c, 844, 181, 10, 3, '#8ad6de'); // lake
  R(c, 859, 166, 20, 21, '#cf5236'); R(c, 863, 170, 12, 12, '#f39c38'); // active fire sector
  // Red & gold tactical map pins
  R(c, 865, 169, 2, 2, '#fff4b8'); R(c, 871, 175, 2, 2, '#fff4b8'); R(c, 862, 178, 2, 2, '#fff4b8');
  // Fire Danger Rating Gauge ('FDRS SIAGA') beside map (x=814..832)
  R(c, 814, 162, 18, 26, '#332315'); R(c, 816, 164, 14, 22, '#f0e6ce');
  R(c, 818, 167, 4, 4, '#4ca65b'); R(c, 822, 167, 4, 4, '#ebbf3b');
  R(c, 818, 172, 4, 4, '#e67e30'); R(c, 822, 172, 4, 4, '#d43b2c'); // active red alert!
  R(c, 818, 179, 10, 4, '#2f4a3c');

  // === COMMAND DESK (x=796..854, y=211..239) WITH GREEN BALAI RUNNER, VHF RADIO & MEGAPHONE ===
  R(c, 796, 211, 58, 6, '#cfa76e'); R(c, 796, 211, 58, 2, '#edd09d');
  R(c, 798, 217, 54, 21, '#593d24');
  // Official green & gold Balai RT front cloth runner with emblem
  R(c, 811, 214, 28, 19, '#2e6347'); R(c, 811, 231, 28, 2, '#e6be5a');
  R(c, 822, 219, 6, 7, '#f0cb62'); R(c, 824, 221, 2, 3, '#2e6347');
  // VHF Base-Station Radio Transceiver (left of desk)
  R(c, 800, 200, 15, 11, '#2a3432'); R(c, 802, 202, 7, 5, '#7de084'); R(c, 811, 191, 2, 10, '#aeb8b4');
  // Red-and-white Emergency Megaphone / Toa (center-right of desk)
  poly(c, [[832, 207], [844, 202], [844, 211], [832, 209]], '#f2ede2');
  R(c, 841, 202, 4, 9, '#cf3d2e'); R(c, 830, 206, 3, 4, '#cf3d2e');
  // Duty Logbook
  R(c, 818, 206, 11, 5, '#f5ebd2'); R(c, 819, 207, 9, 1, '#b83f2e');

  // === FOREGROUND LOGISTICS: Blue Water Drum, Relief Aid Crates, Sandbags & Coiled Fire Hose ===
  barrel(c, 760, 210, '#31758c'); // emergency water drum
  // Bantuan Logistik crate with white & red badge on left veranda
  crate(c, 780, 218, 16, 20, '#9c7548');
  R(c, 784, 223, 8, 8, '#f5efe2'); R(c, 787, 224, 2, 6, '#cf3d2e'); R(c, 785, 226, 6, 2, '#cf3d2e');
  // Stacked flood/fire sandbags & coiled crimson fire hose with brass nozzle on right
  for (let j = 0; j < 2; j++) {
    R(c, 856 + j * 15, 230, 14, 8, '#c7b382'); R(c, 856 + j * 15, 230, 14, 2, '#e6d6aa');
  }
  R(c, 860, 223, 15, 7, '#bda877'); R(c, 860, 223, 15, 2, '#dfd0a4');
  // Coiled fire hose reel
  R(c, 874, 214, 14, 16, '#b83c2b'); R(c, 876, 216, 10, 12, '#df5942');
  R(c, 879, 219, 4, 6, '#473221'); R(c, 886, 226, 5, 3, '#e6be5a'); // brass nozzle

  // Veranda timber columns + carved wooden KENTONGAN (traditional Indonesian alarm slit-drum!)
  for (const px of [x0 + 2, 796, 854, x1 - 8]) {
    R(c, px, yEave + 11, 6, 93, '#573b23');
    R(c, px, yEave + 11, 2, 93, '#a87e50');
  }
  // Veranda side wooden railings (left & right of central steps)
  for (const [rx0, rx1] of [[x0 + 8, 796], [860, x1 - 8]] as [number, number][]) {
    R(c, rx0, 225, rx1 - rx0, 3, '#8f6940'); R(c, rx0, 225, rx1 - rx0, 1, '#cfa76e');
  }
  // Iconic hanging carved wooden Kentongan on the left veranda column!
  R(c, 756, 164, 2, 6, '#cbb88a');
  R(c, 753, 169, 8, 24, '#8c5d34'); R(c, 754, 169, 2, 24, '#c79358');
  R(c, 756, 174, 2, 14, '#24160c'); // resonant acoustic slit
  R(c, 752, 167, 10, 3, '#a87644'); R(c, 761, 178, 5, 2, '#cfa76e'); // striker mallet
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
  weatherBuilding(c, 462, 113, 34, 16, 9);
  weatherBuilding(c, 760, 154, 126, 50, 17);
  bambooFence(c, 40, 300, 121);
  bambooFence(c, 690, 452, 110);
  villageWell(c, 372, 430);
  laundryLine(c, 316, 424, 236);
  handCart(c, 706, 392);
  chickenCoop(c, 104, 372);
  bicycle(c, 908, 246);
  // Wooden customer bench & flower pots beside Warung Budi (clear of Pak Budi at 627,272)
  sack(c, 672, 242);
  R(c, 444, 249, 28, 6, '#9c7446'); R(c, 444, 249, 28, 2, '#cfa76e');
  R(c, 447, 255, 4, 6, '#593e24'); R(c, 465, 255, 4, 6, '#593e24');
  pottedRow(c, 480, 262, 2);
  pottedRow(c, 650, 260, 2);
  for (let i = 0; i < 5; i++) R(c, 366 + (i % 2) * 5, 396 - i * 13, 13, 7, i % 2 ? '#b3a277' : '#a89468');
}

export function getBackground(scene: SceneType) {
  const previous=cache.get(scene); if(previous) return previous;
  const canvas=document.createElement('canvas'); canvas.width=scene==='house'?1280:1400; canvas.height=scene==='house'?620:820;
  const c=canvas.getContext('2d')!; c.imageSmoothingEnabled=false;
  if(scene==='house') { c.translate(200,0); houseBackground(c); } else villageBackground(c);
  cache.set(scene,canvas); return canvas;
}

