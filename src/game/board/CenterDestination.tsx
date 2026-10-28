import { useMemo } from 'react';
import { ExtrudeGeometry, Shape } from 'three';
import { CENTER_SIDE, PLAYER_ORDER } from './boardLayout';
import { PLAYER_THEME } from '../palette';

type Pt = readonly [number, number];

/** Segitiga pusat (koordinat dunia x,z) untuk tiap sisi. */
const TRIANGLES: Record<'left' | 'top' | 'right' | 'bottom', readonly [Pt, Pt, Pt]> = {
  left: [[-1.5, -1.5], [-1.5, 1.5], [0, 0]],
  top: [[-1.5, -1.5], [1.5, -1.5], [0, 0]],
  right: [[1.5, -1.5], [1.5, 1.5], [0, 0]],
  bottom: [[-1.5, 1.5], [1.5, 1.5], [0, 0]],
};

function triangleGeometry(pts: readonly [Pt, Pt, Pt]): ExtrudeGeometry {
  // tarik tiap titik sedikit ke pusat agar ada nat antar segitiga
  const cx = (pts[0][0] + pts[1][0] + pts[2][0]) / 3;
  const cz = (pts[0][1] + pts[1][1] + pts[2][1]) / 3;
  const k = 0.955;
  const shape = new Shape();
  pts.forEach(([x, z], i) => {
    const px = cx + (x - cx) * k;
    const pz = cz + (z - cz) * k;
    // shape.y = -z dunia (lihat rotateX di bawah)
    if (i === 0) shape.moveTo(px, -pz);
    else shape.lineTo(px, -pz);
  });
  shape.closePath();
  const g = new ExtrudeGeometry(shape, {
    depth: 0.18,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, -0.08, 0);
  return g;
}

/** Tujuan di tengah: empat segitiga warna menunjuk ke jalur rumah masing-masing. */
export function CenterDestination() {
  const items = useMemo(
    () =>
      PLAYER_ORDER.map((color) => ({
        color,
        geometry: triangleGeometry(TRIANGLES[CENTER_SIDE[color]]),
      })),
    [],
  );
  return (
    <group>
      {items.map(({ color, geometry }) => (
        <mesh key={color} geometry={geometry} castShadow receiveShadow>
          <meshStandardMaterial color={PLAYER_THEME[color].main} roughness={0.55} metalness={0.02} />
        </mesh>
      ))}
    </group>
  );
}
