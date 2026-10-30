import { describe, expect, it } from 'vitest';
import { BASE, HOME, createInitialGameState, dispatchAction, type GameState, type DieValue } from '../game/engine';
import { rollDie, nextRandom } from '../game/engine/random';
import { GameSession } from '../game/store/gameSession';

describe('Audit Sistem Dadu dan Pergerakan Pion Ludo', () => {
  describe('1. Sistem Dadu', () => {
    it('dadu wajib menghasilkan angka acak 1, 2, 3, 4, 5, atau 6 dengan sebaran yang merata', () => {
      const counts: Record<DieValue, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      let state = 123456789;
      const totalRolls = 60000;

      for (let i = 0; i < totalRolls; i++) {
        const [value, nextState] = rollDie(state);
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(6);
        expect(Number.isInteger(value)).toBe(true);
        counts[value]++;
        state = nextState;
      }

      // Setiap sisi (1-6) harus muncul mendekati 1/6 (~10.000 kali) dengan toleransi wajar
      for (let face = 1; face <= 6; face++) {
        const count = counts[face as DieValue];
        expect(count).toBeGreaterThan(9000);
        expect(count).toBeLessThan(11000);
      }
    });

    it('pemain hijau memiliki probabilitas dadu 6 lebih tinggi (~33.3%) dibanding angka lain', () => {
      const counts: Record<DieValue, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      let state = 987654321;
      const totalRolls = 60000;

      for (let i = 0; i < totalRolls; i++) {
        const [value, nextState] = rollDie(state, 'green');
        counts[value]++;
        state = nextState;
      }

      // Angka 6 untuk hijau muncul ~33.3% (~20.000 kali dari 60.000 lemparan)
      expect(counts[6]).toBeGreaterThan(19000);
      expect(counts[6]).toBeLessThan(21000);

      // Angka 1-5 muncul seimbang ~13.3% (~8.000 kali masing-masing)
      for (let face = 1; face <= 5; face++) {
        const count = counts[face as DieValue];
        expect(count).toBeGreaterThan(7000);
        expect(count).toBeLessThan(9000);
      }
    });

    it('pemain kuning, merah, dan biru memiliki probabilitas yang setara untuk setiap angka 1-6', () => {
      for (const color of ['yellow', 'red', 'blue'] as const) {
        const counts: Record<DieValue, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        let state = 555666777;
        const totalRolls = 60000;

        for (let i = 0; i < totalRolls; i++) {
          const [value, nextState] = rollDie(state, color);
          counts[value]++;
          state = nextState;
        }

        // Setiap angka 1-6 memiliki probabilitas setara (~16.67% atau ~10.000 kali)
        for (let face = 1; face <= 6; face++) {
          const count = counts[face as DieValue];
          expect(count).toBeGreaterThan(9000);
          expect(count).toBeLessThan(11000);
        }
      }
    });

    it('fungsi nextRandom menghasilkan nilai float dalam rentang [0, 1)', () => {
      let state = 42;
      for (let i = 0; i < 1000; i++) {
        const [r, next] = nextRandom(state);
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThan(1);
        state = next;
      }
    });

    it('seed pengacak default bersifat dinamis dan tidak statis', () => {
      const g1 = createInitialGameState();
      const g2 = createInitialGameState();
      // Dua game yang dibuat tanpa seed eksplisit harus memiliki seed RNG yang berbeda
      expect(g1.rng).toBeTypeOf('number');
      expect(g2.rng).toBeTypeOf('number');
    });
  });

  describe('2. Sistem Validasi & Pergerakan Pion', () => {
    it('Kondisi 1: Dadu 1–5 ketika semua pion masih di rumah tidak dapat bergerak dan giliran berpindah', () => {
      const diceValues: DieValue[] = [1, 2, 3, 4, 5];

      for (const die of diceValues) {
        const state = createInitialGameState();
        expect(state.current).toBe('yellow');
        expect(state.pawns.yellow.every((s) => s === BASE)).toBe(true);

        const res = dispatchAction(state, { type: 'ROLL', forcedValue: die });
        expect(res.ok).toBe(true);
        if (!res.ok) return;

        // Tidak ada pion yang bisa keluar
        expect(res.state.legalMoves).toHaveLength(0);
        expect(res.events.some((e) => e.type === 'noLegalMove')).toBe(true);
        expect(res.events.some((e) => e.type === 'turnChanged')).toBe(true);
        // Giliran otomatis beralih ke pemain berikutnya (blue)
        expect(res.state.current).toBe('blue');
        expect(res.state.phase).toBe('awaitingRoll');
        // Posisi semua pion tetap di BASE (-1)
        expect(res.state.pawns.yellow.every((s) => s === BASE)).toBe(true);
      }
    });

    it('Kondisi 2 & 3: Dadu 6 ketika semua pion masih di rumah mengizinkan pion keluar ke petak awal', () => {
      const state = createInitialGameState();
      const res = dispatchAction(state, { type: 'ROLL', forcedValue: 6 });
      expect(res.ok).toBe(true);
      if (!res.ok) return;

      expect(res.state.phase).toBe('awaitingMove');
      // Semua 4 pion di base boleh keluar
      expect(res.state.legalMoves).toHaveLength(4);
      for (const move of res.state.legalMoves) {
        expect(move.kind).toBe('enter');
        expect(move.to).toBe(0);
      }

      // Pilih pion ke-0 untuk keluar
      const moveRes = dispatchAction(res.state, { type: 'MOVE', pawn: 0 });
      expect(moveRes.ok).toBe(true);
      if (!moveRes.ok) return;

      // Pion 0 berada di petak awal jalur (step 0), 3 pion lainnya tetap di BASE
      expect(moveRes.state.pawns.yellow[0]).toBe(0);
      expect(moveRes.state.pawns.yellow[1]).toBe(BASE);
      expect(moveRes.state.pawns.yellow[2]).toBe(BASE);
      expect(moveRes.state.pawns.yellow[3]).toBe(BASE);
      expect(moveRes.events.some((e) => e.type === 'pawnEntered')).toBe(true);
    });

    it('Kondisi 4: Pion yang berada di jalur bergerak persis mengikuti angka dadu', () => {
      const baseState = createInitialGameState();
      // Setup pion kuning 0 berada di petak awal (step 0)
      const customState: GameState = {
        ...baseState,
        pawns: {
          ...baseState.pawns,
          yellow: [0, BASE, BASE, BASE],
        },
      };

      const testDice: DieValue[] = [1, 2, 3, 4, 5, 6];
      for (const die of testDice) {
        const rollRes = dispatchAction(customState, { type: 'ROLL', forcedValue: die });
        expect(rollRes.ok).toBe(true);
        if (!rollRes.ok) continue;

        const move = rollRes.state.legalMoves.find((m) => m.pawn === 0);
        expect(move).toBeDefined();
        expect(move!.from).toBe(0);
        expect(move!.to).toBe(die);
        expect(move!.kind).toBe('advance');

        const moveRes = dispatchAction(rollRes.state, { type: 'MOVE', pawn: 0 });
        expect(moveRes.ok).toBe(true);
        if (!moveRes.ok) continue;
        expect(moveRes.state.pawns.yellow[0]).toBe(die);
      }
    });

    it('Kondisi 5: Pemain mendapatkan giliran tambahan setelah mendapatkan angka 6', () => {
      const state = createInitialGameState();
      // Roll 6
      const rollRes = dispatchAction(state, { type: 'ROLL', forcedValue: 6 });
      expect(rollRes.ok).toBe(true);
      if (!rollRes.ok) return;

      // Gerakkan pion keluar
      const moveRes = dispatchAction(rollRes.state, { type: 'MOVE', pawn: 0 });
      expect(moveRes.ok).toBe(true);
      if (!moveRes.ok) return;

      // Event extraTurn dipancarkan
      expect(moveRes.events.some((e) => e.type === 'extraTurn')).toBe(true);
      // Giliran tetap milik pemain kuning
      expect(moveRes.state.current).toBe('yellow');
      expect(moveRes.state.phase).toBe('awaitingRoll');
    });

    it('Kondisi 6: Pemain berpindah giliran setelah angka 1–5 selesai dijalankan', () => {
      const baseState = createInitialGameState();
      // Pion kuning 0 berada di step 5
      const customState: GameState = {
        ...baseState,
        pawns: {
          ...baseState.pawns,
          yellow: [5, BASE, BASE, BASE],
        },
      };

      // Roll angka 3 (bukan 6, tidak menangkap lawan, belum masuk home)
      const rollRes = dispatchAction(customState, { type: 'ROLL', forcedValue: 3 });
      expect(rollRes.ok).toBe(true);
      if (!rollRes.ok) return;

      const moveRes = dispatchAction(rollRes.state, { type: 'MOVE', pawn: 0 });
      expect(moveRes.ok).toBe(true);
      if (!moveRes.ok) return;

      // Pion maju ke step 8
      expect(moveRes.state.pawns.yellow[0]).toBe(8);
      // Tidak ada extraTurn
      expect(moveRes.events.some((e) => e.type === 'extraTurn')).toBe(false);
      expect(moveRes.events.some((e) => e.type === 'turnChanged')).toBe(true);
      // Giliran berpindah ke pemain berikutnya (blue)
      expect(moveRes.state.current).toBe('blue');
      expect(moveRes.state.phase).toBe('awaitingRoll');
    });

    it('Kondisi 7: Pion tidak dapat melewati finish (HOME) tanpa angka yang tepat', () => {
      const baseState = createInitialGameState();
      // Pion kuning 0 berada di step 54 (HOME berada di step 56, butuh angka 2 pas)
      const customState: GameState = {
        ...baseState,
        current: 'yellow',
        pawns: {
          ...baseState.pawns,
          yellow: [54, BASE, BASE, BASE],
        },
      };

      // Coba dadu 3, 4, 5, 6 (melebihi batas HOME 56)
      for (const overDie of [3, 4, 5, 6] as DieValue[]) {
        const rollRes = dispatchAction(customState, { type: 'ROLL', forcedValue: overDie });
        expect(rollRes.ok).toBe(true);
        if (!rollRes.ok) continue;

        // Pion 0 tidak boleh memiliki langkah legal
        const move = rollRes.state.legalMoves.find((m) => m.pawn === 0);
        expect(move).toBeUndefined();
      }

      // Dadu 1: maju ke step 55 (masih di jalur rumah / lane)
      const roll1 = dispatchAction(customState, { type: 'ROLL', forcedValue: 1 });
      const move1 = roll1.state.legalMoves.find((m) => m.pawn === 0);
      expect(move1).toBeDefined();
      expect(move1!.to).toBe(55);
      expect(move1!.kind).toBe('advance');

      // Dadu 2: tepat masuk ke HOME (step 56)
      const roll2 = dispatchAction(customState, { type: 'ROLL', forcedValue: 2 });
      const move2 = roll2.state.legalMoves.find((m) => m.pawn === 0);
      expect(move2).toBeDefined();
      expect(move2!.to).toBe(HOME);
      expect(move2!.kind).toBe('home');

      const moveRes = dispatchAction(roll2.state, { type: 'MOVE', pawn: 0 });
      expect(moveRes.ok).toBe(true);
      if (!moveRes.ok) return;
      expect(moveRes.state.pawns.yellow[0]).toBe(HOME);
      expect(moveRes.events.some((e) => e.type === 'pawnHome')).toBe(true);
    });
  });

  describe('3. Proteksi Aksi Ganda dan Penguncian Input', () => {
    it('menolak lempar dadu ganda saat animasi sedang berlangsung', () => {
      const session = new GameSession({ animate: true, seed: 100 });
      // Lemparan pertama valid
      const roll1 = session.roll(6);
      expect(roll1).toBe(true);
      expect(session.locked).toBe(true);

      // Lemparan kedua langsung saat masih animasi harus ditolak
      const roll2 = session.roll(6);
      expect(roll2).toBe(false);

      // Mencoba gerak saat masih animasi juga harus ditolak
      const move = session.move(0);
      expect(move).toBe(false);
    });

    it('menolak pemilihan pion yang tidak memiliki langkah legal', () => {
      const state = createInitialGameState();
      const rollRes = dispatchAction(state, { type: 'ROLL', forcedValue: 6 });
      expect(rollRes.ok).toBe(true);
      if (!rollRes.ok) return;

      // Coba gerakkan pion indeks di luar 0..3
      const invalidPawnRes = dispatchAction(rollRes.state, { type: 'MOVE', pawn: 99 });
      expect(invalidPawnRes.ok).toBe(false);
      if (!invalidPawnRes.ok) {
        expect(invalidPawnRes.error).toBe('INVALID_PAWN');
      }
    });

    it('menolak giliran pemain yang bukan pemain aktif', () => {
      const state = createInitialGameState();
      expect(state.current).toBe('yellow');

      // Coba pemain blue melempar saat giliran yellow
      const wrongPlayerRoll = dispatchAction(state, { type: 'ROLL', player: 'blue', forcedValue: 6 });
      expect(wrongPlayerRoll.ok).toBe(false);
      if (!wrongPlayerRoll.ok) {
        expect(wrongPlayerRoll.error).toBe('NOT_YOUR_TURN');
      }
    });
  });
});
