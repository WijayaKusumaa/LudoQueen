import { describe, expect, it } from 'vitest';
import { PLAYER_ORDER, START_INDEX, TRACK_LENGTH } from '../game/board/boardLayout';
import {
  BASE,
  HOME,
  LAST_TRACK_STEP,
  absoluteIndex,
  createInitialGameState,
  dispatchAction,
  locationOf,
  type GameState,
} from '../game/engine';

describe('Ludo Game Engine', () => {
  describe('1. Starting positions and movement directions', () => {
    it('tiap pemain memiliki titik start yang tepat pada jalur bersama dan bergerak searah jarum jam', () => {
      expect(START_INDEX.yellow).toBe(0);
      expect(START_INDEX.blue).toBe(13);
      expect(START_INDEX.red).toBe(26);
      expect(START_INDEX.green).toBe(39);

      // Jalur bersama 51 petak (step 0..50)
      for (const color of PLAYER_ORDER) {
        expect(absoluteIndex(color, 0)).toBe(START_INDEX[color]);
        expect(absoluteIndex(color, 1)).toBe((START_INDEX[color] + 1) % TRACK_LENGTH);
        expect(absoluteIndex(color, LAST_TRACK_STEP)).toBe(
          (START_INDEX[color] + LAST_TRACK_STEP) % TRACK_LENGTH,
        );
      }
    });

    it('jalur rumah (lane) tiap pemain berada tepat setelah step 50 dan mengarah ke home', () => {
      for (const color of PLAYER_ORDER) {
        // Step 51..55 adalah lane step 0..4
        for (let s = 51; s <= 55; s++) {
          const loc = locationOf(color, s);
          expect(loc.kind).toBe('lane');
          if (loc.kind === 'lane') {
            expect(loc.index).toBe(s - 51);
          }
        }
        // Step 56 adalah home
        expect(locationOf(color, HOME)).toEqual({ kind: 'home' });
      }
    });
  });

  describe('2. Entering the track from base', () => {
    it('pion tidak bisa keluar dari base jika lemparan dadu bukan angka pembuka (default: 6)', () => {
      let state = createInitialGameState();
      expect(state.current).toBe('yellow');

      // Lempar dadu angka 5
      const rollRes = dispatchAction(state, { type: 'ROLL', forcedValue: 5 });
      expect(rollRes.ok).toBe(true);
      if (!rollRes.ok) return;

      // Karena semua pion di base dan angka 5 bukan angka keluar, giliran beralih (noLegalMove)
      expect(rollRes.events.some((e) => e.type === 'noLegalMove')).toBe(true);
      expect(rollRes.state.current).toBe('blue'); // pindah ke pemain berikutnya
      expect(rollRes.state.pawns.yellow.every((s) => s === BASE)).toBe(true);
    });

    it('pion keluar ke petak awal saat melempar angka 6', () => {
      const state = createInitialGameState();
      const rollRes = dispatchAction(state, { type: 'ROLL', forcedValue: 6 });
      expect(rollRes.ok).toBe(true);
      if (!rollRes.ok) return;

      expect(rollRes.state.phase).toBe('awaitingMove');
      expect(rollRes.state.legalMoves).toHaveLength(4); // ke-4 pion di base boleh keluar
      expect(rollRes.state.legalMoves[0]!.kind).toBe('enter');
      expect(rollRes.state.legalMoves[0]!.to).toBe(0);

      const moveRes = dispatchAction(rollRes.state, { type: 'MOVE', pawn: 0 });
      expect(moveRes.ok).toBe(true);
      if (!moveRes.ok) return;

      expect(moveRes.state.pawns.yellow[0]).toBe(0);
      expect(locationOf('yellow', 0)).toEqual({ kind: 'track', index: 0 });
      expect(moveRes.events.some((e) => e.type === 'pawnEntered')).toBe(true);
    });

    it('mendukung konfigurasi angka pembuka khusus (misalnya [1, 6])', () => {
      const state = createInitialGameState({ config: { entryRolls: [1, 6] } });
      const rollRes = dispatchAction(state, { type: 'ROLL', forcedValue: 1 });
      expect(rollRes.ok).toBe(true);
      if (!rollRes.ok) return;

      expect(rollRes.state.phase).toBe('awaitingMove');
      expect(rollRes.state.legalMoves).toHaveLength(4);
    });
  });

  describe('3. Movement across the shared track and entering home lane', () => {
    it('pergerakan melintasi ujung indeks jalur 52 membungkus secara siklis (circular wrapping)', () => {
      // Blue mulai di index 13. Step 38 berada di index (13+38)%52 = 51. Step 39 berada di index 0.
      expect(absoluteIndex('blue', 38)).toBe(51);
      expect(absoluteIndex('blue', 39)).toBe(0);
      expect(absoluteIndex('blue', 40)).toBe(1);
    });

    it('pion beralih mulus dari jalur bersama (step 50) ke lane rumah (step 51..55)', () => {
      // Setup state artifisial dengan memodifikasi game state awal
      const baseState = createInitialGameState();
      const customState: GameState = {
        ...baseState,
        pawns: {
          ...baseState.pawns,
          yellow: [49, BASE, BASE, BASE],
        },
      };

      // Lempar angka 3: dari step 49 -> step 52 (lane step 1)
      const rollRes = dispatchAction(customState, { type: 'ROLL', forcedValue: 3 });
      expect(rollRes.ok).toBe(true);
      if (!rollRes.ok) return;

      const moveRes = dispatchAction(rollRes.state, { type: 'MOVE', pawn: 0 });
      expect(moveRes.ok).toBe(true);
      if (!moveRes.ok) return;

      expect(moveRes.state.pawns.yellow[0]).toBe(52);
      expect(locationOf('yellow', 52)).toEqual({ kind: 'lane', index: 1 });

      // Cek jejak jalur (path) untuk animasi
      const moveEvent = moveRes.events.find((e) => e.type === 'pawnMoved');
      expect(moveEvent).toBeDefined();
      if (moveEvent && moveEvent.type === 'pawnMoved') {
        expect(moveEvent.path).toHaveLength(3);
        expect(moveEvent.path[0]).toEqual({ kind: 'track', index: 50 });
        expect(moveEvent.path[1]).toEqual({ kind: 'lane', index: 0 });
        expect(moveEvent.path[2]).toEqual({ kind: 'lane', index: 1 });
      }
    });
  });

  describe('4. Safe squares behavior', () => {
    it('pion lawan di petak aman (start atau bintang) tidak tertangkap saat diduduki', () => {
      const baseState = createInitialGameState();
      // Kuning di index 2 (step 2). Biru di index 8 (bintang aman). Jarak = 6 langkah.
      const customState: GameState = {
        ...baseState,
        current: 'yellow',
        pawns: {
          ...baseState.pawns,
          yellow: [2, BASE, BASE, BASE],
          blue: [BASE, BASE, BASE, BASE], // kita tempatkan biru di track index 8
        },
      };
      // Hitung step Blue agar berada di track index 8:
      // (13 + step) % 52 = 8 -> step = 47.
      const stateWithBlueOnStar: GameState = {
        ...customState,
        pawns: {
          ...customState.pawns,
          blue: [47, BASE, BASE, BASE],
        },
      };

      const rollRes = dispatchAction(stateWithBlueOnStar, { type: 'ROLL', forcedValue: 6 });
      expect(rollRes.ok).toBe(true);
      if (!rollRes.ok) return;

      const move = rollRes.state.legalMoves.find((m) => m.pawn === 0);
      expect(move).toBeDefined();
      expect(move!.to).toBe(8); // step 8 Kuning = track index 8 (bintang aman)
      expect(move!.captures).toHaveLength(0); // TIDAK ada tangkapan karena petak aman

      const moveRes = dispatchAction(rollRes.state, { type: 'MOVE', pawn: 0 });
      expect(moveRes.ok).toBe(true);
      if (!moveRes.ok) return;

      // Keduanya tetap di petak yang sama tanpa saling makan
      expect(moveRes.state.pawns.yellow[0]).toBe(8);
      expect(moveRes.state.pawns.blue[0]).toBe(47);
      expect(moveRes.events.some((e) => e.type === 'pawnCaptured')).toBe(false);
    });

    it('petak bintang dapat dimakan jika aturan safeCells diatur ke "none"', () => {
      const baseState = createInitialGameState({ config: { safeCells: 'none' } });
      const customState: GameState = {
        ...baseState,
        current: 'yellow',
        pawns: {
          ...baseState.pawns,
          yellow: [2, BASE, BASE, BASE],
          blue: [47, BASE, BASE, BASE], // index 8
        },
      };

      const rollRes = dispatchAction(customState, { type: 'ROLL', forcedValue: 6 });
      expect(rollRes.ok).toBe(true);
      if (!rollRes.ok) return;

      const move = rollRes.state.legalMoves.find((m) => m.pawn === 0);
      expect(move!.captures).toHaveLength(1);
      expect(move!.captures[0]!.color).toBe('blue');
    });
  });

  describe('5. Capturing opponent pawn', () => {
    it('menangkap pion lawan di petak biasa mengembalikannya ke base dan memberi giliran ekstra', () => {
      const baseState = createInitialGameState();
      // Kuning di step 0 (index 0). Biru di index 3 (step Blue: (13 + 42) % 52 = 3).
      const customState: GameState = {
        ...baseState,
        current: 'yellow',
        pawns: {
          ...baseState.pawns,
          yellow: [0, BASE, BASE, BASE],
          blue: [42, BASE, BASE, BASE], // index 3
        },
      };

      const rollRes = dispatchAction(customState, { type: 'ROLL', forcedValue: 3 });
      expect(rollRes.ok).toBe(true);
      if (!rollRes.ok) return;

      const move = rollRes.state.legalMoves.find((m) => m.pawn === 0);
      expect(move).toBeDefined();
      expect(move!.captures).toEqual([{ color: 'blue', pawn: 0 }]);

      const moveRes = dispatchAction(rollRes.state, { type: 'MOVE', pawn: 0 });
      expect(moveRes.ok).toBe(true);
      if (!moveRes.ok) return;

      // Pion Blue kembali ke base (-1)
      expect(moveRes.state.pawns.blue[0]).toBe(BASE);
      // Pion Yellow menempati step 3
      expect(moveRes.state.pawns.yellow[0]).toBe(3);

      // Event pawnCaptured dipancarkan
      const capEvent = moveRes.events.find((e) => e.type === 'pawnCaptured');
      expect(capEvent).toBeDefined();

      // Mendapat giliran tambahan karena menangkap pion
      expect(moveRes.events.some((e) => e.type === 'extraTurn')).toBe(true);
      expect(moveRes.state.current).toBe('yellow'); // giliran tetap pada Kuning
    });
  });

  describe('6. Stacking and blockade rules', () => {
    it('friendlyStacking: true mengizinkan pion sewarna bertumpuk di petak yang sama', () => {
      const baseState = createInitialGameState({ config: { friendlyStacking: true } });
      const customState: GameState = {
        ...baseState,
        current: 'yellow',
        pawns: {
          ...baseState.pawns,
          yellow: [4, 1, BASE, BASE], // pion 0 di 4, pion 1 di 1
        },
      };

      const rollRes = dispatchAction(customState, { type: 'ROLL', forcedValue: 3 });
      expect(rollRes.ok).toBe(true);
      if (!rollRes.ok) return;

      // Pion 1 (di step 1) boleh melangkah ke step 4 meskipun sudah ada pion 0
      const movePawn1 = rollRes.state.legalMoves.find((m) => m.pawn === 1);
      expect(movePawn1).toBeDefined();
      expect(movePawn1!.to).toBe(4);
    });

    it('friendlyStacking: false melarang pion mendarat di petak yang sudah ada pion sewarna', () => {
      const baseState = createInitialGameState({ config: { friendlyStacking: false } });
      const customState: GameState = {
        ...baseState,
        current: 'yellow',
        pawns: {
          ...baseState.pawns,
          yellow: [4, 1, BASE, BASE],
        },
      };

      const rollRes = dispatchAction(customState, { type: 'ROLL', forcedValue: 3 });
      expect(rollRes.ok).toBe(true);
      if (!rollRes.ok) return;

      // Langkah untuk pion 1 terhalang karena petak 4 sudah ditempati pion 0
      const movePawn1 = rollRes.state.legalMoves.find((m) => m.pawn === 1);
      expect(movePawn1).toBeUndefined();
    });

    it('blockades: true membuat 2+ pion lawan menghalangi perlintasan dan penangkapan', () => {
      const baseState = createInitialGameState({ config: { blockades: true } });
      // Biru menempatkan 2 pion di index 5 (membentuk blokade)
      // Kuning di index 2 (step 2)
      // Step Blue untuk index 5: (13 + 44) % 52 = 5
      const customState: GameState = {
        ...baseState,
        current: 'yellow',
        pawns: {
          ...baseState.pawns,
          yellow: [2, BASE, BASE, BASE],
          blue: [44, 44, BASE, BASE], // blokade di index 5
        },
      };

      // Kuning melempar 4 (mau ke index 6, harus melewati index 5) -> terhalang
      const rollRes = dispatchAction(customState, { type: 'ROLL', forcedValue: 4 });
      expect(rollRes.ok).toBe(true);
      if (!rollRes.ok) return;
      expect(rollRes.state.legalMoves).toHaveLength(0);

      // Kuning melempar 3 (mau mendarat di index 5) -> tidak boleh makan blokade
      const rollRes2 = dispatchAction(customState, { type: 'ROLL', forcedValue: 3 });
      expect(rollRes2.ok).toBe(true);
      if (!rollRes2.ok) return;
      expect(rollRes2.state.legalMoves).toHaveLength(0);
    });
  });

  describe('7. Extra turn behavior', () => {
    it('melempar angka 6 memberikan giliran tambahan', () => {
      const state = createInitialGameState();
      const r1 = dispatchAction(state, { type: 'ROLL', forcedValue: 6 });
      const m1 = dispatchAction(r1.state, { type: 'MOVE', pawn: 0 });

      expect(m1.ok).toBe(true);
      if (!m1.ok) return;

      expect(m1.state.current).toBe('yellow'); // masih giliran kuning
      expect(m1.state.phase).toBe('awaitingRoll');
      expect(m1.events.some((e) => e.type === 'extraTurn')).toBe(true);
    });

    it('tiga kali berturut-turut angka 6 menghanguskan giliran pemain', () => {
      let state = createInitialGameState({ config: { maxConsecutiveSixes: 3 } });

      // Roll 1: dapat 6
      const r1 = dispatchAction(state, { type: 'ROLL', forcedValue: 6 });
      const m1 = dispatchAction(r1.state, { type: 'MOVE', pawn: 0 });
      expect(m1.state.current).toBe('yellow');

      // Roll 2: dapat 6
      const r2 = dispatchAction(m1.state, { type: 'ROLL', forcedValue: 6 });
      const m2 = dispatchAction(r2.state, { type: 'MOVE', pawn: 1 });
      expect(m2.state.current).toBe('yellow');

      // Roll 3: dapat 6 lagi -> giliran hangus!
      const r3 = dispatchAction(m2.state, { type: 'ROLL', forcedValue: 6 });
      expect(r3.ok).toBe(true);
      if (!r3.ok) return;

      expect(r3.events.some((e) => e.type === 'turnForfeited')).toBe(true);
      expect(r3.state.current).toBe('blue'); // pindah ke lawan
      expect(r3.state.consecutiveSixes).toBe(0);
    });
  });

  describe('8. No legal move turns', () => {
    it('bila tidak ada langkah legal, giliran otomatis berganti ke pemain berikutnya', () => {
      const state = createInitialGameState();
      expect(state.current).toBe('yellow');

      const rollRes = dispatchAction(state, { type: 'ROLL', forcedValue: 2 });
      expect(rollRes.ok).toBe(true);
      if (!rollRes.ok) return;

      expect(rollRes.events.some((e) => e.type === 'noLegalMove')).toBe(true);
      expect(rollRes.events.some((e) => e.type === 'turnChanged')).toBe(true);
      expect(rollRes.state.current).toBe('blue');
      expect(rollRes.state.phase).toBe('awaitingRoll');
    });
  });

  describe('9. Exact home entry', () => {
    it('membutuhkan angka dadu yang tepat untuk masuk ke HOME (step 56)', () => {
      const baseState = createInitialGameState();
      // Pion di step 54 (butuh 2 untuk masuk home di 56)
      const customState: GameState = {
        ...baseState,
        current: 'yellow',
        pawns: {
          ...baseState.pawns,
          yellow: [54, BASE, BASE, BASE],
        },
      };

      // Dadu 3: melebihi 56 -> tidak ada langkah legal (overshoot)
      const roll3 = dispatchAction(customState, { type: 'ROLL', forcedValue: 3 });
      expect(roll3.state.legalMoves).toHaveLength(0);

      // Dadu 1: maju ke step 55 (masih di lane)
      const roll1 = dispatchAction(customState, { type: 'ROLL', forcedValue: 1 });
      expect(roll1.state.legalMoves[0]!.to).toBe(55);
      expect(roll1.state.legalMoves[0]!.kind).toBe('advance');

      // Dadu 2: tepat masuk ke 56 (HOME)
      const roll2 = dispatchAction(customState, { type: 'ROLL', forcedValue: 2 });
      expect(roll2.state.legalMoves[0]!.to).toBe(HOME);
      expect(roll2.state.legalMoves[0]!.kind).toBe('home');

      const moveRes = dispatchAction(roll2.state, { type: 'MOVE', pawn: 0 });
      expect(moveRes.ok).toBe(true);
      if (!moveRes.ok) return;
      expect(moveRes.events.some((e) => e.type === 'pawnHome')).toBe(true);
    });
  });

  describe('10. Winning and game over conditions', () => {
    it('permainan selesai seketika satu pemain memasukkan ke-4 pionnya ke HOME (firstFinisher)', () => {
      const baseState = createInitialGameState();
      // Tiga pion sudah di home, pion terakhir di step 55 (butuh 1)
      const customState: GameState = {
        ...baseState,
        current: 'yellow',
        pawns: {
          ...baseState.pawns,
          yellow: [HOME, HOME, HOME, 55],
        },
      };

      const rollRes = dispatchAction(customState, { type: 'ROLL', forcedValue: 1 });
      const moveRes = dispatchAction(rollRes.state, { type: 'MOVE', pawn: 3 });

      expect(moveRes.ok).toBe(true);
      if (!moveRes.ok) return;

      expect(moveRes.state.phase).toBe('finished');
      expect(moveRes.state.winner).toBe('yellow');
      expect(moveRes.events.some((e) => e.type === 'playerFinished')).toBe(true);
      expect(moveRes.events.some((e) => e.type === 'gameOver')).toBe(true);

      // Aksi lanjutan setelah selesai ditolak dengan error GAME_OVER
      const afterAction = dispatchAction(moveRes.state, { type: 'ROLL', forcedValue: 6 });
      expect(afterAction.ok).toBe(false);
      if (!afterAction.ok) {
        expect(afterAction.error).toBe('GAME_OVER');
      }
    });
  });

  describe('11. Invalid actions, stale action prevention, and state immutability', () => {
    it('menolak lemparan dadu saat sedang berada di fase memilih pion', () => {
      const state = createInitialGameState();
      const r1 = dispatchAction(state, { type: 'ROLL', forcedValue: 6 });
      expect(r1.state.phase).toBe('awaitingMove');

      const r2 = dispatchAction(r1.state, { type: 'ROLL', forcedValue: 2 });
      expect(r2.ok).toBe(false);
      if (!r2.ok) {
        expect(r2.error).toBe('NOT_AWAITING_ROLL');
      }
    });

    it('menolak aksi pemain di luar giliran (NOT_YOUR_TURN)', () => {
      const state = createInitialGameState();
      expect(state.current).toBe('yellow');

      const rollBlue = dispatchAction(state, { type: 'ROLL', player: 'blue', forcedValue: 6 });
      expect(rollBlue.ok).toBe(false);
      if (!rollBlue.ok) {
        expect(rollBlue.error).toBe('NOT_YOUR_TURN');
      }
    });

    it('menolak aksi dengan expectedVersion basi untuk mencegah klik ganda (STALE_ACTION)', () => {
      const state = createInitialGameState();
      expect(state.version).toBe(1);

      // Kirim expectedVersion 99 (tidak cocok)
      const staleRes = dispatchAction(state, { type: 'ROLL', expectedVersion: 99, forcedValue: 6 });
      expect(staleRes.ok).toBe(false);
      if (!staleRes.ok) {
        expect(staleRes.error).toBe('STALE_ACTION');
      }
    });

    it('menolak indeks pion yang tidak valid atau langkah ilegal', () => {
      const state = createInitialGameState();
      const r1 = dispatchAction(state, { type: 'ROLL', forcedValue: 6 });

      const invalidPawn = dispatchAction(r1.state, { type: 'MOVE', pawn: 99 });
      expect(invalidPawn.ok).toBe(false);
      if (!invalidPawn.ok) {
        expect(invalidPawn.error).toBe('INVALID_PAWN');
      }
    });

    it('state dibekukan (deep frozen) sehingga kebal terhadap mutasi eksternal', () => {
      const state = createInitialGameState();
      expect(Object.isFrozen(state)).toBe(true);
      expect(Object.isFrozen(state.pawns)).toBe(true);
      expect(Object.isFrozen(state.pawns.yellow)).toBe(true);

      // Percobaan mutasi melempar TypeError dalam strict mode
      expect(() => {
        // @ts-expect-error Pengujian mutasi ilegal eksternal
        state.current = 'blue';
      }).toThrow();

      expect(() => {
        // @ts-expect-error Pengujian mutasi ilegal eksternal
        state.pawns.yellow[0] = 10;
      }).toThrow();
    });
  });
});
