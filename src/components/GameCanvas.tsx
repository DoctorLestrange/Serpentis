import React, { useEffect, useRef } from 'react';
import { soundEngine } from '../game/audio';
import { ParticlePool } from '../game/particles';
import {
  advanceTimers,
  computeDemoDirection,
  createInitialSimulationState,
  enqueueDirection,
  getDirectionDelta,
  getEffectiveTickIntervalMs,
  pointKey,
  resolveEffectiveConfig,
  spawnFruit,
  stepSimulation,
} from '../game/rules';
import { THEMES } from '../game/themes';
import {
  AppScreenState,
  Direction,
  FruitItem,
  GameConfig,
  Point,
  SimulationState,
} from '../game/types';

interface GameCanvasProps {
  screenState: AppScreenState;
  config: GameConfig;
  runId: number;
  onHudUpdate: (sim: SimulationState) => void;
  onRunEnd: (sim: SimulationState) => void;
  externalDirectionRef: React.MutableRefObject<((dir: Direction) => void) | null>;
  externalBoostRef: React.MutableRefObject<((boosting: boolean) => void) | null>;
}

interface SpineSample {
  x: number;
  y: number;
  tx: number; // Unit tangent X pointing toward head
  ty: number; // Unit tangent Y pointing toward head
  nx: number; // Unit normal X
  ny: number; // Unit normal Y
  radius: number;
  distFromHeadCells: number;
  u: number;
}

function createShowcaseDemoState(config: GameConfig): SimulationState {
  const demoConfig: GameConfig = {
    ...config,
    multiFruitCount: Math.max(3, config.multiFruitCount) as 1 | 3 | 5,
  };
  const base = createInitialSimulationState(demoConfig);
  const spawnY = Math.max(2, Math.floor(base.rows / 2) - 3);
  const startX = Math.min(base.cols - 3, Math.floor(base.cols * 0.68));
  // Coiled initial showcase posture with a turn so the smooth curved body is visible immediately,
  // falling back to the guaranteed-clear horizontal spawn lane if any coiled cell hits an obstacle or portal.
  const coiled: Point[] = [
    { x: startX, y: spawnY },
    { x: startX - 1, y: spawnY },
    { x: startX - 2, y: spawnY },
    { x: startX - 3, y: spawnY },
    { x: startX - 3, y: spawnY + 1 },
    { x: startX - 3, y: spawnY + 2 },
    { x: startX - 3, y: spawnY + 3 },
    { x: startX - 4, y: spawnY + 3 },
    { x: startX - 5, y: spawnY + 3 },
  ];
  const portalKeys = new Set<string>();
  for (const p of base.portals) {
    portalKeys.add(pointKey(p.a));
    portalKeys.add(pointKey(p.b));
  }
  const coiledClear = coiled.every(
    (pt) =>
      pt.x >= 1 &&
      pt.x < base.cols - 1 &&
      pt.y >= 1 &&
      pt.y < base.rows - 1 &&
      !base.obstacleSet.has(pointKey(pt)) &&
      !portalKeys.has(pointKey(pt))
  );
  if (coiledClear) {
    base.snake = coiled;
    base.prevSnake = coiled.map((p) => ({ ...p }));
    base.direction = 'RIGHT';
    const snakeKeys = new Set(coiled.map(pointKey));
    const overlapping = base.fruits.filter((f) => snakeKeys.has(pointKey(f)));
    if (overlapping.length > 0) {
      base.fruits = base.fruits.filter((f) => !snakeKeys.has(pointKey(f)));
      for (const removed of overlapping) {
        const replacement = spawnFruit(base, removed.type);
        if (replacement) base.fruits.push(replacement);
      }
    }
  }
  return base;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  screenState,
  config,
  runId,
  onHudUpdate,
  onRunEnd,
  externalDirectionRef,
  externalBoostRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const screenStateRef = useRef<AppScreenState>(screenState);
  const configRef = useRef<GameConfig>(config);
  const onHudUpdateRef = useRef(onHudUpdate);
  const onRunEndRef = useRef(onRunEnd);

  screenStateRef.current = screenState;
  configRef.current = config;
  onHudUpdateRef.current = onHudUpdate;
  onRunEndRef.current = onRunEnd;

  const simRef = useRef<SimulationState>(createInitialSimulationState(config));
  const demoSimRef = useRef<SimulationState>(createShowcaseDemoState(config));
  const particlesRef = useRef<ParticlePool>(new ParticlePool());
  const tickAccumulatorMsRef = useRef<number>(0);
  const hitstopSecRef = useRef<number>(0);
  const traumaRef = useRef<number>(0);
  const endDelayTimerSecRef = useRef<number>(0);
  const endReportedRef = useRef<boolean>(false);
  const pointerNormRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const fresh = createInitialSimulationState(configRef.current);
    simRef.current = fresh;
    demoSimRef.current = createShowcaseDemoState(configRef.current);
    tickAccumulatorMsRef.current = 0;
    hitstopSecRef.current = 0;
    traumaRef.current = 0;
    endDelayTimerSecRef.current = 0;
    endReportedRef.current = false;
    particlesRef.current.clear();
    onHudUpdateRef.current(fresh);
  }, [
    runId,
    config.mode,
    config.boardSize,
    config.speed,
    config.wrapWalls,
    config.obstaclePreset,
    config.multiFruitCount,
    config.portalsEnabled,
    config.specialFruitsEnabled,
    config.poisonEnabled,
    config.campaignStage,
  ]);

  useEffect(() => {
    externalDirectionRef.current = (dir: Direction) => {
      if (screenStateRef.current !== 'playing') return;
      const sim = simRef.current;
      if (sim.status !== 'running') return;
      const updatedQueue = enqueueDirection(sim.direction, sim.inputQueue, dir);
      if (updatedQueue.length !== sim.inputQueue.length) {
        sim.inputQueue = updatedQueue;
        soundEngine.playTurn(dir);
      }
    };

    externalBoostRef.current = (boosting: boolean) => {
      if (screenStateRef.current !== 'playing') return;
      simRef.current.isBoosting = boosting && simRef.current.stamina > 5;
    };
  }, [externalDirectionRef, externalBoostRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    const updateCanvasSize = () => {
      if (!container || !canvas) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    updateCanvasSize();
    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });
    resizeObserver.observe(container);
    window.addEventListener('resize', updateCanvasSize);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (screenStateRef.current !== 'playing') return;
      const sim = simRef.current;
      if (sim.status !== 'running') return;

      let dir: Direction | null = null;
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          dir = 'UP';
          break;
        case 'ArrowDown':
        case 'KeyS':
          dir = 'DOWN';
          break;
        case 'ArrowLeft':
        case 'KeyA':
          dir = 'LEFT';
          break;
        case 'ArrowRight':
        case 'KeyD':
          dir = 'RIGHT';
          break;
        case 'Space':
        case 'ShiftLeft':
        case 'ShiftRight':
          e.preventDefault();
          if (!e.repeat && sim.stamina > 10) {
            sim.isBoosting = true;
          }
          return;
      }

      if (dir) {
        e.preventDefault();
        if (e.repeat) return;
        const nextQ = enqueueDirection(sim.direction, sim.inputQueue, dir);
        if (nextQ.length !== sim.inputQueue.length) {
          sim.inputQueue = nextQ;
          soundEngine.playTurn(dir);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' ||
        e.code === 'ShiftLeft' ||
        e.code === 'ShiftRight'
      ) {
        simRef.current.isBoosting = false;
      }
    };

    const handleBlurOrVisibility = () => {
      simRef.current.isBoosting = false;
    };

    const handlePointerMove = (e: PointerEvent) => {
      pointerNormRef.current = {
        x: (e.clientX / Math.max(1, width) - 0.5) * 2,
        y: (e.clientY / Math.max(1, height) - 0.5) * 2,
      };
    };

    let touchStartX = 0;
    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (screenStateRef.current !== 'playing' || e.touches.length === 0) return;
      e.preventDefault();
      const dx = e.touches[0].clientX - touchStartX;
      const dy = e.touches[0].clientY - touchStartY;
      if (Math.hypot(dx, dy) < 24) return;

      const dir: Direction =
        Math.abs(dx) > Math.abs(dy)
          ? dx > 0
            ? 'RIGHT'
            : 'LEFT'
          : dy > 0
          ? 'DOWN'
          : 'UP';

      const sim = simRef.current;
      const nextQ = enqueueDirection(sim.direction, sim.inputQueue, dir);
      if (nextQ.length !== sim.inputQueue.length) {
        sim.inputQueue = nextQ;
        soundEngine.playTurn(dir);
      }
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlurOrVisibility);
    document.addEventListener('visibilitychange', handleBlurOrVisibility);
    window.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });

    let lastTime = performance.now();
    let rafId = 0;
    let timerId: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const computeBoardMetrics = (cols: number, rows: number, isTitle: boolean) => {
      const isMobile = width < 768;
      const topInset = isTitle ? (isMobile ? 48 : 72) : isMobile ? 78 : 80;
      const bottomInset = isTitle ? (isMobile ? 36 : 60) : isMobile ? 136 : 32;
      const horizontalInset = isMobile ? 12 : 32;
      const availW = Math.max(180, width - horizontalInset * 2);
      const availH = Math.max(160, height - topInset - bottomInset);
      const cellSize = Math.max(6, Math.floor(Math.min(availW / cols, availH / rows)));
      const boardW = cellSize * cols;
      const boardH = cellSize * rows;
      const offsetX = Math.floor((width - boardW) / 2);
      const offsetY = Math.floor(topInset + (availH - boardH) / 2);
      return { cellSize, boardW, boardH, offsetX, offsetY };
    };

    let lastHudSignature = '';

    const getHudSignature = (s: SimulationState) =>
      `${s.score}|${s.applesEaten}|${s.combo}|${Math.round(s.comboTimerMs / 250)}|${Math.round(
        s.stamina / 2
      )}|${
        s.remainingTimeMs !== null ? Math.ceil(s.remainingTimeMs / 1000) : -1
      }|${s.activeEffects
        .map((e) => `${e.type}:${Math.ceil(e.remainingMs / 200)}`)
        .join(',')}|${s.status}`;

    const scheduleNextFrame = () => {
      if (disposed) return;
      const st = screenStateRef.current;
      const hasActiveFx =
        particlesRef.current.particles.some((p) => p.active) ||
        particlesRef.current.texts.some((t) => t.active);

      if (st === 'playing' || (st === 'gameover' && hasActiveFx)) {
        rafId = requestAnimationFrame(loop);
        return;
      }

      const delay = st === 'title' ? 33 : 120;
      timerId = setTimeout(() => {
        if (!disposed) {
          rafId = requestAnimationFrame(loop);
        }
      }, delay);
    };

    const loop = (now: number) => {
      if (disposed) return;

      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      const currentScreen = screenStateRef.current;
      const activeConfig = configRef.current;
      const palette = THEMES[activeConfig.theme] || THEMES.botanical;

      if (traumaRef.current > 0) {
        traumaRef.current = Math.max(0, traumaRef.current - dt * 2.2);
      }
      particlesRef.current.update(dt);

      if (currentScreen === 'title') {
        let demo = demoSimRef.current;
        if (demo.status !== 'running') {
          demo = createShowcaseDemoState(activeConfig);
          demoSimRef.current = demo;
        }
        const demoConfig: GameConfig = {
          ...activeConfig,
          multiFruitCount: Math.max(3, activeConfig.multiFruitCount) as 1 | 3 | 5,
        };
        const demoWrapWalls = resolveEffectiveConfig(demoConfig).wrapWalls;
        const tickMs = 100;
        tickAccumulatorMsRef.current += dt * 1000;
        while (tickAccumulatorMsRef.current >= tickMs) {
          tickAccumulatorMsRef.current -= tickMs;
          const aiDir = computeDemoDirection(demo, demoWrapWalls);
          demo.inputQueue = [aiDir];
          stepSimulation(demo, demoConfig);
          if (demo.status !== 'running') {
            demo = createShowcaseDemoState(activeConfig);
            demoSimRef.current = demo;
            break;
          }
          if (demo.snake.length > 14) {
            demo.snake.pop();
            demo.prevSnake.pop();
          }
        }
        const alpha =
          demo.tickCount === 0
            ? 1
            : Math.min(1, tickAccumulatorMsRef.current / tickMs);
        const metrics = computeBoardMetrics(demo.cols, demo.rows, true);
        renderArena(
          ctx,
          width,
          height,
          demo,
          activeConfig,
          palette,
          metrics,
          alpha,
          now,
          true
        );
        scheduleNextFrame();
        return;
      }

      const sim = simRef.current;
      const metrics = computeBoardMetrics(sim.cols, sim.rows, false);

      if (currentScreen === 'playing') {
        if (hitstopSecRef.current > 0) {
          hitstopSecRef.current = Math.max(0, hitstopSecRef.current - dt);
        } else if (sim.status === 'running') {
          const dtMs = dt * 1000;
          advanceTimers(sim, dtMs);

          const tickIntervalMs = getEffectiveTickIntervalMs(sim, activeConfig);
          tickAccumulatorMsRef.current += dtMs;

          if (sim.isBoosting && sim.snake.length > 0 && Math.random() < 0.45) {
            const tail = sim.snake[sim.snake.length - 1];
            const tx = metrics.offsetX + (tail.x + 0.5) * metrics.cellSize;
            const ty = metrics.offsetY + (tail.y + 0.5) * metrics.cellSize;
            particlesRef.current.spawnBurst(
              tx,
              ty,
              palette.snakeBoostGlow,
              2,
              15,
              55,
              2,
              4
            );
          }

          while (
            tickAccumulatorMsRef.current >= tickIntervalMs &&
            sim.status === 'running'
          ) {
            tickAccumulatorMsRef.current -= tickIntervalMs;
            stepSimulation(sim, activeConfig);

            const ev = sim.lastEvent;
            if (ev.type !== 'none') {
              const pt = ev.point || sim.snake[0];
              const px = metrics.offsetX + (pt.x + 0.5) * metrics.cellSize;
              const py = metrics.offsetY + (pt.y + 0.5) * metrics.cellSize;

              if (ev.type === 'eat_apple') {
                soundEngine.playEatApple(sim.combo);
                particlesRef.current.spawnBurst(
                  px,
                  py,
                  palette.appleFill,
                  10,
                  40,
                  150,
                  2.5,
                  5.5
                );
                particlesRef.current.spawnFloatingText(
                  px,
                  py - 8,
                  `+${ev.pointsAwarded}${sim.combo > 1 ? ` (${sim.combo}x)` : ''}`,
                  palette.snakeScaleAccent
                );
              } else if (ev.type === 'eat_special') {
                soundEngine.playEatSpecial();
                hitstopSecRef.current = 0.04;
                traumaRef.current = 0.25;
                particlesRef.current.spawnBurst(
                  px,
                  py,
                  palette.goldenFill,
                  18,
                  60,
                  200,
                  3,
                  6.5
                );
                particlesRef.current.spawnFloatingText(
                  px,
                  py - 10,
                  `+${ev.pointsAwarded} BONUS!`,
                  palette.goldenFill
                );
              } else if (ev.type === 'portal_warp') {
                soundEngine.playPortalWarp();
                particlesRef.current.spawnBurst(
                  px,
                  py,
                  '#2DD4BF',
                  14,
                  50,
                  160,
                  2.5,
                  5
                );
              } else if (ev.type === 'stage_clear') {
                soundEngine.playStageClear();
                hitstopSecRef.current = 0.07;
                traumaRef.current = 0.35;
                particlesRef.current.spawnBurst(
                  px,
                  py,
                  palette.goldenFill,
                  28,
                  80,
                  240,
                  3.5,
                  7
                );
                endDelayTimerSecRef.current = 0.45;
              } else if (
                ev.type === 'wall_hit' ||
                ev.type === 'self_hit' ||
                ev.type === 'obstacle_hit' ||
                ev.type === 'poison_hit'
              ) {
                soundEngine.playCrash();
                hitstopSecRef.current = 0.07;
                traumaRef.current = 0.65;
                particlesRef.current.spawnBurst(
                  px,
                  py,
                  ev.type === 'poison_hit' ? '#C084FC' : palette.appleFill,
                  26,
                  70,
                  230,
                  3,
                  7
                );
                endDelayTimerSecRef.current = 0.48;
              }
            }
          }

          if (
            sim.status !== 'running' &&
            endDelayTimerSecRef.current === 0 &&
            !endReportedRef.current
          ) {
            soundEngine.playStageClear();
            endDelayTimerSecRef.current = 0.35;
          }

          const sig = getHudSignature(sim);
          if (sig !== lastHudSignature) {
            lastHudSignature = sig;
            onHudUpdateRef.current({ ...sim });
          }
        } else if (!endReportedRef.current) {
          endDelayTimerSecRef.current -= dt;
          if (endDelayTimerSecRef.current <= 0) {
            endReportedRef.current = true;
            onRunEndRef.current({ ...sim });
          }
        }
      }

      const tickIntervalMs = getEffectiveTickIntervalMs(sim, activeConfig);
      const alpha =
        sim.status === 'running'
          ? sim.tickCount === 0
            ? 1
            : Math.min(1, tickAccumulatorMsRef.current / tickIntervalMs)
          : 1;

      renderArena(
        ctx,
        width,
        height,
        sim,
        activeConfig,
        palette,
        metrics,
        alpha,
        now,
        false
      );

      scheduleNextFrame();
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      disposed = true;
      if (timerId) clearTimeout(timerId);
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateCanvasSize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlurOrVisibility);
      document.removeEventListener('visibilitychange', handleBlurOrVisibility);
      window.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  const renderArena = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    sim: SimulationState,
    activeConfig: GameConfig,
    palette: (typeof THEMES)['botanical'],
    metrics: {
      cellSize: number;
      boardW: number;
      boardH: number;
      offsetX: number;
      offsetY: number;
    },
    alpha: number,
    now: number,
    isTitleDemo: boolean
  ) => {
    const { cellSize, boardW, boardH, offsetX, offsetY } = metrics;

    ctx.save();
    ctx.fillStyle = palette.bgOuter;
    ctx.fillRect(0, 0, width, height);

    if (isTitleDemo) {
      ctx.translate(
        pointerNormRef.current.x * 6,
        pointerNormRef.current.y * 6
      );
    } else if (traumaRef.current > 0) {
      const shake = traumaRef.current * traumaRef.current * 12;
      ctx.translate(
        (Math.random() - 0.5) * 2 * shake,
        (Math.random() - 0.5) * 2 * shake
      );
    }

    // Board outer shadow & frame (avoid expensive full-board Gaussian shadowBlur every frame)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    ctx.roundRect(offsetX - 6, offsetY + 4, boardW + 12, boardH + 10, 14);
    ctx.fill();

    ctx.fillStyle = palette.boardBg;
    ctx.beginPath();
    ctx.roundRect(offsetX - 4, offsetY - 4, boardW + 8, boardH + 8, 12);
    ctx.fill();

    if (activeConfig.showGrid) {
      // Batched checkerboard grid: 1 background fill + 1 single path fill for alternating tiles
      ctx.fillStyle = palette.boardGridB;
      ctx.fillRect(offsetX, offsetY, boardW, boardH);

      ctx.fillStyle = palette.boardGridA;
      ctx.beginPath();
      for (let r = 0; r < sim.rows; r++) {
        for (let c = (r % 2); c < sim.cols; c += 2) {
          ctx.rect(
            offsetX + c * cellSize,
            offsetY + r * cellSize,
            cellSize,
            cellSize
          );
        }
      }
      ctx.fill();
    } else {
      // Seamless Realistic Arena Surface (No Grid View) - Fast Single-Batch Render
      ctx.fillStyle = palette.boardBg;
      ctx.fillRect(offsetX, offsetY, boardW, boardH);

      // Subtle inner border vignette for spatial depth without grid lines
      ctx.save();
      ctx.strokeStyle = palette.boardGridA;
      const borderW = Math.max(8, cellSize * 0.6);
      ctx.lineWidth = borderW;
      ctx.strokeRect(
        offsetX + borderW * 0.5,
        offsetY + borderW * 0.5,
        boardW - borderW,
        boardH - borderW
      );
      ctx.restore();

      // Single batched path for subtle natural surface grain
      ctx.save();
      ctx.fillStyle = palette.boardBorder;
      ctx.globalAlpha = 0.32;
      ctx.beginPath();
      const speckCount = 64;
      for (let i = 0; i < speckCount; i++) {
        const hx = ((i * 73856093) ^ 0x5bd1e995) >>> 0;
        const hy = ((i * 19349663) ^ 0x27d4eb2d) >>> 0;
        const sx = offsetX + 12 + (hx % Math.max(1, boardW - 24));
        const sy = offsetY + 12 + (hy % Math.max(1, boardH - 24));
        const sz = (i % 2) + 2;
        ctx.rect(sx, sy, sz, sz);
      }
      ctx.fill();
      ctx.restore();
    }

    // Perimeter Wall Indicator (Single Source of Truth from resolveEffectiveConfig)
    const isWrap = resolveEffectiveConfig(activeConfig).wrapWalls;

    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = isWrap ? palette.wallWrapBorder : palette.wallSolidBorder;
    if (isWrap) {
      ctx.setLineDash([8, 6]);
    }
    ctx.strokeRect(offsetX - 2, offsetY - 2, boardW + 4, boardH + 4);
    ctx.restore();

    // Render Portals
    for (const portal of sim.portals) {
      for (const pt of [portal.a, portal.b]) {
        const cx = offsetX + (pt.x + 0.5) * cellSize;
        const cy = offsetY + (pt.y + 0.5) * cellSize;
        const r = cellSize * 0.44;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((now / 450) % (Math.PI * 2));
        ctx.strokeStyle = portal.color;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(45, 212, 191, 0.22)';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.65, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Render Obstacles
    for (const obs of sim.obstacles) {
      const ox = offsetX + obs.x * cellSize;
      const oy = offsetY + obs.y * cellSize;
      const pad = 1.5;

      ctx.fillStyle = palette.obstacleFill;
      ctx.beginPath();
      ctx.roundRect(
        ox + pad,
        oy + pad,
        cellSize - pad * 2,
        cellSize - pad * 2,
        4
      );
      ctx.fill();

      ctx.fillStyle = palette.obstacleTop;
      ctx.beginPath();
      ctx.roundRect(
        ox + pad + 2,
        oy + pad + 2,
        cellSize - (pad + 2) * 2,
        cellSize - (pad + 2) * 2 - 2,
        3
      );
      ctx.fill();

      ctx.strokeStyle = palette.obstacleStroke;
      ctx.lineWidth = 1;
      ctx.strokeRect(
        ox + pad + 0.5,
        oy + pad + 0.5,
        cellSize - pad * 2 - 1,
        cellSize - pad * 2 - 1
      );
    }

    // Render Fruits
    for (const fruit of sim.fruits) {
      renderFruit(ctx, fruit, offsetX, offsetY, cellSize, palette, now);
    }

    // Render Smooth Uniform Quadratic B-Spline & 3D Textured Serpent
    renderSerpent(
      ctx,
      sim,
      offsetX,
      offsetY,
      cellSize,
      palette,
      alpha,
      now,
      hitstopSecRef.current > 0
    );

    // Render Particles & Floating Score Popups
    particlesRef.current.render(ctx);

    ctx.restore();
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-full h-full overflow-hidden select-none"
      data-testid="game-canvas-container"
    >
      <canvas
        ref={canvasRef}
        data-testid="snake-canvas"
        aria-label="Serpentis Game Arena Canvas"
        className="block w-full h-full touch-none"
      />
    </div>
  );
};

function renderFruit(
  ctx: CanvasRenderingContext2D,
  fruit: FruitItem,
  offsetX: number,
  offsetY: number,
  cellSize: number,
  palette: (typeof THEMES)['botanical'],
  now: number
) {
  const cx = offsetX + (fruit.x + 0.5) * cellSize;
  const cy = offsetY + (fruit.y + 0.5) * cellSize;
  const pulse = 1 + Math.sin(now / 180) * 0.07;
  const radius = cellSize * 0.38 * pulse;

  ctx.save();
  ctx.translate(cx, cy);

  if (fruit.type === 'poison') {
    // Distinct Toxic Skull & Crossbones Hazard (Never looks like a fruit)
    const r = cellSize * 0.41 * pulse;

    // 1. Pulsing Toxic Violet Miasma Aura
    ctx.fillStyle = 'rgba(168, 85, 247, 0.24)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.42, 0, Math.PI * 2);
    ctx.fill();

    // 2. Crossed Bones behind Skull
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = Math.max(2, r * 0.28);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.92, -r * 0.78);
    ctx.lineTo(r * 0.92, r * 0.78);
    ctx.moveTo(r * 0.92, -r * 0.78);
    ctx.lineTo(-r * 0.92, r * 0.78);
    ctx.stroke();

    // 3. Drop Shadow under Skull
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.arc(0, -r * 0.1 + 1.5, r * 0.86, 0, Math.PI * 2);
    ctx.fill();

    // 4. Sculpted Bone Cranium + Narrower Jawbone
    ctx.fillStyle = '#F1F5F9';
    ctx.strokeStyle = '#7E22CE';
    ctx.lineWidth = Math.max(1.2, r * 0.12);
    ctx.beginPath();
    ctx.arc(0, -r * 0.14, r * 0.82, Math.PI * 0.82, Math.PI * 0.18, false);
    ctx.lineTo(r * 0.48, r * 0.82);
    ctx.lineTo(-r * 0.48, r * 0.82);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 5. Hollow Eye Sockets with Glowing Toxic Pupils
    const eyeR = r * 0.26;
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(side * r * 0.34, -r * 0.12, eyeR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#D946EF';
      ctx.beginPath();
      ctx.arc(side * r * 0.34, -r * 0.12, eyeR * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Nasal Cavity Triangle
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.moveTo(0, r * 0.08);
    ctx.lineTo(-r * 0.14, r * 0.34);
    ctx.lineTo(r * 0.14, r * 0.34);
    ctx.closePath();
    ctx.fill();

    // 7. Jaw Teeth Notches
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = Math.max(1, r * 0.1);
    ctx.beginPath();
    for (const tx of [-0.22, 0, 0.22]) {
      ctx.moveTo(r * tx, r * 0.52);
      ctx.lineTo(r * tx, r * 0.8);
    }
    ctx.stroke();

    ctx.restore();
    return;
  }

  let fill = palette.appleFill;
  if (fruit.type === 'golden') fill = palette.goldenFill;
  else if (fruit.type === 'chrono') fill = palette.chronoFill;
  else if (fruit.type === 'phase') fill = palette.phaseFill;
  else if (fruit.type === 'magnet') fill = palette.magnetFill;

  if (fruit.type !== 'apple') {
    ctx.fillStyle = fill;
    ctx.globalAlpha = 0.22;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.arc(0, 1.5, radius + 1.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = fill;
  ctx.beginPath();
  if (fruit.type === 'phase') {
    ctx.moveTo(0, -radius * 1.15);
    ctx.lineTo(radius * 1.1, 0);
    ctx.lineTo(0, radius * 1.15);
    ctx.lineTo(-radius * 1.1, 0);
    ctx.closePath();
  } else {
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
  }
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.beginPath();
  ctx.arc(-radius * 0.3, -radius * 0.3, radius * 0.26, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#34D399';
  ctx.beginPath();
  ctx.ellipse(2, -radius * 0.95, 3.5, 1.8, -0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Evaluates a Uniform Quadratic B-Spline over the snake's occupied cell corridor
 * [G_0, G_1, ..., G_M] for continuous parameter s in [sStart, sEnd].
 * Because each cell G_k uses fixed cell-edge midpoints M_{k-1,k} and M_{k,k+1} with G_k as control point,
 * every 90-degree turn is ALWAYS a wide, silky-smooth quarter-circle arc at all alpha in [0, 1].
 */
function renderSerpent(
  ctx: CanvasRenderingContext2D,
  sim: SimulationState,
  offsetX: number,
  offsetY: number,
  cellSize: number,
  palette: (typeof THEMES)['botanical'],
  alpha: number,
  now: number,
  isHitFlash: boolean
) {
  const len = sim.snake.length;
  if (len === 0) return;

  const hasPhase = sim.activeEffects.some((e) => e.type === 'phase');

  // Build the full grid cell track G = [S_0, S_1, ..., S_{L-1}, P_{L-1}]
  const track: Point[] = sim.snake.map((p) => ({ x: p.x, y: p.y }));
  let tailRetracts = false;
  if (sim.prevSnake.length >= len) {
    const prevTail = sim.prevSnake[len - 1];
    const currTail = sim.snake[len - 1];
    const dTail = Math.abs(currTail.x - prevTail.x) + Math.abs(currTail.y - prevTail.y);
    if (dTail === 1) {
      track.push({ x: prevTail.x, y: prevTail.y });
      tailRetracts = true;
    }
  }

  // Partition track into contiguous cell sequences (splitting if wrapped across board or warped through a portal)
  interface SubTrack {
    cells: Point[];
    globalStartIdx: number;
  }

  const subTracks: SubTrack[] = [];
  let currentCells: Point[] = [track[0]];
  let currentStartIdx = 0;

  for (let i = 1; i < track.length; i++) {
    const prev = track[i - 1];
    const curr = track[i];
    const dist = Math.abs(curr.x - prev.x) + Math.abs(curr.y - prev.y);
    if (dist === 1) {
      currentCells.push(curr);
    } else {
      subTracks.push({ cells: currentCells, globalStartIdx: currentStartIdx });
      currentCells = [curr];
      currentStartIdx = i;
    }
  }
  if (currentCells.length > 0) {
    subTracks.push({ cells: currentCells, globalStartIdx: currentStartIdx });
  }

  // Continuous global parameter range along track:
  // Head is at sHead = 1 - alpha (gliding from G_1 at alpha=0 to G_0 at alpha=1)
  // Tail is at sTail = (len - 1) + (tailRetracts ? 1 - alpha : 0)
  const sHead = Math.max(0, 1 - alpha);
  const sTail = len - 1 + (tailRetracts ? 1 - alpha : 0);
  const totalSpan = Math.max(0.5, sTail - sHead);

  // Evaluate position & tangent on a contiguous cell sequence for local parameter u in [0, cells.length - 1]
  // Each integer k corresponds to cell center cells[k]; each [k - 0.5, k + 0.5] is the Quadratic Bezier through cells[k]!
  const evalSubTrack = (
    cells: Point[],
    localS: number
  ): { gx: number; gy: number; tx: number; ty: number } => {
    const m = cells.length;
    if (m === 1) {
      return { gx: cells[0].x, gy: cells[0].y, tx: 1, ty: 0 };
    }
    const clampedS = Math.max(0, Math.min(m - 1, localS));

    // Find nearest integer cell index k = Math.round(clampedS)
    const k = Math.max(0, Math.min(m - 1, Math.round(clampedS)));

    if (k === 0) {
      // Between cells[0] (at s=0) and midpoint M_{0,1} (at s=0.5)
      const dx = cells[1].x - cells[0].x;
      const dy = cells[1].y - cells[0].y;
      return {
        gx: cells[0].x + dx * clampedS,
        gy: cells[0].y + dy * clampedS,
        tx: -dx,
        ty: -dy,
      };
    }

    if (k === m - 1) {
      // Between midpoint M_{m-2, m-1} (at s = m - 1.5) and cells[m-1] (at s = m - 1)
      const dx = cells[m - 1].x - cells[m - 2].x;
      const dy = cells[m - 1].y - cells[m - 2].y;
      const offsetFromPrev = clampedS - (m - 2);
      return {
        gx: cells[m - 2].x + dx * offsetFromPrev,
        gy: cells[m - 2].y + dy * offsetFromPrev,
        tx: -dx,
        ty: -dy,
      };
    }

    // Interior cell k (1 <= k <= m - 2):
    // Local Bezier parameter t in [0, 1] maps s in [k - 0.5, k + 0.5]
    // Entry midpoint A = 0.5 * (cells[k-1] + cells[k])
    // Control point C = cells[k]
    // Exit midpoint B = 0.5 * (cells[k] + cells[k+1])
    const t = Math.max(0, Math.min(1, clampedS - (k - 0.5)));
    const invT = 1 - t;

    const ax = 0.5 * (cells[k - 1].x + cells[k].x);
    const ay = 0.5 * (cells[k - 1].y + cells[k].y);
    const cx = cells[k].x;
    const cy = cells[k].y;
    const bx = 0.5 * (cells[k].x + cells[k + 1].x);
    const by = 0.5 * (cells[k].y + cells[k + 1].y);

    const gx = invT * invT * ax + 2 * invT * t * cx + t * t * bx;
    const gy = invT * invT * ay + 2 * invT * t * cy + t * t * by;

    let dxdt = 2 * invT * (cx - ax) + 2 * t * (bx - cx);
    let dydt = 2 * invT * (cy - ay) + 2 * t * (by - cy);
    const mag = Math.hypot(dxdt, dydt);
    if (mag > 1e-4) {
      dxdt /= mag;
      dydt /= mag;
    } else {
      dxdt = 1;
      dydt = 0;
    }

    return {
      gx,
      gy,
      tx: -dxdt,
      ty: -dydt,
    };
  };

  const allChainSamples: SpineSample[][] = [];
  const STEP_S = 0.24; // ~4.2 samples per cell
  let leadHeadOverride: { x: number; y: number; angle: number } | null = null;

  for (let subIdx = 0; subIdx < subTracks.length; subIdx++) {
    const sub = subTracks[subIdx];

    // Special case: head just warped through a portal or wrapped across a board edge,
    // so subTracks[0] has only 1 cell. Synthesize a smooth emergence along sim.direction
    // so the sculpted head never stays frozen on the old edge for a tick.
    if (subIdx === 0 && sub.cells.length === 1) {
      const dirDelta = getDirectionDelta(sim.direction);
      const gx = sub.cells[0].x - dirDelta.x * (1 - alpha) * 0.5;
      const gy = sub.cells[0].y - dirDelta.y * (1 - alpha) * 0.5;
      const hx = offsetX + (gx + 0.5) * cellSize;
      const hy = offsetY + (gy + 0.5) * cellSize;
      leadHeadOverride = {
        x: hx,
        y: hy,
        angle: Math.atan2(dirDelta.y, dirDelta.x),
      };
      const neckRadius = cellSize * 0.39;
      const entryX = offsetX + (sub.cells[0].x - dirDelta.x * 0.5 + 0.5) * cellSize;
      const entryY = offsetY + (sub.cells[0].y - dirDelta.y * 0.5 + 0.5) * cellSize;
      const nx = -dirDelta.y;
      const ny = dirDelta.x;
      if (Math.hypot(hx - entryX, hy - entryY) > 1) {
        allChainSamples.push([
          {
            x: hx,
            y: hy,
            tx: dirDelta.x,
            ty: dirDelta.y,
            nx,
            ny,
            radius: neckRadius,
            distFromHeadCells: 0,
            u: 0,
          },
          {
            x: entryX,
            y: entryY,
            tx: dirDelta.x,
            ty: dirDelta.y,
            nx,
            ny,
            radius: neckRadius * 0.96,
            distFromHeadCells: 0.5,
            u: Math.min(1, 0.5 / totalSpan),
          },
        ]);
      }
      continue;
    }

    const subMinS = sub.globalStartIdx;
    const subMaxS = sub.globalStartIdx + sub.cells.length - 1;

    const activeStartS = Math.max(sHead, subMinS);
    const activeEndS = Math.min(sTail, subMaxS);
    if (activeEndS <= activeStartS + 0.02) continue;

    const samples: SpineSample[] = [];
    const numSteps = Math.max(4, Math.ceil((activeEndS - activeStartS) / STEP_S));

    for (let i = 0; i <= numSteps; i++) {
      const globalS = activeStartS + ((activeEndS - activeStartS) * i) / numSteps;
      const localS = globalS - subMinS;
      const { gx, gy, tx, ty } = evalSubTrack(sub.cells, localS);

      const nx = -ty;
      const ny = tx;

      const distFromHead = Math.max(0, globalS - sHead);
      const u = Math.min(1, distFromHead / totalSpan);

      // Smooth organic muscular taper from neck to sleek pointed tail
      const neckPinch = u < 0.07 ? 0.9 + 0.1 * (u / 0.07) : 1.0;
      const tailTaper = Math.pow(1 - u, 0.65);
      const radius = cellSize * Math.max(0.08, 0.43 * neckPinch * tailTaper);

      // Subtle living slither undulation (zero at head and tail tip)
      const slitherEnvelope = Math.sin(u * Math.PI) * (1 - u * 0.4);
      const slitherAmp = cellSize * 0.036 * slitherEnvelope;
      const slitherPhase = distFromHead * 1.6 - now * 0.008;
      const slitherOffset = Math.sin(slitherPhase) * slitherAmp;

      samples.push({
        x: offsetX + (gx + 0.5) * cellSize + nx * slitherOffset,
        y: offsetY + (gy + 0.5) * cellSize + ny * slitherOffset,
        tx,
        ty,
        nx,
        ny,
        radius,
        distFromHeadCells: distFromHead,
        u,
      });
    }

    if (samples.length >= 2) {
      allChainSamples.push(samples);
    }
  }

  ctx.save();
  if (hasPhase) {
    ctx.globalAlpha = 0.7;
  }

  for (const samples of allChainSamples) {
    // Layer A: Soft Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
    drawSmoothBodyTube(ctx, samples, 1.06, 0, 3.0);

    // Layer B: Dark Outer Silhouette / Underbelly Border
    ctx.fillStyle = 'rgba(4, 10, 8, 0.85)';
    drawSmoothBodyTube(ctx, samples, 1.04, 0, 0);

    // Layer C: Deep Cylindrical Flank Base (snakeBodyEnd)
    ctx.fillStyle = isHitFlash ? '#FFFFFF' : palette.snakeBodyEnd;
    drawSmoothBodyTube(ctx, samples, 0.94, 0, 0);

    // Layer D: Illuminated Upper Dorsal Cylinder (snakeBodyStart)
    if (!isHitFlash) {
      ctx.fillStyle = palette.snakeBodyStart;
      drawSmoothBodyTube(ctx, samples, 0.66, 0, -0.8);

      // Layer E: Batched Woven Scale Scutes & Dorsal Diamond Pattern
      renderSplineScales(ctx, samples, cellSize, palette, hasPhase);
    }
  }

  // Render Sculpted Anatomical Serpent Head at the lead sample (or portal/wrap emergence point)
  const leadSample = allChainSamples[0]?.[0];
  const headPose = leadHeadOverride
    ? leadHeadOverride
    : leadSample
    ? {
        x: leadSample.x,
        y: leadSample.y,
        angle: Math.atan2(leadSample.ty, leadSample.tx),
      }
    : null;

  if (headPose) {
    renderSculptedHead(
      ctx,
      headPose.x,
      headPose.y,
      headPose.angle,
      cellSize,
      palette,
      sim,
      offsetX,
      offsetY,
      now,
      isHitFlash
    );
  }

  ctx.restore();
}

/**
 * Renders a smooth, tapered tubular body along the spine samples without inner-corner polygon self-intersection.
 */
function drawSmoothBodyTube(
  ctx: CanvasRenderingContext2D,
  samples: SpineSample[],
  scaleFactor: number,
  shiftX: number,
  shiftY: number
) {
  const n = samples.length;
  if (n < 2) return;

  ctx.beginPath();

  // Left flank (head -> tail)
  for (let i = 0; i < n; i++) {
    const s = samples[i];
    const r = s.radius * scaleFactor;
    const lx = s.x + shiftX + s.nx * r;
    const ly = s.y + shiftY + s.ny * r;
    if (i === 0) {
      ctx.moveTo(lx, ly);
    } else {
      ctx.lineTo(lx, ly);
    }
  }

  // Tail tip cap
  const tail = samples[n - 1];
  const tailR = tail.radius * scaleFactor;
  const tailAngle = Math.atan2(tail.ny, tail.nx);
  ctx.arc(
    tail.x + shiftX,
    tail.y + shiftY,
    tailR,
    tailAngle,
    tailAngle + Math.PI,
    false
  );

  // Right flank (tail -> head)
  for (let i = n - 1; i >= 0; i--) {
    const s = samples[i];
    const r = s.radius * scaleFactor;
    const rx = s.x + shiftX - s.nx * r;
    const ry = s.y + shiftY - s.ny * r;
    ctx.lineTo(rx, ry);
  }

  // Head/neck cap
  const head = samples[0];
  const headR = head.radius * scaleFactor;
  const headAngle = Math.atan2(-head.ny, -head.nx);
  ctx.arc(
    head.x + shiftX,
    head.y + shiftY,
    headR,
    headAngle,
    headAngle + Math.PI,
    false
  );

  ctx.closePath();
  ctx.fill();
}

/**
 * Batches all overlapping reptile scale scutes and dorsal diamond markings into
 * 3 single Canvas2D path calls using the precomputed (tx, ty, nx, ny) basis vectors.
 */
function renderSplineScales(
  ctx: CanvasRenderingContext2D,
  samples: SpineSample[],
  cellSize: number,
  palette: (typeof THEMES)['botanical'],
  hasPhase: boolean
) {
  ctx.save();

  // 1. Single batched path for all overlapping curved scale scute arches
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.lineWidth = Math.max(1.1, cellSize * 0.045);
  ctx.beginPath();

  for (let i = 1; i < samples.length - 1; i += 2) {
    const s = samples[i];
    if (s.radius < 3.5) continue;

    const w = s.radius * 0.65;
    const archBack = s.radius * 0.55;
    const lx = s.x + s.nx * w;
    const ly = s.y + s.ny * w;
    const rx = s.x - s.nx * w;
    const ry = s.y - s.ny * w;
    const cx = s.x - s.tx * archBack;
    const cy = s.y - s.ty * archBack;

    ctx.moveTo(lx, ly);
    ctx.quadraticCurveTo(cx, cy, rx, ry);
  }
  ctx.stroke();

  // 2. Single batched path for all dorsal diamond markings
  ctx.fillStyle = palette.snakeScaleAccent;
  ctx.globalAlpha = hasPhase ? 0.25 : 0.38;
  ctx.beginPath();

  for (let i = 2; i < samples.length - 2; i += 4) {
    const s = samples[i];
    if (s.radius < 4) continue;

    const dLen = s.radius * 0.62;
    const dWid = s.radius * 0.42;

    ctx.moveTo(s.x + s.tx * dLen, s.y + s.ty * dLen);
    ctx.lineTo(s.x + s.nx * dWid, s.y + s.ny * dWid);
    ctx.lineTo(s.x - s.tx * dLen * 1.1, s.y - s.ty * dLen * 1.1);
    ctx.lineTo(s.x - s.nx * dWid, s.y - s.ny * dWid);
    ctx.closePath();
  }
  ctx.fill();

  // 3. Single batched path for dorsal specular sheen dots
  ctx.fillStyle = '#FFFFFF';
  ctx.globalAlpha = hasPhase ? 0.16 : 0.24;
  ctx.beginPath();

  for (let i = 2; i < samples.length - 2; i += 4) {
    const s = samples[i];
    if (s.radius < 4) continue;
    const dotR = s.radius * 0.16;
    const dx = s.x + s.tx * (s.radius * 0.15);
    const dy = s.y + s.ty * (s.radius * 0.15);
    ctx.moveTo(dx + dotR, dy);
    ctx.arc(dx, dy, dotR, 0, Math.PI * 2);
  }
  ctx.fill();

  ctx.restore();
}

/**
 * Draws a sculpted, anatomical serpent head with jaw plates, tapered snout,
 * brow ridges, nostrils, fruit-tracking slitted eyes, and a flicking forked tongue.
 */
function renderSculptedHead(
  ctx: CanvasRenderingContext2D,
  hx: number,
  hy: number,
  angle: number,
  cellSize: number,
  palette: (typeof THEMES)['botanical'],
  sim: SimulationState,
  offsetX: number,
  offsetY: number,
  now: number,
  isHitFlash: boolean
) {
  const headR = cellSize * 0.5;

  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(angle);

  // 1. Flicking Forked Tongue when near closest edible fruit or periodically
  const headCell = sim.snake[0];
  let nearestFruit: FruitItem | undefined;
  let fruitDist = 99;
  for (const f of sim.fruits) {
    if (f.type === 'poison') continue;
    const d = Math.hypot(f.x - headCell.x, f.y - headCell.y);
    if (d < fruitDist) {
      fruitDist = d;
      nearestFruit = f;
    }
  }
  if (fruitDist < 4.8 || Math.sin(now / 150) > 0.65) {
    const tongueExtend = headR * (0.58 + Math.sin(now / 55) * 0.16);
    const tipX = headR * 1.02 + tongueExtend;
    const waveY = Math.sin(now / 40) * 1.4;

    ctx.strokeStyle = '#F43F5E';
    ctx.lineWidth = Math.max(1.6, cellSize * 0.065);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(headR * 0.85, 0);
    ctx.lineTo(tipX, waveY);
    ctx.lineTo(tipX + headR * 0.28, waveY - headR * 0.22);
    ctx.moveTo(tipX, waveY);
    ctx.lineTo(tipX + headR * 0.28, waveY + headR * 0.22);
    ctx.stroke();
  }

  const traceViperHeadPath = (scale: number, shiftY = 0) => {
    const r = headR * scale;
    ctx.beginPath();
    ctx.moveTo(-r * 0.82, shiftY);
    ctx.bezierCurveTo(
      -r * 0.82,
      -r * 0.78 + shiftY,
      -r * 0.25,
      -r * 0.98 + shiftY,
      r * 0.15,
      -r * 0.78 + shiftY
    );
    ctx.bezierCurveTo(
      r * 0.65,
      -r * 0.58 + shiftY,
      r * 1.08,
      -r * 0.32 + shiftY,
      r * 1.08,
      shiftY
    );
    ctx.bezierCurveTo(
      r * 1.08,
      r * 0.32 + shiftY,
      r * 0.65,
      r * 0.58 + shiftY,
      r * 0.15,
      r * 0.78 + shiftY
    );
    ctx.bezierCurveTo(
      -r * 0.25,
      r * 0.98 + shiftY,
      -r * 0.82,
      r * 0.78 + shiftY,
      -r * 0.82,
      shiftY
    );
    ctx.closePath();
  };

  // 2. Head Drop Shadow & Outer Silhouette
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  traceViperHeadPath(1.06, 2.0);
  ctx.fill();

  ctx.fillStyle = 'rgba(4, 10, 8, 0.88)';
  traceViperHeadPath(1.04, 0);
  ctx.fill();

  // 3. Main Sculpted Skull Fill
  ctx.fillStyle = isHitFlash ? '#FFFFFF' : palette.snakeHead;
  traceViperHeadPath(0.96, 0);
  ctx.fill();

  if (!isHitFlash) {
    // 4. Dorsal Crown Plate Shield & Specular Highlight
    ctx.fillStyle = palette.snakeScaleAccent;
    ctx.globalAlpha = 0.32;
    ctx.beginPath();
    ctx.moveTo(headR * 0.62, 0);
    ctx.lineTo(headR * 0.05, -headR * 0.38);
    ctx.lineTo(-headR * 0.55, 0);
    ctx.lineTo(headR * 0.05, headR * 0.38);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // 5. Snout Nostrils
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(headR * 0.78, side * headR * 0.2, Math.max(1, cellSize * 0.035), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 6. Gleaming Eyes with Fruit-Tracking Reptile Pupils
  const eyeX = headR * 0.22;
  const eyeY = headR * 0.46;
  const eyeR = Math.max(2.4, cellSize * 0.125);

  let lookX = 0.8;
  let lookY = 0;
  if (nearestFruit) {
    const fx = offsetX + (nearestFruit.x + 0.5) * cellSize;
    const fy = offsetY + (nearestFruit.y + 0.5) * cellSize;
    const worldAngleToFruit = Math.atan2(fy - hy, fx - hx);
    const relAngle = worldAngleToFruit - angle;
    lookX = Math.cos(relAngle) * eyeR * 0.25;
    lookY = Math.sin(relAngle) * eyeR * 0.25;
  }

  for (const side of [-1, 1]) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(eyeX, side * eyeY, eyeR * 1.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FEF9C3';
    ctx.beginPath();
    ctx.arc(eyeX, side * eyeY, eyeR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = palette.snakeEye;
    ctx.beginPath();
    ctx.ellipse(
      eyeX + lookX,
      side * eyeY + lookY,
      eyeR * 0.38,
      eyeR * 0.78,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(
      eyeX - eyeR * 0.25,
      side * eyeY - eyeR * 0.25,
      eyeR * 0.26,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  ctx.restore();
}
