import type { CollectibleItem, DialogueMessage, FireHotspot, SceneType } from '../types/gameTypes';
import type { Interaction, Point } from '../game/model';

export const HOUSE_SIZE = { width: 880, height: 620 };
export const VILLAGE_SIZE = { width: 1960, height: 1020 };

export const INITIAL_COLLECTIBLES: CollectibleItem[] = [
  { id: 'savings', scene: 'house', x: 660, y: 356, name: 'Tabungan di meja', rupiahValue: 12000, collected: false, description: 'Tabungan Wira', iconType: 'celengan' },
  { id: 'wallet', scene: 'house', x: 204, y: 176, name: 'Dompet di lemari', rupiahValue: 10000, collected: false, description: 'Uang simpanan Wira', iconType: 'dompet' },
  { id: 'rattan', scene: 'village', x: 345, y: 390, name: 'Upah kerajinan rotan', rupiahValue: 8000, collected: false, description: 'Upah kerajinan Wira', iconType: 'rotan' },
  { id: 'aid', scene: 'village', x: 770, y: 295, name: 'Bantuan posko', rupiahValue: 12000, collected: false, description: 'Bantuan perlengkapan', iconType: 'bantuan' },
];

// 10 organically distributed Kalimantan peat-clearing hotspots across West Edge, Central Canal Basin & Deep Dipterocarp Forest
export const INITIAL_FIRE_HOTSPOTS: FireHotspot[] = [
  [1072, 206], [1024, 424], [1082, 684], [1234, 286], [1248, 566],
  [1484, 218], [1518, 742], [1658, 392], [1788, 254], [1776, 636],
].map(([x, y], i) => ({ id: `fire_${i + 1}`, x, y, intensity: 10, maxIntensity: 10, label: `Titik api ${i + 1}` }));

export const HOUSE_INTERACTIONS: Interaction[] = [
  { id: 'exit', kind: 'exit', x: 440, y: 530, stand: { x: 440, y: 518 }, radius: 62, label: 'Keluar rumah' },
  { id: 'savings', kind: 'collect', x: 660, y: 356, stand: { x: 574, y: 367 }, radius: 98, label: 'Ambil tabungan' },
  { id: 'wallet', kind: 'collect', x: 204, y: 176, stand: { x: 254, y: 207 }, radius: 76, label: 'Ambil dompet' },
  { id: 'radio', kind: 'radio', x: 638, y: 224, stand: { x: 628, y: 291 }, radius: 88, label: 'Dengarkan radio' },
  { id: 'window', kind: 'window', x: 454, y: 128, stand: { x: 454, y: 203 }, radius: 94, label: 'Lihat ke luar jendela' },
];

export const VILLAGE_INTERACTIONS: Interaction[] = [
  { id: 'home', kind: 'home', x: 210, y: 260, stand: { x: 210, y: 293 }, radius: 54, label: 'Masuk rumah' },
  { id: 'shop', kind: 'shop', x: 565, y: 230, stand: { x: 565, y: 281 }, radius: 93, label: 'Buka Warung Budi' },
  { id: 'lake', kind: 'lake', x: 442, y: 598, stand: { x: 442, y: 610 }, radius: 96, label: 'Timba air danau' },
  { id: 'canal', kind: 'lake', x: 1382, y: 500, stand: { x: 1382, y: 500 }, radius: 84, label: 'Timba air kanal sekat bakar' },
  { id: 'chief', kind: 'chief', x: 825, y: 269, stand: { x: 825, y: 312 }, radius: 68, label: 'Bicara dengan Pak RT' },
];

export const CUTSCENE: { camera: Point; dialogue: DialogueMessage }[] = [
  { camera: { x: 210, y: 300 }, dialogue: { speaker: 'Wira', role: 'Warga Desa Rantau', portrait: 'wira', text: 'Uhuk... Asapnya tebal sekali. Apa yang terjadi di luar rumah?' } },
  { camera: { x: 1180, y: 400 }, dialogue: { speaker: 'Pak RT Daman', role: 'Ketua RT', portrait: 'pak_rt', text: 'Wira, ada karhutla di hutan gambut! Warga sudah menghubungi petugas. Bantu padamkan titik api di tepi hingga dalam hutan.' } },
  { camera: { x: 565, y: 260 }, dialogue: { speaker: 'Pak Budi', role: 'Pemilik warung', portrait: 'budi', text: 'Ambil perlengkapan di warungku, Wira. Ember biasa Rp 12.000,00. Ada juga ember besar dan sepatu baru untuk perjalananmu.' } },
  { camera: { x: 442, y: 520 }, dialogue: { speaker: 'Wira', role: 'Warga Desa Rantau', portrait: 'wira', text: 'Aku bisa menimba air di danau desa atau kanal sekat bakar di tengah hutan, lalu menyiram titik api!' } },
];

const HOUSE_OBSTACLES = [
  { x: 134, y: 212, w: 117, h: 159 },
  { x: 580, y: 203, w: 153, h: 66 },
  { x: 604, y: 335, w: 120, h: 74 },
  { x: 133, y: 424, w: 64, h: 67 },
  { x: 654, y: 464, w: 87, h: 43 },
];

const VILLAGE_OBSTACLES = [
  { x: 112, y: 80, w: 196, h: 175 },
  { x: 459, y: 90, w: 207, h: 154 },
  { x: 752, y: 145, w: 144, h: 101 },
  // solid yard decoration: fences, well, cart, coop, bicycle, lakeside bench & ranger equipment rack
  { x: 38, y: 286, w: 126, h: 22 },
  { x: 688, y: 440, w: 114, h: 20 },
  { x: 350, y: 398, w: 44, h: 40 },
  { x: 680, y: 376, w: 52, h: 28 },
  { x: 80, y: 340, w: 50, h: 34 },
  { x: 890, y: 232, w: 40, h: 22 },
  { x: 944, y: 214, w: 46, h: 24 }, // ranger karhutla tool rack
  { x: 256, y: 808, w: 44, h: 18 }, // southern lakeside wooden viewing bench
  { x: 704, y: 618, w: 76, h: 36 }, // saung tepi danau lakeside pavilion
];

export function canStand(scene: SceneType, x: number, y: number): boolean {
  if (scene === 'house') {
    if (x < 129 || x > 751 || y < 194 || y > 523) return false;
    return !HOUSE_OBSTACLES.some(r => x > r.x - 9 && x < r.x + r.w + 9 && y > r.y - 5 && y < r.y + r.h + 7);
  }
  if (x < 34 || x > 1922 || y < 68 || y > 982) return false;
  // Danau Rantau open water (pier walkable)
  if (x > 174 && x < 684 && y > 532 && y < 766 && !(x > 418 && x < 467 && y < 625)) return false;
  // Forest Sekat Bakar peat canal (ironwood footbridge at y=476..524 walkable!)
  if (x > 1344 && x < 1420 && y > 388 && y < 626 && !(y >= 476 && y <= 524)) return false;
  return !VILLAGE_OBSTACLES.some(r => x > r.x - 8 && x < r.x + r.w + 8 && y > r.y && y < r.y + r.h + 10);
}
