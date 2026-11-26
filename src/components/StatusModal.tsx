import React, { useEffect, useState } from 'react';
import { CAMPAIGN_STAGES } from '../game/rules';
import { ACHIEVEMENTS } from '../game/storage';
import { THEMES } from '../game/themes';
import {
  AppScreenState,
  GameConfig,
  PlayerProfile,
  RunSnapshot,
  SimulationState,
} from '../game/types';

interface StatusModalProps {
  screenState: AppScreenState;
  config: GameConfig;
  sim: SimulationState;
  snapshot: RunSnapshot | null;
  profile: PlayerProfile;
  isMuted: boolean;
  onToggleMute: () => void;
  onToggleGrid: () => void;
  onSaveHallOfFame: (
    playerName: string,
    snap: RunSnapshot
  ) => { rank: number; savedName: string };
  onResume: () => void;
  onRestart: () => void;
  onNextStage: () => void;
  onReturnTitle: () => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({
  screenState,
  config,
  sim,
  snapshot,
  profile,
  isMuted,
  onToggleMute,
  onToggleGrid,
  onSaveHallOfFame,
  onResume,
  onRestart,
  onNextStage,
  onReturnTitle,
}) => {
  const activeRunEntryId = snapshot?.runEntryId || 'fallback_run';
  const [playerName, setPlayerName] = useState<string>(
    () => profile.lastPlayerName || 'ORION'
  );
  const [savedRecord, setSavedRecord] = useState<{
    runEntryId: string;
    name: string;
    rank: number;
  } | null>(null);

  const lastInitializedRunRef = React.useRef<string>('');
  const savedRunIdRef = React.useRef<string>('');

  useEffect(() => {
    if (
      screenState === 'gameover' &&
      lastInitializedRunRef.current !== activeRunEntryId
    ) {
      lastInitializedRunRef.current = activeRunEntryId;
      setPlayerName(profile.lastPlayerName || 'ORION');
      setSavedRecord(null);
    }
  }, [screenState, activeRunEntryId, profile.lastPlayerName]);

  useEffect(() => {
    if (screenState !== 'gameover') return;

    const snap: RunSnapshot = snapshot || {
      runEntryId: 'fallback_run',
      mode: config.mode,
      stage: config.campaignStage,
      victory: sim.status === 'victory',
      deathReason: sim.deathReason,
      score: sim.score,
      bestScore: sim.score,
      isNewRecord: false,
      applesEaten: sim.applesEaten,
      targetApples: sim.targetApples,
      peakLength: sim.snake.length,
      maxCombo: sim.maxCombo,
      timeSurvivedSec: Math.round(sim.elapsedMs / 1000),
      newlyUnlockedAchievements: [],
    };
    const isCurrentRunSaved =
      savedRunIdRef.current === snap.runEntryId ||
      (savedRecord !== null && savedRecord.runEntryId === snap.runEntryId);
    const trimmed = playerName.trim();
    const hasNextStage =
      snap.victory &&
      snap.mode === 'campaign' &&
      snap.stage < CAMPAIGN_STAGES.length;

    const autoSaveIfNeeded = () => {
      if (!isCurrentRunSaved && savedRunIdRef.current !== snap.runEntryId && trimmed.length > 0) {
        savedRunIdRef.current = snap.runEntryId;
        const { rank, savedName } = onSaveHallOfFame(trimmed, snap);
        setSavedRecord({
          runEntryId: snap.runEntryId,
          name: savedName,
          rank,
        });
      }
    };

    const onWindowKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLElement &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.isContentEditable);

      if (e.code === 'Escape') {
        e.preventDefault();
        autoSaveIfNeeded();
        onReturnTitle();
        return;
      }

      if (isInput) return;

      if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyR') {
        if (activeEl && activeEl.tagName === 'BUTTON') {
          return;
        }
        e.preventDefault();
        autoSaveIfNeeded();
        if (hasNextStage) {
          onNextStage();
        } else {
          onRestart();
        }
      }
    };

    window.addEventListener('keydown', onWindowKeyDown);
    return () => window.removeEventListener('keydown', onWindowKeyDown);
  }, [
    screenState,
    snapshot,
    config.mode,
    config.campaignStage,
    sim,
    savedRecord,
    playerName,
    onSaveHallOfFame,
    onReturnTitle,
    onNextStage,
    onRestart,
  ]);

  if (screenState !== 'paused' && screenState !== 'gameover') {
    return null;
  }

  const palette = THEMES[config.theme] || THEMES.botanical;

  if (screenState === 'paused') {
    const modeLabel =
      config.mode === 'classic'
        ? 'Classic Arcade'
        : config.mode === 'campaign'
        ? `Stage ${config.campaignStage}`
        : config.mode === 'time_blitz'
        ? 'Time Blitz 90s'
        : 'Zen Endless';

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pause-modal-title"
        className="fixed inset-0 z-30 flex items-center justify-center p-3 sm:p-4 bg-black/65"
      >
        <div
          className="w-full max-w-md max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain rounded-2xl p-5 sm:p-7 shadow-2xl"
          style={{
            backgroundColor: palette.hudSurface,
            border: `1px solid ${palette.hudBorder}`,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              Simulation Suspended
            </div>
            <span className="text-xs text-stone-400">{modeLabel}</span>
          </div>

          <h2
            id="pause-modal-title"
            className="text-2xl sm:text-3xl font-extrabold text-white mt-1"
          >
            Game Paused
          </h2>

          {/* 3 Tabular Stat Tiles */}
          <div className="grid grid-cols-3 gap-2.5 my-5">
            <div className="p-3 rounded-xl bg-black/45 border border-white/10">
              <div className="text-[10px] uppercase text-stone-400">Score</div>
              <div className="text-xl font-bold font-mono-tabular text-white mt-0.5">
                {Math.round(sim.score)}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-black/45 border border-white/10">
              <div className="text-[10px] uppercase text-stone-400">
                Harvest
              </div>
              <div className="text-xl font-bold font-mono-tabular text-emerald-400 mt-0.5">
                {sim.applesEaten}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-black/45 border border-white/10">
              <div className="text-[10px] uppercase text-stone-400">Length</div>
              <div className="text-xl font-bold font-mono-tabular text-amber-300 mt-0.5">
                {sim.snake.length}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onResume}
              className="w-full py-3.5 px-5 rounded-xl font-bold text-stone-950 bg-emerald-400 hover:bg-emerald-300 transition-colors cursor-pointer"
            >
              Resume Game [P / Esc]
            </button>
            <button
              type="button"
              onClick={onRestart}
              className="w-full py-3 px-5 rounded-xl font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/15 transition-colors cursor-pointer"
            >
              Restart Run [R]
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onToggleGrid}
                className="py-2.5 px-3 rounded-xl font-semibold text-xs uppercase tracking-wider text-stone-200 bg-black/35 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer whitespace-nowrap"
              >
                {config.showGrid ? 'Hide Grid' : 'Show Grid'}
              </button>
              <button
                type="button"
                onClick={onToggleMute}
                className="py-2.5 px-3 rounded-xl font-semibold text-xs uppercase tracking-wider text-stone-200 bg-black/35 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer whitespace-nowrap"
              >
                {isMuted ? 'Unmute [M]' : 'Mute [M]'}
              </button>
            </div>
            <button
              type="button"
              onClick={onReturnTitle}
              className="w-full py-2.5 px-5 rounded-xl font-semibold text-stone-300 hover:text-white bg-transparent hover:bg-white/5 transition-colors cursor-pointer"
            >
              Return to Title
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Game Over / Victory Modal
  const snap: RunSnapshot = snapshot || {
    runEntryId: 'fallback_run',
    mode: config.mode,
    stage: config.campaignStage,
    victory: sim.status === 'victory',
    deathReason: sim.deathReason,
    score: sim.score,
    bestScore: sim.score,
    isNewRecord: false,
    applesEaten: sim.applesEaten,
    targetApples: sim.targetApples,
    peakLength: sim.snake.length,
    maxCombo: sim.maxCombo,
    timeSurvivedSec: Math.round(sim.elapsedMs / 1000),
    newlyUnlockedAchievements: [],
  };

  const isVictory = snap.victory;
  const hasNextCampaignStage =
    isVictory && snap.mode === 'campaign' && snap.stage < CAMPAIGN_STAGES.length;

  const deathDescription =
    snap.deathReason === 'wall'
      ? 'Collided with the arena perimeter wall'
      : snap.deathReason === 'obstacle'
      ? 'Struck an interior stone monolith'
      : snap.deathReason === 'self'
      ? 'Coiled into your own serpent body'
      : snap.deathReason === 'poison'
      ? 'Consumed a lethal toxic poison skull'
      : snap.deathReason === 'stage_clear'
      ? snap.mode === 'campaign'
        ? `Chamber ${snap.stage} quota completed`
        : 'Arena conquered in full'
      : '90-second Time Blitz completed';

  const unlockedDefs = ACHIEVEMENTS.filter((a) =>
    snap.newlyUnlockedAchievements.includes(a.id)
  );

  const isCurrentRunSaved =
    savedRunIdRef.current === snap.runEntryId ||
    (savedRecord !== null && savedRecord.runEntryId === snap.runEntryId);
  const trimmedInput = playerName.trim();

  const handleCommitHallOfFame = (nameToSave: string) => {
    if (isCurrentRunSaved || savedRunIdRef.current === snap.runEntryId) return;
    const clean = nameToSave.trim();
    if (!clean) return;
    savedRunIdRef.current = snap.runEntryId;
    setPlayerName(clean);
    const { rank, savedName } = onSaveHallOfFame(clean, snap);
    setSavedRecord({
      runEntryId: snap.runEntryId,
      name: savedName,
      rank,
    });
  };

  const ensureSavedBeforeExit = (action: () => void) => {
    if (
      !isCurrentRunSaved &&
      savedRunIdRef.current !== snap.runEntryId &&
      trimmedInput.length > 0
    ) {
      savedRunIdRef.current = snap.runEntryId;
      const { rank, savedName } = onSaveHallOfFame(trimmedInput, snap);
      setSavedRecord({
        runEntryId: snap.runEntryId,
        name: savedName,
        rank,
      });
    }
    action();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="outcome-modal-title"
      className="fixed inset-0 z-30 flex items-center justify-center p-3 sm:p-4 bg-black/70"
    >
      <div
        className="w-full max-w-md max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain rounded-2xl p-4 sm:p-6 shadow-2xl"
        style={{
          backgroundColor: palette.hudSurface,
          border: `1px solid ${palette.hudBorder}`,
        }}
      >
        <div className="flex items-center justify-between">
          <div
            className={`text-xs font-bold uppercase tracking-widest ${
              isVictory ? 'text-amber-400' : 'text-rose-400'
            }`}
          >
            {isVictory
              ? snap.mode === 'campaign'
                ? 'Chamber Conquered'
                : 'Run Victorious'
              : 'Run Terminated'}
          </div>
          <button
            type="button"
            aria-label="Close Dialog"
            onClick={() => ensureSavedBeforeExit(onReturnTitle)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            Close [Esc]
          </button>
        </div>

        <h2
          id="outcome-modal-title"
          className="text-2xl sm:text-3xl font-extrabold text-white mt-0.5"
        >
          {isVictory ? 'Stage Clear!' : 'Game Over'}
        </h2>
        <p className="text-xs text-stone-300 mt-0.5">{deathDescription}</p>

        {/* 3 Tabular-Nums Mastery / Progress Stat Tiles */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5 my-4">
          <div className="p-2.5 rounded-xl bg-black/45 border border-white/10">
            <div className="text-[10px] uppercase text-stone-400 whitespace-nowrap">
              {snap.isNewRecord ? 'New Record!' : 'Score / Best'}
            </div>
            <div className="text-base sm:text-lg font-bold font-mono-tabular text-white mt-0.5 whitespace-nowrap">
              {Math.round(snap.score)}
              <span className="text-xs text-stone-400 font-normal">
                {' '}
                / {Math.round(snap.bestScore)}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-black/45 border border-white/10">
            <div className="text-[10px] uppercase text-stone-400 whitespace-nowrap">
              {snap.targetApples ? 'Stage Quota' : 'Harvested'}
            </div>
            <div className="text-base sm:text-lg font-bold font-mono-tabular text-emerald-400 mt-0.5 whitespace-nowrap">
              {snap.targetApples
                ? `${snap.applesEaten} / ${snap.targetApples}`
                : `${snap.applesEaten}`}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-black/45 border border-white/10">
            <div className="text-[10px] uppercase text-stone-400 whitespace-nowrap">
              Len · Combo
            </div>
            <div className="text-base sm:text-lg font-bold font-mono-tabular text-amber-300 mt-0.5 whitespace-nowrap">
              {snap.peakLength} · {snap.maxCombo}x
            </div>
          </div>
        </div>

        {/* Celebratory Unlocked Achievements Banner */}
        {unlockedDefs.length > 0 && (
          <div className="mb-4 p-2.5 rounded-xl bg-amber-500/15 border border-amber-400/40">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
              Milestone Unlocked
            </div>
            {unlockedDefs.map((ach) => (
              <div
                key={ach.id}
                className="text-xs text-white font-semibold mt-0.5"
              >
                {ach.title} —{' '}
                <span className="font-normal text-stone-300">
                  {ach.description}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Hall of Fame Player Name Entry & Previous Name Picker */}
        <div className="mb-4 p-3.5 rounded-xl bg-black/45 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="hof-player-name-input"
              className="text-[11px] font-bold uppercase tracking-wider text-stone-300"
            >
              Hall of Fame Entry
            </label>
            {isCurrentRunSaved && savedRecord ? (
              <span className="text-[11px] font-semibold text-emerald-400 font-mono-tabular">
                Saved as {savedRecord.name} · Rank #{savedRecord.rank}
              </span>
            ) : (
              <span className="text-[11px] text-stone-400">
                Type or select a previous name
              </span>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCommitHallOfFame(playerName);
            }}
            className="flex items-center gap-2"
          >
            <input
              id="hof-player-name-input"
              type="text"
              maxLength={18}
              disabled={isCurrentRunSaved}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name..."
              className="flex-1 min-w-0 px-3 py-2 rounded-lg text-sm font-bold text-white bg-black/60 border border-white/15 focus:border-emerald-400 focus:outline-none placeholder:text-stone-500 disabled:opacity-65"
            />
            <button
              type="submit"
              disabled={isCurrentRunSaved || trimmedInput.length === 0}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
                isCurrentRunSaved
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/50 cursor-default'
                  : trimmedInput.length === 0
                  ? 'bg-white/10 text-stone-500 cursor-not-allowed'
                  : 'bg-emerald-400 hover:bg-emerald-300 text-stone-950 cursor-pointer'
              }`}
            >
              {isCurrentRunSaved ? 'Saved ✓' : 'Save Score'}
            </button>
          </form>

          {profile.savedPlayerNames.length > 0 && (
            <div className="mt-2.5">
              <div className="text-[10px] uppercase tracking-wider text-stone-400 mb-1.5">
                Quick-Select Previous Name:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {profile.savedPlayerNames.map((prevName) => {
                  const isSelected =
                    playerName.trim().toLowerCase() === prevName.toLowerCase();
                  return (
                    <button
                      key={prevName}
                      type="button"
                      disabled={isCurrentRunSaved}
                      onClick={() => {
                        if (!isCurrentRunSaved) {
                          setPlayerName(prevName);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                        isCurrentRunSaved
                          ? isSelected
                            ? 'bg-emerald-500/25 border border-emerald-400 text-emerald-200 cursor-default'
                            : 'bg-white/5 border border-white/5 text-stone-500 cursor-default'
                          : isSelected
                          ? 'bg-emerald-500/25 border border-emerald-400 text-emerald-200 cursor-pointer'
                          : 'bg-white/5 hover:bg-white/15 border border-white/10 text-stone-300 hover:text-white cursor-pointer'
                      }`}
                    >
                      {prevName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {hasNextCampaignStage ? (
            <button
              type="button"
              data-start="true"
              onClick={() => ensureSavedBeforeExit(onNextStage)}
              className="w-full py-3 px-5 rounded-xl font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 transition-colors cursor-pointer"
            >
              Advance to Stage {snap.stage + 1}
            </button>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={() => ensureSavedBeforeExit(onRestart)}
              className="w-full py-3 px-5 rounded-xl font-bold text-stone-950 bg-emerald-400 hover:bg-emerald-300 transition-colors cursor-pointer"
            >
              {isVictory ? 'Play Again' : 'Try Again'}
            </button>
          )}

          <button
            type="button"
            onClick={() => ensureSavedBeforeExit(onReturnTitle)}
            className="w-full py-2.5 px-5 rounded-xl font-semibold text-stone-200 bg-white/10 hover:bg-white/20 border border-white/15 transition-colors cursor-pointer"
          >
            Return to Title
          </button>
        </div>
      </div>
    </div>
  );
};
