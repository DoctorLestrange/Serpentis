export type AppScreenState = 'title' | 'playing' | 'paused' | 'gameover';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export type GameMode = 'classic' | 'campaign' | 'time_blitz' | 'zen';

export type BoardSizePreset = 'compact' | 'standard' | 'grand';

export type SpeedPreset = 'relaxed' | 'standard' | 'turbo' | 'hyper';

export type ObstaclePreset = 'none' | 'pillars' | 'cross' | 'gates' | 'labyrinth';

export type ThemeId = 'botanical' | 'obsidian' | 'phosphor' | 'alabaster';

export type FruitType = 'apple' | 'golden' | 'chrono' | 'phase' | 'magnet' | 'poison';

export interface Point {
  x: number;
  y: number;
}

export interface FruitItem {
  id: string;
  x: number;
  y: number;
  type: FruitType;
  spawnedAtTick: number;
  ttlTicks?: number; // Special fruits and poison relocate if not eaten in time
}

export interface PortalPair {
  id: string;
  a: Point;
  b: Point;
  color: string;
}

export interface ActiveEffect {
  type: 'golden' | 'chrono' | 'phase' | 'magnet';
  remainingMs: number;
  durationMs: number;
}

export interface GameConfig {
  mode: GameMode;
  boardSize: BoardSizePreset;
  speed: SpeedPreset;
  wrapWalls: boolean;
  obstaclePreset: ObstaclePreset;
  multiFruitCount: 1 | 3 | 5;
  portalsEnabled: boolean;
  specialFruitsEnabled: boolean;
  poisonEnabled: boolean;
  showGrid: boolean;
  theme: ThemeId;
  campaignStage: number; // 1 to 5
}

export interface CampaignStageDef {
  stage: number;
  name: string;
  subtitle: string;
  targetApples: number;
  speedPreset: SpeedPreset;
  wrapWalls: boolean;
  portalsEnabled: boolean;
  poisonEnabled: boolean;
  obstaclePreset: ObstaclePreset;
}

export type DeathReason =
  | 'wall'
  | 'self'
  | 'obstacle'
  | 'poison'
  | 'timeout'
  | 'stage_clear'
  | null;

export interface SimulationState {
  cols: number;
  rows: number;
  snake: Point[];
  prevSnake: Point[];
  direction: Direction;
  inputQueue: Direction[];
  fruits: FruitItem[];
  obstacles: Point[];
  obstacleSet: Set<string>;
  portals: PortalPair[];
  score: number;
  applesEaten: number;
  targetApples: number | null; // Used in campaign mode
  combo: number;
  maxCombo: number;
  comboTimerMs: number;
  maxComboTimerMs: number;
  activeEffects: ActiveEffect[];
  stamina: number; // 0 to 100 for boost
  isBoosting: boolean;
  tickCount: number;
  elapsedMs: number;
  remainingTimeMs: number | null; // Used in time_blitz mode
  status: 'running' | 'victory' | 'defeat';
  deathReason: DeathReason;
  lastEvent: {
    type:
      | 'none'
      | 'eat_apple'
      | 'eat_special'
      | 'portal_warp'
      | 'wall_hit'
      | 'self_hit'
      | 'obstacle_hit'
      | 'poison_hit'
      | 'stage_clear'
      | 'timeout';
    point?: Point;
    fruitType?: FruitType;
    pointsAwarded?: number;
  };
}

export interface RunSnapshot {
  runEntryId: string;
  mode: GameMode;
  stage: number;
  victory: boolean;
  deathReason: DeathReason;
  score: number;
  bestScore: number;
  isNewRecord: boolean;
  applesEaten: number;
  targetApples: number | null;
  peakLength: number;
  maxCombo: number;
  timeSurvivedSec: number;
  newlyUnlockedAchievements: string[];
}

export interface HallOfFameEntry {
  id: string;
  playerName: string;
  score: number;
  mode: GameMode;
  stage: number;
  applesEaten: number;
  peakLength: number;
  maxCombo: number;
  victory: boolean;
  timestamp: number;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  unlockedAt?: number;
}

export interface PlayerProfile {
  highScores: Record<GameMode, number>;
  highestUnlockedStage: number;
  totalApplesEaten: number;
  totalGamesPlayed: number;
  longestSnakeEver: number;
  highestComboEver: number;
  unlockedAchievements: string[];
  hallOfFame: HallOfFameEntry[];
  savedPlayerNames: string[];
  lastPlayerName: string;
}
