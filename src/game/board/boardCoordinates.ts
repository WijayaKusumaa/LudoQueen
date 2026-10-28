import { GRID_CENTER, baseSlot, type GridCell, type PlayerColor } from './boardLayout';

/** 1 sel grid = 1 unit dunia. Pusat papan di origin. Sumbu +z mengarah ke kamera. */
export const CELL_SIZE = 1;
/** Ukuran visual ubin (sedikit lebih kecil dari sel agar ada nat). */
export const TILE_SIZE = 0.94;

/** Ketinggian (sumbu y) lapisan-lapisan terrain. */
export const HEIGHTS = {
  water: -0.55,
  groundTop: 0,
  tileTop: 0.1,
  markTop: 0.115,
  padTop: 0.06,
  slotTop: 0.075,
} as const;

export interface WorldPoint {
  readonly x: number;
  readonly z: number;
}

export function gridToWorld(c: GridCell): WorldPoint {
  return { x: (c.col - GRID_CENTER) * CELL_SIZE, z: (c.row - GRID_CENTER) * CELL_SIZE };
}

/** Posisi pijakan pion di atas ubin jalur/lane (y = permukaan ubin). */
export function gridToPawnPosition(c: GridCell): [number, number, number] {
  const p = gridToWorld(c);
  return [p.x, HEIGHTS.tileTop, p.z];
}

/** Posisi pijakan pion di slot base. */
export function baseSlotPawnPosition(color: PlayerColor, slot: number): [number, number, number] {
  const p = gridToWorld(baseSlot(color, slot));
  return [p.x, HEIGHTS.slotTop, p.z];
}

/** Setengah lebar daerah pulau (dipakai kamera dan shader laut). */
export const ISLAND_HALF_EXTENT = 7.65;
/** Setengah lebar lengan salib (termasuk bibir rumput). */
export const ARM_HALF_WIDTH = 1.65;
/** Ukuran sisi pulau base. */
export const BASE_ISLAND_SIZE = 5.2;
