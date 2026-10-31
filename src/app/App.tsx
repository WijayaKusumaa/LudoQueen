import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { GameProvider, useGame } from '../game/store/GameContext';
import { CustomizationProvider } from '../game/customization';
import { GameHUD } from '../components/ui/GameHUD';
import { SettingsPanel, SetupScreen, TitleScreen, type GameSessionConfig } from '../components/ui/Menus';
import { SceneErrorBoundary, WebGLFallback, isWebGLAvailable } from '../components/ui/SceneFallback';
import { PLAYER_ORDER, type PlayerColor } from '../game/board/boardLayout';
import { audio } from '../game/audio/audio';
import { useBotTurnRunner } from '../game/engine/ai';
import { useSettings } from './useSettings';

const GameCanvas = lazy(() => import('../game/GameCanvas'));

type Screen = 'title' | 'setup' | 'playing';

interface ShellProps {
  animate: boolean;
  settings: ReturnType<typeof useSettings>;
}

function Shell({ animate, settings: s }: ShellProps) {
  const { rematch, state } = useGame();
  const [ready, setReady] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [screen, setScreen] = useState<Screen>('title');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [players, setPlayers] = useState<PlayerColor[]>([...PLAYER_ORDER]);
  const [started, setStarted] = useState(false);
  const [gameConfig, setGameConfig] = useState<GameSessionConfig>(() => ({
    mode: 'solo',
    humanColor: 'yellow',
    botColors: ['blue', 'red', 'green'],
  }));
  const onReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    audio.configure(s.settings.sound, s.settings.music);
  }, [s.settings.sound, s.settings.music]);

  // Eksekusi otomatis giliran bot untuk mode Solo vs Komputer
  useBotTurnRunner({
    enabled: screen === 'playing',
    mode: gameConfig.mode,
    botColors: gameConfig.botColors,
    animate,
  });

  const startSolo = (chosenHuman: PlayerColor, count: number) => {
    const opponents = PLAYER_ORDER.filter((c) => c !== chosenHuman).slice(0, count);
    const activePlayers = PLAYER_ORDER.filter((c) => c === chosenHuman || opponents.includes(c));
    setGameConfig({
      mode: 'solo',
      humanColor: chosenHuman,
      botColors: opponents,
    });
    setPlayers(activePlayers);
    rematch(activePlayers);
    setStarted(true);
    setScreen('playing');
  };

  const startMultiplayer = (selectedPlayers: PlayerColor[]) => {
    setGameConfig({
      mode: 'multiplayer',
      humanColor: selectedPlayers[0] ?? 'yellow',
      botColors: [],
    });
    setPlayers(selectedPlayers);
    rematch(selectedPlayers);
    setStarted(true);
    setScreen('playing');
  };

  return (
    <main
      className="app"
      data-motion={animate ? 'on' : 'off'}
      onPointerDownCapture={() => audio.unlock()}
      onKeyDownCapture={() => audio.unlock()}
    >
      <div className="app__canvas">
        <SceneErrorBoundary>
          <Suspense fallback={null}>
            <GameCanvas resetToken={resetToken} animate={animate} onReady={onReady} />
          </Suspense>
        </SceneErrorBoundary>
      </div>

      {screen === 'playing' && (
        <GameHUD
          mode={gameConfig.mode}
          botColors={gameConfig.botColors}
          humanColor={gameConfig.humanColor}
          onResetCamera={() => setResetToken((t) => t + 1)}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenMenu={() => setScreen('title')}
          onOpenSetup={() => setScreen('setup')}
        />
      )}

      {screen === 'title' && (
        <TitleScreen
          canResume={started && state.phase !== 'finished'}
          onPlay={() => setScreen('setup')}
          onResume={() => setScreen('playing')}
          onSettings={() => setSettingsOpen(true)}
        />
      )}
      {screen === 'setup' && (
        <SetupScreen
          initialConfig={gameConfig}
          initialPlayers={players}
          onStartSolo={startSolo}
          onStartMultiplayer={startMultiplayer}
          onBack={() => setScreen('title')}
        />
      )}
      {settingsOpen && (
        <SettingsPanel
          settings={s.settings}
          reducedMotion={s.reducedMotion}
          onChange={s.update}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      <div className={`loading${ready ? ' loading--done' : ''}`} aria-hidden={ready} role="status">
        <span className="loading__spinner" />
        <p>Menyiapkan pulau…</p>
      </div>
    </main>
  );
}

export function App() {
  const [webgl] = useState(isWebGLAvailable);
  const settings = useSettings();
  const animate = !settings.reducedMotion;

  if (!webgl) return <WebGLFallback />;

  return (
    <CustomizationProvider>
      <GameProvider animate={animate}>
        <Shell animate={animate} settings={settings} />
      </GameProvider>
    </CustomizationProvider>
  );
}
