import type { CollectibleItem, DialogueMessage, FireHotspot, PlayerState, SceneType, ShopItem } from '../types/gameTypes';
import type { ActiveEmote, EmoteId } from '../canvas/emotes';

export interface Point { x: number; y: number }
export type Panel = 'shop' | 'map' | 'help' | 'pause' | 'victory' | null;
export type Destination = 'exit' | 'savings' | 'wallet' | 'radio' | 'window' | 'home' | 'shop' | 'lake' | 'fire' | 'chief';
export interface Interaction extends Point {
  id: string;
  label: string;
  stand: Point;
  radius: number;
  kind: Destination | 'collect';
}
export interface Effect extends Point {
  vx: number;
  vy: number;
  age: number;
  duration: number;
  color: string;
  size: number;
  gravity: number;
}
export interface PlayerAction { type: 'pour' | 'fill'; age: number; target: Point }
export interface GameWorld {
  scene: SceneType;
  player: PlayerState;
  fires: FireHotspot[];
  collectibles: CollectibleItem[];
  discovered: boolean;
  cutscene: number;
  dialogue: DialogueMessage | null;
  panel: Panel;
  prompt: Interaction | null;
  path: Point[];
  destination: Point | null;
  action: PlayerAction | null;
  effects: Effect[];
  time: number;
  transition: number;
  muted: boolean;
  reducedMotion: boolean;
  notice: { id: number; text: string; tone: 'success' | 'info' | 'error' } | null;
  emote?: ActiveEmote | null;
}
export interface GameSnapshot {
  scene: SceneType;
  player: PlayerState;
  progress: number;
  discovered: boolean;
  cutscene: number;
  dialogue: DialogueMessage | null;
  panel: Panel;
  prompt: { id: string; label: string } | null;
  walking: boolean;
  muted: boolean;
  reducedMotion: boolean;
  notice: GameWorld['notice'];
  saved: boolean;
  activeEmote?: EmoteId | null;
}
export interface Viewport { x: number; y: number; scale: number; width: number; height: number }

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'normal_bucket', name: 'Ember air', englishSub: 'Perlengkapan dasar', price: 12000, badge: '1 takar air', description: 'Ambil air dari danau untuk memadamkan satu titik api.', effectText: '+10% pemadaman setiap isi ulang' },
  { id: 'big_bucket', name: 'Ember besar', englishSub: 'Kapasitas dua kali lipat', price: 24000, badge: '2 takar air', description: 'Dua kali kapasitas ember biasa. Lebih sedikit perjalanan ke danau.', effectText: '2 kali siram sebelum mengisi ulang' },
  { id: 'new_boots', name: 'Sepatu baru', englishSub: 'Langkah lebih ringan', price: 22000, badge: '+20% kecepatan', description: 'Sepatu baru yang ringan dan empuk. Bergerak 20% lebih cepat di setiap perjalanan.', effectText: 'Langsung dipakai setelah dibeli' },
];