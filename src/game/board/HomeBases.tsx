import { useMemo } from 'react';
import { ExtrudeGeometry, RepeatWrapping, Shape, type Texture } from 'three';
import { RoundedBox } from '@react-three/drei';
import { BASE_CENTER, PLAYER_ORDER, type PlayerColor } from './boardLayout';
import {
  ARM_HALF_WIDTH,
  BASE_ISLAND_SIZE,
  HEIGHTS,
  ISLAND_HALF_EXTENT,
  gridToWorld,
} from './boardCoordinates';
import { makeGrassTexture } from './boardTextures';
import { PALETTE, PLAYER_THEME } from '../palette';

function useGrass(repeatX: number, repeatY: number): Texture {
  return useMemo(() => {
    const t = makeGrassTexture();
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(repeatX, repeatY);
    return t;
  }, [repeatX, repeatY]);
}

const GRASS_H = 0.18;
const SOIL_H = 0.42;

/** Lempeng terrain: lapisan rumput bertepi bulat di atas lapisan tanah. */
function Slab({ width, depth, grass }: { width: number; depth: number; grass: Texture }) {
  return (
    <group>
      <RoundedBox
        args={[width, GRASS_H, depth]}
        radius={0.07}
        smoothness={3}
        position={[0, HEIGHTS.groundTop - GRASS_H / 2, 0]}
        receiveShadow
        castShadow
      >
        <meshStandardMaterial color={PALETTE.grassLight} map={grass} roughness={0.95} />
      </RoundedBox>
      <RoundedBox
        args={[width - 0.16, SOIL_H, depth - 0.16]}
        radius={0.08}
        smoothness={3}
        position={[0, HEIGHTS.groundTop - GRASS_H - SOIL_H / 2 + 0.02, 0]}
        receiveShadow
      >
        <meshStandardMaterial color={PALETTE.soil} roughness={1} />
      </RoundedBox>
    </group>
  );
}

/** Pulau salib yang menopang jalur utama (rumput membingkai ubin). */
export function CrossIsland() {
  const long = ISLAND_HALF_EXTENT * 2;
  const short = ARM_HALF_WIDTH * 2;
  const grassH = useGrass(4.6, 1);
  const grassV = useGrass(1, 4.6);
  return (
    <group>
      <Slab width={long} depth={short} grass={grassH} />
      <group position={[0, 0.002, 0]}>
        <Slab width={short} depth={long} grass={grassV} />
      </group>
    </group>
  );
}

/** Pelat tipis bersudut bulat (RoundedBox memaksa tebal >= 2x radius, jadi tidak cocok). */
function plateGeometry(size: number, radius: number, height: number): ExtrudeGeometry {
  const h = size / 2;
  const s = new Shape();
  s.moveTo(-h + radius, -h);
  s.lineTo(h - radius, -h);
  s.absarc(h - radius, -h + radius, radius, -Math.PI / 2, 0, false);
  s.lineTo(h, h - radius);
  s.absarc(h - radius, h - radius, radius, 0, Math.PI / 2, false);
  s.lineTo(-h + radius, h);
  s.absarc(-h + radius, h - radius, radius, Math.PI / 2, Math.PI, false);
  s.lineTo(-h, -h + radius);
  s.absarc(-h + radius, -h + radius, radius, Math.PI, Math.PI * 1.5, false);
  const g = new ExtrudeGeometry(s, { depth: height, bevelEnabled: false, curveSegments: 10 });
  g.rotateX(-Math.PI / 2);
  return g;
}

function BasePad({ color }: { color: PlayerColor }) {
  const theme = PLAYER_THEME[color];
  const pad = 3.5;
  const rim = useMemo(() => plateGeometry(pad + 0.22, 0.3, 0.035), []);
  const face = useMemo(() => plateGeometry(pad, 0.22, 0.055), []);
  const slots = useMemo(
    () =>
      [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ] as const,
    [],
  );
  return (
    <group>
      <mesh geometry={rim} receiveShadow>
        <meshStandardMaterial color={theme.dark} roughness={0.6} />
      </mesh>
      <mesh geometry={face} position={[0, 0.002, 0]} receiveShadow>
        <meshStandardMaterial color={theme.main} roughness={0.7} />
      </mesh>
      {slots.map(([x, z]) => (
        <group key={`${x},${z}`} position={[x, 0, z]}>
          <mesh position={[0, HEIGHTS.padTop + 0.004, 0]} receiveShadow>
            <cylinderGeometry args={[0.52, 0.52, 0.012, 40]} />
            <meshStandardMaterial color={theme.dark} roughness={0.6} />
          </mesh>
          <mesh position={[0, HEIGHTS.padTop + 0.009, 0]} receiveShadow>
            <cylinderGeometry args={[0.42, 0.42, 0.012, 40]} />
            <meshStandardMaterial color={theme.light} roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Empat pulau base di kuadran yang benar, dengan pad berwarna dan empat slot pion. */
export function HomeBases() {
  const grass = useGrass(1.6, 1.6);
  return (
    <group>
      {PLAYER_ORDER.map((color) => {
        const c = gridToWorld(BASE_CENTER[color]);
        return (
          <group key={color} position={[c.x, 0, c.z]}>
            <Slab width={BASE_ISLAND_SIZE} depth={BASE_ISLAND_SIZE} grass={grass} />
            <BasePad color={color} />
          </group>
        );
      })}
    </group>
  );
}
