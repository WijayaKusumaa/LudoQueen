import { describe, expect, it } from 'vitest';
import {
  BASE_CENTER,
  GRID_SIZE,
  HOME_LANES,
  PLAYER_ORDER,
  SAFE_INDICES,
  START_INDEX,
  TRACK,
  TRACK_LENGTH,
  buildBoardCells,
  cellKey,
} from '../game/board/boardLayout';
import { gridToWorld } from '../game/board/boardCoordinates';

describe('boardLayout', () => {
  it('memiliki 52 sel jalur unik di dalam grid', () => {
    expect(TRACK).toHaveLength(TRACK_LENGTH);
    expect(new Set(TRACK.map(cellKey)).size).toBe(TRACK_LENGTH);
    for (const c of TRACK) {
      expect(c.col).toBeGreaterThanOrEqual(0);
      expect(c.col).toBeLessThan(GRID_SIZE);
      expect(c.row).toBeGreaterThanOrEqual(0);
      expect(c.row).toBeLessThan(GRID_SIZE);
    }
  });

  it('sel berurutan bersebelahan; hanya 4 tikungan di sudut pusat yang diagonal', () => {
    let diagonals = 0;
    for (let i = 0; i < TRACK_LENGTH; i++) {
      const a = TRACK[i]!;
      const b = TRACK[(i + 1) % TRACK_LENGTH]!;
      const dc = Math.abs(a.col - b.col);
      const dr = Math.abs(a.row - b.row);
      expect(Math.max(dc, dr)).toBe(1);
      if (dc + dr === 2) diagonals++;
    }
    expect(diagonals).toBe(4);
  });

  it('start dan lane simetris rotasi 90 derajat searah jarum jam', () => {
    const rot = (c: { col: number; row: number }) => ({ col: 14 - c.row, row: c.col });
    PLAYER_ORDER.forEach((color, i) => {
      const next = PLAYER_ORDER[(i + 1) % 4]!;
      expect(rot(TRACK[START_INDEX[color]]!)).toEqual(TRACK[START_INDEX[next]]);
      HOME_LANES[color].forEach((c, k) => {
        expect(rot(c)).toEqual(HOME_LANES[next][k]);
      });
      expect(rot(BASE_CENTER[color])).toEqual(BASE_CENTER[next]);
    });
  });

  it('lane dan jalur utama tidak bertabrakan, ada 8 kotak aman', () => {
    const cells = buildBoardCells();
    expect(cells).toHaveLength(TRACK_LENGTH + 20);
    expect(new Set(cells.map((c) => cellKey(c.grid))).size).toBe(cells.length);
    expect(new Set(SAFE_INDICES).size).toBe(8);
  });

  it('pusat grid berada di origin dunia', () => {
    expect(gridToWorld({ col: 7, row: 7 })).toEqual({ x: 0, z: 0 });
  });
});
