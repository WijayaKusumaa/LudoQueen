import { HOME_LANE_LENGTH, PAWNS_PER_PLAYER, TRACK_LENGTH, type PlayerColor } from '../board/boardLayout';
import type { RulesConfig } from './config';

export type { PlayerColor };
export { PAWNS_PER_PLAYER };

export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;

/*
 * Progres pion ("step") relatif terhadap pemiliknya:
 *   -1        di base
 *   0..50     jalur bersama; indeks absolut = (START_INDEX[warna] + step) % 52
 *   51..55    jalur rumah warna itu (indeks lane 0..4)
 *   56        sudah di home (pusat)
 */
export const BASE = -1;
export const LAST_TRACK_STEP = TRACK_LENGTH - 2; // 50
export const FIRST_LANE_STEP = TRACK_LENGTH - 1; // 51
export const HOME = FIRST_LANE_STEP + HOME_LANE_LENGTH; // 56

export interface PawnRef {
  readonly color: PlayerColor;
  readonly pawn: number;
}

/** Lokasi pion dalam istilah papan, untuk UI dan animasi. */
export type PawnLocation =
  | { readonly kind: 'base' }
  | { readonly kind: 'track'; readonly index: number }
  | { readonly kind: 'lane'; readonly index: number }
  | { readonly kind: 'home' };

export type MoveKind = 'enter' | 'advance' | 'home';

export interface Move {
  readonly pawn: number;
  readonly from: number;
  readonly to: number;
  readonly kind: MoveKind;
  /** Pion lawan yang akan dikembalikan ke base oleh langkah ini. */
  readonly captures: readonly PawnRef[];
}

export type Phase = 'awaitingRoll' | 'awaitingMove' | 'finished';

export interface GameState {
  readonly config: RulesConfig;
  /** Pemain aktif, urut searah jarum jam. */
  readonly players: readonly PlayerColor[];
  /** Step tiap pion per warna (selalu 4 warna; warna nonaktif diabaikan). */
  readonly pawns: Readonly<Record<PlayerColor, readonly number[]>>;
  readonly current: PlayerColor;
  readonly phase: Phase;
  /** Dadu yang menunggu dipakai (hanya saat awaitingMove). */
  readonly dice: DieValue | null;
  readonly legalMoves: readonly Move[];
  readonly consecutiveSixes: number;
  readonly lastRoll: { readonly player: PlayerColor; readonly value: DieValue } | null;
  /** Urutan pemain yang sudah menyelesaikan keempat pion. */
  readonly finishOrder: readonly PlayerColor[];
  readonly winner: PlayerColor | null;
  /** State PRNG (uint32). */
  readonly rng: number;
  /** Naik satu setiap aksi yang berhasil; dipakai untuk menolak aksi basi/ganda. */
  readonly version: number;
}

interface ActionBase {
  /** Bila diisi, aksi ditolak kecuali sama dengan state.version (cegah klik ganda). */
  readonly expectedVersion?: number;
  /** Bila diisi, aksi ditolak kecuali pemain ini yang sedang giliran. */
  readonly player?: PlayerColor;
}

export type GameAction =
  | (ActionBase & {
      readonly type: 'ROLL';
      /** Kait untuk tes/debug: memaksa hasil dadu alih-alih memakai PRNG. */
      readonly forcedValue?: DieValue;
    })
  | (ActionBase & { readonly type: 'MOVE'; readonly pawn: number });

export type ExtraTurnReason = 'six' | 'capture' | 'home';

export type GameEvent =
  | { readonly type: 'diceRolled'; readonly player: PlayerColor; readonly value: DieValue }
  | { readonly type: 'turnForfeited'; readonly player: PlayerColor; readonly reason: 'consecutiveSixes' }
  | { readonly type: 'noLegalMove'; readonly player: PlayerColor; readonly value: DieValue }
  | { readonly type: 'pawnEntered'; readonly player: PlayerColor; readonly pawn: number; readonly to: PawnLocation }
  | {
      readonly type: 'pawnMoved';
      readonly player: PlayerColor;
      readonly pawn: number;
      readonly from: PawnLocation;
      readonly to: PawnLocation;
      /** Setiap sel yang dilewati, satu per langkah, termasuk sel akhir. */
      readonly path: readonly PawnLocation[];
    }
  | { readonly type: 'pawnCaptured'; readonly victim: PawnRef; readonly by: PawnRef; readonly at: PawnLocation }
  | { readonly type: 'pawnHome'; readonly player: PlayerColor; readonly pawn: number }
  | { readonly type: 'extraTurn'; readonly player: PlayerColor; readonly reasons: readonly ExtraTurnReason[] }
  | { readonly type: 'turnChanged'; readonly from: PlayerColor; readonly to: PlayerColor }
  | { readonly type: 'playerFinished'; readonly player: PlayerColor; readonly place: number }
  | { readonly type: 'gameOver'; readonly winner: PlayerColor; readonly ranking: readonly PlayerColor[] };

export type EngineErrorCode =
  | 'GAME_OVER'
  | 'STALE_ACTION'
  | 'NOT_YOUR_TURN'
  | 'NOT_AWAITING_ROLL'
  | 'NOT_AWAITING_MOVE'
  | 'INVALID_DIE_VALUE'
  | 'INVALID_PAWN'
  | 'ILLEGAL_MOVE';

export type ActionResult =
  | { readonly ok: true; readonly state: GameState; readonly events: readonly GameEvent[] }
  | { readonly ok: false; readonly state: GameState; readonly error: EngineErrorCode; readonly message: string };
