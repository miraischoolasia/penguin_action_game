export type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';

export interface Skin {
  id: string;
  name: string;
  cost: number;
  unlocked: boolean;
  color: string;
  accentColor: string;
  description: string;
  particleType: 'snow' | 'gold' | 'bubble' | 'spark' | 'smoke' | 'shadow';
}

export interface PlayerPhysics {
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number;
  gravity: number;
  jumpForce: number;
  isGrounded: boolean;
  isSliding: boolean;
  slideTimer: number;
  rotation: number;
  runFrame: number;
}

export type ObstacleType = 'ICICLE' | 'SNOWBALL' | 'GLACIER_WALL' | 'FLYING_SEAGULL';

export interface Obstacle {
  id: string;
  type: ObstacleType;
  x: number;
  y: number;
  width: number;
  height: number;
  speedX: number;
  passed: boolean;
  pulse?: number;
  angle?: number;
}

export interface FishCollectible {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  points: number;
  collected: boolean;
  pulseOffset: number;
  type: 'regular' | 'golden';
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  type: 'snow' | 'slide_dust' | 'fish_spark' | 'impact_ice' | 'trail';
}

export interface BackgroundLayer {
  x: number;
  speedFactor: number;
  color: string;
}

export interface GameStats {
  score: number;
  highScore: number;
  fishCollected: number;
  totalFish: number;
  distance: number;
}
