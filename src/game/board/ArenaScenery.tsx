/**
 * ArenaScenery.tsx
 *
 * Dekorasi 3D bertema untuk tiap Arena (forest, candy, space, lava, ice) di luar area main.
 * Hanya visual: tidak menyentuh papan, jalur, maupun logika permainan.
 */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferAttribute, type Points } from 'three';
import { HEIGHTS } from './boardCoordinates';
import { useCustomization, type ArenaSkinId } from '../customization';

type Prop = readonly [x: number, z: number, s: number, r: number];

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Titik tersebar di cincin luar pulau (aman dari papan: Chebyshev ≥ 9.3). */
function ring(n: number, seed: number, rMax = 15.5): Prop[] {
  const rand = rng(seed);
  const out: Prop[] = [];
  let guard = 0;
  while (out.length < n && guard++ < 600) {
    const x = (rand() * 2 - 1) * rMax;
    const z = (rand() * 2 - 1) * rMax;
    if (Math.max(Math.abs(x), Math.abs(z)) < 9.3) continue;
    if (out.some(([px, pz]) => (px - x) ** 2 + (pz - z) ** 2 < 5.5)) continue;
    out.push([x, z, 0.8 + rand() * 0.7, rand() * Math.PI * 2]);
  }
  return out;
}

/** Gundukan tanah kecil agar dekorasi tidak melayang di atas air. */
function Mound({ top, side, r = 1 }: { top: string; side: string; r?: number }) {
  const h = -HEIGHTS.water;
  return (
    <group>
      <mesh position={[0, -h / 2, 0]} receiveShadow>
        <cylinderGeometry args={[r * 0.95, r * 1.12, h, 14]} />
        <meshStandardMaterial color={side} roughness={1} flatShading />
      </mesh>
      <mesh position={[0, 0.01, 0]} receiveShadow>
        <cylinderGeometry args={[r * 0.96, r * 0.96, 0.04, 14]} />
        <meshStandardMaterial color={top} roughness={0.95} />
      </mesh>
    </group>
  );
}

function Spot({ p, children }: { p: Prop; children: React.ReactNode }) {
  return (
    <group position={[p[0], 0, p[1]]} rotation={[0, p[3], 0]} scale={p[2]}>
      {children}
    </group>
  );
}

// ─── Partikel (ember, salju, kerlip bintang) ──────────────────────────────────

interface ParticlesProps {
  count: number;
  color: string;
  size: number;
  mode: 'rise' | 'fall' | 'twinkle';
  animate: boolean;
  seed: number;
  yMin: number;
  yMax: number;
  inner?: number;
}

function Particles({ count, color, size, mode, animate, seed, yMin, yMax, inner = 0 }: ParticlesProps) {
  const ref = useRef<Points>(null);
  const data = useMemo(() => {
    const rand = rng(seed);
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      let x = 0;
      let z = 0;
      do {
        x = (rand() * 2 - 1) * 17;
        z = (rand() * 2 - 1) * 17;
      } while (Math.max(Math.abs(x), Math.abs(z)) < inner);
      pos[i * 3] = x;
      pos[i * 3 + 1] = yMin + rand() * (yMax - yMin);
      pos[i * 3 + 2] = z;
      spd[i] = 0.3 + rand() * 0.6;
    }
    return { pos, spd };
  }, [count, seed, yMin, yMax, inner]);

  useFrame(({ clock }, dt) => {
    const pts = ref.current;
    if (!pts || !animate) return;
    const t = clock.getElapsedTime();
    if (mode === 'twinkle') {
      (pts.material as { opacity: number }).opacity = 0.65 + Math.sin(t * 2.4) * 0.3;
      return;
    }
    const attr = pts.geometry.getAttribute('position') as BufferAttribute;
    const d = Math.min(dt, 0.05);
    for (let i = 0; i < count; i++) {
      const dir = mode === 'rise' ? 1 : -1;
      let y = attr.getY(i) + dir * data.spd[i]! * d;
      attr.setX(i, attr.getX(i) + Math.sin(t * 0.8 + i) * 0.003);
      if (y > yMax) y = yMin;
      if (y < yMin) y = yMax;
      attr.setY(i, y);
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.pos, 3]} />
      </bufferGeometry>
      <pointsMaterial color={color} size={size} sizeAttenuation transparent opacity={0.85} depthWrite={false} />
    </points>
  );
}

// ─── Forest ───────────────────────────────────────────────────────────────────

function Pine({ shade }: { shade: number }) {
  const g = ['#14532d', '#166534', '#15803d'][shade % 3]!;
  return (
    <group>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.13, 0.6, 8]} />
        <meshStandardMaterial color="#7c4a21" roughness={1} />
      </mesh>
      {[0.55, 1.0, 1.4].map((y, i) => (
        <mesh key={y} position={[0, y + 0.2, 0]} castShadow>
          <coneGeometry args={[0.62 - i * 0.17, 0.75, 9]} />
          <meshStandardMaterial color={g} roughness={0.9} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function Mushroom() {
  return (
    <group>
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 0.3, 8]} />
        <meshStandardMaterial color="#fef3c7" />
      </mesh>
      <mesh position={[0, 0.32, 0]} castShadow>
        <sphereGeometry args={[0.24, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#dc2626" roughness={0.6} />
      </mesh>
      {[[0.1, 0.05], [-0.08, 0.1], [0.0, -0.12]].map(([x, z], i) => (
        <mesh key={i} position={[x!, 0.5 - Math.hypot(x!, z!) * 0.9, z!]}>
          <sphereGeometry args={[0.04, 6, 6]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}
    </group>
  );
}

function Forest() {
  const props = useMemo(() => ring(15, 11), []);
  return (
    <>
      {props.map((p, i) => (
        <Spot key={i} p={p}>
          <Mound top="#4ade80" side="#78350f" r={0.95} />
          {i % 5 === 4 ? <Mushroom /> : <Pine shade={i} />}
          {i % 3 === 0 && (
            <mesh position={[0.6, 0.18, 0.3]} castShadow>
              <sphereGeometry args={[0.24, 10, 8]} />
              <meshStandardMaterial color="#22c55e" roughness={0.9} flatShading />
            </mesh>
          )}
        </Spot>
      ))}
    </>
  );
}

// ─── Candy ────────────────────────────────────────────────────────────────────

const CANDY = ['#f43f5e', '#facc15', '#38bdf8', '#a78bfa', '#34d399', '#fb923c'];

function Lollipop({ c }: { c: string }) {
  return (
    <group>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 1.1, 8]} />
        <meshStandardMaterial color="#fff7ed" />
      </mesh>
      <mesh position={[0, 1.2, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.42, 0.1, 24]} />
        <meshStandardMaterial color={c} roughness={0.25} />
      </mesh>
      <mesh position={[0, 1.2, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.22, 0.04, 8, 24]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </mesh>
    </group>
  );
}

function Cupcake({ c }: { c: string }) {
  return (
    <group>
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.38, 0.27, 0.4, 14]} />
        <meshStandardMaterial color="#d97706" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.5, 0]} castShadow>
        <sphereGeometry args={[0.4, 16, 12]} />
        <meshStandardMaterial color={c} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#dc2626" roughness={0.2} />
      </mesh>
    </group>
  );
}

function Gumdrops({ c }: { c: string }) {
  return (
    <group>
      {[[0, 0, 0.45], [0.55, 0.2, 0.3], [-0.4, -0.3, 0.32]].map(([x, z, r], i) => (
        <mesh key={i} position={[x!, r! * 0.55, z!]} castShadow>
          <sphereGeometry args={[r!, 14, 10, 0, Math.PI * 2, 0, Math.PI / 1.7]} />
          <meshStandardMaterial color={CANDY[(CANDY.indexOf(c) + i) % CANDY.length]} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

function Candy() {
  const props = useMemo(() => ring(14, 23), []);
  return (
    <>
      {props.map((p, i) => {
        const c = CANDY[i % CANDY.length]!;
        return (
          <Spot key={i} p={p}>
            <Mound top="#fbcfe8" side="#9d174d" r={0.95} />
            {i % 3 === 0 ? <Lollipop c={c} /> : i % 3 === 1 ? <Cupcake c={c} /> : <Gumdrops c={c} />}
          </Spot>
        );
      })}
    </>
  );
}

// ─── Space ────────────────────────────────────────────────────────────────────

function Planet({ position, r, color, ringColor }: { position: [number, number, number]; r: number; color: string; ringColor?: string }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <sphereGeometry args={[r, 32, 24]} />
        <meshStandardMaterial color={color} roughness={0.7} emissive={color} emissiveIntensity={0.18} />
      </mesh>
      {ringColor && (
        <mesh rotation={[Math.PI / 2.6, 0.2, 0]}>
          <torusGeometry args={[r * 1.6, r * 0.09, 6, 48]} />
          <meshStandardMaterial color={ringColor} emissive={ringColor} emissiveIntensity={0.4} />
        </mesh>
      )}
    </group>
  );
}

function Space({ animate }: { animate: boolean }) {
  const rocks = useMemo(() => ring(14, 37, 16), []);
  return (
    <>
      <Planet position={[-13, 1.6, -11.5]} r={2.1} color="#7c3aed" ringColor="#f0abfc" />
      <Planet position={[13.5, 2.2, 11]} r={1.3} color="#38bdf8" />
      <Planet position={[12, 0.6, -13]} r={0.55} color="#fbbf24" />
      {rocks.map((p, i) => (
        <mesh
          key={i}
          position={[p[0], 0.3 + (i % 4) * 0.55, p[1]]}
          rotation={[p[3], p[3] * 0.7, 0]}
          scale={[p[2] * 0.45, p[2] * 0.35, p[2] * 0.4]}
          castShadow
        >
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color={i % 3 === 0 ? '#818cf8' : '#64748b'}
            emissive={i % 3 === 0 ? '#6366f1' : '#000000'}
            emissiveIntensity={0.35}
            roughness={0.8}
            flatShading
          />
        </mesh>
      ))}
      <Particles count={140} color="#ffffff" size={0.09} mode="twinkle" animate={animate} seed={5} yMin={-0.4} yMax={4} inner={8.6} />
      <Particles count={60} color="#c4b5fd" size={0.13} mode="twinkle" animate={animate} seed={9} yMin={0} yMax={5} inner={8.6} />
    </>
  );
}

// ─── Lava ─────────────────────────────────────────────────────────────────────

function Volcano() {
  return (
    <group>
      <mesh position={[0, 0.9, 0]} castShadow>
        <coneGeometry args={[1.5, 2.2, 10, 1, true]} />
        <meshStandardMaterial color="#292524" roughness={1} flatShading side={2} />
      </mesh>
      <mesh position={[0, 2.0, 0]}>
        <cylinderGeometry args={[0.38, 0.38, 0.06, 12]} />
        <meshStandardMaterial color="#f97316" emissive="#ef4444" emissiveIntensity={2.2} />
      </mesh>
      {[0, 1.6, 3.4, 4.8].map((a, i) => (
        <mesh key={i} position={[Math.sin(a) * 0.6, 1.2 - i * 0.18, Math.cos(a) * 0.6]} rotation={[0.45, a, 0]}>
          <boxGeometry args={[0.1, 1.1, 0.04]} />
          <meshStandardMaterial color="#fb923c" emissive="#ea580c" emissiveIntensity={1.6} />
        </mesh>
      ))}
    </group>
  );
}

function Lava({ animate }: { animate: boolean }) {
  const props = useMemo(() => ring(14, 51), []);
  return (
    <>
      {props.map((p, i) => (
        <Spot key={i} p={p}>
          <Mound top="#44403c" side="#1c1917" r={0.95} />
          {i % 5 === 0 ? (
            <Volcano />
          ) : (
            <group>
              <mesh position={[0, 0.35, 0]} scale={[1, 1.2, 0.9]} castShadow>
                <dodecahedronGeometry args={[0.45, 0]} />
                <meshStandardMaterial color="#1c1917" roughness={1} flatShading />
              </mesh>
              <mesh position={[0.1, 0.5, 0.3]} scale={[0.3, 0.1, 0.3]}>
                <sphereGeometry args={[1, 8, 6]} />
                <meshStandardMaterial color="#f97316" emissive="#ef4444" emissiveIntensity={1.8} />
              </mesh>
            </group>
          )}
        </Spot>
      ))}
      <Particles count={90} color="#fb923c" size={0.1} mode="rise" animate={animate} seed={7} yMin={-0.3} yMax={5} inner={8.6} />
    </>
  );
}

// ─── Ice ──────────────────────────────────────────────────────────────────────

function IceSpikes() {
  const spikes: readonly (readonly [number, number, number, number])[] = [
    [0, 0, 0.3, 1.4],
    [0.4, 0.2, 0.2, 0.9],
    [-0.35, 0.15, 0.22, 1.0],
    [0.1, -0.4, 0.16, 0.7],
  ];
  return (
    <group>
      {spikes.map(([x, z, r, h], i) => (
        <mesh key={i} position={[x, h / 2, z]} rotation={[0, i, (i - 1.5) * 0.08]} castShadow>
          <coneGeometry args={[r, h, 6]} />
          <meshPhysicalMaterial
            color="#bae6fd"
            emissive="#38bdf8"
            emissiveIntensity={0.18}
            roughness={0.05}
            transmission={0.35}
            transparent
            opacity={0.9}
            clearcoat={1}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}

function Snowman() {
  return (
    <group>
      <mesh position={[0, 0.3, 0]} castShadow>
        <sphereGeometry args={[0.34, 14, 12]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.7, 0]} castShadow>
        <sphereGeometry args={[0.24, 14, 12]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.0, 0]} castShadow>
        <sphereGeometry args={[0.17, 12, 10]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.0, 0.17]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.035, 0.18, 6]} />
        <meshStandardMaterial color="#f97316" />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.14, 10]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
    </group>
  );
}

function Ice({ animate }: { animate: boolean }) {
  const props = useMemo(() => ring(14, 67), []);
  return (
    <>
      {props.map((p, i) => (
        <Spot key={i} p={p}>
          <Mound top="#f8fafc" side="#7dd3fc" r={0.95} />
          {i % 4 === 3 ? (
            <Snowman />
          ) : i % 4 === 1 ? (
            <mesh position={[0, 0.3, 0]} scale={[1, 0.7, 0.9]} castShadow>
              <sphereGeometry args={[0.6, 14, 10]} />
              <meshStandardMaterial color="#ffffff" roughness={0.95} />
            </mesh>
          ) : (
            <IceSpikes />
          )}
        </Spot>
      ))}
      <Particles count={160} color="#ffffff" size={0.07} mode="fall" animate={animate} seed={3} yMin={-0.3} yMax={6} />
    </>
  );
}

// ─── Lingkungan (cahaya & kabut warna per arena) ──────────────────────────────

export const ARENA_LIGHT: Readonly<Record<ArenaSkinId, { sky: string; ground: string; sun: string; sunI: number; hemiI: number }>> = {
  classic: { sky: '#d6f1f2', ground: '#b59c74', sun: '#ffe2b5', sunI: 2.3, hemiI: 0.85 },
  forest: { sky: '#d9f99d', ground: '#365314', sun: '#fde68a', sunI: 2.1, hemiI: 0.8 },
  candy: { sky: '#fbcfe8', ground: '#f472b6', sun: '#fff1f2', sunI: 2.2, hemiI: 1.0 },
  space: { sky: '#a5b4fc', ground: '#1e1b4b', sun: '#c7d2fe', sunI: 1.8, hemiI: 0.75 },
  lava: { sky: '#fdba74', ground: '#7f1d1d', sun: '#fb923c', sunI: 2.0, hemiI: 0.8 },
  ice: { sky: '#e0f2fe', ground: '#7dd3fc', sun: '#f0f9ff', sunI: 2.3, hemiI: 1.0 },
};

export function ArenaScenery({ animate }: { animate: boolean }) {
  const { arenaDef } = useCustomization();
  switch (arenaDef.id) {
    case 'forest':
      return <Forest />;
    case 'candy':
      return <Candy />;
    case 'space':
      return <Space animate={animate} />;
    case 'lava':
      return <Lava animate={animate} />;
    case 'ice':
      return <Ice animate={animate} />;
    default:
      return null;
  }
}
