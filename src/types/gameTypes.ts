export type SceneType = 'house' | 'village';

export type GamePhase =
  | 'title'
  | 'inside_house'
  | 'cutscene_karhutla'
  | 'playing_mission'
  | 'victory';

export type Direction = 'up' | 'down' | 'left' | 'right';

export type BucketType = 'none' | 'normal' | 'big';

export type PortraitId = 'wira' | 'budi' | 'pak_rt' | 'radio' | 'info';

export interface DialogueMessage {
  speaker: string;
  role: string;
  portrait: PortraitId;
  text: string;
}

export interface FireHotspot {
  id: string;
  x: number;
  y: number;
  maxIntensity: number; // e.g., 10 or 20
  intensity: number;    // 0 = fully extinguished
  label: string;
  extinguishedAt?: number; // performance.now() timestamp of extinguishing (for white flash animation)
}

export interface CollectibleItem {
  id: string;
  scene: SceneType;
  x: number;
  y: number;
  name: string;
  rupiahValue: number;
  collected: boolean;
  description: string;
  iconType: 'celengan' | 'dompet' | 'rotan' | 'bantuan' | 'koin';
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  createdAt: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  type: 'smoke' | 'ember' | 'water' | 'steam' | 'sparkle';
}

export interface PlayerState {
  x: number;
  y: number;
  dir: Direction;
  isMoving: boolean;
  animFrame: number;
  rupiah: number;
  bucketType: BucketType;
  ownsNormalBucket: boolean;
  ownsBigBucket: boolean;
  hasNewShoes: boolean;
  waterUnits: number;    // 0 = empty, 1 = normal full, 2 = big bucket full
  maxWaterUnits: number; // 0 = no bucket, 1 = normal bucket, 2 = big bucket (2x capacity!)
  totalWaterPoured: number;
}

export interface ShopItem {
  id: 'normal_bucket' | 'big_bucket' | 'new_boots';
  name: string;
  englishSub: string;
  price: number;
  badge: string;
  description: string;
  effectText: string;
}
