import type { DieValue } from './types';

/** Aturan kotak aman yang dipakai: 'starOnly' (hanya petak bintang, default standar Ludo), 'startAndStar', 'startOnly', 'none'. */
export type SafeCellRule = 'starOnly' | 'startAndStar' | 'startOnly' | 'none';

/** Kapan permainan berakhir. */
export type EndCondition = 'firstFinisher' | 'allButOne';

/**
 * Semua variasi aturan Ludo yang didukung, eksplisit dan bertipe.
 * Default: lihat DEFAULT_RULES dan docs/03-engine-dan-aturan.md.
 */
export interface RulesConfig {
  /** Angka dadu yang boleh mengeluarkan pion dari base. */
  readonly entryRolls: readonly DieValue[];
  /** Angka 6 memberi giliran tambahan. */
  readonly extraTurnOnSix: boolean;
  /** Menangkap pion lawan memberi giliran tambahan. */
  readonly extraTurnOnCapture: boolean;
  /** Pion masuk home memberi giliran tambahan. */
  readonly extraTurnOnHome: boolean;
  /** Jumlah 6 berturut-turut yang menghanguskan giliran. 0 = nonaktif. */
  readonly maxConsecutiveSixes: number;
  readonly safeCells: SafeCellRule;
  /** Apakah pion-pion sewarna boleh menempati sel yang sama (stacking). */
  readonly friendlyStacking: boolean;
  /** Dua pion atau lebih dari warna yang sama di satu sel jalur membentuk blokade bagi lawan. */
  readonly blockades: boolean;
  readonly endCondition: EndCondition;
}

export const DEFAULT_RULES: RulesConfig = Object.freeze({
  entryRolls: Object.freeze([6] as DieValue[]),
  extraTurnOnSix: true,
  extraTurnOnCapture: true,
  extraTurnOnHome: true,
  maxConsecutiveSixes: 3,
  safeCells: 'starOnly',
  friendlyStacking: true,
  blockades: false,
  endCondition: 'firstFinisher',
});

export function isDieValue(v: unknown): v is DieValue {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 6;
}

/** Gabungkan dengan default dan validasi. Melempar RangeError bila konfigurasi tidak valid. */
export function resolveRules(partial: Partial<RulesConfig> = {}): RulesConfig {
  const rules: RulesConfig = { ...DEFAULT_RULES, ...partial };
  if (rules.entryRolls.length === 0 || !rules.entryRolls.every(isDieValue)) {
    throw new RangeError('entryRolls harus berisi minimal satu angka dadu 1-6');
  }
  if (new Set(rules.entryRolls).size !== rules.entryRolls.length) {
    throw new RangeError('entryRolls tidak boleh duplikat');
  }
  if (!Number.isInteger(rules.maxConsecutiveSixes) || rules.maxConsecutiveSixes < 0) {
    throw new RangeError('maxConsecutiveSixes harus bilangan bulat >= 0');
  }
  return Object.freeze({ ...rules, entryRolls: Object.freeze([...rules.entryRolls]) });
}
