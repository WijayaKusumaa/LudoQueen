/**
 * EffectsLayer.tsx
 *
 * Umpan balik sesaat: cincin tipis saat pion mendarat, ditangkap, atau masuk home.
 * Hanya pool kecil mesh (tanpa partikel). Posisi/waktu berasal dari PresentationController.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, Mesh, MeshBasicMaterial, RingGeometry } from 'three';
import { EFFECT_MS, type PresentationController } from './presentation';
import { PLAYER_THEME } from '../palette';

const POOL = 8;

const STYLE = {
  land: { from: 0.8, grow: 0.9, opacity: 0.6 },
  capture: { from: 1.0, grow: 1.4, opacity: 0.75 },
  home: { from: 1.2, grow: 2.2, opacity: 0.8 },
} as const;

export function EffectsLayer({ presentation }: { presentation: PresentationController }) {
  const geometry = useMemo(() => new RingGeometry(0.3, 0.38, 40), []);
  const materials = useMemo(
    () =>
      Array.from(
        { length: POOL },
        () =>
          new MeshBasicMaterial({ transparent: true, depthWrite: false, side: DoubleSide }),
      ),
    [],
  );
  const meshes = useRef<Array<Mesh | null>>([]);

  useEffect(
    () => () => {
      geometry.dispose();
      materials.forEach((m) => m.dispose());
    },
    [geometry, materials],
  );

  useFrame(() => {
    const list = presentation.activeEffects;
    const now = presentation.time;
    for (let i = 0; i < POOL; i++) {
      const mesh = meshes.current[i];
      if (!mesh) continue;
      const fx = list[i];
      if (!fx) {
        mesh.visible = false;
        continue;
      }
      const age = Math.min(Math.max((now - fx.born) / EFFECT_MS, 0), 1);
      const style = STYLE[fx.kind];
      const mat = materials[i]!;
      mat.color.set(PLAYER_THEME[fx.color].light);
      mat.opacity = (1 - age) * style.opacity;
      const s = style.from + age * style.grow;
      mesh.scale.set(s, s, 1);
      mesh.position.set(fx.pos[0], fx.pos[1] + 0.03, fx.pos[2]);
      mesh.visible = true;
    }
  });

  return (
    <>
      {materials.map((material, i) => (
        <mesh
          key={i}
          ref={(m) => {
            meshes.current[i] = m;
          }}
          geometry={geometry}
          material={material}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={4}
          visible={false}
          raycast={() => null}
        />
      ))}
    </>
  );
}
