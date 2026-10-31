/**
 * DiceDisplay.tsx
 *
 * Dadu 3D yang duduk di tengah base pemain aktif. Ketuk/klik untuk melempar.
 *
 * Hasil dadu SELALU ditentukan engine (GameSession.roll). Komponen ini hanya
 * menampilkan: selama langkah 'dice' pada PresentationController berjalan, dadu
 * berguling lalu mendarat tepat pada muka hasil yang sudah ditentukan.
 * animate=false → dadu langsung menunjukkan hasil.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  CanvasTexture,
  Euler,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  Quaternion,
  RingGeometry,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { DieValue } from '../engine/types';
import type { PlayerColor } from '../board/boardLayout';
import { BASE_CENTER } from '../board/boardLayout';
import { gridToWorld } from '../board/boardCoordinates';
import type { PresentationController } from '../animation/presentation';
import { PLAYER_THEME } from '../palette';
import { useTap } from '../interaction/useTap';
import { registerCanvasTexture } from '../board/boardTextures';
import { useCustomization, type DiceSkinDef } from '../customization';

// ─── Dot texture generator ────────────────────────────────────────────────────

/** Canonical dot positions for each face value (0-1 UV space). */
const DOT_POSITIONS: Record<number, Array<[number, number]>> = {
  1: [[0.5, 0.5]],
  2: [[0.25, 0.25], [0.75, 0.75]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.25, 0.2], [0.75, 0.2], [0.25, 0.5], [0.75, 0.5], [0.25, 0.8], [0.75, 0.8]],
};

const faceTextureCache = new Map<string, CanvasTexture>();

function makeFaceTexture(value: number, skin: DiceSkinDef): CanvasTexture {
  const key = `${skin.id}:${value}`;
  let t = faceTextureCache.get(key);
  if (t) return t;

  const S = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = skin.colors.body;
  ctx.fillRect(0, 0, S, S);

  // Bingkai halus pada permukaan dadu
  ctx.strokeStyle = skin.colors.border;
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, S - 6, S - 6);

  ctx.fillStyle = value === 1 ? skin.colors.pipOne : skin.colors.pip;
  const r = value === 1 ? S * 0.115 : S * 0.085;
  for (const [u, v] of DOT_POSITIONS[value] ?? []) {
    ctx.beginPath();
    ctx.arc(u * S, v * S, r, 0, Math.PI * 2);
    ctx.fill();
  }

  t = new CanvasTexture(canvas);
  faceTextureCache.set(key, t);
  return registerCanvasTexture(t);
}

// ─── Orientasi muka ───────────────────────────────────────────────────────────
// Muka BoxGeometry: +X=4, -X=3, +Y=1, -Y=6, +Z=5, -Z=2 (sisi berlawanan berjumlah 7).
// Rotasi berikut membawa muka bernilai V ke atas (+Y).

const FACE_ROTATIONS: Record<number, [number, number, number]> = {
  1: [0, 0, 0],
  2: [Math.PI / 2, 0, 0],
  3: [0, 0, -Math.PI / 2],
  4: [0, 0, Math.PI / 2],
  5: [-Math.PI / 2, 0, 0],
  6: [Math.PI, 0, 0],
};

const FACE_QUATS: Record<number, Quaternion> = Object.fromEntries(
  Object.entries(FACE_ROTATIONS).map(([v, r]) => [v, new Quaternion().setFromEuler(new Euler(...r))]),
);

const SIZE = 0.72;
const REST_Y = 0.5;
const smooth = (t: number) => t * t * (3 - 2 * t);

// ─── Komponen ─────────────────────────────────────────────────────────────────

export interface DiceDisplayProps {
  /** Hasil lemparan terakhir dari engine (state.lastRoll). */
  value: DieValue | null;
  /** Pemain yang dadunya ditampilkan (di tengah base-nya). */
  player: PlayerColor;
  /** Boleh dilempar sekarang (fase awaitingRoll dan input tidak terkunci). */
  canRoll: boolean;
  animate: boolean;
  presentation: PresentationController;
  onRoll: () => void;
}

export function DiceDisplay({ value, player, canRoll, animate, presentation, onRoll }: DiceDisplayProps) {
  const { diceDef } = useCustomization();
  const groupRef = useRef<Group>(null!);
  const ringRef = useRef<Mesh>(null!);
  const hovered = useRef(false);
  const seed = useRef(0);
  const wasRolling = useRef(false);
  const spin = useMemo(() => new Quaternion(), []);
  const euler = useMemo(() => new Euler(), []);

  const faceTextures = useMemo(
    () => [1, 2, 3, 4, 5, 6].map((v) => makeFaceTexture(v, diceDef)),
    [diceDef],
  );
  const diceGeo = useMemo(() => new RoundedBoxGeometry(SIZE, SIZE, SIZE, 4, 0.09), []);
  const diceMaterials = useMemo(() => {
    const { roughness, metalness } = diceDef.colors;
    return [
      // +X: face 4
      new MeshPhysicalMaterial({ color: '#ffffff', map: faceTextures[3], roughness, metalness }),
      // -X: face 3
      new MeshPhysicalMaterial({ color: '#ffffff', map: faceTextures[2], roughness, metalness }),
      // +Y: face 1
      new MeshPhysicalMaterial({ color: '#ffffff', map: faceTextures[0], roughness, metalness }),
      // -Y: face 6
      new MeshPhysicalMaterial({ color: '#ffffff', map: faceTextures[5], roughness, metalness }),
      // +Z: face 5
      new MeshPhysicalMaterial({ color: '#ffffff', map: faceTextures[4], roughness, metalness }),
      // -Z: face 2
      new MeshPhysicalMaterial({ color: '#ffffff', map: faceTextures[1], roughness, metalness }),
    ];
  }, [faceTextures, diceDef]);

  const ringGeo = useMemo(() => new RingGeometry(0.62, 0.78, 40), []);
  const ringMat = useMemo(
    () => new MeshBasicMaterial({ transparent: true, opacity: 0.7, depthWrite: false }),
    [],
  );
  useEffect(
    () => () => {
      diceGeo.dispose();
      diceMaterials.forEach((m) => m.dispose());
      ringGeo.dispose();
      ringMat.dispose();
      if (hovered.current) document.body.style.cursor = '';
    },
    [diceGeo, diceMaterials, ringGeo, ringMat],
  );
  useEffect(() => {
    ringMat.color.set(PLAYER_THEME[player].light);
  }, [ringMat, player]);

  const center = gridToWorld(BASE_CENTER[player]);
  const tap = useTap(onRoll, canRoll);

  useFrame(({ clock }) => {
    const g = groupRef.current;
    if (!g) return;
    const target = FACE_QUATS[value ?? 1]!;
    const progress = presentation.diceProgress();

    if (progress !== null) {
      if (!wasRolling.current) seed.current = Math.random() * 10;
      // Putaran melambat (ease-out) dan berpadu mulus ke muka hasil engine.
      const left = (1 - progress) * (1 - progress);
      const a = left * Math.PI * 6;
      euler.set(a + seed.current, a * 0.7, a * 0.4);
      spin.setFromEuler(euler);
      g.quaternion.copy(spin).slerp(target, smooth(Math.min(Math.max((progress - 0.45) / 0.55, 0), 1)));
      g.position.y = REST_Y + Math.sin(progress * Math.PI) * 0.3;
      wasRolling.current = true;
    } else {
      wasRolling.current = false;
      g.quaternion.copy(target);
      const hoverY = hovered.current && canRoll ? 0.08 : 0;
      g.position.y += (REST_Y + hoverY - g.position.y) * (animate ? 0.2 : 1);
    }

    const ring = ringRef.current;
    if (ring) {
      ring.visible = canRoll;
      if (canRoll) {
        const pulse = animate ? Math.sin(clock.getElapsedTime() * Math.PI * 2 * 1.4) : 0;
        ringMat.opacity = 0.7 + pulse * 0.2;
        const s = 1 + pulse * 0.05;
        ring.scale.set(s, s, 1);
      }
    }
  });

  return (
    <>
      {/* Cincin penanda "lempar di sini" berwarna pemain aktif (rata di tanah) */}
      <mesh
        ref={ringRef}
        geometry={ringGeo}
        material={ringMat}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[center.x, 0.12, center.z]}
        renderOrder={3}
        raycast={() => null}
      />
    <group
      ref={groupRef}
      position={[center.x, REST_Y, center.z]}
      onPointerDown={tap.onPointerDown}
      onPointerUp={tap.onPointerUp}
      onPointerCancel={tap.onPointerCancel}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (canRoll) {
          hovered.current = true;
          document.body.style.cursor = 'pointer';
        }
      }}
      onPointerOut={() => {
        hovered.current = false;
        document.body.style.cursor = '';
      }}
    >
      <mesh geometry={diceGeo} material={diceMaterials} castShadow />

      {/* Area sentuh lebih besar untuk jari */}
      {canRoll && (
        <mesh>
          <sphereGeometry args={[0.85, 12, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
      )}
    </group>
    </>
  );
}
