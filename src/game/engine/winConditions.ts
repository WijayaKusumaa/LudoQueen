import { HOME, PAWNS_PER_PLAYER, type PlayerColor } from './types';
import type { EndCondition } from './config';

/** Apakah semua pion pemain telah mencapai petak HOME (56). */
export function isPlayerFinished(pawnSteps: readonly number[]): boolean {
  return pawnSteps.length === PAWNS_PER_PLAYER && pawnSteps.every((step) => step === HOME);
}

export interface WinCheckResult {
  readonly isOver: boolean;
  readonly winner: PlayerColor | null;
  readonly ranking: readonly PlayerColor[];
}

/**
 * Mengevaluasi status kemenangan berdasarkan urutan pemain yang selesai dan aturan endCondition.
 */
export function evaluateWinCondition(
  allPlayers: readonly PlayerColor[],
  finishOrder: readonly PlayerColor[],
  endCondition: EndCondition,
): WinCheckResult {
  if (finishOrder.length === 0) {
    return { isOver: false, winner: null, ranking: [] };
  }

  const winner = finishOrder[0] ?? null;

  if (endCondition === 'firstFinisher') {
    // Selesai seketika pemain pertama menuntaskan semua pion.
    return {
      isOver: true,
      winner,
      ranking: [...finishOrder],
    };
  }

  // allButOne: terus berjalan sampai tersisa 1 pemain saja
  if (finishOrder.length >= allPlayers.length - 1) {
    const remaining = allPlayers.filter((p) => !finishOrder.includes(p));
    const fullRanking = [...finishOrder, ...remaining];
    return {
      isOver: true,
      winner,
      ranking: fullRanking,
    };
  }

  return {
    isOver: false,
    winner: null,
    ranking: [...finishOrder],
  };
}
