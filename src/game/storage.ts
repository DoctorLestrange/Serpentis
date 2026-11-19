import {
  BOARD_DIMENSIONS,
  BASE_TICK_MS,
  CAMPAIGN_STAGES,
  DEFAULT_CONFIG,
} from './rules';
import { THEMES } from './themes';
import {
  AchievementDef,
  BoardSizePreset,
  GameConfig,
  GameMode,
  HallOfFameEntry,
  ObstaclePreset,
  PlayerProfile,
  RunSnapshot,
  SimulationState,
  SpeedPreset,
  ThemeId,
} from './types';

const CONFIG_KEY = 'serpentis_config_v1';
const PROFILE_KEY = 'serpentis_profile_v1';

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_harvest',
    title: 'First Harvest',
    description: 'Consume 10 fruits in a single run.',
  },
  {
    id: 'combo_surge',
    title: 'Rhythm Coiled',
    description: 'Reach a 6x combo multiplier streak.',
  },
  {
    id: 'serpent_sovereign',
    title: 'Grand Serpent',
    description: 'Grow your serpent to 25 segments or longer.',
  },
  {
    id: 'stage_conqueror',
    title: 'Sanctum Explorer',
    description: 'Clear any stage in Labyrinth Campaign mode.',
  },
  {
    id: 'high_roller',
    title: 'Apex Predator',
    description: 'Score 5,000 or more points in a single run.',
  },
];

export const DEFAULT_HALL_OF_FAME: HallOfFameEntry[] = [
  {
    id: 'seed_blitz_1',
    playerName: 'KAEL',
    score: 2200,
    mode: 'time_blitz',
    stage: 1,
    applesEaten: 18,
    peakLength: 22,
    maxCombo: 5,
    victory: true,
    timestamp: 1700000004000,
  },
  {
    id: 'seed_campaign_1',
    playerName: 'LYRA',
    score: 1850,
    mode: 'campaign',
    stage: 1,
    applesEaten: 12,
    peakLength: 16,
    maxCombo: 4,
    victory: true,
    timestamp: 1700000003000,
  },
  {
    id: 'seed_classic_1',
    playerName: 'ORION',
    score: 1400,
    mode: 'classic',
    stage: 1,
    applesEaten: 14,
    peakLength: 18,
    maxCombo: 4,
    victory: false,
    timestamp: 1700000002000,
  },
  {
    id: 'seed_zen_1',
    playerName: 'VERA',
    score: 950,
    mode: 'zen',
    stage: 1,
    applesEaten: 11,
    peakLength: 15,
    maxCombo: 3,
    victory: false,
    timestamp: 1700000001000,
  },
];

export const DEFAULT_SAVED_NAMES: string[] = ['ORION', 'LYRA', 'KAEL', 'VERA'];

export const DEFAULT_PROFILE: PlayerProfile = {
  highScores: {
    classic: 1400,
    campaign: 1850,
    time_blitz: 2200,
    zen: 950,
  },
  highestUnlockedStage: 1,
  totalApplesEaten: 0,
  totalGamesPlayed: 0,
  longestSnakeEver: 4,
  highestComboEver: 1,
  unlockedAchievements: [],
  hallOfFame: DEFAULT_HALL_OF_FAME.map((e) => ({ ...e })),
  savedPlayerNames: [...DEFAULT_SAVED_NAMES],
  lastPlayerName: 'ORION',
};

const VALID_MODES: GameMode[] = ['classic', 'campaign', 'time_blitz', 'zen'];
const VALID_OBSTACLES: ObstaclePreset[] = [
  'none',
  'pillars',
  'cross',
  'gates',
  'labyrinth',
];

export function sanitizeConfig(raw: unknown): GameConfig {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_CONFIG };
  }
  const obj = raw as Record<string, unknown>;

  const mode: GameMode = VALID_MODES.includes(obj.mode as GameMode)
    ? (obj.mode as GameMode)
    : DEFAULT_CONFIG.mode;

  const boardSize: BoardSizePreset =
    typeof obj.boardSize === 'string' && obj.boardSize in BOARD_DIMENSIONS
      ? (obj.boardSize as BoardSizePreset)
      : DEFAULT_CONFIG.boardSize;

  const speed: SpeedPreset =
    typeof obj.speed === 'string' && obj.speed in BASE_TICK_MS
      ? (obj.speed as SpeedPreset)
      : DEFAULT_CONFIG.speed;

  const obstaclePreset: ObstaclePreset = VALID_OBSTACLES.includes(
    obj.obstaclePreset as ObstaclePreset
  )
    ? (obj.obstaclePreset as ObstaclePreset)
    : DEFAULT_CONFIG.obstaclePreset;

  const multiFruitCount: 1 | 3 | 5 =
    obj.multiFruitCount === 1 ||
    obj.multiFruitCount === 3 ||
    obj.multiFruitCount === 5
      ? obj.multiFruitCount
      : DEFAULT_CONFIG.multiFruitCount;

  const theme: ThemeId =
    typeof obj.theme === 'string' && obj.theme in THEMES
      ? (obj.theme as ThemeId)
      : DEFAULT_CONFIG.theme;

  const campaignStage =
    typeof obj.campaignStage === 'number' &&
    Number.isInteger(obj.campaignStage) &&
    obj.campaignStage >= 1 &&
    obj.campaignStage <= CAMPAIGN_STAGES.length
      ? obj.campaignStage
      : DEFAULT_CONFIG.campaignStage;

  return {
    mode,
    boardSize,
    speed,
    wrapWalls:
      typeof obj.wrapWalls === 'boolean'
        ? obj.wrapWalls
        : DEFAULT_CONFIG.wrapWalls,
    obstaclePreset,
    multiFruitCount,
    portalsEnabled:
      typeof obj.portalsEnabled === 'boolean'
        ? obj.portalsEnabled
        : DEFAULT_CONFIG.portalsEnabled,
    specialFruitsEnabled:
      typeof obj.specialFruitsEnabled === 'boolean'
        ? obj.specialFruitsEnabled
        : DEFAULT_CONFIG.specialFruitsEnabled,
    poisonEnabled:
      typeof obj.poisonEnabled === 'boolean'
        ? obj.poisonEnabled
        : speed === 'turbo' || speed === 'hyper'
        ? true
        : DEFAULT_CONFIG.poisonEnabled,
    showGrid:
      typeof obj.showGrid === 'boolean'
        ? obj.showGrid
        : DEFAULT_CONFIG.showGrid,
    theme,
    campaignStage,
  };
}

function sanitizeHallOfFameEntry(raw: unknown): HallOfFameEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.id !== 'string' || !obj.id.trim()) return null;
  if (typeof obj.playerName !== 'string' || !obj.playerName.trim()) return null;
  const mode: GameMode = VALID_MODES.includes(obj.mode as GameMode)
    ? (obj.mode as GameMode)
    : 'classic';
  const score =
    typeof obj.score === 'number' && Number.isFinite(obj.score) && obj.score >= 0
      ? Math.floor(obj.score)
      : 0;
  const stage =
    typeof obj.stage === 'number' && Number.isInteger(obj.stage) && obj.stage >= 1
      ? Math.min(CAMPAIGN_STAGES.length, obj.stage)
      : 1;
  const applesEaten =
    typeof obj.applesEaten === 'number' && Number.isFinite(obj.applesEaten) && obj.applesEaten >= 0
      ? Math.floor(obj.applesEaten)
      : 0;
  const peakLength =
    typeof obj.peakLength === 'number' && Number.isFinite(obj.peakLength) && obj.peakLength >= 1
      ? Math.floor(obj.peakLength)
      : 4;
  const maxCombo =
    typeof obj.maxCombo === 'number' && Number.isFinite(obj.maxCombo) && obj.maxCombo >= 1
      ? Math.floor(obj.maxCombo)
      : 1;
  const timestamp =
    typeof obj.timestamp === 'number' && Number.isFinite(obj.timestamp) && obj.timestamp > 0
      ? Math.floor(obj.timestamp)
      : Date.now();

  return {
    id: obj.id.trim().slice(0, 64),
    playerName: obj.playerName.trim().slice(0, 18),
    score,
    mode,
    stage,
    applesEaten,
    peakLength,
    maxCombo,
    victory: Boolean(obj.victory),
    timestamp,
  };
}

export function sanitizeProfile(raw: unknown): PlayerProfile {
  if (!raw || typeof raw !== 'object') {
    return {
      ...DEFAULT_PROFILE,
      highScores: { ...DEFAULT_PROFILE.highScores },
      unlockedAchievements: [],
      hallOfFame: DEFAULT_HALL_OF_FAME.map((e) => ({ ...e })),
      savedPlayerNames: [...DEFAULT_SAVED_NAMES],
    };
  }
  const obj = raw as Record<string, unknown>;
  const rawScores =
    obj.highScores && typeof obj.highScores === 'object'
      ? (obj.highScores as Record<string, unknown>)
      : {};

  const safeNum = (val: unknown, fallback: number, min = 0): number =>
    typeof val === 'number' && Number.isFinite(val) && val >= min
      ? Math.floor(val)
      : fallback;

  const validAchievementIds = new Set(ACHIEVEMENTS.map((a) => a.id));
  const unlockedAchievements = Array.isArray(obj.unlockedAchievements)
    ? obj.unlockedAchievements.filter(
        (id): id is string =>
          typeof id === 'string' && validAchievementIds.has(id)
      )
    : [];

  let hallOfFame: HallOfFameEntry[];
  if (Array.isArray(obj.hallOfFame)) {
    hallOfFame = obj.hallOfFame
      .map(sanitizeHallOfFameEntry)
      .filter((e): e is HallOfFameEntry => e !== null)
      .sort((a, b) => b.score - a.score || b.applesEaten - a.applesEaten || b.timestamp - a.timestamp)
      .slice(0, 50);
  } else {
    hallOfFame = DEFAULT_HALL_OF_FAME.map((e) => ({ ...e }));
  }

  let savedPlayerNames: string[];
  if (Array.isArray(obj.savedPlayerNames)) {
    const seen = new Set<string>();
    savedPlayerNames = [];
    for (const item of obj.savedPlayerNames) {
      if (typeof item === 'string') {
        const cleaned = item.trim().slice(0, 18);
        if (cleaned && !seen.has(cleaned.toLowerCase())) {
          seen.add(cleaned.toLowerCase());
          savedPlayerNames.push(cleaned);
        }
      }
    }
    if (savedPlayerNames.length === 0) {
      savedPlayerNames = [...DEFAULT_SAVED_NAMES];
    }
  } else {
    savedPlayerNames = [...DEFAULT_SAVED_NAMES];
  }

  const lastPlayerName =
    typeof obj.lastPlayerName === 'string' && obj.lastPlayerName.trim()
      ? obj.lastPlayerName.trim().slice(0, 18)
      : savedPlayerNames[0] || 'ORION';

  return {
    highScores: {
      classic: safeNum(rawScores.classic, DEFAULT_PROFILE.highScores.classic),
      campaign: safeNum(
        rawScores.campaign,
        DEFAULT_PROFILE.highScores.campaign
      ),
      time_blitz: safeNum(
        rawScores.time_blitz,
        DEFAULT_PROFILE.highScores.time_blitz
      ),
      zen: safeNum(rawScores.zen, DEFAULT_PROFILE.highScores.zen),
    },
    highestUnlockedStage: Math.min(
      CAMPAIGN_STAGES.length,
      Math.max(1, safeNum(obj.highestUnlockedStage, 1, 1))
    ),
    totalApplesEaten: safeNum(obj.totalApplesEaten, 0),
    totalGamesPlayed: safeNum(obj.totalGamesPlayed, 0),
    longestSnakeEver: safeNum(obj.longestSnakeEver, 4, 4),
    highestComboEver: safeNum(obj.highestComboEver, 1, 1),
    unlockedAchievements,
    hallOfFame,
    savedPlayerNames: savedPlayerNames.slice(0, 12),
    lastPlayerName,
  };
}

export function loadConfig(): GameConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    return sanitizeConfig(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: GameConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(sanitizeConfig(config)));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) {
      return sanitizeProfile(null);
    }
    return sanitizeProfile(JSON.parse(raw));
  } catch {
    return sanitizeProfile(null);
  }
}

export function saveProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(sanitizeProfile(profile)));
  } catch {
    // Ignore storage quota errors
  }
}

export function resetProfile(): PlayerProfile {
  const fresh = sanitizeProfile(null);
  saveProfile(fresh);
  return fresh;
}

export function recordCompletedRun(
  profile: PlayerProfile,
  config: GameConfig,
  sim: SimulationState
): {
  updatedProfile: PlayerProfile;
  isNewRecord: boolean;
  newlyUnlocked: string[];
} {
  const prevBest = profile.highScores[config.mode] || 0;
  const isNewRecord = sim.score > prevBest;

  const updated: PlayerProfile = {
    ...profile,
    highScores: {
      ...profile.highScores,
      [config.mode]: Math.max(prevBest, sim.score),
    },
    highestUnlockedStage:
      config.mode === 'campaign' && sim.status === 'victory'
        ? Math.min(
            CAMPAIGN_STAGES.length,
            Math.max(profile.highestUnlockedStage, config.campaignStage + 1)
          )
        : profile.highestUnlockedStage,
    totalApplesEaten: profile.totalApplesEaten + sim.applesEaten,
    totalGamesPlayed: profile.totalGamesPlayed + 1,
    longestSnakeEver: Math.max(profile.longestSnakeEver, sim.snake.length),
    highestComboEver: Math.max(profile.highestComboEver, sim.maxCombo),
    unlockedAchievements: [...profile.unlockedAchievements],
    hallOfFame: [...profile.hallOfFame],
    savedPlayerNames: [...profile.savedPlayerNames],
  };

  const newlyUnlocked: string[] = [];
  const unlock = (id: string) => {
    if (!updated.unlockedAchievements.includes(id)) {
      updated.unlockedAchievements.push(id);
      newlyUnlocked.push(id);
    }
  };

  if (sim.applesEaten >= 10) unlock('first_harvest');
  if (sim.maxCombo >= 6) unlock('combo_surge');
  if (sim.snake.length >= 25) unlock('serpent_sovereign');
  if (config.mode === 'campaign' && sim.status === 'victory') {
    unlock('stage_conqueror');
  }
  if (sim.score >= 5000) unlock('high_roller');

  saveProfile(updated);
  return { updatedProfile: updated, isNewRecord, newlyUnlocked };
}

export function recordHallOfFameEntry(
  profile: PlayerProfile,
  snapshot: RunSnapshot,
  rawName: string
): {
  updatedProfile: PlayerProfile;
  rank: number;
  entry: HallOfFameEntry;
} {
  const existingIdx = profile.hallOfFame.findIndex(
    (e) => e.id === snapshot.runEntryId
  );
  if (existingIdx >= 0) {
    return {
      updatedProfile: profile,
      rank: existingIdx + 1,
      entry: profile.hallOfFame[existingIdx],
    };
  }

  const cleanedName =
    rawName.trim().slice(0, 18) || profile.lastPlayerName || 'SERPENT';

  const entry: HallOfFameEntry = {
    id: snapshot.runEntryId,
    playerName: cleanedName,
    score: Math.round(snapshot.score),
    mode: snapshot.mode,
    stage: snapshot.stage,
    applesEaten: snapshot.applesEaten,
    peakLength: snapshot.peakLength,
    maxCombo: snapshot.maxCombo,
    victory: snapshot.victory,
    timestamp: Date.now(),
  };

  const nextHallOfFame = [...profile.hallOfFame, entry]
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.applesEaten - a.applesEaten ||
        b.timestamp - a.timestamp
    )
    .slice(0, 50);

  const rankIndex = nextHallOfFame.findIndex((e) => e.id === entry.id);
  const rank = rankIndex >= 0 ? rankIndex + 1 : nextHallOfFame.length;

  const nextSavedNames = [
    cleanedName,
    ...profile.savedPlayerNames.filter(
      (n) => n.toLowerCase() !== cleanedName.toLowerCase()
    ),
  ].slice(0, 12);

  const updatedProfile: PlayerProfile = {
    ...profile,
    hallOfFame: nextHallOfFame,
    savedPlayerNames: nextSavedNames,
    lastPlayerName: cleanedName,
  };

  saveProfile(updatedProfile);
  return { updatedProfile, rank, entry };
}
