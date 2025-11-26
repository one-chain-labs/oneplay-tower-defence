// Tower Defense Game Engine

export interface Tower {
  id: string;
  x: number;
  y: number;
  level: number;
  damage: number;
  range: number;
  fireRate: number;
  lastFire: number;
}

export interface Enemy {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  pathIndex: number;
  type: 'normal' | 'fast' | 'tank';
}

export interface GameState {
  towers: Tower[];
  enemies: Enemy[];
  wave: number;
  lives: number;
  gold: number;
  isPlaying: boolean;
  isWaveActive: boolean;
}

// Game path (enemies follow this)
export const GAME_PATH = [
  { x: 0, y: 300 },
  { x: 200, y: 300 },
  { x: 200, y: 100 },
  { x: 400, y: 100 },
  { x: 400, y: 400 },
  { x: 600, y: 400 },
  { x: 600, y: 200 },
  { x: 800, y: 200 },
];

// Tower stats by level
export const TOWER_STATS = {
  1: { damage: 10, range: 100, fireRate: 1000, cost: 0 },
  2: { damage: 20, range: 120, fireRate: 800, cost: 50 },
  3: { damage: 40, range: 150, fireRate: 600, cost: 100 },
};

// Enemy stats by wave and type
export const ENEMY_TYPES = {
  normal: { hp: 50, speed: 1, reward: 10 },
  fast: { hp: 30, speed: 2, reward: 15 },
  tank: { hp: 150, speed: 0.5, reward: 25 },
};

export function getWaveEnemies(wave: number): Array<{ type: 'normal' | 'fast' | 'tank'; count: number }> {
  const waves = [
    [{ type: 'normal' as const, count: 10 }],
    [{ type: 'normal' as const, count: 15 }],
    [{ type: 'normal' as const, count: 10 }, { type: 'fast' as const, count: 5 }],
    [{ type: 'normal' as const, count: 15 }, { type: 'fast' as const, count: 5 }],
    [{ type: 'normal' as const, count: 10 }, { type: 'fast' as const, count: 5 }, { type: 'tank' as const, count: 3 }],
  ];
  return waves[wave - 1] || [];
}
