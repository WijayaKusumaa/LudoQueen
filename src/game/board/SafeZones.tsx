import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, ExtrudeGeometry, InstancedMesh, Matrix4, Shape } from 'three';
import { PLAYER_ORDER, SAFE_INDICES, START_INDEX, TRACK } from './boardLayout';
import { HEIGHTS, gridToWorld } from './boardCoordinates';
import { PALETTE, PLAYER_THEME } from '../palette';

function starGeometry(outer: number, inner: number): ExtrudeGeometry {
  const shape = new Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const g = new ExtrudeGeometry(shape, {
    depth: 0.025,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.012,
    bevelSegments: 1,
  });
  // shape y -> dunia -z, ekstrusi ke atas
  g.rotateX(-Math.PI / 2);
  g.translate(0, HEIGHTS.tileTop, 0);
  return g;
}

/** Bintang pada kotak aman: start tiap pemain (warna pemain) dan bintang emas. */
export function SafeZones() {
  const ref = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => starGeometry(0.32, 0.14), []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new Matrix4();
    const c = new Color();
    SAFE_INDICES.forEach((idx, i) => {
      const w = gridToWorld(TRACK[idx]!);
      m.makeTranslation(w.x, 0, w.z);
      mesh.setMatrixAt(i, m);
      const owner = PLAYER_ORDER.find((p) => START_INDEX[p] === idx);
      c.set(owner ? PLAYER_THEME[owner].dark : PALETTE.star);
      mesh.setColorAt(i, c);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);

  return (
    <instancedMesh ref={ref} args={[geometry, undefined, SAFE_INDICES.length]} receiveShadow>
      <meshStandardMaterial roughness={0.5} metalness={0.1} />
    </instancedMesh>
  );
}
