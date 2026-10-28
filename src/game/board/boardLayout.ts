/**
 * Model papan otoritatif (murni, tanpa three.js).
 *
 * Grid 15x15, (col,row) dengan row 0 di atas. Pusat = (7,7).
 * Semua komponen render, posisi pion, dan nanti engine membaca dari sini.
 * Urutan jalur searah jarum jam. Kuning kiri-atas, Biru kanan-atas,
 * Merah kanan-bawah, Hijau kiri-bawah.
 */

export type PlayerColor = 'yellow' | 'blue' | 'red' | 'green';

/** Urutan searah jarum jam, sama dengan urutan titik start di jalur. */
export const PLAYER_ORDER: readonly PlayerColor[] = ['yellow', 'blue', 'red', 'green'];

export interface GridCell {
  readonly col: number;
  readonly row: number;
}

export const GRID_SIZE = 15;
export const GRID_CENTER = 7;
export const TRACK_LENGTH = 52;
export const HOME_LANE_LENGTH = 5;
export const PAWNS_PER_PLAYER = 4;

const cell = (col: number, row: number): GridCell => ({ col, row });

/** Ruas lurus jalur utama (mulai dari titik start kuning), 52 sel. */
function buildTrack(): GridCell[] {
  const out: GridCell[] = [];
  const run = (c0: number, r0: number, c1: number, r1: number) => {
    const dc = Math.sign(c1 - c0);
    const dr = Math.sign(r1 - r0);
    const n = Math.max(Math.abs(c1 - c0), Math.abs(r1 - r0));
    for (let i = 0; i <= n; i++) out.push(cell(c0 + dc * i, r0 + dr * i));
  };
  run(1, 6, 5, 6);
  run(6, 5, 6, 0);
  run(7, 0, 8, 0);
  run(8, 1, 8, 5);
  run(9, 6, 14, 6);
  run(14, 7, 14, 8);
  run(13, 8, 9, 8);
  run(8, 9, 8, 14);
  run(7, 14, 6, 14);
  run(6, 13, 6, 9);
  run(5, 8, 0, 8);
  run(0, 7, 0, 6);
  return out;
}

export const TRACK: readonly GridCell[] = buildTrack();

/** Indeks jalur tempat tiap warna masuk papan. */
export const START_INDEX: Readonly<Record<PlayerColor, number>> = {
  yellow: 0,
  blue: 13,
  red: 26,
  green: 39,
};

/** Kotak bintang aman: 8 langkah setelah start tiap pemain. */
const STAR_OFFSET = 8;

export const SAFE_INDICES: readonly number[] = PLAYER_ORDER.flatMap((c) => [
  START_INDEX[c],
  START_INDEX[c] + STAR_OFFSET,
]);

export const STAR_INDICES: readonly number[] = PLAYER_ORDER.map((c) => START_INDEX[c] + STAR_OFFSET);

/** Jalur rumah per warna, urut dari mulut jalur menuju pusat. */
export const HOME_LANES: Readonly<Record<PlayerColor, readonly GridCell[]>> = {
  yellow: [1, 2, 3, 4, 5].map((c) => cell(c, 7)),
  blue: [1, 2, 3, 4, 5].map((r) => cell(7, r)),
  red: [13, 12, 11, 10, 9].map((c) => cell(c, 7)),
  green: [13, 12, 11, 10, 9].map((r) => cell(7, r)),
};

/** Pusat sel base (satuan grid) dan kuadran tiap warna. */
export const BASE_CENTER: Readonly<Record<PlayerColor, GridCell>> = {
  yellow: { col: 2.5, row: 2.5 },
  blue: { col: 11.5, row: 2.5 },
  red: { col: 11.5, row: 11.5 },
  green: { col: 2.5, row: 11.5 },
};

/** Offset 4 slot pion dalam base (satuan grid). */
export const BASE_SLOT_OFFSETS: readonly GridCell[] = [
  { col: -1, row: -1 },
  { col: 1, row: -1 },
  { col: -1, row: 1 },
  { col: 1, row: 1 },
];

export function baseSlot(color: PlayerColor, slot: number): GridCell {
  const c = BASE_CENTER[color];
  const o = BASE_SLOT_OFFSETS[slot];
  if (!o) throw new RangeError(`Slot base tidak valid: ${slot}`);
  return { col: c.col + o.col, row: c.row + o.row };
}

/** Segitiga pusat: sisi mana yang dimiliki warna apa. */
export const CENTER_SIDE: Readonly<Record<PlayerColor, 'left' | 'top' | 'right' | 'bottom'>> = {
  yellow: 'left',
  blue: 'top',
  red: 'right',
  green: 'bottom',
};

export type CellKind = 'track' | 'start' | 'star' | 'lane';

export interface BoardCell {
  readonly grid: GridCell;
  readonly kind: CellKind;
  readonly owner: PlayerColor | null;
  /** Indeks jalur utama (untuk 'track'/'start'/'star'), atau indeks lane. */
  readonly index: number;
}

/** Seluruh sel yang dapat dimainkan, diturunkan dari data di atas. */
export function buildBoardCells(): BoardCell[] {
  const cells: BoardCell[] = [];
  TRACK.forEach((grid, index) => {
    const startOwner = PLAYER_ORDER.find((c) => START_INDEX[c] === index) ?? null;
    const isStar = STAR_INDICES.includes(index);
    cells.push({
      grid,
      kind: startOwner ? 'start' : isStar ? 'star' : 'track',
      owner: startOwner,
      index,
    });
  });
  for (const color of PLAYER_ORDER) {
    HOME_LANES[color].forEach((grid, index) => {
      cells.push({ grid, kind: 'lane', owner: color, index });
    });
  }
  return cells;
}

export function cellKey(c: GridCell): string {
  return `${c.col},${c.row}`;
}
