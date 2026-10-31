/**
 * ai.ts
 *
 * Kecerdasan buatan (Bot / Komputer) untuk mode Solo vs Komputer.
 * Memilih langkah terbaik berdasarkan prioritas strategis:
 * 1. Menabrak/menangkap pion lawan (mengirim pion lawan kembali ke base).
 * 2. Memasukkan pion ke gawang (HOME) atau mendekati gawang.
 * 3. Mengeluarkan pion dari BASE ke jalur saat mendapatkan dadu 6.
 * 4. Berhenti di petak aman (Safe zone / Bintang).
 * 5. Menghindari petak berbahaya jika memungkinkan.
 */

import { useEffect } from 'react';
import {
  BASE,
  HOME,
  LAST_TRACK_STEP,
  type GameState,
} from './types';
import { absoluteIndex, isSafeCell, occupantsAt } from './movement';
import { useGame } from '../store/GameContext';
import type { PlayerColor } from '../board/boardLayout';

export function chooseBestPawn(state: GameState, selectablePawns: readonly number[]): number {
  if (selectablePawns.length === 0) return 0;
  if (selectablePawns.length === 1) return selectablePawns[0]!;

  const color = state.current;
  const dice = state.dice ?? 0;
  let bestPawn: number = selectablePawns[0]!;
  let maxScore = -Infinity;

  for (const pawn of selectablePawns) {
    const currentStep = state.pawns[color][pawn] ?? BASE;
    let score = 0;

    // Aksi 1: Keluar dari BASE
    if (currentStep === BASE) {
      score += 150; // Prioritas tinggi untuk menambah pion aktif di lintasan
      // Periksa apakah petak start ada lawan yang bisa ditabrak
      const startTrack = absoluteIndex(color, 0);
      const opponents = occupantsAt(state, startTrack).filter((o) => o.color !== color);
      if (opponents.length > 0 && !isSafeCell(state.config, startTrack)) {
        score += 300; // Menabrak lawan langsung saat keluar base!
      }
    } else {
      const destStep = currentStep + dice;

      // Aksi 2: Masuk tepat ke HOME (Gawang)
      if (destStep === HOME) {
        score += 500; // Prioritas tertinggi: memasukkan pion ke finish
      } else if (destStep > LAST_TRACK_STEP) {
        // Berada di jalur rumah yang aman (home lane)
        score += 200 + destStep;
      } else {
        // Berada di jalur bersama (track 0..50)
        const destTrack = absoluteIndex(color, destStep);
        const isSafe = isSafeCell(state.config, destTrack);

        // Periksa apakah menabrak lawan di petak tujuan
        const opponents = occupantsAt(state, destTrack).filter((o) => o.color !== color);
        if (opponents.length > 0 && !isSafe) {
          score += 400; // Menabrak pion lawan!
        }

        // Mendarat di petak aman bintang
        if (isSafe) {
          score += 100;
        }

        // Semakin maju pion, semakin berharga untuk dimajukan
        score += destStep * 2;
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestPawn = pawn;
    }
  }

  return bestPawn;
}

export interface BotTurnRunnerProps {
  enabled: boolean;
  mode: 'multiplayer' | 'solo';
  botColors: readonly PlayerColor[];
  animate: boolean;
}

/** Hook otomatis yang menjalankan giliran bot secara cerdas dan natural. */
export function useBotTurnRunner({ enabled, mode, botColors, animate }: BotTurnRunnerProps): void {
  const { state, locked, roll, move, selectablePawns } = useGame();

  useEffect(() => {
    if (!enabled || mode !== 'solo' || locked || state.phase === 'finished') return;

    const isBotTurn = botColors.includes(state.current);
    if (!isBotTurn) return;

    if (state.phase === 'awaitingRoll') {
      const delay = animate ? 650 : 80;
      const timer = setTimeout(() => {
        roll();
      }, delay);
      return () => clearTimeout(timer);
    }

    if (state.phase === 'awaitingMove' && selectablePawns.length > 0) {
      const delay = animate ? 600 : 80;
      const timer = setTimeout(() => {
        const bestPawn = chooseBestPawn(state, selectablePawns);
        move(bestPawn);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [enabled, mode, botColors, animate, locked, state, roll, move, selectablePawns]);
}

