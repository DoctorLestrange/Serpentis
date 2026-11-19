import React, { useEffect, useState } from 'react';
import { CAMPAIGN_STAGES } from '../game/rules';
import { ACHIEVEMENTS } from '../game/storage';
import { THEMES } from '../game/themes';
import {
  BoardSizePreset,
  GameConfig,
  GameMode,
  ObstaclePreset,
  PlayerProfile,
  SpeedPreset,
  ThemeId,
} from '../game/types';

interface TitleScreenProps {
  config: GameConfig;
  profile: PlayerProfile;
  isMuted: boolean;
  onUpdateConfig: (partial: Partial<GameConfig>) => void;
  onResetProfile: () => void;
  onStartGame: () => void;
  onToggleMute: () => void;
}

type ActivePanel = 'none' | 'customize' | 'records';

const MODE_OPTIONS: {
  id: GameMode;
  title: string;
  summary: string;
}[] = [
  {
    id: 'classic',
    title: 'Classic Arcade',
    summary: 'Progressive speed, combo multipliers & special harvest pickups.',
  },
  {
    id: 'campaign',
    title: 'Labyrinth Stages',
    summary: '5 handcrafted architectural chambers with apple harvest quotas.',
  },
  {
    id: 'time_blitz',
    title: 'Time Blitz 90s',
    summary: 'High-tempo 90-second score attack with multi-fruit harvests.',
  },
  {
    id: 'zen',
    title: 'Zen Endless',
    summary: 'Portal wrap walls and phase-through body for relaxed flow.',
  },
];

export const TitleScreen: React.FC<TitleScreenProps> = ({
  config,
  profile,
  isMuted,
  onUpdateConfig,
  onResetProfile,
  onStartGame,
  onToggleMute,
}) => {
  const [activePanel, setActivePanel] = useState<ActivePanel>('none');
  const [recordsTab, setRecordsTab] = useState<'hof' | 'career'>('hof');
  const [hofModeFilter, setHofModeFilter] = useState<'all' | GameMode>('all');
  const [confirmReset, setConfirmReset] = useState<boolean>(false);
  const palette = THEMES[config.theme] || THEMES.botanical;
  const modeBest = profile.highScores[config.mode] || 0;

  useEffect(() => {
    document.body.dataset.titleDialog = activePanel;
    return () => {
      delete document.body.dataset.titleDialog;
    };
  }, [activePanel]);

  // Allow Escape to close open Customize / Records sub-dialogs and return to Main Menu
  useEffect(() => {
    if (activePanel === 'none') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        setActivePanel('none');
        setConfirmReset(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activePanel]);

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-3 sm:p-6 lg:p-8 overflow-hidden">
      {/* Top Bar: Arena Context & Audio Toggle */}
      <div className="shrink-0 flex items-center justify-between w-full max-w-6xl mx-auto gap-2">
        <div
          className="text-[11px] sm:text-xs font-semibold tracking-wider uppercase truncate"
          style={{ color: palette.outerTextMuted }}
        >
          {THEMES[config.theme].name} Arena · Best:{' '}
          <span
            className="font-mono-tabular font-bold"
            style={{ color: palette.outerTextPrimary }}
          >
            {modeBest}
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleMute}
          className="pointer-events-auto shrink-0 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer flex items-center gap-2"
          style={{
            backgroundColor: palette.hudSurface,
            border: `1px solid ${palette.hudBorder}`,
            color: palette.textPrimary,
          }}
        >
          <span>{isMuted ? 'Audio Muted [M]' : 'Audio Active [M]'}</span>
        </button>
      </div>

      {/* Center Stage: Strictly ONE Centered Dialog Open at a Time */}
      <div className="flex-1 min-h-0 w-full flex items-center justify-center my-2">
        {activePanel === 'none' && (
          <div
            role="dialog"
            aria-modal="false"
            aria-label="Main Menu"
            className="w-full max-w-lg max-h-full overflow-y-auto overscroll-contain rounded-2xl p-4 sm:p-7 shadow-2xl pointer-events-auto"
            style={{
              backgroundColor: palette.hudSurface,
              border: `1px solid ${palette.hudBorder}`,
            }}
          >
            {/* Custom Inline SVG Title Lockup */}
            <div className="flex items-center gap-3.5 sm:gap-4 mb-4 sm:mb-5">
              <SerpentEmblemSvg accent={palette.accentPrimary} />
              <div>
                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-none">
                  SERPENTIS
                </h1>
                <p className="text-xs sm:text-sm text-stone-300 mt-1">
                  Tactile Arcade Serpent &amp; Labyrinth Trial
                </p>
              </div>
            </div>

            {/* 4 Game Modes Selection Grid */}
            <div className="mb-4 sm:mb-5">
              <div className="flex items-center justify-between text-xs font-semibold text-stone-300 mb-2">
                <span>Select Game Mode</span>
                <span className="font-mono-tabular text-emerald-400">
                  Record: {modeBest} pts
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                {MODE_OPTIONS.map((m) => {
                  const selected = config.mode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onUpdateConfig({ mode: m.id })}
                      className={`text-left p-2.5 sm:p-3 rounded-xl border transition-colors cursor-pointer ${
                        selected
                          ? 'bg-emerald-500/20 border-emerald-400 text-white'
                          : 'bg-black/35 border-white/10 text-stone-300 hover:border-white/25 hover:text-white'
                      }`}
                    >
                      <div className="text-xs sm:text-sm font-bold whitespace-nowrap">
                        {m.title}
                      </div>
                      <div className="text-[11px] text-stone-300/85 line-clamp-2 mt-0.5 leading-snug">
                        {m.summary}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Campaign Stage Selector (Visible when Labyrinth Stages mode is active) */}
            {config.mode === 'campaign' && (
              <div className="mb-4 sm:mb-5 p-3 sm:p-3.5 rounded-xl bg-black/40 border border-white/10">
                <div className="text-xs font-semibold text-stone-300 mb-2">
                  Select Chamber (Unlocked: {profile.highestUnlockedStage} / 5)
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {CAMPAIGN_STAGES.map((st) => {
                    const locked = st.stage > profile.highestUnlockedStage;
                    const active = config.campaignStage === st.stage;
                    return (
                      <button
                        key={st.stage}
                        type="button"
                        disabled={locked}
                        onClick={() =>
                          onUpdateConfig({ campaignStage: st.stage })
                        }
                        className={`py-1.5 sm:py-2 px-1.5 rounded-lg text-xs font-bold font-mono-tabular transition-colors ${
                          locked
                            ? 'bg-black/30 text-stone-600 border border-white/5 cursor-not-allowed'
                            : active
                            ? 'bg-emerald-500 text-stone-950 border border-emerald-300 cursor-pointer'
                            : 'bg-white/5 text-stone-200 border border-white/10 hover:bg-white/15 cursor-pointer'
                        }`}
                      >
                        {locked ? `St.${st.stage} 🔒` : `St.${st.stage}`}
                      </button>
                    );
                  })}
                </div>
                <div className="text-[11px] text-emerald-300 mt-2">
                  {
                    CAMPAIGN_STAGES.find(
                      (s) => s.stage === config.campaignStage
                    )?.name
                  }{' '}
                  ·{' '}
                  {
                    CAMPAIGN_STAGES.find(
                      (s) => s.stage === config.campaignStage
                    )?.subtitle
                  }
                </div>
              </div>
            )}

            {/* Primary Menu Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5">
              <button
                type="button"
                data-start="true"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onStartGame();
                }}
                className="flex-1 py-3 sm:py-3.5 px-6 rounded-xl font-bold text-base tracking-wide text-stone-950 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 transition-colors cursor-pointer shadow-lg whitespace-nowrap"
              >
                Start Game
              </button>

              <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-2.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setConfirmReset(false);
                    setActivePanel('customize');
                  }}
                  className="py-3 sm:py-3.5 px-3.5 sm:px-4 rounded-xl font-semibold text-xs tracking-wider uppercase border bg-white/5 text-stone-200 border-white/15 hover:bg-white/15 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Customize Rules
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setConfirmReset(false);
                    setActivePanel('records');
                  }}
                  className="py-3 sm:py-3.5 px-3.5 sm:px-4 rounded-xl font-semibold text-xs tracking-wider uppercase border bg-white/5 text-stone-200 border-white/15 hover:bg-white/15 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Hall of Fame
                </button>
              </div>
            </div>
          </div>
        )}

        {activePanel === 'customize' && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="customize-dialog-title"
            className="w-full max-w-xl max-h-full overflow-y-auto overscroll-contain rounded-2xl p-4 sm:p-6 shadow-2xl pointer-events-auto"
            style={{
              backgroundColor: palette.hudSurface,
              border: `1px solid ${palette.hudBorder}`,
            }}
          >
            <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4 pb-2.5 sm:pb-3 border-b border-white/10">
              <div>
                <h2
                  id="customize-dialog-title"
                  className="text-base sm:text-lg font-bold text-white"
                >
                  Arena Customization &amp; Rules
                </h2>
                <p className="text-[11px] sm:text-xs text-stone-400">
                  Live arena preview updates immediately behind this dialog
                </p>
              </div>
              <button
                type="button"
                aria-label="Close Customization Panel"
                onClick={() => setActivePanel('none')}
                className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-400 text-stone-950 hover:bg-emerald-300 transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>

            <div className="space-y-3 sm:space-y-4 text-xs">
              {/* Visual Theme Selector */}
              <div>
                <label className="block font-semibold text-stone-300 mb-1.5">
                  Studio Palette &amp; Surface
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                  {(Object.keys(THEMES) as ThemeId[]).map((tKey) => {
                    const th = THEMES[tKey];
                    const active = config.theme === tKey;
                    return (
                      <button
                        key={tKey}
                        type="button"
                        onClick={() => onUpdateConfig({ theme: tKey })}
                        className={`p-2 sm:p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                          active
                            ? 'border-emerald-400 bg-emerald-500/20 text-white'
                            : 'border-white/10 bg-black/35 text-stone-300 hover:border-white/25'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1">
                          <span
                            className="w-3 h-3 rounded-sm border border-white/20"
                            style={{ backgroundColor: th.snakeHead }}
                          />
                          <span
                            className="w-3 h-3 rounded-sm border border-white/20"
                            style={{ backgroundColor: th.appleFill }}
                          />
                        </div>
                        <div className="font-bold whitespace-nowrap truncate">
                          {th.name}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Board Size & Speed Tier */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
                <div>
                  <label className="block font-semibold text-stone-300 mb-1 sm:mb-1.5">
                    Board Dimensions
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: 'compact', label: 'Compact' },
                        { id: 'standard', label: 'Standard' },
                        { id: 'grand', label: 'Grand' },
                      ] as { id: BoardSizePreset; label: string }[]
                    ).map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => onUpdateConfig({ boardSize: b.id })}
                        className={`py-1.5 sm:py-2 px-2 rounded-lg font-semibold border cursor-pointer whitespace-nowrap ${
                          config.boardSize === b.id
                            ? 'bg-emerald-500 text-stone-950 border-emerald-300'
                            : 'bg-black/35 text-stone-300 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-stone-300 mb-1 sm:mb-1.5">
                    Base Speed Tier
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(
                      [
                        { id: 'relaxed', label: 'Calm' },
                        { id: 'standard', label: 'Normal' },
                        { id: 'turbo', label: 'Turbo' },
                        { id: 'hyper', label: 'Hyper' },
                      ] as { id: SpeedPreset; label: string }[]
                    ).map((sp) => (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={() =>
                          onUpdateConfig({
                            speed: sp.id,
                            poisonEnabled:
                              sp.id === 'turbo' || sp.id === 'hyper',
                          })
                        }
                        className={`py-1.5 sm:py-2 px-1.5 rounded-lg font-semibold border cursor-pointer whitespace-nowrap ${
                          config.speed === sp.id
                            ? 'bg-emerald-500 text-stone-950 border-emerald-300'
                            : 'bg-black/35 text-stone-300 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {sp.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Obstacle Architecture */}
              <div>
                <label className="block font-semibold text-stone-300 mb-1 sm:mb-1.5">
                  Obstacle Architecture (Classic &amp; Time Blitz)
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(
                    [
                      { id: 'none', label: 'Open' },
                      { id: 'pillars', label: 'Pillars' },
                      { id: 'gates', label: 'Gates' },
                      { id: 'cross', label: 'Cross' },
                      { id: 'labyrinth', label: 'Maze' },
                    ] as { id: ObstaclePreset; label: string }[]
                  ).map((ob) => (
                    <button
                      key={ob.id}
                      type="button"
                      onClick={() =>
                        onUpdateConfig({ obstaclePreset: ob.id })
                      }
                      className={`py-1.5 sm:py-2 px-1.5 sm:px-2 rounded-lg font-semibold border cursor-pointer whitespace-nowrap ${
                        config.obstaclePreset === ob.id
                          ? 'bg-emerald-500 text-stone-950 border-emerald-300'
                          : 'bg-black/35 text-stone-300 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {ob.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles: Arena Grid, Perimeter, Simultaneous, Warp Gates, Power-Ups, Poison Hazard */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateConfig({ showGrid: !config.showGrid })
                  }
                  className={`p-2 sm:p-2.5 rounded-lg border text-left cursor-pointer ${
                    config.showGrid
                      ? 'bg-emerald-500/20 border-emerald-400 text-white'
                      : 'bg-amber-500/20 border-amber-400 text-white'
                  }`}
                >
                  <div className="text-[10px] uppercase text-stone-400">
                    Arena Grid
                  </div>
                  <div className="font-bold mt-0.5 whitespace-nowrap">
                    {config.showGrid ? 'Grid Shown' : 'Hidden (Real)'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onUpdateConfig({ wrapWalls: !config.wrapWalls })
                  }
                  className={`p-2 sm:p-2.5 rounded-lg border text-left cursor-pointer ${
                    config.wrapWalls
                      ? 'bg-teal-500/20 border-teal-400 text-white'
                      : 'bg-black/35 border-white/10 text-stone-300'
                  }`}
                >
                  <div className="text-[10px] uppercase text-stone-400">
                    Perimeter
                  </div>
                  <div className="font-bold mt-0.5 whitespace-nowrap">
                    {config.wrapWalls ? 'Portal Wrap' : 'Solid Walls'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const nextCount =
                      config.multiFruitCount === 1
                        ? 3
                        : config.multiFruitCount === 3
                        ? 5
                        : 1;
                    onUpdateConfig({ multiFruitCount: nextCount });
                  }}
                  className="p-2 sm:p-2.5 rounded-lg border bg-black/35 border-white/10 hover:border-white/25 text-left text-white cursor-pointer"
                >
                  <div className="text-[10px] uppercase text-stone-400">
                    Simultaneous
                  </div>
                  <div className="font-bold mt-0.5 font-mono-tabular whitespace-nowrap">
                    {config.multiFruitCount} Fruit
                    {config.multiFruitCount > 1 ? 's' : ''}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onUpdateConfig({
                      portalsEnabled: !config.portalsEnabled,
                    })
                  }
                  className={`p-2 sm:p-2.5 rounded-lg border text-left cursor-pointer ${
                    config.portalsEnabled
                      ? 'bg-teal-500/20 border-teal-400 text-white'
                      : 'bg-black/35 border-white/10 text-stone-300'
                  }`}
                >
                  <div className="text-[10px] uppercase text-stone-400">
                    Warp Gates
                  </div>
                  <div className="font-bold mt-0.5 whitespace-nowrap">
                    {config.portalsEnabled ? 'Enabled' : 'Disabled'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onUpdateConfig({
                      specialFruitsEnabled: !config.specialFruitsEnabled,
                    })
                  }
                  className={`p-2 sm:p-2.5 rounded-lg border text-left cursor-pointer ${
                    config.specialFruitsEnabled
                      ? 'bg-amber-500/20 border-amber-400 text-white'
                      : 'bg-black/35 border-white/10 text-stone-300'
                  }`}
                >
                  <div className="text-[10px] uppercase text-stone-400">
                    Power-Ups
                  </div>
                  <div className="font-bold mt-0.5 whitespace-nowrap">
                    {config.specialFruitsEnabled ? 'Active' : 'Classic Only'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onUpdateConfig({
                      poisonEnabled: !config.poisonEnabled,
                    })
                  }
                  className={`p-2 sm:p-2.5 rounded-lg border text-left cursor-pointer ${
                    config.poisonEnabled
                      ? 'bg-purple-500/25 border-purple-400 text-white'
                      : 'bg-black/35 border-white/10 text-stone-300'
                  }`}
                >
                  <div className="text-[10px] uppercase text-stone-400">
                    Poison Hazard
                  </div>
                  <div className="font-bold mt-0.5 whitespace-nowrap">
                    {config.poisonEnabled ? 'Skulls On' : 'Disabled'}
                  </div>
                </button>
              </div>

              {/* Power-Up Harvest & Hazard Field Guide */}
              <div className="pt-2 border-t border-white/10">
                <div className="text-[11px] font-semibold text-stone-300 mb-1.5">
                  Special Pickups &amp; Hazards (Magnets Never Pull Poison)
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-[11px] text-stone-300">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: palette.goldenFill }}
                    />
                    <span className="whitespace-nowrap">Golden · 2x</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: palette.chronoFill }}
                    />
                    <span className="whitespace-nowrap">Chrono · Slow</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rotate-45 shrink-0"
                      style={{ backgroundColor: palette.phaseFill }}
                    />
                    <span className="whitespace-nowrap">Phase · Ghost</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: palette.magnetFill }}
                    />
                    <span className="whitespace-nowrap">Magnet · Pull</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-purple-300 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-sm bg-slate-100 border border-purple-500 shrink-0" />
                    <span className="whitespace-nowrap">Skull · Poison</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activePanel === 'records' && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="records-dialog-title"
            className="w-full max-w-xl max-h-full overflow-y-auto overscroll-contain rounded-2xl p-4 sm:p-6 shadow-2xl pointer-events-auto"
            style={{
              backgroundColor: palette.hudSurface,
              border: `1px solid ${palette.hudBorder}`,
            }}
          >
            <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4 pb-2.5 sm:pb-3 border-b border-white/10">
              <div>
                <h2
                  id="records-dialog-title"
                  className="text-base sm:text-lg font-bold text-white"
                >
                  Hall of Fame &amp; Career Records
                </h2>
                <p className="text-[11px] sm:text-xs text-stone-400">
                  Top serpent champions, lifetime metrics &amp; milestones
                </p>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {!confirmReset ? (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    Reset Career
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onResetProfile();
                        setConfirmReset(false);
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-500 text-white hover:bg-rose-400 cursor-pointer"
                    >
                      Confirm Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="px-2 py-1.5 rounded-lg text-xs font-medium bg-white/10 text-stone-300 hover:bg-white/20 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  aria-label="Close Hall of Fame Panel"
                  onClick={() => {
                    setConfirmReset(false);
                    setActivePanel('none');
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-400 text-stone-950 hover:bg-emerald-300 transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>

            {/* Sub-navigation Tabs: Hall of Fame Leaderboard vs Career & Milestones */}
            <div className="grid grid-cols-2 gap-2 mb-3.5 sm:mb-4">
              <button
                type="button"
                onClick={() => setRecordsTab('hof')}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-colors cursor-pointer ${
                  recordsTab === 'hof'
                    ? 'bg-emerald-500 text-stone-950 border-emerald-300'
                    : 'bg-black/35 text-stone-300 border-white/10 hover:bg-white/10'
                }`}
              >
                Hall of Fame ({profile.hallOfFame.length})
              </button>
              <button
                type="button"
                onClick={() => setRecordsTab('career')}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-colors cursor-pointer ${
                  recordsTab === 'career'
                    ? 'bg-emerald-500 text-stone-950 border-emerald-300'
                    : 'bg-black/35 text-stone-300 border-white/10 hover:bg-white/10'
                }`}
              >
                Career &amp; Milestones ({profile.unlockedAchievements.length}/
                {ACHIEVEMENTS.length})
              </button>
            </div>

            {recordsTab === 'hof' ? (
              <div>
                {/* Mode Filter Bar */}
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  {(
                    [
                      { id: 'all', label: 'All Modes' },
                      { id: 'classic', label: 'Classic' },
                      { id: 'campaign', label: 'Labyrinth' },
                      { id: 'time_blitz', label: 'Time Blitz' },
                      { id: 'zen', label: 'Zen' },
                    ] as { id: 'all' | GameMode; label: string }[]
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setHofModeFilter(f.id)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer ${
                        hofModeFilter === f.id
                          ? 'bg-white/20 text-white border-white/40'
                          : 'bg-black/30 text-stone-400 border-white/10 hover:text-stone-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Ranked Leaderboard Rows */}
                {(() => {
                  const filtered = profile.hallOfFame
                    .filter(
                      (e) =>
                        hofModeFilter === 'all' || e.mode === hofModeFilter
                    )
                    .slice(0, 7);

                  if (filtered.length === 0) {
                    return (
                      <div className="p-6 rounded-xl bg-black/35 border border-white/10 text-center text-xs text-stone-400">
                        No Hall of Fame entries recorded for this mode yet.
                        Complete a run to claim the #1 spot!
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-1.5">
                      {filtered.map((entry, idx) => {
                        const rank = idx + 1;
                        const modeTag =
                          entry.mode === 'classic'
                            ? 'Classic'
                            : entry.mode === 'campaign'
                            ? `Stage ${entry.stage}`
                            : entry.mode === 'time_blitz'
                            ? 'Time Blitz'
                            : 'Zen';

                        return (
                          <div
                            key={entry.id}
                            className={`px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl border flex items-center justify-between gap-3 ${
                              rank === 1
                                ? 'bg-amber-500/15 border-amber-400/40'
                                : rank === 2
                                ? 'bg-emerald-500/12 border-emerald-400/30'
                                : rank === 3
                                ? 'bg-teal-500/10 border-teal-400/25'
                                : 'bg-black/35 border-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                              <span
                                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-xs font-extrabold font-mono-tabular shrink-0 ${
                                  rank === 1
                                    ? 'bg-amber-400 text-stone-950'
                                    : rank === 2
                                    ? 'bg-emerald-400 text-stone-950'
                                    : rank === 3
                                    ? 'bg-teal-400 text-stone-950'
                                    : 'bg-white/10 text-stone-300'
                                }`}
                              >
                                #{rank}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs sm:text-sm font-bold text-white truncate">
                                    {entry.playerName}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white/10 text-stone-300 whitespace-nowrap">
                                    {modeTag}
                                  </span>
                                </div>
                                <div className="text-[11px] text-stone-400 font-mono-tabular">
                                  {entry.applesEaten} fruits · Len{' '}
                                  {entry.peakLength} · {entry.maxCombo}x combo
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="text-sm sm:text-base font-extrabold font-mono-tabular text-white">
                                {entry.score}
                              </div>
                              <div className="text-[10px] uppercase text-stone-400">
                                pts
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div>
                {/* Career Summary Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3.5">
                  <div className="p-2.5 sm:p-3 rounded-xl bg-black/40 border border-white/10">
                    <div className="text-[10px] uppercase text-stone-400">
                      Classic Best
                    </div>
                    <div className="text-base sm:text-lg font-bold font-mono-tabular text-white mt-0.5">
                      {profile.highScores.classic}
                    </div>
                  </div>
                  <div className="p-2.5 sm:p-3 rounded-xl bg-black/40 border border-white/10">
                    <div className="text-[10px] uppercase text-stone-400">
                      Longest Coil
                    </div>
                    <div className="text-base sm:text-lg font-bold font-mono-tabular text-emerald-400 mt-0.5">
                      {profile.longestSnakeEver}
                    </div>
                  </div>
                  <div className="p-2.5 sm:p-3 rounded-xl bg-black/40 border border-white/10">
                    <div className="text-[10px] uppercase text-stone-400">
                      Peak Combo
                    </div>
                    <div className="text-base sm:text-lg font-bold font-mono-tabular text-amber-400 mt-0.5">
                      {profile.highestComboEver}x
                    </div>
                  </div>
                  <div className="p-2.5 sm:p-3 rounded-xl bg-black/40 border border-white/10">
                    <div className="text-[10px] uppercase text-stone-400">
                      Total Harvest
                    </div>
                    <div className="text-base sm:text-lg font-bold font-mono-tabular text-stone-200 mt-0.5">
                      {profile.totalApplesEaten}
                    </div>
                  </div>
                </div>

                {/* Achievements List */}
                <div className="space-y-1.5 sm:space-y-2">
                  {ACHIEVEMENTS.map((ach) => {
                    const unlocked = profile.unlockedAchievements.includes(
                      ach.id
                    );
                    return (
                      <div
                        key={ach.id}
                        className={`p-2.5 sm:p-3 rounded-xl border flex items-center justify-between gap-2 ${
                          unlocked
                            ? 'bg-emerald-500/15 border-emerald-400/40 text-white'
                            : 'bg-black/30 border-white/5 text-stone-400'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold">{ach.title}</div>
                          <div className="text-[11px] opacity-80">
                            {ach.description}
                          </div>
                        </div>
                        <span className="text-[11px] font-mono-tabular font-semibold shrink-0">
                          {unlocked ? 'UNLOCKED' : 'LOCKED'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Safe Margin: Single Flat, Borderless Inline Control Hint */}
      <div
        className="shrink-0 w-full text-center text-[11px] sm:text-xs font-medium tracking-wide truncate"
        style={{ color: palette.outerTextMuted }}
      >
        WASD / Arrows Steer · Space Boost · P / Esc Pause · R Restart
      </div>
    </div>
  );
};

function SerpentEmblemSvg({ accent }: { accent: string }) {
  return (
    <svg
      viewBox="0 0 56 56"
      className="w-12 h-12 sm:w-14 sm:h-14 shrink-0"
      aria-hidden="true"
    >
      <rect
        x="2"
        y="2"
        width="52"
        height="52"
        rx="14"
        fill="#07110E"
        stroke={accent}
        strokeWidth="2"
      />
      <path
        d="M15 39C15 31 23 31 23 24C23 17 33 17 33 25C33 33 41 33 41 21"
        fill="none"
        stroke={accent}
        strokeWidth="6.5"
        strokeLinecap="round"
      />
      <circle cx="41" cy="18" r="4.5" fill={accent} />
      <circle cx="42.5" cy="16.5" r="1.3" fill="#07110E" />
      <circle cx="16" cy="17" r="4" fill="#F43F5E" />
    </svg>
  );
}
