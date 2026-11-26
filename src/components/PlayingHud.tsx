import React from 'react';
import { CAMPAIGN_STAGES } from '../game/rules';
import { THEMES } from '../game/themes';
import {
  AppScreenState,
  Direction,
  GameConfig,
  SimulationState,
} from '../game/types';

interface PlayingHudProps {
  screenState: AppScreenState;
  sim: SimulationState;
  config: GameConfig;
  bestScore: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onRestart: () => void;
  onSteer: (dir: Direction) => void;
  onBoostChange: (boosting: boolean) => void;
}

export const PlayingHud: React.FC<PlayingHudProps> = ({
  screenState,
  sim,
  config,
  bestScore,
  isMuted,
  onToggleMute,
  onPause,
  onRestart,
  onSteer,
  onBoostChange,
}) => {
  const palette = THEMES[config.theme] || THEMES.botanical;
  const currentBest = Math.max(bestScore, sim.score);
  const comboPercent = Math.round(
    (sim.comboTimerMs / Math.max(1, sim.maxComboTimerMs)) * 100
  );

  const stageDef =
    config.mode === 'campaign'
      ? CAMPAIGN_STAGES.find((s) => s.stage === config.campaignStage)
      : null;

  const isInteractive = screenState === 'playing';

  return (
    <div className="fixed inset-0 pointer-events-none z-20 flex flex-col justify-between p-2.5 sm:p-4 overflow-hidden">
      {/* Top Area: Unified Perimeter Dock + Compact Mobile Status Row */}
      <div className="w-full max-w-6xl mx-auto flex flex-col gap-1">
        <div
          className="w-full rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4 shadow-2xl"
          style={{
            backgroundColor: palette.hudSurface,
            border: `1px solid ${palette.hudBorder}`,
          }}
        >
          {/* Left Cluster: Score, Best, Combo */}
          <div className="flex items-center gap-3 sm:gap-7 min-w-0">
            <div>
              <div className="text-[9px] sm:text-[10px] font-bold tracking-widest uppercase text-emerald-400/80">
                SCORE
              </div>
              <div
                data-testid="hud-score"
                className="text-xl sm:text-3xl font-extrabold font-mono-tabular leading-none tracking-tight hud-stroke text-white"
              >
                {Math.round(sim.score)}
              </div>
            </div>

            <div>
              <div className="text-[9px] sm:text-[10px] font-bold tracking-widest uppercase text-stone-400">
                BEST
              </div>
              <div
                data-testid="hud-best"
                className="text-base sm:text-2xl font-bold font-mono-tabular leading-none text-stone-200"
              >
                {Math.round(currentBest)}
              </div>
            </div>

            {/* Combo Streak Indicator */}
            <div className="flex flex-col justify-center min-w-[56px] sm:min-w-[76px]">
              <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-bold tracking-wider uppercase gap-1">
                <span className="text-amber-400">COMBO</span>
                <span className="font-mono-tabular text-amber-300">
                  {sim.combo}x
                </span>
              </div>
              <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden mt-1 border border-white/10">
                <div
                  className="h-full bg-amber-400 origin-left"
                  style={{
                    transform: `scaleX(${
                      sim.combo > 1 ? comboPercent / 100 : 0
                    })`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Center Cluster (Desktop): Mode Goal / Harvest / Time Blitz Clock & Boost Stamina */}
          <div className="hidden md:flex items-center gap-6">
            {config.mode === 'campaign' && sim.targetApples !== null ? (
              <div className="flex items-center gap-2.5">
                <AppleSvgIcon color={palette.appleFill} />
                <div>
                  <div className="text-[10px] font-bold tracking-widest uppercase text-stone-400">
                    STAGE {config.campaignStage} · {stageDef?.name}
                  </div>
                  <div className="text-lg font-bold font-mono-tabular leading-none text-white">
                    {sim.applesEaten} / {sim.targetApples}
                  </div>
                </div>
              </div>
            ) : config.mode === 'time_blitz' &&
              sim.remainingTimeMs !== null ? (
              <div>
                <div className="text-[10px] font-bold tracking-widest uppercase text-amber-400">
                  TIME REMAINING
                </div>
                <div className="text-2xl font-extrabold font-mono-tabular leading-none text-amber-300">
                  {Math.ceil(sim.remainingTimeMs / 1000)}s
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <AppleSvgIcon color={palette.appleFill} />
                <div>
                  <div className="text-[10px] font-bold tracking-widest uppercase text-stone-400">
                    HARVEST · LENGTH
                  </div>
                  <div className="text-lg font-bold font-mono-tabular leading-none text-white">
                    {sim.applesEaten} · {sim.snake.length} segs
                  </div>
                </div>
              </div>
            )}

            {/* Boost Stamina Meter */}
            <div className="w-32">
              <div className="flex items-center justify-between text-[10px] font-bold tracking-wider uppercase text-emerald-300">
                <span>BOOST [SPACE]</span>
                <span className="font-mono-tabular">
                  {Math.round(sim.stamina)}%
                </span>
              </div>
              <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden mt-1 border border-emerald-500/30">
                <div
                  className="h-full bg-emerald-400 origin-left"
                  style={{
                    transform: `scaleX(${Math.max(
                      0,
                      Math.min(1, sim.stamina / 100)
                    )})`,
                  }}
                />
              </div>
            </div>

            {/* Active Power-Up Slots */}
            {sim.activeEffects.length > 0 && (
              <div className="flex items-center gap-2">
                {sim.activeEffects.map((eff) => (
                  <div
                    key={eff.type}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/50 border border-white/15"
                  >
                    <PowerUpSvgIcon type={eff.type} />
                    <span className="text-xs font-bold font-mono-tabular text-white">
                      {(eff.remainingMs / 1000).toFixed(1)}s
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Cluster: Utility Icon Buttons (Mute [M], Restart [R], Pause [P]) */}
          <div
            className={`flex items-center gap-1.5 sm:gap-2 shrink-0 ${
              isInteractive ? 'pointer-events-auto' : 'pointer-events-none opacity-50'
            }`}
          >
            <button
              type="button"
              tabIndex={-1}
              disabled={!isInteractive}
              aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/15 border border-white/10 text-stone-200 transition-colors cursor-pointer disabled:cursor-default"
              title="Mute / Unmute [M]"
            >
              {isMuted ? (
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              )}
            </button>

            <button
              type="button"
              tabIndex={-1}
              disabled={!isInteractive}
              aria-label="Restart Run"
              onClick={(e) => {
                e.currentTarget.blur();
                onRestart();
              }}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/15 border border-white/10 text-stone-200 transition-colors cursor-pointer disabled:cursor-default"
              title="Restart Run [R]"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4 sm:w-5 sm:h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>

            <button
              type="button"
              tabIndex={-1}
              disabled={!isInteractive}
              aria-label="Pause Game"
              onClick={(e) => {
                e.currentTarget.blur();
                onPause();
              }}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/30 text-emerald-200 transition-colors cursor-pointer disabled:cursor-default"
              title="Pause Game [P / Esc]"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4 sm:w-5 sm:h-5"
                fill="currentColor"
              >
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            </button>
          </div>
        </div>

        {/* Compact Mobile Sub-Status Strip (Visible only on mobile <768px) */}
        <div
          className="flex md:hidden items-center justify-between px-3 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase text-stone-200"
          style={{
            backgroundColor: palette.hudSurface,
            border: `1px solid ${palette.hudBorder}`,
          }}
        >
          <div className="flex items-center gap-2">
            {config.mode === 'campaign' && sim.targetApples !== null ? (
              <span className="font-mono-tabular text-emerald-300">
                St.{config.campaignStage}: {sim.applesEaten}/{sim.targetApples}
              </span>
            ) : config.mode === 'time_blitz' &&
              sim.remainingTimeMs !== null ? (
              <span className="font-mono-tabular text-amber-300">
                Time: {Math.ceil(sim.remainingTimeMs / 1000)}s
              </span>
            ) : (
              <span className="font-mono-tabular text-stone-200">
                Fruits: {sim.applesEaten} · Len: {sim.snake.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {sim.activeEffects.map((eff) => (
              <span
                key={eff.type}
                className="font-mono-tabular text-amber-300"
              >
                {eff.type.slice(0, 3)} {(eff.remainingMs / 1000).toFixed(0)}s
              </span>
            ))}
            <span className="font-mono-tabular text-emerald-300">
              Boost {Math.round(sim.stamina)}%
            </span>
          </div>
        </div>
      </div>

      {/* Touch / Mobile On-Screen Controls (Visible only on small screens when actively playing) */}
      {isInteractive && (
        <div className="md:hidden flex items-end justify-between w-full max-w-md mx-auto pb-0.5 pointer-events-auto touch-none">
          <div className="grid grid-cols-3 gap-1 w-32 h-28 touch-none">
            <div />
            <button
              type="button"
              aria-label="Steer Up"
              onPointerDown={(e) => {
                e.preventDefault();
                onSteer('UP');
              }}
              className="rounded-lg bg-stone-900/90 border border-white/15 flex items-center justify-center active:bg-emerald-600 text-white text-sm touch-none"
            >
              ▲
            </button>
            <div />
            <button
              type="button"
              aria-label="Steer Left"
              onPointerDown={(e) => {
                e.preventDefault();
                onSteer('LEFT');
              }}
              className="rounded-lg bg-stone-900/90 border border-white/15 flex items-center justify-center active:bg-emerald-600 text-white text-sm touch-none"
            >
              ◀
            </button>
            <div />
            <button
              type="button"
              aria-label="Steer Right"
              onPointerDown={(e) => {
                e.preventDefault();
                onSteer('RIGHT');
              }}
              className="rounded-lg bg-stone-900/90 border border-white/15 flex items-center justify-center active:bg-emerald-600 text-white text-sm touch-none"
            >
              ▶
            </button>
            <div />
            <button
              type="button"
              aria-label="Steer Down"
              onPointerDown={(e) => {
                e.preventDefault();
                onSteer('DOWN');
              }}
              className="rounded-lg bg-stone-900/90 border border-white/15 flex items-center justify-center active:bg-emerald-600 text-white text-sm touch-none"
            >
              ▼
            </button>
            <div />
          </div>

          <button
            type="button"
            aria-label="Hold Boost"
            onPointerDown={(e) => {
              e.preventDefault();
              onBoostChange(true);
            }}
            onPointerUp={() => onBoostChange(false)}
            onPointerCancel={() => onBoostChange(false)}
            onPointerLeave={() => onBoostChange(false)}
            className="h-14 px-5 rounded-xl bg-emerald-600/90 active:bg-emerald-500 border border-emerald-300/40 text-white font-bold text-xs tracking-wider uppercase shadow-lg touch-none"
          >
            BOOST
          </button>
        </div>
      )}
    </div>
  );
};

function AppleSvgIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6 shrink-0">
      <circle cx="12" cy="13" r="8.5" fill="rgba(0,0,0,0.5)" />
      <circle cx="12" cy="12.5" r="7.5" fill={color} />
      <circle cx="9.5" cy="10" r="2.2" fill="rgba(255,255,255,0.55)" />
      <ellipse
        cx="13.5"
        cy="4.2"
        rx="3"
        ry="1.6"
        transform="rotate(-20 13.5 4.2)"
        fill="#34D399"
      />
    </svg>
  );
}

function PowerUpSvgIcon({
  type,
}: {
  type: 'golden' | 'chrono' | 'phase' | 'magnet';
}) {
  const colorMap = {
    golden: '#FBBF24',
    chrono: '#38BDF8',
    phase: '#C084FC',
    magnet: '#FB923C',
  };
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0">
      <circle cx="12" cy="12" r="9" fill="rgba(0,0,0,0.6)" />
      <circle cx="12" cy="12" r="7" fill={colorMap[type]} />
      <circle cx="10" cy="10" r="2" fill="#FFFFFF" />
    </svg>
  );
}
