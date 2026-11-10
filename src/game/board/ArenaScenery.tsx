/**
 * ArenaScenery.tsx
 *
 * Medan + dekorasi 3D bertema untuk tiap Arena (forest, candy, space, lava, ice).
 * Hanya visual: tidak menyentuh papan, jalur, maupun logika permainan.
 *  - Terrain: tekstur kanvas prosedural yang menggantikan permukaan laut.
 *  - Dekorasi: objek bertema yang diletakkan di luar area papan.
 */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BufferAttribute,
  CanvasTexture,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  type Points,
} from 'three';
import { useCustomization, type ArenaSkinId } from '../customization';

/** Tinggi permukaan medan tematik (sedikit di atas laut -0.55). */
const GROUND_Y = -0.5;

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

/** Titik tersebar di luar papan (Chebyshev ≥ 8.8), saling berjarak. */
function scatter(n: number, seed: number, rMax = 14.5, minGap2 = 3.6): Prop[] {
  const rand = rng(seed);
  const out: Prop[] = [];
  let guard = 0;
  while (out.length < n && guard++ < 1500) {
    const x = (rand() * 2 - 1) * rMax;
    const z = (rand() * 2 - 1) * rMax;
    if (Math.max(Math.abs(x), Math.abs(z)) < 8.8) continue;
    if (out.some(([px, pz]) => (px - x) ** 2 + (pz - z) ** 2 < minGap2)) continue;
    out.push([x, z, 0.85 + rand() * 0.75, rand() * Math.PI * 2]);
  }
  return out;
}

// ─── Tekstur medan prosedural ─────────────────────────────────────────────────

const SZ = 1024;
type Ctx = CanvasRenderingContext2D;

function canvas(): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = c.height = SZ;
  return [c, c.getContext('2d')!];
}

/** Gambar elemen pada 9 offset agar tekstur tileable tanpa sambungan. */
function wrap(x: number, y: number, fn: (x: number, y: number) => void) {
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) fn(x + dx * SZ, y + dy * SZ);
}

function blobs(ctx: Ctx, rand: () => number, n: number, rMin: number, rMax: number, colors: string[], alpha: number) {
  for (let i = 0; i < n; i++) {
    const x = rand() * SZ;
    const y = rand() * SZ;
    const r = rMin + rand() * (rMax - rMin);
    const col = colors[Math.floor(rand() * colors.length)]!;
    wrap(x, y, (px, py) => {
      const g = ctx.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, col);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = alpha;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  ctx.globalAlpha = 1;
}

function crackPaths(rand: () => number, n: number): [number, number][][] {
  const paths: [number, number][][] = [];
  const walk = (x: number, y: number, a: number, segs: number, depth: number) => {
    const pts: [number, number][] = [[x, y]];
    for (let i = 0; i < segs; i++) {
      a += (rand() - 0.5) * 1.3;
      const l = 18 + rand() * 30;
      x += Math.cos(a) * l;
      y += Math.sin(a) * l;
      pts.push([x, y]);
      if (depth < 2 && rand() < 0.16) walk(x, y, a + (rand() < 0.5 ? 1 : -1) * (0.6 + rand() * 0.6), 4 + Math.floor(rand() * 5), depth + 1);
    }
    paths.push(pts);
  };
  for (let i = 0; i < n; i++) walk(rand() * SZ, rand() * SZ, rand() * Math.PI * 2, 9 + Math.floor(rand() * 8), 0);
  return paths;
}

function strokePaths(ctx: Ctx, paths: [number, number][][], color: string, width: number, glow = 0, glowColor = color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowBlur = glow;
  ctx.shadowColor = glowColor;
  for (const p of paths) {
    wrap(0, 0, (ox, oy) => {
      ctx.beginPath();
      p.forEach(([x, y], i) => (i ? ctx.lineTo(x + ox, y + oy) : ctx.moveTo(x + ox, y + oy)));
      ctx.stroke();
    });
  }
  ctx.shadowBlur = 0;
}

interface Terrain {
  map: CanvasTexture;
  emissive?: CanvasTexture;
  roughness: number;
  metalness: number;
}

function tex(c: HTMLCanvasElement, srgb = true): CanvasTexture {
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(5, 5);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = SRGBColorSpace;
  return t;
}

function paintForest(): Terrain {
  const rand = rng(101);
  const [c, ctx] = canvas();
  ctx.fillStyle = '#3f8f3a';
  ctx.fillRect(0, 0, SZ, SZ);
  blobs(ctx, rand, 70, 50, 140, ['#2c7433', '#5db043', '#34803a', '#79c24f'], 0.32);
  const greens = ['#2a6e2f', '#4a9c3b', '#6cbb48', '#8bd25a', '#1f5a28'];
  for (let i = 0; i < 6500; i++) {
    const x = rand() * SZ;
    const y = rand() * SZ;
    const a = -Math.PI / 2 + (rand() - 0.5) * 1.1;
    const l = 5 + rand() * 9;
    ctx.strokeStyle = greens[Math.floor(rand() * greens.length)]!;
    ctx.lineWidth = 1.4;
    wrap(x, y, (px, py) => {
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l);
      ctx.stroke();
    });
  }
  const flowers = ['#ffffff', '#fde047', '#f9a8d4', '#fb7185', '#c4b5fd'];
  for (let i = 0; i < 160; i++) {
    const x = rand() * SZ;
    const y = rand() * SZ;
    const col = flowers[Math.floor(rand() * flowers.length)]!;
    wrap(x, y, (px, py) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(px, py, 2.2 + rand() * 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(px, py, 0.9, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  return { map: tex(c), roughness: 1, metalness: 0 };
}

function paintCandy(): Terrain {
  const rand = rng(202);
  const [c, ctx] = canvas();
  ctx.fillStyle = '#f9a8d4';
  ctx.fillRect(0, 0, SZ, SZ);
  blobs(ctx, rand, 60, 60, 170, ['#fbcfe8', '#f472b6', '#fde7f3', '#e879f9'], 0.35);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 9;
  for (let i = 0; i < 26; i++) {
    const x = rand() * SZ;
    const y = rand() * SZ;
    const r = 30 + rand() * 90;
    const a0 = rand() * 6;
    wrap(x, y, (px, py) => {
      ctx.beginPath();
      ctx.arc(px, py, r, a0, a0 + 2.2 + rand());
      ctx.stroke();
    });
  }
  const cols = ['#ef4444', '#facc15', '#38bdf8', '#a78bfa', '#34d399', '#ffffff', '#fb923c'];
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  for (let i = 0; i < 850; i++) {
    const x = rand() * SZ;
    const y = rand() * SZ;
    const a = rand() * Math.PI;
    const l = 7 + rand() * 6;
    ctx.strokeStyle = cols[Math.floor(rand() * cols.length)]!;
    wrap(x, y, (px, py) => {
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l);
      ctx.stroke();
    });
  }
  return { map: tex(c), roughness: 0.4, metalness: 0 };
}

function paintSpace(): Terrain {
  const rand = rng(303);
  const [c, ctx] = canvas();
  ctx.fillStyle = '#04031a';
  ctx.fillRect(0, 0, SZ, SZ);
  blobs(ctx, rand, 18, 160, 340, ['#7c3aed', '#2563eb', '#db2777', '#0ea5e9'], 0.26);
  blobs(ctx, rand, 24, 60, 160, ['#4c1d95', '#1e3a8a', '#831843'], 0.3);
  const cols = ['#ffffff', '#bfdbfe', '#fde68a', '#fbcfe8'];
  for (let i = 0; i < 1500; i++) {
    const x = rand() * SZ;
    const y = rand() * SZ;
    const r = 0.5 + rand() * rand() * 1.8;
    ctx.fillStyle = cols[Math.floor(rand() * cols.length)]!;
    ctx.globalAlpha = 0.5 + rand() * 0.5;
    wrap(x, y, (px, py) => {
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 55; i++) {
    const x = rand() * SZ;
    const y = rand() * SZ;
    ctx.shadowBlur = 9;
    ctx.shadowColor = '#c4b5fd';
    ctx.fillStyle = '#ffffff';
    wrap(x, y, (px, py) => {
      ctx.beginPath();
      ctx.arc(px, py, 1.8 + rand() * 1.2, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  ctx.shadowBlur = 0;
  return { map: tex(c), roughness: 0.9, metalness: 0 };
}

function paintLava(): Terrain {
  const rand = rng(404);
  const [c, ctx] = canvas();
  const [ce, ectx] = canvas();
  ctx.fillStyle = '#1b1614';
  ctx.fillRect(0, 0, SZ, SZ);
  ectx.fillStyle = '#000000';
  ectx.fillRect(0, 0, SZ, SZ);
  blobs(ctx, rand, 80, 40, 130, ['#2d2522', '#0d0a09', '#3a2f2a'], 0.4);
  for (let i = 0; i < 2200; i++) {
    const x = rand() * SZ;
    const y = rand() * SZ;
    ctx.fillStyle = rand() < 0.5 ? '#0a0807' : '#42352f';
    wrap(x, y, (px, py) => ctx.fillRect(px, py, 2 + rand() * 3, 2 + rand() * 3));
  }
  // kolam magma
  for (let i = 0; i < 7; i++) {
    const x = rand() * SZ;
    const y = rand() * SZ;
    const r = 28 + rand() * 40;
    wrap(x, y, (px, py) => {
      ctx.fillStyle = '#7c2d12';
      ctx.beginPath();
      ctx.ellipse(px, py, r * 1.2, r, 0, 0, Math.PI * 2);
      ctx.fill();
      const g = ectx.createRadialGradient(px, py, 0, px, py, r * 1.25);
      g.addColorStop(0, '#fde047');
      g.addColorStop(0.45, '#f97316');
      g.addColorStop(1, '#7f1d1d');
      ectx.fillStyle = g;
      ectx.beginPath();
      ectx.ellipse(px, py, r * 1.2, r, 0, 0, Math.PI * 2);
      ectx.fill();
    });
  }
  const paths = crackPaths(rand, 13);
  strokePaths(ctx, paths, '#7c2d12', 5);
  strokePaths(ectx, paths, '#c2410c', 4, 10, '#b91c1c');
  strokePaths(ectx, paths, '#fb923c', 1.4);
  return { map: tex(c), emissive: tex(ce), roughness: 1, metalness: 0 };
}

function paintIce(): Terrain {
  const rand = rng(505);
  const [c, ctx] = canvas();
  ctx.fillStyle = '#c5e8f8';
  ctx.fillRect(0, 0, SZ, SZ);
  blobs(ctx, rand, 70, 70, 200, ['#e6f6fd', '#9fd5ee', '#ffffff', '#7fc3e6'], 0.32);
  const paths = crackPaths(rand, 34);
  strokePaths(ctx, paths, 'rgba(103,170,210,0.9)', 3.2);
  strokePaths(ctx, paths, 'rgba(255,255,255,0.85)', 1.3);
  for (let i = 0; i < 1600; i++) {
    const x = rand() * SZ;
    const y = rand() * SZ;
    ctx.fillStyle = `rgba(255,255,255,${0.3 + rand() * 0.5})`;
    wrap(x, y, (px, py) => {
      ctx.beginPath();
      ctx.arc(px, py, 0.8 + rand() * 1.7, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  return { map: tex(c), roughness: 0.22, metalness: 0.05 };
}

const _terrain = new Map<ArenaSkinId, Terrain>();
function getTerrain(id: ArenaSkinId): Terrain | null {
  let t = _terrain.get(id);
  if (!t) {
    const make = { forest: paintForest, candy: paintCandy, space: paintSpace, lava: paintLava, ice: paintIce }[id as string] as
      | (() => Terrain)
      | undefined;
    if (!make) return null;
    t = make();
    _terrain.set(id, t);
  }
  return t;
}

function TerrainPlane({ id, animate }: { id: ArenaSkinId; animate: boolean }) {
  const t = useMemo(() => getTerrain(id), [id]);
  const mat = useRef<MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (animate && t?.emissive && mat.current) mat.current.emissiveIntensity = 0.75 + Math.sin(clock.getElapsedTime() * 1.6) * 0.2;
  });
  if (!t) return null;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y, 0]} receiveShadow>
      <planeGeometry args={[140, 140]} />
      <meshStandardMaterial
        ref={mat}
        map={t.map}
        roughness={t.roughness}
        metalness={t.metalness}
        {...(t.emissive ? { emissiveMap: t.emissive, emissive: '#ffffff', emissiveIntensity: 0.75 } : {})}
      />
    </mesh>
  );
}

// ─── Utilitas dekorasi ────────────────────────────────────────────────────────

function Spot({ p, children }: { p: Prop; children: React.ReactNode }) {
  return (
    <group position={[p[0], GROUND_Y, p[1]]} rotation={[0, p[3], 0]} scale={p[2]}>
      {children}
    </group>
  );
}

// ─── Partikel ─────────────────────────────────────────────────────────────────

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
    const dir = mode === 'rise' ? 1 : -1;
    for (let i = 0; i < count; i++) {
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

function Pine({ i }: { i: number }) {
  const g = ['#14532d', '#166534', '#15803d'][i % 3]!;
  return (
    <group>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.14, 0.6, 8]} />
        <meshStandardMaterial color="#7c4a21" roughness={1} />
      </mesh>
      {[0.5, 0.95, 1.35, 1.7].map((y, k) => (
        <mesh key={y} position={[0, y + 0.2, 0]} castShadow>
          <coneGeometry args={[0.68 - k * 0.15, 0.72, 9]} />
          <meshStandardMaterial color={g} roughness={0.9} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function Oak({ i }: { i: number }) {
  const leaf = ['#2f9e44', '#37b24d', '#51cf66'];
  return (
    <group>
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.2, 1.0, 8]} />
        <meshStandardMaterial color="#6b4423" roughness={1} />
      </mesh>
      {[[0, 1.25, 0, 0.62], [0.38, 1.05, 0.1, 0.42], [-0.34, 1.12, -0.12, 0.45], [0.05, 1.6, 0.05, 0.4]].map(([x, y, z, r], k) => (
        <mesh key={k} position={[x!, y!, z!]} castShadow>
          <icosahedronGeometry args={[r!, 1]} />
          <meshStandardMaterial color={leaf[(i + k) % 3]} roughness={0.9} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function Mushroom() {
  return (
    <group>
      {[[0, 0, 1], [0.5, 0.25, 0.6], [-0.4, 0.3, 0.7]].map(([x, z, s], i) => (
        <group key={i} position={[x!, 0, z!]} scale={s}>
          <mesh position={[0, 0.17, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.1, 0.34, 8]} />
            <meshStandardMaterial color="#fef3c7" />
          </mesh>
          <mesh position={[0, 0.34, 0]} castShadow>
            <sphereGeometry args={[0.28, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#dc2626" roughness={0.6} />
          </mesh>
          {[[0.12, 0.08], [-0.1, 0.12], [0, -0.15]].map(([px, pz], k) => (
            <mesh key={k} position={[px!, 0.5 - Math.hypot(px!, pz!) * 0.9, pz!]}>
              <sphereGeometry args={[0.045, 6, 6]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Pond() {
  return (
    <group>
      <mesh position={[0, 0.015, 0]} receiveShadow>
        <cylinderGeometry args={[1.05, 1.05, 0.03, 24]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.05} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.06, 0.07, 8, 28]} />
        <meshStandardMaterial color="#8b6a46" roughness={1} />
      </mesh>
      {[[0.3, 0.2], [-0.4, -0.3], [0.1, -0.5]].map(([x, z], i) => (
        <mesh key={i} position={[x!, 0.04, z!]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.2, 12]} />
          <meshStandardMaterial color="#22c55e" side={2} />
        </mesh>
      ))}
    </group>
  );
}

function Flowers() {
  const cols = ['#f472b6', '#fde047', '#ffffff', '#fb7185', '#a78bfa'];
  return (
    <group>
      {[[0, 0], [0.35, 0.15], [-0.3, 0.2], [0.1, -0.35], [-0.25, -0.3], [0.45, -0.2]].map(([x, z], i) => (
        <group key={i} position={[x!, 0, z!]}>
          <mesh position={[0, 0.15, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.3, 5]} />
            <meshStandardMaterial color="#22c55e" />
          </mesh>
          <mesh position={[0, 0.32, 0]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshStandardMaterial color={cols[i % cols.length]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Log() {
  return (
    <group>
      <mesh position={[0, 0.14, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.14, 0.14, 0.9, 10]} />
        <meshStandardMaterial color="#7c4a21" roughness={1} />
      </mesh>
      <mesh position={[0.451, 0.14, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.12, 0.12, 0.01, 10]} />
        <meshStandardMaterial color="#d6a96a" />
      </mesh>
      <mesh position={[0.1, 0.32, 0.05]}>
        <sphereGeometry args={[0.08, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#dc2626" />
      </mesh>
    </group>
  );
}

function Forest() {
  const props = useMemo(() => scatter(30, 11), []);
  return (
    <>
      {props.map((p, i) => (
        <Spot key={i} p={p}>
          {i % 7 === 3 ? <Mushroom /> : i % 7 === 5 ? <Pond /> : i % 7 === 6 ? <Log /> : i % 7 === 1 ? <Flowers /> : i % 3 === 0 ? <Oak i={i} /> : <Pine i={i} />}
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
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 1.4, 8]} />
        <meshStandardMaterial color="#fff7ed" />
      </mesh>
      <mesh position={[0, 1.5, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.12, 28]} />
        <meshStandardMaterial color={c} roughness={0.2} />
      </mesh>
      {[0.12, 0.24, 0.36].map((r, k) => (
        <mesh key={k} position={[0, 1.5, 0.07]} rotation={[0, 0, 0]}>
          <torusGeometry args={[r, 0.028, 6, 28]} />
          <meshStandardMaterial color={k % 2 ? c : '#ffffff'} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function Cupcake({ c }: { c: string }) {
  return (
    <group>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.46, 0.32, 0.5, 16]} />
        <meshStandardMaterial color="#d97706" roughness={0.8} />
      </mesh>
      {[0.5, 0.75, 0.97].map((y, k) => (
        <mesh key={k} position={[0, y, 0]} castShadow>
          <sphereGeometry args={[0.46 - k * 0.12, 18, 12]} />
          <meshStandardMaterial color={c} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 1.22, 0]}>
        <sphereGeometry args={[0.09, 10, 10]} />
        <meshStandardMaterial color="#dc2626" roughness={0.15} />
      </mesh>
    </group>
  );
}

function Gumdrops({ c }: { c: string }) {
  return (
    <group>
      {[[0, 0, 0.5], [0.6, 0.25, 0.34], [-0.45, -0.3, 0.36], [0.2, -0.55, 0.28]].map(([x, z, r], i) => (
        <mesh key={i} position={[x!, r! * 0.1, z!]} castShadow>
          <sphereGeometry args={[r!, 16, 10, 0, Math.PI * 2, 0, Math.PI / 1.9]} />
          <meshStandardMaterial color={CANDY[(CANDY.indexOf(c) + i) % CANDY.length]} roughness={0.15} />
        </mesh>
      ))}
    </group>
  );
}

function CandyCane() {
  return (
    <group>
      {[0, 1, 2, 3, 4, 5].map((k) => (
        <mesh key={k} position={[0, 0.12 + k * 0.22, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.22, 10]} />
          <meshStandardMaterial color={k % 2 ? '#ffffff' : '#ef4444'} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0.2, 1.38, 0]} castShadow>
        <torusGeometry args={[0.2, 0.07, 10, 18, Math.PI]} />
        <meshStandardMaterial color="#ef4444" roughness={0.3} />
      </mesh>
    </group>
  );
}

function Donut() {
  return (
    <group position={[0, 0.34, 0]} rotation={[Math.PI / 2.4, 0, 0]}>
      <mesh castShadow>
        <torusGeometry args={[0.42, 0.2, 14, 28]} />
        <meshStandardMaterial color="#d99a4e" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.08]} scale={[1, 1, 0.6]}>
        <torusGeometry args={[0.42, 0.19, 14, 28]} />
        <meshStandardMaterial color="#f472b6" roughness={0.25} />
      </mesh>
    </group>
  );
}

function CottonCandy() {
  return (
    <group>
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 1.0, 8]} />
        <meshStandardMaterial color="#fff7ed" />
      </mesh>
      {[[0, 1.2, 0, 0.45, '#fbcfe8'], [0.3, 1.05, 0.1, 0.32, '#f9a8d4'], [-0.28, 1.1, -0.05, 0.34, '#bae6fd'], [0, 1.5, 0, 0.3, '#fbcfe8']].map(([x, y, z, r, col], k) => (
        <mesh key={k} position={[x as number, y as number, z as number]} castShadow>
          <icosahedronGeometry args={[r as number, 1]} />
          <meshStandardMaterial color={col as string} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function Candy() {
  const props = useMemo(() => scatter(30, 23), []);
  return (
    <>
      {props.map((p, i) => {
        const c = CANDY[i % CANDY.length]!;
        const k = i % 6;
        return (
          <Spot key={i} p={p}>
            {k === 0 ? <Lollipop c={c} /> : k === 1 ? <Cupcake c={c} /> : k === 2 ? <Gumdrops c={c} /> : k === 3 ? <CandyCane /> : k === 4 ? <Donut /> : <CottonCandy />}
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
        <sphereGeometry args={[r, 40, 28]} />
        <meshStandardMaterial color={color} roughness={0.65} emissive={color} emissiveIntensity={0.22} />
      </mesh>
      <mesh scale={1.06}>
        <sphereGeometry args={[r, 32, 20]} />
        <meshBasicMaterial color={color} transparent opacity={0.12} depthWrite={false} />
      </mesh>
      {ringColor && (
        <mesh rotation={[Math.PI / 2.6, 0.2, 0]}>
          <torusGeometry args={[r * 1.65, r * 0.1, 6, 64]} />
          <meshStandardMaterial color={ringColor} emissive={ringColor} emissiveIntensity={0.45} />
        </mesh>
      )}
    </group>
  );
}

function FloatingRock({ p, i }: { p: Prop; i: number }) {
  const y = 0.5 + (i % 4) * 0.45;
  return (
    <group position={[p[0], y, p[1]]} rotation={[p[3] * 0.3, p[3], 0]} scale={p[2]}>
      <mesh scale={[0.5, 0.38, 0.45]} castShadow>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#475569" roughness={0.85} flatShading />
      </mesh>
      {i % 2 === 0 && (
        <>
          <mesh position={[0.1, 0.35, 0]} rotation={[0, 0, 0.2]}>
            <coneGeometry args={[0.1, 0.5, 5]} />
            <meshStandardMaterial color="#67e8f9" emissive="#22d3ee" emissiveIntensity={1.4} />
          </mesh>
          <mesh position={[-0.15, 0.28, 0.08]} rotation={[0, 0, -0.35]}>
            <coneGeometry args={[0.07, 0.34, 5]} />
            <meshStandardMaterial color="#f0abfc" emissive="#d946ef" emissiveIntensity={1.4} />
          </mesh>
        </>
      )}
    </group>
  );
}

function Space({ animate }: { animate: boolean }) {
  const rocks = useMemo(() => scatter(20, 37, 15, 4.6), []);
  return (
    <>
      <Planet position={[13, 1.6, -3.5]} r={2.0} color="#7c3aed" ringColor="#f0abfc" />
      <Planet position={[-12.8, 1.8, 3.5]} r={1.3} color="#38bdf8" />
      <Planet position={[12.5, 0.7, -12.5]} r={0.6} color="#fbbf24" />
      <Planet position={[-12, 1.2, 12]} r={0.9} color="#f43f5e" ringColor="#fecdd3" />
      {rocks.map((p, i) => (
        <FloatingRock key={i} p={p} i={i} />
      ))}
      <Particles count={120} color="#ffffff" size={0.08} mode="twinkle" animate={animate} seed={5} yMin={-0.3} yMax={4} inner={8.6} />
      <Particles count={50} color="#c4b5fd" size={0.12} mode="twinkle" animate={animate} seed={9} yMin={0} yMax={5} inner={8.6} />
    </>
  );
}

// ─── Lava ─────────────────────────────────────────────────────────────────────

function Volcano() {
  return (
    <group>
      <mesh position={[0, 1.0, 0]} castShadow>
        <coneGeometry args={[1.6, 2.4, 12, 1, true]} />
        <meshStandardMaterial color="#2b2522" roughness={1} flatShading side={2} />
      </mesh>
      <mesh position={[0, 2.18, 0]}>
        <cylinderGeometry args={[0.42, 0.42, 0.06, 14]} />
        <meshStandardMaterial color="#7c2d12" emissive="#ea580c" emissiveIntensity={1.0} />
      </mesh>
      {[0, 1.6, 3.4, 4.8].map((a, i) => (
        <mesh key={i} position={[Math.sin(a) * 0.62, 1.3 - i * 0.2, Math.cos(a) * 0.62]} rotation={[0.45, a, 0]}>
          <boxGeometry args={[0.11, 1.1, 0.04]} />
          <meshStandardMaterial color="#7c2d12" emissive="#ea580c" emissiveIntensity={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function BasaltColumns() {
  return (
    <group>
      {[[0, 0, 0.9], [0.32, 0.12, 0.6], [-0.3, 0.2, 0.75], [0.1, -0.32, 0.5], [-0.25, -0.28, 0.4]].map(([x, z, h], i) => (
        <mesh key={i} position={[x!, h! / 2, z!]} castShadow>
          <cylinderGeometry args={[0.17, 0.2, h!, 6]} />
          <meshStandardMaterial color="#27272a" roughness={0.9} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function MagmaPool() {
  return (
    <group>
      <mesh position={[0, 0.03, 0]} scale={[1, 1, 0.8]}>
        <cylinderGeometry args={[0.9, 0.95, 0.06, 18]} />
        <meshStandardMaterial color="#292524" roughness={1} />
      </mesh>
      <mesh position={[0, 0.07, 0]} scale={[1, 1, 0.8]}>
        <cylinderGeometry args={[0.72, 0.72, 0.03, 18]} />
        <meshStandardMaterial color="#7c2d12" emissive="#ea580c" emissiveIntensity={1.0} />
      </mesh>
    </group>
  );
}

function Spire() {
  return (
    <group>
      <mesh position={[0, 0.7, 0]} castShadow>
        <coneGeometry args={[0.32, 1.5, 6]} />
        <meshStandardMaterial color="#1c1917" roughness={1} flatShading />
      </mesh>
      <mesh position={[0.28, 0.4, 0.1]} castShadow rotation={[0, 0, -0.25]}>
        <coneGeometry args={[0.2, 0.9, 6]} />
        <meshStandardMaterial color="#292524" roughness={1} flatShading />
      </mesh>
      <mesh position={[0, 1.42, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#7c2d12" emissive="#ea580c" emissiveIntensity={1.0} />
      </mesh>
    </group>
  );
}

function Lava({ animate }: { animate: boolean }) {
  const props = useMemo(() => scatter(26, 51), []);
  return (
    <>
      {props.map((p, i) => {
        const k = i % 5;
        return (
          <Spot key={i} p={p}>
            {k === 0 ? <Volcano /> : k === 1 || k === 4 ? <BasaltColumns /> : k === 2 ? <MagmaPool /> : <Spire />}
          </Spot>
        );
      })}
      <Particles count={110} color="#fb923c" size={0.1} mode="rise" animate={animate} seed={7} yMin={-0.3} yMax={5} inner={8.6} />
    </>
  );
}

// ─── Ice ──────────────────────────────────────────────────────────────────────

function IceSpikes() {
  const spikes: readonly (readonly [number, number, number, number])[] = [
    [0, 0, 0.32, 1.6],
    [0.45, 0.2, 0.22, 1.0],
    [-0.4, 0.15, 0.24, 1.15],
    [0.1, -0.45, 0.17, 0.75],
    [-0.15, 0.45, 0.14, 0.6],
  ];
  return (
    <group>
      {spikes.map(([x, z, r, h], i) => (
        <mesh key={i} position={[x, h / 2, z]} rotation={[0, i, (i - 2) * 0.08]} castShadow>
          <coneGeometry args={[r, h, 6]} />
          <meshPhysicalMaterial
            color="#bae6fd"
            emissive="#38bdf8"
            emissiveIntensity={0.25}
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
      {[[0.3, 0.36], [0.74, 0.26], [1.04, 0.19]].map(([y, r], i) => (
        <mesh key={i} position={[0, y!, 0]} castShadow>
          <sphereGeometry args={[r!, 16, 12]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 1.04, 0.19]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.04, 0.2, 6]} />
        <meshStandardMaterial color="#f97316" />
      </mesh>
      {[-0.07, 0.07].map((x) => (
        <mesh key={x} position={[x, 1.1, 0.17]}>
          <sphereGeometry args={[0.02, 6, 6]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
      ))}
      <mesh position={[0, 1.24, 0]}>
        <cylinderGeometry args={[0.11, 0.13, 0.16, 10]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[0, 0.9, 0.0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.2, 0.04, 6, 14]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
    </group>
  );
}

function SnowPine() {
  return (
    <group>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.13, 0.5, 8]} />
        <meshStandardMaterial color="#6b4a2e" roughness={1} />
      </mesh>
      {[0.45, 0.85, 1.2].map((y, k) => (
        <group key={y} position={[0, y + 0.2, 0]}>
          <mesh castShadow>
            <coneGeometry args={[0.66 - k * 0.17, 0.7, 9]} />
            <meshStandardMaterial color="#2f6f62" roughness={0.9} flatShading />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <coneGeometry args={[0.55 - k * 0.15, 0.5, 9]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.95} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Igloo() {
  return (
    <group>
      <mesh castShadow>
        <sphereGeometry args={[0.95, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#e8f6fd" roughness={0.7} />
      </mesh>
      {[0.3, 0.55, 0.78].map((y, k) => (
        <mesh key={k} position={[0, y * 0.95, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[Math.sqrt(0.9 - (y * 0.95) ** 2) * 1.02, 0.012, 4, 36]} />
          <meshStandardMaterial color="#9ccbe3" />
        </mesh>
      ))}
      <mesh position={[0, 0.2, 0.88]} castShadow>
        <boxGeometry args={[0.42, 0.4, 0.5]} />
        <meshStandardMaterial color="#e8f6fd" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.17, 1.14]}>
        <boxGeometry args={[0.28, 0.3, 0.02]} />
        <meshStandardMaterial color="#0c2a45" />
      </mesh>
    </group>
  );
}

function Penguin() {
  return (
    <group>
      <mesh position={[0, 0.34, 0]} castShadow>
        <capsuleGeometry args={[0.2, 0.3, 6, 14]} />
        <meshStandardMaterial color="#111827" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.32, 0.1]} scale={[0.85, 1.2, 0.5]}>
        <sphereGeometry args={[0.18, 14, 12]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.66, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.04, 0.1, 6]} />
        <meshStandardMaterial color="#f97316" />
      </mesh>
      {[-0.06, 0.06].map((x) => (
        <mesh key={x} position={[x, 0.7, 0.14]}>
          <sphereGeometry args={[0.022, 6, 6]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}
      {[-0.09, 0.09].map((x) => (
        <mesh key={x} position={[x, 0.02, 0.1]} scale={[1, 0.3, 1.5]}>
          <sphereGeometry args={[0.06, 8, 6]} />
          <meshStandardMaterial color="#f97316" />
        </mesh>
      ))}
    </group>
  );
}

function SnowMound() {
  return (
    <mesh position={[0, 0.05, 0]} scale={[1, 0.55, 0.9]} castShadow>
      <sphereGeometry args={[0.75, 16, 12]} />
      <meshStandardMaterial color="#ffffff" roughness={0.95} />
    </mesh>
  );
}

function Ice({ animate }: { animate: boolean }) {
  const props = useMemo(() => scatter(30, 67), []);
  return (
    <>
      {props.map((p, i) => {
        const k = i % 7;
        return (
          <Spot key={i} p={p}>
            {k === 0 ? <Snowman /> : k === 1 || k === 4 ? <SnowPine /> : k === 2 ? <IceSpikes /> : k === 3 ? <Igloo /> : k === 5 ? <Penguin /> : <SnowMound />}
          </Spot>
        );
      })}
      <Particles count={190} color="#ffffff" size={0.07} mode="fall" animate={animate} seed={3} yMin={-0.3} yMax={6} />
    </>
  );
}

// ─── Lingkungan (cahaya warna per arena) ──────────────────────────────────────

export const ARENA_LIGHT: Readonly<Record<ArenaSkinId, { sky: string; ground: string; sun: string; sunI: number; hemiI: number }>> = {
  classic: { sky: '#d6f1f2', ground: '#b59c74', sun: '#ffe2b5', sunI: 2.3, hemiI: 0.85 },
  forest: { sky: '#d9f99d', ground: '#365314', sun: '#fde68a', sunI: 2.1, hemiI: 0.8 },
  candy: { sky: '#fbcfe8', ground: '#f472b6', sun: '#fff1f2', sunI: 2.2, hemiI: 1.0 },
  space: { sky: '#a5b4fc', ground: '#1e1b4b', sun: '#c7d2fe', sunI: 1.9, hemiI: 0.85 },
  lava: { sky: '#fdba74', ground: '#7f1d1d', sun: '#fb923c', sunI: 2.0, hemiI: 0.8 },
  ice: { sky: '#e0f2fe', ground: '#7dd3fc', sun: '#f0f9ff', sunI: 2.3, hemiI: 1.0 },
};

export function ArenaScenery({ animate }: { animate: boolean }) {
  const { arenaDef } = useCustomization();
  const id = arenaDef.id;
  if (id === 'classic') return null;
  return (
    <>
      <TerrainPlane id={id} animate={animate} />
      {id === 'forest' && <Forest />}
      {id === 'candy' && <Candy />}
      {id === 'space' && <Space animate={animate} />}
      {id === 'lava' && <Lava animate={animate} />}
      {id === 'ice' && <Ice animate={animate} />}
    </>
  );
}
