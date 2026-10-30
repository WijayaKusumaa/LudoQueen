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
 * - Untuk pemain 'green' (hijau), probabilitas mendapatkan angka 6 ditingkatkan menjadi 1/3 (~33.3%),
 *   sedangkan angka 1-5 masing-masing memiliki peluang ~13.3%.
 * - Untuk pemain kuning, merah, dan biru, peluang setiap angka 1-6 setara (1/6 atau ~16.67%).
 */
export function rollDie(state: number, player?: PlayerColor): [DieValue, number] {
  const [r, next] = nextRandom(state);

  if (player === 'green') {
    // Peluang angka 6 ditingkatkan menjadi 33.33% (2x lipat normal)
    if (r < 1 / 3) {
      return [6 as DieValue, next];
    }
    // Sisa peluang terdistribusi merata untuk angka 1-5 (masing-masing 13.33%)
    const otherVal = Math.floor(((r - 1 / 3) / (2 / 3)) * 5) + 1;
    return [otherVal as DieValue, next];
  }

  return [(Math.floor(r * 6) + 1) as DieValue, next];
}
