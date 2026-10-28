import { HOME, type DieValue, type ExtraTurnReason, type Move, type PlayerColor } from './types';
import type { RulesConfig } from './config';

/**
 * Mencari pemain giliran berikutnya secara siklis searah jarum jam,
 * mengabaikan pemain yang telah menyelesaikan semua pionnya.
 */
export function getNextPlayer(
  players: readonly PlayerColor[],
  current: PlayerColor,
  finishOrder: readonly PlayerColor[],
): PlayerColor | null {
  const currentIndex = players.indexOf(current);
  if (currentIndex === -1) return null;

  for (let i = 1; i <= players.length; i++) {
    const candidate = players[(currentIndex + i) % players.length]!;
    if (!finishOrder.includes(candidate)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Menghitung alasan giliran tambahan setelah langkah dilakukan.
 * Jika pemain yang baru melangkah sudah selesai (finishOrder), giliran tambahan tidak diberikan.
 */
export function determineExtraTurnReasons(
  dice: DieValue | null,
  move: Move,
  playerJustFinished: boolean,
  config: RulesConfig,
): ExtraTurnReason[] {
  if (playerJustFinished) {
    return [];
  }

  const reasons: ExtraTurnReason[] = [];

  if (dice === 6 && config.extraTurnOnSix) {
    reasons.push('six');
  }

  if (move.captures.length > 0 && config.extraTurnOnCapture) {
    reasons.push('capture');
  }

  if (move.to === HOME && config.extraTurnOnHome) {
    reasons.push('home');
  }

  return reasons;
}

/**
 * Membekukan objek secara rekursif (deep freeze) untuk mencegah mutasi state dari luar engine.
 */
export function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    const val = (obj as Record<string, unknown>)[key];
    if (val !== null && typeof val === 'object' && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  }
  return obj as Readonly<T>;
}
