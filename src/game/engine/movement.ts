import { PLAYER_ORDER, SAFE_INDICES, START_INDEX, TRACK_LENGTH, type PlayerColor } from '../board/boardLayout';
import type { RulesConfig, SafeCellRule } from './config';
import {
  BASE,
  FIRST_LANE_STEP,
  HOME,
  LAST_TRACK_STEP,
  type DieValue,
  type GameState,
  type Move,
  type PawnLocation,
  type PawnRef,
} from './types';

/** Indeks jalur bersama untuk step 0..50 milik warna tertentu. */
export function absoluteIndex(color: PlayerColor, step: number): number {
  if (!Number.isInteger(step) || step < 0 || step > LAST_TRACK_STEP) {
    throw new RangeError(`Step ${step} bukan bagian jalur bersama`);
  }
  return (START_INDEX[color] + step) % TRACK_LENGTH;
}

export function locationOf(color: PlayerColor, step: number): PawnLocation {
  if (step === BASE) return { kind: 'base' };
  if (step === HOME) return { kind: 'home' };
  if (step >= 0 && step <= LAST_TRACK_STEP) return { kind: 'track', index: absoluteIndex(color, step) };
  if (step >= FIRST_LANE_STEP && step < HOME) return { kind: 'lane', index: step - FIRST_LANE_STEP };
  throw new RangeError(`Step tidak valid: ${step}`);
}

/** Lokasi per langkah untuk animasi (tanpa sel awal, termasuk sel akhir). */
export function pathOf(color: PlayerColor, from: number, to: number): PawnLocation[] {
  if (from === BASE) return [locationOf(color, 0)];
  const out: PawnLocation[] = [];
  for (let s = from + 1; s <= to; s++) out.push(locationOf(color, s));
  return out;
}

const SAFE_SETS: Readonly<Record<SafeCellRule, ReadonlySet<number>>> = {
  startAndStar: new Set(SAFE_INDICES),
  startOnly: new Set(PLAYER_ORDER.map((c) => START_INDEX[c])),
  none: new Set(),
};

export function isSafeCell(config: RulesConfig, trackIndex: number): boolean {
  return SAFE_SETS[config.safeCells].has(trackIndex);
}

/** Semua pion pemain aktif yang berada di sel jalur bersama tertentu. */
export function occupantsAt(state: GameState, trackIndex: number): PawnRef[] {
  const out: PawnRef[] = [];
  for (const color of state.players) {
    state.pawns[color].forEach((step, pawn) => {
      if (step >= 0 && step <= LAST_TRACK_STEP && absoluteIndex(color, step) === trackIndex) {
        out.push({ color, pawn });
      }
    });
  }
  return out;
}

function hasOpponentBlockade(state: GameState, mover: PlayerColor, trackIndex: number): boolean {
  const counts = new Map<PlayerColor, number>();
  for (const o of occupantsAt(state, trackIndex)) {
    if (o.color !== mover) counts.set(o.color, (counts.get(o.color) ?? 0) + 1);
  }
  for (const n of counts.values()) if (n >= 2) return true;
  return false;
}

/** Semua langkah legal untuk warna dan angka dadu tertentu. Murni. */
export function legalMovesFor(state: GameState, color: PlayerColor, die: DieValue): Move[] {
  const { config } = state;
  const moves: Move[] = [];
  state.pawns[color].forEach((from, pawn) => {
    if (from === HOME) return;
    let to: number;
    if (from === BASE) {
      if (!config.entryRolls.includes(die)) return;
      to = 0;
    } else {
      to = from + die;
      if (to > HOME) return; // home harus pas
    }

    if (!config.friendlyStacking && to !== HOME) {
      const friendlyAtDest = state.pawns[color].some((s, idx) => idx !== pawn && s === to);
      if (friendlyAtDest) return;
    }

    if (config.blockades) {
      const first = from === BASE ? 0 : from + 1;
      for (let s = first; s <= Math.min(to, LAST_TRACK_STEP); s++) {
        if (hasOpponentBlockade(state, color, absoluteIndex(color, s))) return;
      }
    }

    let captures: PawnRef[] = [];
    if (to <= LAST_TRACK_STEP) {
      const idx = absoluteIndex(color, to);
      if (!isSafeCell(config, idx)) captures = occupantsAt(state, idx).filter((o) => o.color !== color);
    }

    moves.push({
      pawn,
      from,
      to,
      kind: from === BASE ? 'enter' : to === HOME ? 'home' : 'advance',
      captures,
    });
  });
  return moves;
}
