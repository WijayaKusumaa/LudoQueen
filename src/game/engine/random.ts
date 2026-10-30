import type { DieValue, PlayerColor } from './types';

/** Satu langkah mulberry32. Mengembalikan [angka 0..1, state berikutnya]. Murni. */
export function nextRandom(state: number): [number, number] {
  const next = (state + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

/**
 * Melempar dadu 1-6.
 * Semua pemain (kuning, biru, merah, hijau) memiliki probabilitas seragam dan adil (1/6 untuk setiap angka 1-6).
 */
export function rollDie(state: number, _player?: PlayerColor): [DieValue, number] {
  const [r, next] = nextRandom(state);
  return [(Math.floor(r * 6) + 1) as DieValue, next];
}
