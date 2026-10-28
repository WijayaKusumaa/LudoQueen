import { useMemo } from 'react';
import { PLAYER_ORDER } from './boardLayout';
import { PALETTE } from '../palette';

/** Kerikil kecil di perairan dangkal; posisi tetap, sedikit dan tidak menutupi papan. */
const ROCKS: readonly (readonly [number, number, number])[] = [
  [-7.9, -5.9, 0.26],
  [6.2, -7.85, 0.2],
  [7.95, 6.1, 0.3],
  [-6.1, 7.9, 0.22],
];

/** Titik jembatan kuning (satu per base), diputar 90 derajat searah jarum jam per warna. */
const BRIDGE_BASE: readonly [number, number] = [-6, -1.78];

function Bridge({ quarterTurns }: { quarterTurns: number }) {
  const [x0, z0] = BRIDGE_BASE;
  let x = x0;
  let z = z0;
  for (let i = 0; i < quarterTurns; i++) {
    const nx = -z;
    z = x;
    x = nx;
  }
  const planks = [-0.3, -0.1, 0.1, 0.3];
  return (
    <group position={[x, 0, z]} rotation={[0, -quarterTurns * (Math.PI / 2), 0]}>
      {planks.map((pz) => (
        <mesh key={pz} position={[0, 0.02, pz]} castShadow receiveShadow>
          <boxGeometry args={[0.95, 0.07, 0.17]} />
          <meshStandardMaterial color={PALETTE.wood} roughness={0.85} />
        </mesh>
      ))}
      {[-0.43, 0.43].map((px) => (
        <mesh key={px} position={[px, 0.02, 0]} castShadow>
          <boxGeometry args={[0.07, 0.09, 0.8]} />
          <meshStandardMaterial color={PALETTE.woodDark} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/** Detail lingkungan yang hemat: empat jembatan kayu dan beberapa batu pantai. */
export function IslandDetails() {
  const rocks = useMemo(() => ROCKS, []);
  return (
    <group>
      {PLAYER_ORDER.map((c, i) => (
        <Bridge key={c} quarterTurns={i} />
      ))}
      {rocks.map(([x, z, s]) => (
        <mesh key={`${x},${z}`} position={[x, -0.38 + s * 0.4, z]} scale={[s, s * 0.7, s * 0.9]} castShadow receiveShadow>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color="#9c9484" roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  );
}
