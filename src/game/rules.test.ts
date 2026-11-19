import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_CONFIG,
  advanceTimers,
  createInitialSimulationState,
  enqueueDirection,
  pointKey,
  stepSimulation,
} from './rules';
import {
  recordHallOfFameEntry,
  sanitizeConfig,
  sanitizeProfile,
} from './storage';
import { GameConfig, RunSnapshot } from './types';

test('enqueueDirection buffers rapid orthogonal turns and prevents 180-degree self-reversal', () => {
  let q = enqueueDirection('RIGHT', [], 'LEFT');
  assert.deepEqual(q, []);

  q = enqueueDirection('RIGHT', [], 'UP');
  q = enqueueDirection('RIGHT', q, 'LEFT');
  assert.deepEqual(q, ['UP', 'LEFT']);

  q = enqueueDirection('RIGHT', q, 'LEFT');
  assert.deepEqual(q, ['UP', 'LEFT']);

  q = enqueueDirection('RIGHT', q, 'DOWN');
  q = enqueueDirection('RIGHT', q, 'RIGHT');
  assert.equal(q.length, 3);
});

test('initial spawn places snake in an open corridor and survives multiple steps without input', () => {
  const config: GameConfig = {
    ...DEFAULT_CONFIG,
    mode: 'campaign',
    campaignStage: 5,
  };
  const state = createInitialSimulationState(config, () => 0.5);
  assert.equal(state.status, 'running');
  assert.equal(state.snake.length, 4);

  for (let i = 0; i < 10; i++) {
    stepSimulation(state, config, () => 0.5);
  }
  assert.equal(state.status, 'running');
});

test('eating an apple grows the snake, increments combo, and aligns prevSnake without backwards jitter', () => {
  const config: GameConfig = { ...DEFAULT_CONFIG };
  const state = createInitialSimulationState(config, () => 0.5);
  const head = state.snake[0];

  state.fruits = [
    {
      id: 'test-apple',
      x: head.x + 1,
      y: head.y,
      type: 'apple',
      spawnedAtTick: 0,
    },
  ];

  const prevLen = state.snake.length;
  stepSimulation(state, config, () => 0.5);

  assert.equal(state.snake.length, prevLen + 1);
  assert.equal(state.prevSnake.length, prevLen + 1);
  // On a growth tick, interior and tail segments (i >= 1) remain stationary at their exact grid coordinates
  for (let i = 1; i < state.snake.length; i++) {
    assert.deepEqual(state.snake[i], state.prevSnake[i]);
  }
  assert.equal(state.applesEaten, 1);
  assert.equal(state.score, 100);
  assert.equal(state.combo, 2);
  assert.equal(state.lastEvent.type, 'eat_apple');
});

test('magnet effect pulls and consumes multiple adjacent fruits in a single tick', () => {
  const config: GameConfig = { ...DEFAULT_CONFIG, specialFruitsEnabled: false };
  const state = createInitialSimulationState(config, () => 0.5);
  state.activeEffects = [{ type: 'magnet', remainingMs: 5000, durationMs: 5000 }];

  const head = state.snake[0];
  const nextHead = { x: head.x + 1, y: head.y };
  // Place one fruit directly at nextHead and a second fruit 1 tile above nextHead (which magnet will pull onto nextHead)
  state.fruits = [
    {
      id: 'direct-apple',
      x: nextHead.x,
      y: nextHead.y,
      type: 'apple',
      spawnedAtTick: 0,
    },
    {
      id: 'pulled-apple',
      x: nextHead.x,
      y: nextHead.y - 1,
      type: 'apple',
      spawnedAtTick: 0,
    },
  ];

  const prevLen = state.snake.length;
  stepSimulation(state, config, () => 0.5);

  assert.equal(state.applesEaten, 2);
  assert.equal(state.snake.length, prevLen + 2);
});

test('portals always spawn with all 4 cardinal neighbor tiles free of obstacles', () => {
  for (const preset of ['pillars', 'cross', 'gates', 'labyrinth'] as const) {
    const config: GameConfig = {
      ...DEFAULT_CONFIG,
      obstaclePreset: preset,
      portalsEnabled: true,
    };
    const state = createInitialSimulationState(config, () => 0.5);
    assert.equal(state.portals.length, 1);
    const portal = state.portals[0];
    for (const pt of [portal.a, portal.b]) {
      assert.equal(state.obstacleSet.has(pointKey(pt)), false);
      assert.equal(state.obstacleSet.has(`${pt.x + 1},${pt.y}`), false);
      assert.equal(state.obstacleSet.has(`${pt.x - 1},${pt.y}`), false);
      assert.equal(state.obstacleSet.has(`${pt.x},${pt.y + 1}`), false);
      assert.equal(state.obstacleSet.has(`${pt.x},${pt.y - 1}`), false);
    }
  }
});

test('solid walls trigger defeat while wrapWalls wraps around the board', () => {
  const solidConfig: GameConfig = { ...DEFAULT_CONFIG, wrapWalls: false };
  const state1 = createInitialSimulationState(solidConfig, () => 0.5);
  state1.snake = [
    { x: state1.cols - 1, y: 5 },
    { x: state1.cols - 2, y: 5 },
    { x: state1.cols - 3, y: 5 },
  ];
  state1.direction = 'RIGHT';
  stepSimulation(state1, solidConfig, () => 0.5);
  assert.equal(state1.status, 'defeat');
  assert.equal(state1.deathReason, 'wall');

  const wrapConfig: GameConfig = { ...DEFAULT_CONFIG, wrapWalls: true };
  const state2 = createInitialSimulationState(wrapConfig, () => 0.5);
  state2.snake = [
    { x: state2.cols - 1, y: 5 },
    { x: state2.cols - 2, y: 5 },
    { x: state2.cols - 3, y: 5 },
  ];
  state2.direction = 'RIGHT';
  stepSimulation(state2, wrapConfig, () => 0.5);
  assert.equal(state2.status, 'running');
  assert.equal(state2.snake[0].x, 0);
  assert.equal(state2.snake[0].y, 5);
});

test('campaign stage triggers victory when targetApples threshold is reached', () => {
  const campaignConfig: GameConfig = {
    ...DEFAULT_CONFIG,
    mode: 'campaign',
    campaignStage: 1,
  };
  const state = createInitialSimulationState(campaignConfig, () => 0.5);
  assert.equal(state.targetApples, 12);

  state.applesEaten = 11;
  const head = state.snake[0];
  state.fruits = [
    {
      id: 'final-apple',
      x: head.x + 1,
      y: head.y,
      type: 'apple',
      spawnedAtTick: 0,
    },
  ];

  stepSimulation(state, campaignConfig, () => 0.5);
  assert.equal(state.applesEaten, 12);
  assert.equal(state.status, 'victory');
  assert.equal(state.deathReason, 'stage_clear');
});

test('advanceTimers decays combo and expires Time Blitz when remainingTimeMs hits 0', () => {
  const blitzConfig: GameConfig = {
    ...DEFAULT_CONFIG,
    mode: 'time_blitz',
  };
  const state = createInitialSimulationState(blitzConfig, () => 0.5);
  state.combo = 4;
  state.comboTimerMs = 1000;

  advanceTimers(state, 1200);
  assert.equal(state.combo, 1);
  assert.equal(state.status, 'running');

  advanceTimers(state, 90_000);
  assert.equal(state.remainingTimeMs, 0);
  assert.equal(state.status, 'victory');
  assert.equal(state.deathReason, 'timeout');
});

test('sanitizeConfig and sanitizeProfile safely fallback on malformed storage data', () => {
  const cfg = sanitizeConfig({
    mode: 'invalid_mode',
    boardSize: 'huge_invalid',
    speed: 999,
    multiFruitCount: 42,
    showGrid: 'not_a_boolean',
    theme: 'neon_pink',
    campaignStage: -5,
  });
  assert.equal(cfg.mode, DEFAULT_CONFIG.mode);
  assert.equal(cfg.boardSize, DEFAULT_CONFIG.boardSize);
  assert.equal(cfg.speed, DEFAULT_CONFIG.speed);
  assert.equal(cfg.multiFruitCount, DEFAULT_CONFIG.multiFruitCount);
  assert.equal(cfg.showGrid, true);
  assert.equal(cfg.theme, DEFAULT_CONFIG.theme);
  assert.equal(cfg.campaignStage, 1);

  const cfgNoGrid = sanitizeConfig({ showGrid: false });
  assert.equal(cfgNoGrid.showGrid, false);

  const prof = sanitizeProfile({
    highScores: { classic: -100, campaign: 'not-a-number' },
    highestUnlockedStage: 99,
    unlockedAchievements: ['first_harvest', 'fake_achievement', 123],
  });
  assert.equal(prof.highScores.classic, 1400);
  assert.equal(prof.highestUnlockedStage, 5);
  assert.deepEqual(prof.unlockedAchievements, ['first_harvest']);
});

test('recordHallOfFameEntry records scores once per run without overwriting and maintains savedPlayerNames', () => {
  const initialProfile = sanitizeProfile(null);
  const snapshot: RunSnapshot = {
    runEntryId: 'run_test_999',
    mode: 'classic',
    stage: 1,
    victory: false,
    deathReason: 'wall',
    score: 3150,
    bestScore: 3150,
    isNewRecord: true,
    applesEaten: 21,
    targetApples: null,
    peakLength: 25,
    maxCombo: 6,
    timeSurvivedSec: 52,
    newlyUnlockedAchievements: [],
  };

  // 1. Enter a new custom player name
  const res1 = recordHallOfFameEntry(initialProfile, snapshot, 'VALKYRIE');
  assert.equal(res1.rank, 1);
  assert.equal(res1.entry.playerName, 'VALKYRIE');
  assert.equal(res1.updatedProfile.lastPlayerName, 'VALKYRIE');
  assert.equal(res1.updatedProfile.savedPlayerNames[0], 'VALKYRIE');
  assert.equal(
    res1.updatedProfile.hallOfFame.filter((e) => e.id === 'run_test_999').length,
    1
  );

  // 2. Subsequent calls for the same runEntryId never overwrite the recorded name
  const res2 = recordHallOfFameEntry(res1.updatedProfile, snapshot, 'LYRA');
  assert.equal(res2.rank, 1);
  assert.equal(res2.entry.playerName, 'VALKYRIE');
  assert.equal(res2.updatedProfile.hallOfFame[0].playerName, 'VALKYRIE');
  assert.equal(
    res2.updatedProfile.hallOfFame.filter((e) => e.id === 'run_test_999').length,
    1
  );
});

test('poison skulls spawn safely, are never pulled by magnets, and trigger defeat on consumption', () => {
  const config: GameConfig = {
    ...DEFAULT_CONFIG,
    poisonEnabled: true,
    specialFruitsEnabled: false,
  };
  const state = createInitialSimulationState(config, () => 0.5);
  const initialPoison = state.fruits.filter((f) => f.type === 'poison');
  assert.equal(initialPoison.length, 1);
  const head = state.snake[0];
  const distFromHead =
    Math.abs(initialPoison[0].x - head.x) +
    Math.abs(initialPoison[0].y - head.y);
  assert.ok(distFromHead >= 4);

  // Activate Magnet and place a poison skull 2 tiles away from nextHead (head.x + 1, head.y)
  state.activeEffects = [{ type: 'magnet', remainingMs: 5000, durationMs: 5000 }];
  const nextHead = { x: head.x + 1, y: head.y };
  const poisonX = nextHead.x;
  const poisonY = nextHead.y - 2;
  state.fruits = [
    {
      id: 'far-apple',
      x: state.cols - 2,
      y: state.rows - 2,
      type: 'apple',
      spawnedAtTick: 0,
    },
    {
      id: 'nearby-poison',
      x: poisonX,
      y: poisonY,
      type: 'poison',
      spawnedAtTick: 0,
      ttlTicks: 110,
    },
  ];

  stepSimulation(state, config, () => 0.5);
  assert.equal(state.status, 'running');
  const poisonAfterMagnet = state.fruits.find((f) => f.id === 'nearby-poison');
  assert.ok(poisonAfterMagnet);
  // Magnet must NEVER pull poison closer
  assert.equal(poisonAfterMagnet.x, poisonX);
  assert.equal(poisonAfterMagnet.y, poisonY);

  // Now place poison directly in front of the snake's next step and verify lethal collision
  const currentHead = state.snake[0];
  state.fruits.push({
    id: 'direct-poison',
    x: currentHead.x + 1,
    y: currentHead.y,
    type: 'poison',
    spawnedAtTick: state.tickCount,
    ttlTicks: 110,
  });

  stepSimulation(state, config, () => 0.5);
  assert.equal(state.status, 'defeat');
  assert.equal(state.deathReason, 'poison');
  assert.equal(state.lastEvent.type, 'poison_hit');
});
