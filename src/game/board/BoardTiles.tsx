import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, InstancedMesh, Matrix4 } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { buildBoardCells } from './boardLayout';
import { HEIGHTS, TILE_SIZE, gridToWorld } from './boardCoordinates';
import { PALETTE, PLAYER_THEME } from '../palette';

/** Variasi deterministik 0..1 per sel agar ubin tidak seragam. */
function cellNoise(col: number, row: number): number {
  const s = Math.sin(col * 127.1 + row * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Seluruh ubin jalur dan lane dalam satu InstancedMesh dengan geometri bersama. */
export function BoardTiles() {
  const ref = useRef<InstancedMesh>(null);
  const cells = useMemo(() => buildBoardCells(), []);
  const geometry = useMemo(() => {
    const height = 0.2;
    const g = new RoundedBoxGeometry(TILE_SIZE, height, TILE_SIZE, 3, 0.045);
    g.translate(0, HEIGHTS.tileTop - height / 2, 0);
    return g;
  }, []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = mesh;
    const stone = new Color(PALETTE.stone);
    const shade = new Color(PALETTE.stoneShade);
    const tmp = new Color();
    const matrix = new Matrix4();
    cells.forEach((c, i) => {
      const w = gridToWorld(c.grid);
      matrix.makeTranslation(w.x, 0, w.z);
      m.setMatrixAt(i, matrix);
      const n = cellNoise(c.grid.col, c.grid.row);
      tmp.copy(stone).lerp(shade, n * 0.7);
      if (c.kind === 'lane' && c.owner) {
        tmp.set(PLAYER_THEME[c.owner].main).offsetHSL(0, 0, (n - 0.5) * 0.05);
      } else if (c.kind === 'start' && c.owner) {
        tmp.lerp(new Color(PLAYER_THEME[c.owner].main), 0.7);
      }
      m.setColorAt(i, tmp);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [cells, geometry]);

  return (
    <instancedMesh ref={ref} args={[geometry, undefined, cells.length]} castShadow receiveShadow>
      <meshStandardMaterial roughness={0.82} metalness={0} />
    </instancedMesh>
  );
}
