/**
 * GameContext.tsx
 *
 * Jembatan React ↔ GameSession. State otoritatif dan animasi hidup di GameSession;
 * komponen hanya berlangganan lewat useSyncExternalStore.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { getSelectablePawns } from '../engine/rules';
import type { GameState } from '../engine/types';
import type { PresentationController, PresentationSnapshot } from '../animation/presentation';
import { GameSession } from './gameSession';
import { audio } from '../audio/audio';
import type { PlayerColor } from '../board/boardLayout';

export interface GameContextValue {
  /** State otoritatif (beku). */
  state: GameState;
  /** Pion yang boleh dipilih saat ini (tidak memperhitungkan kunci animasi). */
  selectablePawns: readonly number[];
  /** True bila input harus diabaikan. */
  locked: boolean;
  presentation: PresentationController;
  /** Status animasi (busy / rolling / giliran tertahan). */
  anim: PresentationSnapshot;
  roll: () => boolean;
  move: (pawn: number) => boolean;
  rematch: (players?: readonly PlayerColor[]) => void;
  skipAnimation: () => void;
}

const GameCtx = createContext<GameContextValue | null>(null);

export function GameProvider({ children, animate }: { children: ReactNode; animate: boolean }) {
  const [session] = useState(() => new GameSession({ animate }));

  useEffect(() => {
    session.setAnimate(animate);
  }, [session, animate]);

  useEffect(() => {
    session.presentation.onCue = (cue) => audio.cue(cue);
    return () => {
      session.presentation.onCue = null;
      session.dispose();
    };
  }, [session]);

  // Kait debug khusus mode dev (dipakai uji manual/otomatis; tidak ada di build produksi).
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as { __ludo?: GameSession };
    w.__ludo = session;
    return () => {
      delete w.__ludo;
    };
  }, [session]);

  const state = useSyncExternalStore(session.subscribe, session.getState);
  const anim = useSyncExternalStore(
    session.presentation.subscribe,
    session.presentation.getSnapshot,
  );

  const value = useMemo<GameContextValue>(
    () => ({
      state,
      selectablePawns: getSelectablePawns(state),
      locked: anim.busy || state.phase === 'finished',
      presentation: session.presentation,
      anim,
      roll: () => session.roll(),
      move: (pawn) => session.move(pawn),
      rematch: (players) => session.rematch(players),
      skipAnimation: () => session.presentation.skip(),
    }),
    [session, state, anim],
  );

  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameCtx);
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>');
  return ctx;
}
