import { describe, it, expect } from 'vitest';
import { chooseBestPawn } from '../game/engine/ai';
import { createInitialGameState } from '../game/engine/rules';
import { BASE, type DieValue } from '../game/engine/types';

describe('Smart Bot AI (Solo vs Komputer)', () => {
  it('mengeluarkan pion dari BASE saat dadu 6 dan pion lain belum di track', () => {
    const state = createInitialGameState();
    const diceState = { ...state, dice: 6 as DieValue, current: 'yellow' as const };
    const best = chooseBestPawn(diceState, [0, 1, 2, 3]);
    expect(best).toBeGreaterThanOrEqual(0);
    expect(best).toBeLessThanOrEqual(3);
  });

  it('memilih pion yang bisa menabrak musuh dibandingkan pion biasa', () => {
    const state = createInitialGameState();
    // Yellow punya pion 0 di step 5 dan pion 1 di step 10.
    // Blue punya pion 0 di track index yang sama dengan dest pion 0 yellow!
    // Track index untuk yellow step 5 + 3 = 8.
    // Blue start di 13. (13 + 47) % 52 = 8.
    const customState = {
      ...state,
      current: 'yellow' as const,
      dice: 3 as DieValue,
      pawns: {
        ...state.pawns,
        yellow: [5, 10, BASE, BASE] as [number, number, number, number],
        blue: [47, BASE, BASE, BASE] as [number, number, number, number],
      },
    };

    const best = chooseBestPawn(customState, [0, 1]);
    // Pion 0 yellow (step 5 + 3 = 8) menabrak pion blue di track 8!
    expect(best).toBe(0);
  });

  it('memilih pion yang bisa langsung masuk ke HOME (gawang)', () => {
    const state = createInitialGameState();
    // Home adalah step 56.
    // Yellow pion 0 di step 52 (butuh 4 untuk home 56).
    // Yellow pion 1 di step 20 (maju ke 24).
    const customState = {
      ...state,
      current: 'yellow' as const,
      dice: 4 as DieValue,
      pawns: {
        ...state.pawns,
        yellow: [52, 20, BASE, BASE] as [number, number, number, number],
      },
    };

    const best = chooseBestPawn(customState, [0, 1]);
    expect(best).toBe(0); // Pion 0 langsung masuk HOME
  });
});
