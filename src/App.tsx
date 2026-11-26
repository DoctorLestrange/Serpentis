import { useCallback, useEffect, useRef, useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { PlayingHud } from './components/PlayingHud';
import { StatusModal } from './components/StatusModal';
import { TitleScreen } from './components/TitleScreen';
import { soundEngine } from './game/audio';
import { createInitialSimulationState } from './game/rules';
import {
  loadConfig,
  loadProfile,
  recordCompletedRun,
  recordHallOfFameEntry,
  resetProfile,
  saveConfig,
} from './game/storage';
import {
  AppScreenState,
  Direction,
  GameConfig,
  PlayerProfile,
  RunSnapshot,
  SimulationState,
} from './game/types';

export default function App() {
  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile());
  const profileRef = useRef<PlayerProfile>(profile);
  profileRef.current = profile;

  const [config, setConfig] = useState<GameConfig>(() => {
    const loadedConfig = loadConfig();
    const loadedProfile = loadProfile();
    if (loadedConfig.campaignStage > loadedProfile.highestUnlockedStage) {
      const clamped = {
        ...loadedConfig,
        campaignStage: loadedProfile.highestUnlockedStage,
      };
      saveConfig(clamped);
      return clamped;
    }
    return loadedConfig;
  });
  const [isMuted, setIsMuted] = useState<boolean>(() => soundEngine.isMuted());

  const [screenState, setScreenState] = useState<AppScreenState>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return 'playing';
      }
    }
    return 'title';
  });

  const [runId, setRunId] = useState<number>(1);
  const [hudSim, setHudSim] = useState<SimulationState>(() =>
    createInitialSimulationState(config)
  );
  const [runSnapshot, setRunSnapshot] = useState<RunSnapshot | null>(null);

  const externalDirectionRef = useRef<((dir: Direction) => void) | null>(null);
  const externalBoostRef = useRef<((boosting: boolean) => void) | null>(null);

  useEffect(() => {
    document.body.dataset.state = screenState;
  }, [screenState]);

  // Unlock Web Audio cleanly on first user interaction
  useEffect(() => {
    const handleUnlock = () => soundEngine.unlock();
    window.addEventListener('pointerdown', handleUnlock, { passive: true });
    window.addEventListener('keydown', handleUnlock, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', handleUnlock);
      window.removeEventListener('keydown', handleUnlock);
    };
  }, []);

  const handleUpdateConfig = useCallback((partial: Partial<GameConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      saveConfig(next);
      return next;
    });
  }, []);

  const handleResetProfile = useCallback(() => {
    const fresh = resetProfile();
    profileRef.current = fresh;
    setProfile(fresh);
    setConfig((prev) => {
      const next = { ...prev, campaignStage: 1 };
      saveConfig(next);
      return next;
    });
  }, []);

  const handleStartGame = useCallback(() => {
    soundEngine.unlock();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    document.body.dataset.state = 'playing';
    setRunSnapshot(null);
    setRunId((r) => r + 1);
    setScreenState('playing');
  }, []);

  const handleRestartRun = useCallback(() => {
    soundEngine.unlock();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    document.body.dataset.state = 'playing';
    setRunSnapshot(null);
    setRunId((r) => r + 1);
    setScreenState('playing');
  }, []);

  const handleNextStage = useCallback(() => {
    soundEngine.unlock();
    setConfig((prev) => {
      const nextStage = Math.min(5, prev.campaignStage + 1);
      const next = { ...prev, campaignStage: nextStage };
      saveConfig(next);
      return next;
    });
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    document.body.dataset.state = 'playing';
    setRunSnapshot(null);
    setRunId((r) => r + 1);
    setScreenState('playing');
  }, []);

  const handleRunEnd = useCallback(
    (finalSim: SimulationState) => {
      const currentProfile = profileRef.current;
      const prevBest = currentProfile.highScores[config.mode] || 0;
      const { updatedProfile, isNewRecord, newlyUnlocked } = recordCompletedRun(
        currentProfile,
        config,
        finalSim
      );
      profileRef.current = updatedProfile;
      setProfile(updatedProfile);

      const frozenSnapshot: RunSnapshot = {
        runEntryId: `run_${Date.now()}_${runId}`,
        mode: config.mode,
        stage: config.campaignStage,
        victory: finalSim.status === 'victory',
        deathReason: finalSim.deathReason,
        score: finalSim.score,
        bestScore: Math.max(prevBest, finalSim.score),
        isNewRecord,
        applesEaten: finalSim.applesEaten,
        targetApples: finalSim.targetApples,
        peakLength: finalSim.snake.length,
        maxCombo: finalSim.maxCombo,
        timeSurvivedSec: Math.round(finalSim.elapsedMs / 1000),
        newlyUnlockedAchievements: newlyUnlocked,
      };

      setRunSnapshot(frozenSnapshot);
      document.body.dataset.state = 'gameover';
      setScreenState('gameover');
    },
    [config, runId]
  );

  const handleSaveHallOfFame = useCallback(
    (playerName: string, snap: RunSnapshot) => {
      const { updatedProfile, rank, entry } = recordHallOfFameEntry(
        profileRef.current,
        snap,
        playerName
      );
      profileRef.current = updatedProfile;
      setProfile(updatedProfile);
      return { rank, savedName: entry.playerName };
    },
    []
  );

  const handleToggleMute = useCallback(() => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  }, []);

  const handlePause = useCallback(() => {
    // Only allow pausing while simulation is actively running (not during end-of-run hitstop beat)
    if (hudSim.status !== 'running') return;
    externalBoostRef.current?.(false);
    document.body.dataset.state = 'paused';
    setScreenState('paused');
  }, [hudSim.status]);

  // Auto-pause active gameplay if the browser tab is hidden so players never return to an unintended crash
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && screenState === 'playing' && hudSim.status === 'running') {
        externalBoostRef.current?.(false);
        document.body.dataset.state = 'paused';
        setScreenState('paused');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [screenState, hudSim.status]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      const activeEl = document.activeElement;
      const isTypingInInput =
        activeEl instanceof HTMLElement &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.isContentEditable);

      if (isTypingInInput) {
        return;
      }

      if (e.code === 'KeyM') {
        e.preventDefault();
        handleToggleMute();
        return;
      }

      if (screenState === 'title') {
        if (e.code === 'Enter' || e.code === 'Space') {
          if (
            document.activeElement &&
            document.activeElement.tagName === 'BUTTON'
          ) {
            return;
          }
          if (
            document.body.dataset.titleDialog &&
            document.body.dataset.titleDialog !== 'none'
          ) {
            return;
          }
          e.preventDefault();
          handleStartGame();
        }
        return;
      }

      if (screenState === 'playing') {
        if (e.code === 'Escape' || e.code === 'KeyP') {
          e.preventDefault();
          handlePause();
        } else if (e.code === 'KeyR') {
          e.preventDefault();
          handleRestartRun();
        }
        return;
      }

      if (screenState === 'paused') {
        if (e.code === 'Escape' || e.code === 'KeyP') {
          e.preventDefault();
          document.body.dataset.state = 'playing';
          setScreenState('playing');
        } else if (e.code === 'KeyR') {
          e.preventDefault();
          handleRestartRun();
        }
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    screenState,
    handleStartGame,
    handleRestartRun,
    handleToggleMute,
    handlePause,
  ]);

  return (
    <main className="relative w-full h-dvh overflow-hidden select-none">
      <GameCanvas
        screenState={screenState}
        config={config}
        runId={runId}
        onHudUpdate={setHudSim}
        onRunEnd={handleRunEnd}
        externalDirectionRef={externalDirectionRef}
        externalBoostRef={externalBoostRef}
      />

      {screenState === 'title' && (
        <TitleScreen
          config={config}
          profile={profile}
          isMuted={isMuted}
          onUpdateConfig={handleUpdateConfig}
          onResetProfile={handleResetProfile}
          onStartGame={handleStartGame}
          onToggleMute={handleToggleMute}
        />
      )}

      {(screenState === 'playing' ||
        screenState === 'paused' ||
        screenState === 'gameover') && (
        <PlayingHud
          screenState={screenState}
          sim={hudSim}
          config={config}
          bestScore={profile.highScores[config.mode] || 0}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onPause={handlePause}
          onRestart={handleRestartRun}
          onSteer={(dir) => externalDirectionRef.current?.(dir)}
          onBoostChange={(b) => externalBoostRef.current?.(b)}
        />
      )}

      <StatusModal
        screenState={screenState}
        config={config}
        sim={hudSim}
        snapshot={runSnapshot}
        profile={profile}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onToggleGrid={() => handleUpdateConfig({ showGrid: !config.showGrid })}
        onSaveHallOfFame={handleSaveHallOfFame}
        onResume={() => {
          document.body.dataset.state = 'playing';
          setScreenState('playing');
        }}
        onRestart={handleRestartRun}
        onNextStage={handleNextStage}
        onReturnTitle={() => {
          document.body.dataset.state = 'title';
          setScreenState('title');
        }}
      />
    </main>
  );
}
