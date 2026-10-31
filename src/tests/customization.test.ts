import { describe, expect, it } from 'vitest';
import {
  ARENA_CATALOG,
  DICE_CATALOG,
  INITIAL_COINS,
  PAWN_CATALOG,
  loadCustomizationState,
  processPurchase,
  processSelect,
  type CustomizationState,
} from '../game/customization';

describe('Sistem Kustomisasi & Toko Ludo (Arena, Dice, Pawn)', () => {
  const baseState: CustomizationState = {
    coins: INITIAL_COINS,
    selected: { arena: 'classic', dice: 'classic', pawn: 'classic' },
    owned: { arena: ['classic'], dice: ['classic'], pawn: ['classic'] },
  };

  it('menyediakan katalog untuk 3 kategori utama: Arena, Dice, dan Pawn', () => {
    expect(ARENA_CATALOG.length).toBeGreaterThanOrEqual(6);
    expect(DICE_CATALOG.length).toBeGreaterThanOrEqual(8);
    expect(PAWN_CATALOG.length).toBeGreaterThanOrEqual(6);
  });

  it('membeli item yang terkunci mengurangi koin, menambahkan ke daftar owned, dan menjadikannya ACTIVE', () => {
    // Forest Arena berharga 150 koin
    const res = processPurchase(baseState, 'arena', 'forest');
    expect(res.ok).toBe(true);
    expect(res.state.coins).toBe(INITIAL_COINS - 150);
    expect(res.state.owned.arena).toContain('forest');
    expect(res.state.selected.arena).toBe('forest');
  });

  it('menolak pembelian jika saldo koin tidak mencukupi tanpa mengurangi saldo koin', () => {
    const lowCoinState: CustomizationState = {
      ...baseState,
      coins: 50,
    };
    const res = processPurchase(lowCoinState, 'dice', 'gold'); // Gold Dice = 500 koin
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe('INSUFFICIENT_COINS');
    }
    expect(res.state.coins).toBe(50);
    expect(res.state.owned.dice).not.toContain('gold');
    expect(res.state.selected.dice).toBe('classic');
  });

  it('memilih item yang sudah dimiliki langsung mengubah item menjadi ACTIVE', () => {
    const ownedState: CustomizationState = {
      ...baseState,
      owned: {
        ...baseState.owned,
        pawn: ['classic', 'crystal', 'robot'],
      },
    };
    const next = processSelect(ownedState, 'pawn', 'robot');
    expect(next.selected.pawn).toBe('robot');

    const backToClassic = processSelect(next, 'pawn', 'classic');
    expect(backToClassic.selected.pawn).toBe('classic');
  });

  it('mengabaikan pemilihan langsung pada item yang belum dimiliki', () => {
    const next = processSelect(baseState, 'arena', 'lava');
    expect(next.selected.arena).toBe('classic');
  });

  it('loadCustomizationState mengembalikan state default yang valid saat storage kosong', () => {
    const loaded = loadCustomizationState();
    expect(loaded.owned.arena).toContain('classic');
    expect(loaded.owned.dice).toContain('classic');
    expect(loaded.owned.pawn).toContain('classic');
  });
});
