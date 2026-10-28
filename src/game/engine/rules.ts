import { PLAYER_ORDER, PAWNS_PER_PLAYER, type PlayerColor } from '../board/boardLayout';
import { isDieValue, resolveRules, type RulesConfig } from './config';
import { legalMovesFor, locationOf, pathOf } from './movement';
import { rollDie } from './random';
import { deepFreeze, determineExtraTurnReasons, getNextPlayer } from './turnManager';
import {
  BASE,
  type ActionResult,
  type DieValue,
  type GameAction,
  type GameEvent,
  type GameState,
  type Move,
} from './types';
import { evaluateWinCondition, isPlayerFinished } from './winConditions';

export interface CreateGameOptions {
  readonly players?: readonly PlayerColor[];
  readonly config?: Partial<RulesConfig>;
  readonly seed?: number;
}

/**
 * Membuat initial GameState deterministik yang sepenuhnya dibekukan (deep freeze).
 */
export function createInitialGameState(options?: CreateGameOptions): GameState {
  const players = options?.players && options.players.length > 0 ? options.players : PLAYER_ORDER;
  const config = resolveRules(options?.config);

  const pawnsRecord: Record<PlayerColor, readonly number[]> = {
    yellow: Object.freeze([BASE, BASE, BASE, BASE]),
    blue: Object.freeze([BASE, BASE, BASE, BASE]),
    red: Object.freeze([BASE, BASE, BASE, BASE]),
    green: Object.freeze([BASE, BASE, BASE, BASE]),
  };

  const firstPlayer = players[0] ?? 'yellow';

  const initialState: GameState = {
    config,
    players: Object.freeze([...players]),
    pawns: Object.freeze(pawnsRecord),
    current: firstPlayer,
    phase: 'awaitingRoll',
    dice: null,
    legalMoves: Object.freeze([]),
    consecutiveSixes: 0,
    lastRoll: null,
    finishOrder: Object.freeze([]),
    winner: null,
    rng: (options?.seed ?? 20261021) >>> 0,
    version: 1,
  };

  return deepFreeze(initialState);
}

/**
 * Reducer deterministik murni untuk mengeksekusi aksi permainan.
 * Menghasilkan state baru yang dibekukan serta daftar event terstruktur untuk animasi/UI.
 */
export function dispatchAction(state: GameState, action: GameAction): ActionResult {
  if (state.phase === 'finished') {
    return {
      ok: false,
      state,
      error: 'GAME_OVER',
      message: 'Permainan telah selesai',
    };
  }

  if (action.expectedVersion !== undefined && action.expectedVersion !== state.version) {
    return {
      ok: false,
      state,
      error: 'STALE_ACTION',
      message: `Aksi kedaluwarsa (versi saat ini ${state.version}, diharapkan ${action.expectedVersion})`,
    };
  }

  if (action.player !== undefined && action.player !== state.current) {
    return {
      ok: false,
      state,
      error: 'NOT_YOUR_TURN',
      message: `Bukan giliran ${action.player} (giliran saat ini: ${state.current})`,
    };
  }

  switch (action.type) {
    case 'ROLL': {
      if (state.phase !== 'awaitingRoll') {
        return {
          ok: false,
          state,
          error: 'NOT_AWAITING_ROLL',
          message: 'Sedang tidak menunggu lemparan dadu',
        };
      }

      if (action.forcedValue !== undefined && !isDieValue(action.forcedValue)) {
        return {
          ok: false,
          state,
          error: 'INVALID_DIE_VALUE',
          message: 'Nilai dadu paksa tidak valid (harus bilangan bulat 1-6)',
        };
      }

      let die: DieValue;
      let nextRng = state.rng;

      if (action.forcedValue !== undefined) {
        die = action.forcedValue;
      } else {
        const [rolled, rng] = rollDie(state.rng);
        die = rolled;
        nextRng = rng;
      }

      const events: GameEvent[] = [
        {
          type: 'diceRolled',
          player: state.current,
          value: die,
        },
      ];

      const consecutiveSixes = die === 6 ? state.consecutiveSixes + 1 : 0;

      // Cek batas 3 kali berturut-turut angka 6 -> giliran hangus
      if (state.config.maxConsecutiveSixes > 0 && consecutiveSixes >= state.config.maxConsecutiveSixes) {
        events.push({
          type: 'turnForfeited',
          player: state.current,
          reason: 'consecutiveSixes',
        });

        const nextPlayer = getNextPlayer(state.players, state.current, state.finishOrder) ?? state.current;
        events.push({
          type: 'turnChanged',
          from: state.current,
          to: nextPlayer,
        });

        const nextState: GameState = deepFreeze({
          ...state,
          phase: 'awaitingRoll',
          dice: null,
          legalMoves: [],
          consecutiveSixes: 0,
          lastRoll: { player: state.current, value: die },
          current: nextPlayer,
          version: state.version + 1,
          rng: nextRng,
        });

        return { ok: true, state: nextState, events };
      }

      // Hitung langkah-langkah legal
      const moves = legalMovesFor(state, state.current, die);

      // Bila tidak ada pion yang bisa melangkah: giliran langsung beralih ke pemain berikutnya
      if (moves.length === 0) {
        events.push({
          type: 'noLegalMove',
          player: state.current,
          value: die,
        });

        const nextPlayer = getNextPlayer(state.players, state.current, state.finishOrder) ?? state.current;
        events.push({
          type: 'turnChanged',
          from: state.current,
          to: nextPlayer,
        });

        const nextState: GameState = deepFreeze({
          ...state,
          phase: 'awaitingRoll',
          dice: null,
          legalMoves: [],
          consecutiveSixes: 0,
          lastRoll: { player: state.current, value: die },
          current: nextPlayer,
          version: state.version + 1,
          rng: nextRng,
        });

        return { ok: true, state: nextState, events };
      }

      // Ada langkah legal: masuki fase memilih pion
      const nextState: GameState = deepFreeze({
        ...state,
        phase: 'awaitingMove',
        dice: die,
        legalMoves: moves,
        consecutiveSixes,
        lastRoll: { player: state.current, value: die },
        version: state.version + 1,
        rng: nextRng,
      });

      return { ok: true, state: nextState, events };
    }

    case 'MOVE': {
      if (state.phase !== 'awaitingMove') {
        return {
          ok: false,
          state,
          error: 'NOT_AWAITING_MOVE',
          message: 'Sedang tidak menunggu pergerakan pion',
        };
      }

      if (!Number.isInteger(action.pawn) || action.pawn < 0 || action.pawn >= PAWNS_PER_PLAYER) {
        return {
          ok: false,
          state,
          error: 'INVALID_PAWN',
          message: `Indeks pion tidak valid: ${action.pawn}`,
        };
      }

      const move = state.legalMoves.find((m) => m.pawn === action.pawn);
      if (!move) {
        return {
          ok: false,
          state,
          error: 'ILLEGAL_MOVE',
          message: `Pion ${action.pawn} tidak memiliki langkah legal untuk nilai dadu ${state.dice}`,
        };
      }

      // Kloning struktur posisi pion
      const nextPawns: Record<PlayerColor, number[]> = {
        yellow: [...state.pawns.yellow],
        blue: [...state.pawns.blue],
        red: [...state.pawns.red],
        green: [...state.pawns.green],
      };

      // Gerakkan pion yang dipilih
      nextPawns[state.current]![action.pawn] = move.to;

      const events: GameEvent[] = [];

      // Tangkap pion lawan jika ada
      for (const victim of move.captures) {
        nextPawns[victim.color]![victim.pawn] = BASE;
        events.push({
          type: 'pawnCaptured',
          victim,
          by: { color: state.current, pawn: action.pawn },
          at: locationOf(state.current, move.to),
        });
      }

      // Event pergerakan pion
      if (move.kind === 'enter') {
        events.push({
          type: 'pawnEntered',
          player: state.current,
          pawn: action.pawn,
          to: locationOf(state.current, 0),
        });
      } else {
        events.push({
          type: 'pawnMoved',
          player: state.current,
          pawn: action.pawn,
          from: locationOf(state.current, move.from),
          to: locationOf(state.current, move.to),
          path: pathOf(state.current, move.from, move.to),
        });
      }

      if (move.kind === 'home') {
        events.push({
          type: 'pawnHome',
          player: state.current,
          pawn: action.pawn,
        });
      }

      // Periksa apakah pemain ini baru saja menyelesaikan semua pion
      const nextFinishOrder = [...state.finishOrder];
      const playerJustFinished =
        isPlayerFinished(nextPawns[state.current]!) && !state.finishOrder.includes(state.current);

      if (playerJustFinished) {
        nextFinishOrder.push(state.current);
        events.push({
          type: 'playerFinished',
          player: state.current,
          place: nextFinishOrder.length,
        });
      }

      // Periksa evaluasi kemenangan / berakhirnya permainan
      const winCheck = evaluateWinCondition(state.players, nextFinishOrder, state.config.endCondition);
      if (winCheck.isOver) {
        events.push({
          type: 'gameOver',
          winner: winCheck.winner!,
          ranking: winCheck.ranking,
        });

        const finishedState: GameState = deepFreeze({
          ...state,
          pawns: nextPawns,
          phase: 'finished',
          dice: null,
          legalMoves: [],
          consecutiveSixes: 0,
          finishOrder: winCheck.ranking,
          winner: winCheck.winner,
          version: state.version + 1,
        });

        return { ok: true, state: finishedState, events };
      }

      // Hitung hak giliran tambahan
      const extraTurnReasons = determineExtraTurnReasons(
        state.dice,
        move,
        playerJustFinished,
        state.config,
      );

      let nextPlayer = state.current;
      let nextConsecutiveSixes = 0;

      if (extraTurnReasons.length > 0) {
        events.push({
          type: 'extraTurn',
          player: state.current,
          reasons: extraTurnReasons,
        });
        nextPlayer = state.current;
        nextConsecutiveSixes = extraTurnReasons.includes('six') ? state.consecutiveSixes : 0;
      } else {
        nextPlayer = getNextPlayer(state.players, state.current, nextFinishOrder) ?? state.current;
        events.push({
          type: 'turnChanged',
          from: state.current,
          to: nextPlayer,
        });
        nextConsecutiveSixes = 0;
      }

      const nextState: GameState = deepFreeze({
        ...state,
        pawns: nextPawns,
        phase: 'awaitingRoll',
        dice: null,
        legalMoves: [],
        consecutiveSixes: nextConsecutiveSixes,
        current: nextPlayer,
        finishOrder: nextFinishOrder,
        winner: null,
        version: state.version + 1,
      });

      return { ok: true, state: nextState, events };
    }

    default: {
      return {
        ok: false,
        state,
        error: 'ILLEGAL_MOVE',
        message: 'Tipe aksi tidak dikenali',
      };
    }
  }
}

/** Daftar pion pemain saat ini yang bisa dipilih untuk bergerak. */
export function getSelectablePawns(state: GameState): number[] {
  if (state.phase !== 'awaitingMove') return [];
  return state.legalMoves.map((m) => m.pawn);
}

/** Mengambil data langkah untuk pion tertentu. */
export function getMoveForPawn(state: GameState, pawn: number): Move | undefined {
  return state.legalMoves.find((m) => m.pawn === pawn);
}
