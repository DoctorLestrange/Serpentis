import {
  BoardSizePreset,
  CampaignStageDef,
  Direction,
  FruitItem,
  FruitType,
  GameConfig,
  ObstaclePreset,
  Point,
  PortalPair,
  SimulationState,
  SpeedPreset,
} from './types';

export const BOARD_DIMENSIONS: Record<BoardSizePreset, { cols: number; rows: number }> = {
  compact: { cols: 18, rows: 14 },
  standard: { cols: 24, rows: 18 },
  grand: { cols: 30, rows: 22 },
};

export const BASE_TICK_MS: Record<SpeedPreset, number> = {
  relaxed: 135,
  standard: 100,
  turbo: 75,
  hyper: 56,
};

export const CAMPAIGN_STAGES: CampaignStageDef[] = [
  {
    stage: 1,
    name: 'Emerald Meadow',
    subtitle: 'Open perimeter grounds with gentle speed',
    targetApples: 12,
    speedPreset: 'standard',
    wrapWalls: false,
    portalsEnabled: false,
    poisonEnabled: false,
    obstaclePreset: 'none',
  },
  {
    stage: 2,
    name: 'Twin Monoliths',
    subtitle: 'Four stone pillars guard the inner quadrants',
    targetApples: 16,
    speedPreset: 'standard',
    wrapWalls: false,
    portalsEnabled: true,
    poisonEnabled: false,
    obstaclePreset: 'pillars',
  },
  {
    stage: 3,
    name: 'Sanctum Gates',
    subtitle: 'Divided chambers with toxic skulls & portals',
    targetApples: 20,
    speedPreset: 'standard',
    wrapWalls: true,
    portalsEnabled: true,
    poisonEnabled: true,
    obstaclePreset: 'gates',
  },
  {
    stage: 4,
    name: 'Crossroads Vault',
    subtitle: 'Central stone spine with poison hazards',
    targetApples: 24,
    speedPreset: 'turbo',
    wrapWalls: false,
    portalsEnabled: true,
    poisonEnabled: true,
    obstaclePreset: 'cross',
  },
  {
    stage: 5,
    name: 'Sovereign Labyrinth',
    subtitle: 'Interlocking corridors for master serpents',
    targetApples: 30,
    speedPreset: 'turbo',
    wrapWalls: true,
    portalsEnabled: true,
    poisonEnabled: true,
    obstaclePreset: 'labyrinth',
  },
];

export const DEFAULT_CONFIG: GameConfig = {
  mode: 'classic',
  boardSize: 'standard',
  speed: 'standard',
  wrapWalls: false,
  obstaclePreset: 'none',
  multiFruitCount: 1,
  portalsEnabled: false,
  specialFruitsEnabled: true,
  poisonEnabled: false,
  showGrid: true,
  theme: 'botanical',
  campaignStage: 1,
};

export function pointKey(p: Point): string {
  return `${p.x},${p.y}`;
}

export function isOppositeDirection(a: Direction, b: Direction): boolean {
  return (
    (a === 'UP' && b === 'DOWN') ||
    (a === 'DOWN' && b === 'UP') ||
    (a === 'LEFT' && b === 'RIGHT') ||
    (a === 'RIGHT' && b === 'LEFT')
  );
}

/**
 * Enqueues a player directional input into a bounded turn queue (max 3).
 * Rejects redundant same-direction inputs and illegal 180-degree reversals
 * relative to the last planned direction.
 */
export function enqueueDirection(
  currentDir: Direction,
  queue: Direction[],
  nextDir: Direction,
  maxQueueLength = 3
): Direction[] {
  if (queue.length >= maxQueueLength) {
    return queue;
  }
  const referenceDir = queue.length > 0 ? queue[queue.length - 1] : currentDir;
  if (nextDir === referenceDir || isOppositeDirection(referenceDir, nextDir)) {
    return queue;
  }
  return [...queue, nextDir];
}

export function getDirectionDelta(dir: Direction): Point {
  switch (dir) {
    case 'UP':
      return { x: 0, y: -1 };
    case 'DOWN':
      return { x: 0, y: 1 };
    case 'LEFT':
      return { x: -1, y: 0 };
    case 'RIGHT':
      return { x: 1, y: 0 };
  }
}

/**
 * Generates obstacle coordinates for a given board size and preset.
 * Always keeps row `Math.floor(rows / 2) - 2` (the spawn lane) completely clear!
 */
export function generateObstacles(
  cols: number,
  rows: number,
  preset: ObstaclePreset
): Point[] {
  if (preset === 'none') return [];

  const obstacles: Point[] = [];
  const spawnY = Math.max(2, Math.floor(rows / 2) - 3);
  const seen = new Set<string>();

  const addObstacle = (x: number, y: number) => {
    if (x < 1 || x >= cols - 1 || y < 1 || y >= rows - 1) return;
    // Protect spawn corridor across the entire spawn row and adjacent row
    if (Math.abs(y - spawnY) <= 1) return;
    const key = `${x},${y}`;
    if (!seen.has(key)) {
      seen.add(key);
      obstacles.push({ x, y });
    }
  };

  const midX = Math.floor(cols / 2);
  const midY = Math.floor(rows / 2);

  if (preset === 'pillars') {
    const qx1 = Math.floor(cols * 0.25);
    const qx2 = Math.floor(cols * 0.75);
    const qy1 = Math.floor(rows * 0.25);
    const qy2 = Math.floor(rows * 0.75);
    for (const px of [qx1, qx2]) {
      for (const py of [qy1, qy2]) {
        addObstacle(px, py);
        addObstacle(px + 1, py);
        addObstacle(px, py + 1);
        addObstacle(px + 1, py + 1);
      }
    }
  } else if (preset === 'cross') {
    for (let x = Math.floor(cols * 0.25); x <= Math.floor(cols * 0.75); x++) {
      addObstacle(x, midY + 2);
    }
    for (let y = Math.floor(rows * 0.2); y <= Math.floor(rows * 0.8); y++) {
      addObstacle(midX, y);
    }
  } else if (preset === 'gates') {
    const leftGateX = Math.floor(cols * 0.33);
    const rightGateX = Math.floor(cols * 0.66);
    for (let y = 2; y < rows - 2; y++) {
      if (Math.abs(y - midY) > 2) {
        addObstacle(leftGateX, y);
        addObstacle(rightGateX, y);
      }
    }
  } else if (preset === 'labyrinth') {
    // Outer inset brackets
    for (let x = 3; x < cols - 3; x++) {
      if (Math.abs(x - midX) > 2) {
        addObstacle(x, 3);
        addObstacle(x, rows - 4);
      }
    }
    // Inner vertical dividers
    for (let y = 5; y < rows - 5; y++) {
      if (Math.abs(y - midY) > 1) {
        addObstacle(Math.floor(cols * 0.28), y);
        addObstacle(Math.floor(cols * 0.72), y);
      }
    }
  }

  return obstacles;
}

export function generatePortals(
  cols: number,
  rows: number,
  enabled: boolean,
  obstacleSet: Set<string>,
  snake: Point[]
): PortalPair[] {
  if (!enabled) return [];

  const occupied = new Set<string>(obstacleSet);
  for (const s of snake) occupied.add(pointKey(s));

  const isSafePortalCell = (x: number, y: number): boolean => {
    if (x < 2 || x >= cols - 2 || y < 2 || y >= rows - 2) return false;
    if (occupied.has(`${x},${y}`)) return false;
    // Ensure all 4 cardinal neighbors are free of obstacles so exiting a portal never traps the player
    const neighbors = [
      `${x + 1},${y}`,
      `${x - 1},${y}`,
      `${x},${y + 1}`,
      `${x},${y - 1}`,
    ];
    return neighbors.every((k) => !obstacleSet.has(k));
  };

  const findFreeNear = (targetX: number, targetY: number): Point => {
    for (let r = 0; r <= 6; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          const x = Math.max(2, Math.min(cols - 3, targetX + dx));
          const y = Math.max(2, Math.min(rows - 3, targetY + dy));
          if (isSafePortalCell(x, y)) {
            occupied.add(`${x},${y}`);
            return { x, y };
          }
        }
      }
    }
    return { x: targetX, y: targetY };
  };

  const a = findFreeNear(3, rows - 3);
  const b = findFreeNear(cols - 4, 3);

  return [
    {
      id: 'portal-main',
      a,
      b,
      color: '#2DD4BF',
    },
  ];
}

export function spawnFruit(
  state: Pick<
    SimulationState,
    'cols' | 'rows' | 'snake' | 'obstacles' | 'fruits' | 'portals' | 'tickCount'
  >,
  type: FruitType = 'apple',
  rng: () => number = Math.random
): FruitItem | null {
  const occupied = new Set<string>();
  for (const s of state.snake) occupied.add(pointKey(s));
  for (const o of state.obstacles) occupied.add(pointKey(o));
  for (const f of state.fruits) occupied.add(pointKey(f));
  for (const p of state.portals) {
    occupied.add(pointKey(p.a));
    occupied.add(pointKey(p.b));
  }

  const freeCells: Point[] = [];
  for (let y = 0; y < state.rows; y++) {
    for (let x = 0; x < state.cols; x++) {
      if (!occupied.has(`${x},${y}`)) {
        freeCells.push({ x, y });
      }
    }
  }

  if (freeCells.length === 0) return null;

  let candidateCells = freeCells;
  if (type === 'poison' && state.snake.length > 0) {
    const head = state.snake[0];
    const safePoisonCells = freeCells.filter(
      (c) => Math.abs(c.x - head.x) + Math.abs(c.y - head.y) >= 4
    );
    if (safePoisonCells.length > 0) {
      candidateCells = safePoisonCells;
    }
  }

  const chosen = candidateCells[Math.floor(rng() * candidateCells.length)];
  const isTemporary = type !== 'apple';

  return {
    id: `fruit-${state.tickCount}-${chosen.x}-${chosen.y}-${Math.floor(rng() * 10000)}`,
    x: chosen.x,
    y: chosen.y,
    type,
    spawnedAtTick: state.tickCount,
    ttlTicks: type === 'poison' ? 110 : isTemporary ? 95 : undefined,
  };
}

export function resolveEffectiveConfig(config: GameConfig): {
  cols: number;
  rows: number;
  baseTickMs: number;
  wrapWalls: boolean;
  obstaclePreset: ObstaclePreset;
  portalsEnabled: boolean;
  poisonEnabled: boolean;
  targetApples: number | null;
  initialTimeMs: number | null;
} {
  const { cols, rows } = BOARD_DIMENSIONS[config.boardSize];

  if (config.mode === 'campaign') {
    const stageDef =
      CAMPAIGN_STAGES.find((s) => s.stage === config.campaignStage) ||
      CAMPAIGN_STAGES[0];
    return {
      cols,
      rows,
      baseTickMs: BASE_TICK_MS[stageDef.speedPreset],
      wrapWalls: stageDef.wrapWalls,
      obstaclePreset: stageDef.obstaclePreset,
      portalsEnabled: stageDef.portalsEnabled,
      poisonEnabled: config.poisonEnabled || stageDef.poisonEnabled,
      targetApples: stageDef.targetApples,
      initialTimeMs: null,
    };
  }

  if (config.mode === 'time_blitz') {
    return {
      cols,
      rows,
      baseTickMs: BASE_TICK_MS[config.speed],
      wrapWalls: config.wrapWalls,
      obstaclePreset: config.obstaclePreset,
      portalsEnabled: config.portalsEnabled,
      poisonEnabled: config.poisonEnabled,
      targetApples: null,
      initialTimeMs: 90_000, // 90 seconds
    };
  }

  if (config.mode === 'zen') {
    return {
      cols,
      rows,
      baseTickMs: BASE_TICK_MS[config.speed],
      wrapWalls: true,
      obstaclePreset: 'none',
      portalsEnabled: config.portalsEnabled,
      poisonEnabled: config.poisonEnabled,
      targetApples: null,
      initialTimeMs: null,
    };
  }

  return {
    cols,
    rows,
    baseTickMs: BASE_TICK_MS[config.speed],
    wrapWalls: config.wrapWalls,
    obstaclePreset: config.obstaclePreset,
    portalsEnabled: config.portalsEnabled,
    poisonEnabled: config.poisonEnabled,
    targetApples: null,
    initialTimeMs: null,
  };
}

export function createInitialSimulationState(
  config: GameConfig,
  rng: () => number = Math.random
): SimulationState {
  const resolved = resolveEffectiveConfig(config);
  const { cols, rows } = resolved;

  const obstacles = generateObstacles(cols, rows, resolved.obstaclePreset);
  const obstacleSet = new Set<string>(obstacles.map(pointKey));

  // Spawn in a guaranteed clear horizontal lane (spawnY) facing RIGHT with plenty of room ahead
  const spawnY = Math.max(2, Math.floor(rows / 2) - 3);
  const spawnHeadX = Math.max(4, Math.floor(cols * 0.25));
  const snake: Point[] = [
    { x: spawnHeadX, y: spawnY },
    { x: spawnHeadX - 1, y: spawnY },
    { x: spawnHeadX - 2, y: spawnY },
    { x: spawnHeadX - 3, y: spawnY },
  ];

  const portals = generatePortals(
    cols,
    rows,
    resolved.portalsEnabled,
    obstacleSet,
    snake
  );

  const state: SimulationState = {
    cols,
    rows,
    snake,
    prevSnake: snake.map((p) => ({ ...p })),
    direction: 'RIGHT',
    inputQueue: [],
    fruits: [],
    obstacles,
    obstacleSet,
    portals,
    score: 0,
    applesEaten: 0,
    targetApples: resolved.targetApples,
    combo: 1,
    maxCombo: 1,
    comboTimerMs: 0,
    maxComboTimerMs: 4500,
    activeEffects: [],
    stamina: 100,
    isBoosting: false,
    tickCount: 0,
    elapsedMs: 0,
    remainingTimeMs: resolved.initialTimeMs,
    status: 'running',
    deathReason: null,
    lastEvent: { type: 'none' },
  };

  const desiredApples =
    config.mode === 'time_blitz'
      ? Math.max(3, config.multiFruitCount)
      : config.multiFruitCount;
  for (let i = 0; i < desiredApples; i++) {
    const f = spawnFruit(state, 'apple', rng);
    if (f) state.fruits.push(f);
  }

  if (resolved.poisonEnabled) {
    const desiredPoison =
      config.speed === 'hyper' || config.multiFruitCount === 5 ? 2 : 1;
    for (let i = 0; i < desiredPoison; i++) {
      const p = spawnFruit(state, 'poison', rng);
      if (p) state.fruits.push(p);
    }
  }

  return state;
}

/**
 * Computes the effective interval in milliseconds between discrete grid ticks,
 * factoring in progressive speed scaling, Chrono slow power-up, and Boost stamina.
 */
export function getEffectiveTickIntervalMs(
  state: SimulationState,
  config: GameConfig
): number {
  const { baseTickMs } = resolveEffectiveConfig(config);
  // Subtle progressive speed up as apples are eaten (up to 25% faster)
  const progressionFactor = Math.max(0.75, 1 - state.applesEaten * 0.005);
  let interval = baseTickMs * progressionFactor;

  const hasChrono = state.activeEffects.some((e) => e.type === 'chrono');
  if (hasChrono) {
    interval *= 1.38;
  }

  if (state.isBoosting && state.stamina > 5) {
    interval *= 0.55;
  }

  return Math.max(35, Math.round(interval));
}

/**
 * Updates continuous timers (combo decay, active power-up durations, stamina, time blitz clock)
 */
export function advanceTimers(
  state: SimulationState,
  dtMs: number
): SimulationState {
  if (state.status !== 'running') return state;

  state.elapsedMs += dtMs;

  // Combo decay timer
  if (state.combo > 1 && state.comboTimerMs > 0) {
    state.comboTimerMs = Math.max(0, state.comboTimerMs - dtMs);
    if (state.comboTimerMs === 0) {
      state.combo = 1;
    }
  }

  // Active power-ups countdown
  if (state.activeEffects.length > 0) {
    state.activeEffects = state.activeEffects
      .map((eff) => ({ ...eff, remainingMs: eff.remainingMs - dtMs }))
      .filter((eff) => eff.remainingMs > 0);
  }

  // Boost stamina drain / regen
  if (state.isBoosting && state.stamina > 0) {
    state.stamina = Math.max(0, state.stamina - (dtMs / 1000) * 32);
    if (state.stamina === 0) {
      state.isBoosting = false;
    }
  } else {
    state.stamina = Math.min(100, state.stamina + (dtMs / 1000) * 18);
  }

  // Time Blitz countdown
  if (state.remainingTimeMs !== null) {
    state.remainingTimeMs = Math.max(0, state.remainingTimeMs - dtMs);
    if (state.remainingTimeMs === 0) {
      state.status = 'victory';
      state.deathReason = 'timeout';
      state.lastEvent = { type: 'timeout' };
    }
  }

  return state;
}

/**
 * Advances the discrete grid simulation by 1 step.
 */
export function stepSimulation(
  state: SimulationState,
  config: GameConfig,
  rng: () => number = Math.random
): SimulationState {
  if (state.status !== 'running') return state;

  const resolved = resolveEffectiveConfig(config);
  state.lastEvent = { type: 'none' };

  // Save previous snake positions for smooth sub-tick rendering interpolation
  state.prevSnake = state.snake.map((p) => ({ ...p }));

  // Pop next valid queued direction
  let nextDir = state.direction;
  while (state.inputQueue.length > 0) {
    const candidate = state.inputQueue.shift()!;
    if (!isOppositeDirection(state.direction, candidate)) {
      nextDir = candidate;
      break;
    }
  }
  state.direction = nextDir;

  const delta = getDirectionDelta(state.direction);
  const head = state.snake[0];
  let nextX = head.x + delta.x;
  let nextY = head.y + delta.y;

  // Handle wall boundaries
  if (nextX < 0 || nextX >= state.cols || nextY < 0 || nextY >= state.rows) {
    if (resolved.wrapWalls) {
      nextX = (nextX + state.cols) % state.cols;
      nextY = (nextY + state.rows) % state.rows;
    } else {
      state.status = 'defeat';
      state.deathReason = 'wall';
      state.lastEvent = { type: 'wall_hit', point: { x: head.x, y: head.y } };
      return state;
    }
  }

  let nextHead: Point = { x: nextX, y: nextY };

  // Check Portal teleportation
  for (const portal of state.portals) {
    if (nextHead.x === portal.a.x && nextHead.y === portal.a.y) {
      nextHead = { x: portal.b.x, y: portal.b.y };
      state.lastEvent = { type: 'portal_warp', point: { ...nextHead } };
      break;
    } else if (nextHead.x === portal.b.x && nextHead.y === portal.b.y) {
      nextHead = { x: portal.a.x, y: portal.a.y };
      state.lastEvent = { type: 'portal_warp', point: { ...nextHead } };
      break;
    }
  }

  const hasPhase =
    config.mode === 'zen' ||
    state.activeEffects.some((e) => e.type === 'phase');

  // Check Obstacle collision
  if (!hasPhase && state.obstacleSet.has(pointKey(nextHead))) {
    state.status = 'defeat';
    state.deathReason = 'obstacle';
    state.lastEvent = { type: 'obstacle_hit', point: { ...nextHead } };
    return state;
  }

  // Check if nextHead steps onto a fruit or poison
  const eatenIndex = state.fruits.findIndex(
    (f) => f.x === nextHead.x && f.y === nextHead.y
  );

  // Lethal Poison Skull hazard check
  if (eatenIndex !== -1 && state.fruits[eatenIndex].type === 'poison') {
    state.status = 'defeat';
    state.deathReason = 'poison';
    state.lastEvent = {
      type: 'poison_hit',
      point: { ...nextHead },
      fruitType: 'poison',
    };
    return state;
  }

  const willGrow = eatenIndex !== -1;

  // Check Self collision (exclude tail tip if not growing because tail moves out of the way)
  if (!hasPhase) {
    const bodyToCheck = willGrow
      ? state.snake
      : state.snake.slice(0, state.snake.length - 1);
    const hitsSelf = bodyToCheck.some(
      (seg) => seg.x === nextHead.x && seg.y === nextHead.y
    );
    if (hitsSelf) {
      state.status = 'defeat';
      state.deathReason = 'self';
      state.lastEvent = { type: 'self_hit', point: { ...nextHead } };
      return state;
    }
  }

  // Move snake and align prevSnake so sub-tick interpolation never jitters on growth
  const preMoveSnake = state.snake.map((p) => ({ ...p }));
  const newSnake = [nextHead, ...state.snake];
  if (!willGrow) {
    newSnake.pop();
    state.prevSnake = preMoveSnake;
  } else {
    // When growing by 1 segment, only the head moves from preMoveSnake[0] -> nextHead;
    // segments 1..N stay anchored at preMoveSnake[0..N-1]
    state.prevSnake = [preMoveSnake[0], ...preMoveSnake];
  }
  state.snake = newSnake;
  state.tickCount += 1;

  // Handle Magnet effect pulling nearby edible fruits 1 cardinal step closer
  // CRITICAL: Magnets NEVER pull poison under any circumstance
  const hasMagnet = state.activeEffects.some((e) => e.type === 'magnet');
  if (hasMagnet) {
    const occupiedSet = new Set<string>(state.obstacleSet);
    for (const seg of state.snake) occupiedSet.add(pointKey(seg));
    for (const f of state.fruits) occupiedSet.add(pointKey(f));
    for (const p of state.portals) {
      occupiedSet.add(pointKey(p.a));
      occupiedSet.add(pointKey(p.b));
    }

    for (const f of state.fruits) {
      if (f.type === 'poison') continue;
      const dist = Math.abs(f.x - nextHead.x) + Math.abs(f.y - nextHead.y);
      if (dist > 0 && dist <= 5) {
        const dx = nextHead.x - f.x;
        const dy = nextHead.y - f.y;
        const stepCandidates: Point[] = [];
        if (Math.abs(dx) >= Math.abs(dy)) {
          if (dx !== 0) stepCandidates.push({ x: f.x + Math.sign(dx), y: f.y });
          if (dy !== 0) stepCandidates.push({ x: f.x, y: f.y + Math.sign(dy) });
        } else {
          if (dy !== 0) stepCandidates.push({ x: f.x, y: f.y + Math.sign(dy) });
          if (dx !== 0) stepCandidates.push({ x: f.x + Math.sign(dx), y: f.y });
        }

        for (const cand of stepCandidates) {
          const candidateKey = pointKey(cand);
          if (
            (cand.x === nextHead.x && cand.y === nextHead.y) ||
            !occupiedSet.has(candidateKey)
          ) {
            occupiedSet.delete(pointKey(f));
            f.x = cand.x;
            f.y = cand.y;
            occupiedSet.add(pointKey(f));
            break;
          }
        }
      }
    }
  }

  // Process all edible fruits located at nextHead (including any pulled onto head by magnet)
  let grewViaDirectStep = willGrow;
  while (true) {
    const consumedIdx = state.fruits.findIndex(
      (f) => f.x === nextHead.x && f.y === nextHead.y && f.type !== 'poison'
    );
    if (consumedIdx === -1) break;

    const eatenFruit = state.fruits[consumedIdx];
    state.fruits.splice(consumedIdx, 1);

    // If magnet pulled an extra fruit onto head, grow by 1 tail segment
    if (!grewViaDirectStep && state.prevSnake.length > 0) {
      const tailTip = state.prevSnake[state.prevSnake.length - 1];
      state.snake.push({ ...tailTip });
      state.prevSnake.push({ ...tailTip });
    }
    grewViaDirectStep = false;

    const hasGoldenMultiplier = state.activeEffects.some(
      (e) => e.type === 'golden'
    );
    const boostMultiplier = state.isBoosting ? 1.5 : 1;
    const goldenMult = hasGoldenMultiplier ? 2 : 1;

    const basePoints =
      eatenFruit.type === 'golden'
        ? 300
        : eatenFruit.type === 'apple'
        ? 100
        : 200;

    const pointsAwarded = Math.round(
      basePoints * state.combo * goldenMult * boostMultiplier
    );

    state.score += pointsAwarded;
    state.applesEaten += 1;
    state.combo = Math.min(12, state.combo + 1);
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    state.comboTimerMs = state.maxComboTimerMs;
    state.stamina = Math.min(100, state.stamina + 20);

    // Apply special fruit effects
    if (eatenFruit.type === 'golden') {
      addOrRefreshEffect(state, 'golden', 8000);
      if (state.remainingTimeMs !== null) {
        state.remainingTimeMs += 5000;
      }
    } else if (eatenFruit.type === 'chrono') {
      addOrRefreshEffect(state, 'chrono', 6500);
    } else if (eatenFruit.type === 'phase') {
      addOrRefreshEffect(state, 'phase', 6500);
    } else if (eatenFruit.type === 'magnet') {
      addOrRefreshEffect(state, 'magnet', 7500);
    }

    // Check Campaign stage victory
    if (
      state.targetApples !== null &&
      state.applesEaten >= state.targetApples
    ) {
      state.status = 'victory';
      state.deathReason = 'stage_clear';
      state.lastEvent = {
        type: 'stage_clear',
        point: { ...nextHead },
        fruitType: eatenFruit.type,
        pointsAwarded,
      };
      return state;
    }

    state.lastEvent = {
      type: eatenFruit.type === 'apple' ? 'eat_apple' : 'eat_special',
      point: { ...nextHead },
      fruitType: eatenFruit.type,
      pointsAwarded,
    };

    // Ensure baseline regular apples remain stocked
    const desiredApples =
      config.mode === 'time_blitz'
        ? Math.max(3, config.multiFruitCount)
        : config.multiFruitCount;
    const currentApples = state.fruits.filter((f) => f.type === 'apple').length;
    for (let i = currentApples; i < desiredApples; i++) {
      const replacement = spawnFruit(state, 'apple', rng);
      if (replacement) state.fruits.push(replacement);
    }

    // Chance to spawn a special power-up fruit if enabled
    if (
      config.specialFruitsEnabled &&
      state.fruits.filter((f) => f.type !== 'apple' && f.type !== 'poison')
        .length === 0 &&
      (state.applesEaten % 4 === 0 || rng() < 0.28)
    ) {
      const specialPool: FruitType[] = ['golden', 'chrono', 'phase', 'magnet'];
      const chosenType = specialPool[Math.floor(rng() * specialPool.length)];
      const special = spawnFruit(state, chosenType, rng);
      if (special) state.fruits.push(special);
    }
  }

  // Expire temporary special fruits and relocate expired poison skulls
  state.fruits = state.fruits.filter((f) => {
    if (f.ttlTicks === undefined) return true;
    return state.tickCount - f.spawnedAtTick < f.ttlTicks;
  });

  // Maintain active poison skulls when poisonEnabled is true
  if (resolved.poisonEnabled) {
    const desiredPoison =
      config.speed === 'hyper' || config.multiFruitCount === 5 ? 2 : 1;
    const currentPoison = state.fruits.filter(
      (f) => f.type === 'poison'
    ).length;
    for (let i = currentPoison; i < desiredPoison; i++) {
      const p = spawnFruit(state, 'poison', rng);
      if (p) state.fruits.push(p);
    }
  } else {
    state.fruits = state.fruits.filter((f) => f.type !== 'poison');
  }

  // Safety guarantee: always keep at least 1 edible apple on the board, or declare victory if the board is 100% full!
  if (!state.fruits.some((f) => f.type === 'apple')) {
    const fallback = spawnFruit(state, 'apple', rng);
    if (fallback) {
      state.fruits.push(fallback);
    } else {
      state.status = 'victory';
      state.deathReason = 'stage_clear';
      state.lastEvent = { type: 'stage_clear', point: { ...nextHead } };
    }
  }

  return state;
}

function addOrRefreshEffect(
  state: SimulationState,
  type: 'golden' | 'chrono' | 'phase' | 'magnet',
  durationMs: number
) {
  const existing = state.activeEffects.find((e) => e.type === type);
  if (existing) {
    existing.remainingMs = durationMs;
    existing.durationMs = durationMs;
  } else {
    state.activeEffects.push({
      type,
      remainingMs: durationMs,
      durationMs,
    });
  }
}

/**
 * Autonomous AI controller for the Title Screen live showcase backdrop.
 * Steers the demo snake smoothly toward the nearest fruit while avoiding walls, obstacles, and its own body.
 */
export function computeDemoDirection(state: SimulationState): Direction {
  const head = state.snake[0];
  const edibleFruits = state.fruits.filter((f) => f.type !== 'poison');
  const target = edibleFruits[0] || {
    x: Math.floor(state.cols / 2),
    y: Math.floor(state.rows / 2),
  };

  const candidates: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'].filter(
    (d) => !isOppositeDirection(state.direction, d as Direction)
  ) as Direction[];

  const hazardSet = new Set<string>(state.obstacleSet);
  for (let i = 0; i < state.snake.length - 1; i++) {
    hazardSet.add(pointKey(state.snake[i]));
  }
  for (const f of state.fruits) {
    if (f.type === 'poison') {
      hazardSet.add(pointKey(f));
    }
  }

  let bestDir = state.direction;
  let bestScore = -Infinity;

  for (const dir of candidates) {
    const delta = getDirectionDelta(dir);
    const nx = (head.x + delta.x + state.cols) % state.cols;
    const ny = (head.y + delta.y + state.rows) % state.rows;
    const key = `${nx},${ny}`;

    if (hazardSet.has(key)) {
      continue;
    }

    // Also count open neighbors from (nx, ny) so it avoids dead-end pockets
    let openNeighbors = 0;
    for (const d2 of ['UP', 'DOWN', 'LEFT', 'RIGHT'] as Direction[]) {
      const del2 = getDirectionDelta(d2);
      const nnx = (nx + del2.x + state.cols) % state.cols;
      const nny = (ny + del2.y + state.rows) % state.rows;
      const k2 = `${nnx},${nny}`;
      if (!hazardSet.has(k2)) {
        openNeighbors++;
      }
    }

    const dist = Math.abs(target.x - nx) + Math.abs(target.y - ny);
    const score = openNeighbors * 12 - dist;
    if (score > bestScore) {
      bestScore = score;
      bestDir = dir;
    }
  }

  return bestDir;
}
