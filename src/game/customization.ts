/**
 * customization.ts
 *
 * Sistem kustomisasi & toko item Ludo (Arena, Dice, Pawn).
 * Menyimpan pilihan aktif, daftar item yang dimiliki, dan saldo koin di localStorage.
 */

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { createElement } from 'react';

export type CustomizationCategory = 'arena' | 'dice' | 'pawn';

export type ArenaSkinId = 'classic' | 'forest' | 'candy' | 'space' | 'lava' | 'ice';
export type DiceSkinId = 'classic' | 'white' | 'green' | 'blue' | 'dark' | 'lava' | 'digital' | 'gold';
export type PawnSkinId = 'classic' | 'crystal' | 'robot' | 'knight' | 'neon' | 'cute';

export interface ArenaSkinDef {
  readonly id: ArenaSkinId;
  readonly name: string;
  readonly subtitle: string;
  readonly price: number;
  readonly tag?: 'Hot' | 'New' | 'VIP';
  readonly colors: {
    readonly oceanShallow: string;
    readonly oceanDeep: string;
    readonly foam: string;
    readonly grass: string;
    readonly soil: string;
    readonly tileLight: string;
    readonly tileShade: string;
    readonly previewBg: [string, string];
  };
}

export interface DiceSkinDef {
  readonly id: DiceSkinId;
  readonly name: string;
  readonly subtitle: string;
  readonly price: number;
  readonly tag?: 'Hot' | 'New' | 'VIP';
  readonly colors: {
    readonly body: string;
    readonly pip: string;
    readonly pipOne: string;
    readonly border: string;
    readonly roughness: number;
    readonly metalness: number;
  };
}

export interface PawnSkinDef {
  readonly id: PawnSkinId;
  readonly name: string;
  readonly subtitle: string;
  readonly price: number;
  readonly tag?: 'Hot' | 'New' | 'VIP';
  readonly style: {
    readonly roughness: number;
    readonly metalness: number;
    readonly clearcoat: number;
    readonly emissiveBoost: number;
  };
}

export const ARENA_CATALOG: readonly ArenaSkinDef[] = [
  {
    id: 'classic',
    name: 'Classic Arena',
    subtitle: 'Pulau Tropis Klasik',
    price: 0,
    colors: {
      oceanShallow: '#3cc7c4',
      oceanDeep: '#1b8a9c',
      foam: '#eef9f6',
      grass: '#7fc96b',
      soil: '#b57b52',
      tileLight: '#ebe2cc',
      tileShade: '#d5c7a8',
      previewBg: ['#38bdf8', '#0284c7'],
    },
  },
  {
    id: 'forest',
    name: 'Forest Arena',
    subtitle: 'Hutan Zamrud Rindang',
    price: 150,
    tag: 'New',
    colors: {
      oceanShallow: '#34d399',
      oceanDeep: '#065f46',
      foam: '#d1fae5',
      grass: '#4ade80',
      soil: '#78350f',
      tileLight: '#fef3c7',
      tileShade: '#d97706',
      previewBg: ['#34d399', '#059669'],
    },
  },
  {
    id: 'candy',
    name: 'Candy Arena',
    subtitle: 'Negeri Permen Manis',
    price: 250,
    tag: 'Hot',
    colors: {
      oceanShallow: '#f472b6',
      oceanDeep: '#be185d',
      foam: '#fce7f3',
      grass: '#f9a8d4',
      soil: '#9d174d',
      tileLight: '#fff1f2',
      tileShade: '#fbcfe8',
      previewBg: ['#f472b6', '#db2777'],
    },
  },
  {
    id: 'space',
    name: 'Space Arena',
    subtitle: 'Galaksi Nebula Kosmik',
    price: 350,
    colors: {
      oceanShallow: '#6366f1',
      oceanDeep: '#1e1b4b',
      foam: '#c7d2fe',
      grass: '#818cf8',
      soil: '#312e81',
      tileLight: '#e0e7ff',
      tileShade: '#a5b4fc',
      previewBg: ['#818cf8', '#4338ca'],
    },
  },
  {
    id: 'lava',
    name: 'Lava Arena',
    subtitle: 'Kawah Gunung Berapi',
    price: 500,
    tag: 'VIP',
    colors: {
      oceanShallow: '#fb923c',
      oceanDeep: '#9a3412',
      foam: '#fef08a',
      grass: '#78716c',
      soil: '#44403c',
      tileLight: '#fed7aa',
      tileShade: '#fdba74',
      previewBg: ['#f97316', '#b91c1c'],
    },
  },
  {
    id: 'ice',
    name: 'Ice Arena',
    subtitle: 'Gletser Kutub Kristal',
    price: 400,
    colors: {
      oceanShallow: '#7dd3fc',
      oceanDeep: '#0369a1',
      foam: '#f0f9ff',
      grass: '#bae6fd',
      soil: '#0284c7',
      tileLight: '#f8fafc',
      tileShade: '#cbd5e1',
      previewBg: ['#67e8f9', '#0284c7'],
    },
  },
];

export const DICE_CATALOG: readonly DiceSkinDef[] = [
  {
    id: 'classic',
    name: 'Classic Dice',
    subtitle: 'Krem Gading Standar',
    price: 0,
    colors: {
      body: '#fef9ec',
      pip: '#1a1008',
      pipOne: '#dc2626',
      border: '#d6c7a1',
      roughness: 0.35,
      metalness: 0.05,
    },
  },
  {
    id: 'white',
    name: 'White Dice',
    subtitle: 'Putih Bersih Elegan',
    price: 100,
    colors: {
      body: '#ffffff',
      pip: '#0f172a',
      pipOne: '#2563eb',
      border: '#cbd5e1',
      roughness: 0.25,
      metalness: 0.05,
    },
  },
  {
    id: 'green',
    name: 'Green Dice',
    subtitle: 'Hijau Lime Segar',
    price: 150,
    tag: 'New',
    colors: {
      body: '#a3e635',
      pip: '#14532d',
      pipOne: '#ffffff',
      border: '#4d7c0f',
      roughness: 0.3,
      metalness: 0.1,
    },
  },
  {
    id: 'blue',
    name: 'Blue Dice',
    subtitle: 'Biru Safir Samudra',
    price: 200,
    colors: {
      body: '#38bdf8',
      pip: '#ffffff',
      pipOne: '#fef08a',
      border: '#0284c7',
      roughness: 0.25,
      metalness: 0.15,
    },
  },
  {
    id: 'dark',
    name: 'Dark Dice',
    subtitle: 'Hitam Siber Neon',
    price: 250,
    tag: 'Hot',
    colors: {
      body: '#1e293b',
      pip: '#22d3ee',
      pipOne: '#f43f5e',
      border: '#0891b2',
      roughness: 0.2,
      metalness: 0.4,
    },
  },
  {
    id: 'lava',
    name: 'Lava Dice',
    subtitle: 'Merah Bara Magma',
    price: 300,
    colors: {
      body: '#dc2626',
      pip: '#fef08a',
      pipOne: '#ffffff',
      border: '#7f1d1d',
      roughness: 0.3,
      metalness: 0.2,
    },
  },
  {
    id: 'digital',
    name: 'Digital Dice',
    subtitle: 'Ungu Siber Futuristik',
    price: 350,
    colors: {
      body: '#7c3aed',
      pip: '#f5d0fe',
      pipOne: '#4ade80',
      border: '#4c1d95',
      roughness: 0.2,
      metalness: 0.35,
    },
  },
  {
    id: 'gold',
    name: 'Gold Dice',
    subtitle: 'Emas Kerajaan Mewah',
    price: 500,
    tag: 'VIP',
    colors: {
      body: '#facc15',
      pip: '#422006',
      pipOne: '#dc2626',
      border: '#a16207',
      roughness: 0.18,
      metalness: 0.65,
    },
  },
];

export const PAWN_CATALOG: readonly PawnSkinDef[] = [
  {
    id: 'classic',
    name: 'Classic Pawn',
    subtitle: 'Pion Ludo Klasik',
    price: 0,
    style: { roughness: 0.4, metalness: 0, clearcoat: 0.3, emissiveBoost: 0 },
  },
  {
    id: 'crystal',
    name: 'Crystal Pawn',
    subtitle: 'Kilau Kristal Bening',
    price: 150,
    tag: 'New',
    style: { roughness: 0.1, metalness: 0.15, clearcoat: 1.0, emissiveBoost: 0.08 },
  },
  {
    id: 'robot',
    name: 'Robot Pawn',
    subtitle: 'Meka Baja Tangguh',
    price: 250,
    style: { roughness: 0.22, metalness: 0.65, clearcoat: 0.5, emissiveBoost: 0.05 },
  },
  {
    id: 'knight',
    name: 'Knight Pawn',
    subtitle: 'Ksatria Pelindung Pulau',
    price: 300,
    tag: 'Hot',
    style: { roughness: 0.28, metalness: 0.45, clearcoat: 0.6, emissiveBoost: 0 },
  },
  {
    id: 'neon',
    name: 'Neon Pawn',
    subtitle: 'Cahaya Cyber Berpijar',
    price: 400,
    tag: 'VIP',
    style: { roughness: 0.15, metalness: 0.2, clearcoat: 0.9, emissiveBoost: 0.35 },
  },
  {
    id: 'cute',
    name: 'Cute Pawn',
    subtitle: 'Pion Bulat Menggemaskan',
    price: 350,
    style: { roughness: 0.35, metalness: 0, clearcoat: 0.45, emissiveBoost: 0.05 },
  },
];

// ─── State & Persistence ──────────────────────────────────────────────────────

const STORAGE_KEY = 'olivia-ludo:customization:v1';
export const INITIAL_COINS = 1000;

export interface CustomizationState {
  readonly coins: number;
  readonly selected: {
    readonly arena: ArenaSkinId;
    readonly dice: DiceSkinId;
    readonly pawn: PawnSkinId;
  };
  readonly owned: {
    readonly arena: readonly ArenaSkinId[];
    readonly dice: readonly DiceSkinId[];
    readonly pawn: readonly PawnSkinId[];
  };
}

const DEFAULT_STATE: CustomizationState = {
  coins: INITIAL_COINS,
  selected: {
    arena: 'classic',
    dice: 'classic',
    pawn: 'classic',
  },
  owned: {
    arena: ['classic'],
    dice: ['classic'],
    pawn: ['classic'],
  },
};

const VALID_ARENAS = new Set<string>(ARENA_CATALOG.map((a) => a.id));
const VALID_DICES = new Set<string>(DICE_CATALOG.map((d) => d.id));
const VALID_PAWNS = new Set<string>(PAWN_CATALOG.map((p) => p.id));

export function loadCustomizationState(): CustomizationState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<CustomizationState>;
    const coins = typeof parsed.coins === 'number' && Number.isFinite(parsed.coins) && parsed.coins >= 0
      ? Math.floor(parsed.coins)
      : INITIAL_COINS;

    const ownedArena = Array.from(
      new Set(['classic', ...(parsed.owned?.arena ?? []).filter((id) => VALID_ARENAS.has(id))]),
    ) as ArenaSkinId[];
    const ownedDice = Array.from(
      new Set(['classic', ...(parsed.owned?.dice ?? []).filter((id) => VALID_DICES.has(id))]),
    ) as DiceSkinId[];
    const ownedPawn = Array.from(
      new Set(['classic', ...(parsed.owned?.pawn ?? []).filter((id) => VALID_PAWNS.has(id))]),
    ) as PawnSkinId[];

    const selArena = parsed.selected?.arena && ownedArena.includes(parsed.selected.arena)
      ? parsed.selected.arena
      : 'classic';
    const selDice = parsed.selected?.dice && ownedDice.includes(parsed.selected.dice)
      ? parsed.selected.dice
      : 'classic';
    const selPawn = parsed.selected?.pawn && ownedPawn.includes(parsed.selected.pawn)
      ? parsed.selected.pawn
      : 'classic';

    return {
      coins,
      selected: { arena: selArena, dice: selDice, pawn: selPawn },
      owned: { arena: ownedArena, dice: ownedDice, pawn: ownedPawn },
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveCustomizationState(state: CustomizationState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Abaikan jika storage penuh / mode privat
  }
}

export function getItemPrice(category: CustomizationCategory, id: string): number {
  if (category === 'arena') return ARENA_CATALOG.find((a) => a.id === id)?.price ?? 0;
  if (category === 'dice') return DICE_CATALOG.find((d) => d.id === id)?.price ?? 0;
  return PAWN_CATALOG.find((p) => p.id === id)?.price ?? 0;
}

export type PurchaseResult =
  | { readonly ok: true; readonly state: CustomizationState }
  | { readonly ok: false; readonly reason: 'ALREADY_OWNED' | 'INSUFFICIENT_COINS' | 'INVALID_ITEM'; readonly state: CustomizationState };

export function processPurchase(
  state: CustomizationState,
  category: CustomizationCategory,
  id: string,
): PurchaseResult {
  const isValid =
    (category === 'arena' && VALID_ARENAS.has(id)) ||
    (category === 'dice' && VALID_DICES.has(id)) ||
    (category === 'pawn' && VALID_PAWNS.has(id));

  if (!isValid) {
    return { ok: false, reason: 'INVALID_ITEM', state };
  }

  const ownedList = state.owned[category] as readonly string[];
  if (ownedList.includes(id)) {
    return { ok: false, reason: 'ALREADY_OWNED', state };
  }

  const price = getItemPrice(category, id);
  if (state.coins < price) {
    return { ok: false, reason: 'INSUFFICIENT_COINS', state };
  }

  const nextState: CustomizationState = {
    coins: state.coins - price,
    selected: {
      ...state.selected,
      [category]: id,
    },
    owned: {
      ...state.owned,
      [category]: [...ownedList, id],
    },
  };

  return { ok: true, state: nextState };
}

export function processSelect(
  state: CustomizationState,
  category: CustomizationCategory,
  id: string,
): CustomizationState {
  const ownedList = state.owned[category] as readonly string[];
  if (!ownedList.includes(id)) return state;
  return {
    ...state,
    selected: {
      ...state.selected,
      [category]: id,
    },
  };
}

// ─── React Context ────────────────────────────────────────────────────────────

export interface CustomizationContextValue {
  readonly state: CustomizationState;
  readonly arenaDef: ArenaSkinDef;
  readonly diceDef: DiceSkinDef;
  readonly pawnDef: PawnSkinDef;
  selectItem: (category: CustomizationCategory, id: string) => void;
  buyItem: (category: CustomizationCategory, id: string) => PurchaseResult;
  addCoins: (amount: number) => void;
}

const CustomizationCtx = createContext<CustomizationContextValue | null>(null);

export function CustomizationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CustomizationState>(loadCustomizationState);

  const selectItem = useCallback((category: CustomizationCategory, id: string) => {
    setState((prev) => {
      const next = processSelect(prev, category, id);
      saveCustomizationState(next);
      return next;
    });
  }, []);

  const buyItem = useCallback((category: CustomizationCategory, id: string): PurchaseResult => {
    let result: PurchaseResult = { ok: false, reason: 'INVALID_ITEM', state };
    setState((prev) => {
      result = processPurchase(prev, category, id);
      if (result.ok) {
        saveCustomizationState(result.state);
        return result.state;
      }
      return prev;
    });
    return result;
  }, [state]);

  const addCoins = useCallback((amount: number) => {
    if (amount <= 0) return;
    setState((prev) => {
      const next = { ...prev, coins: prev.coins + Math.floor(amount) };
      saveCustomizationState(next);
      return next;
    });
  }, []);

  const arenaDef = useMemo(
    () => ARENA_CATALOG.find((a) => a.id === state.selected.arena) ?? ARENA_CATALOG[0]!,
    [state.selected.arena],
  );
  const diceDef = useMemo(
    () => DICE_CATALOG.find((d) => d.id === state.selected.dice) ?? DICE_CATALOG[0]!,
    [state.selected.dice],
  );
  const pawnDef = useMemo(
    () => PAWN_CATALOG.find((p) => p.id === state.selected.pawn) ?? PAWN_CATALOG[0]!,
    [state.selected.pawn],
  );

  const value = useMemo<CustomizationContextValue>(
    () => ({
      state,
      arenaDef,
      diceDef,
      pawnDef,
      selectItem,
      buyItem,
      addCoins,
    }),
    [state, arenaDef, diceDef, pawnDef, selectItem, buyItem, addCoins],
  );

  return createElement(CustomizationCtx.Provider, { value }, children);
}

export function useCustomization(): CustomizationContextValue {
  const ctx = useContext(CustomizationCtx);
  if (!ctx) {
    // Fallback aman jika dirender di luar provider (misal di dalam unit test terisolasi)
    return {
      state: DEFAULT_STATE,
      arenaDef: ARENA_CATALOG[0]!,
      diceDef: DICE_CATALOG[0]!,
      pawnDef: PAWN_CATALOG[0]!,
      selectItem: () => {},
      buyItem: () => ({ ok: false, reason: 'INVALID_ITEM', state: DEFAULT_STATE }),
      addCoins: () => {},
    };
  }
  return ctx;
}
