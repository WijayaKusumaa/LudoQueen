/**
 * AnimatedPawn.tsx
 *
 * A single pawn rendered at an animated world position.
 * - Position each frame = authoritative rest position, or the presentation controller's
 *   temporary interpolation while this pawn is animating (never accumulated).
 * - Shows a selection ring when this pawn is selectable.
 * - Fires onSelect(pawnIdx) on a tap (mouse or touch) to trigger the MOVE action.
 * - Hover state lifts the pawn slightly.
 */

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh, Group } from 'three';
import {
  CircleGeometry,
  LatheGeometry,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  RingGeometry,
  SphereGeometry,
  SplineCurve,
  Vector2,
  type BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { PlayerColor } from '../board/boardLayout';
import { makeBlobShadowTexture } from '../board/boardTextures';
import { PLAYER_THEME } from '../palette';
import { useTap } from '../interaction/useTap';
import type { PresentationController } from '../animation/presentation';

// ─── Shared geometry / material cache ────────────────────────────────────────

function buildPawnGeometry(): BufferGeometry {
  const profile = new SplineCurve([
    new Vector2(0.001, 0),
    new Vector2(0.3, 0),
    new Vector2(0.31, 0.045),
    new Vector2(0.25, 0.1),
    new Vector2(0.19, 0.22),
    new Vector2(0.135, 0.4),
    new Vector2(0.105, 0.52),
    new Vector2(0.13, 0.56),
    new Vector2(0.001, 0.57),
  ]).getPoints(56);
  const body = new LatheGeometry(profile, 40);
  const head = new SphereGeometry(0.17, 32, 24);
  head.translate(0, 0.65, 0);
  const merged = mergeGeometries([body, head]);
  body.dispose();
  head.dispose();
  return merged;
}

let _pawnGeo: BufferGeometry | null = null;
let _blobGeo: CircleGeometry | null = null;
let _blobMat: MeshBasicMaterial | null = null;
let _ringGeo: RingGeometry | null = null;
const _paints = new Map<PlayerColor, MeshPhysicalMaterial>();
const _selectMats = new Map<PlayerColor, MeshBasicMaterial>();

function getPawnGeo()   { return (_pawnGeo ??= buildPawnGeometry()); }
function getBlobGeo()   { return (_blobGeo ??= new CircleGeometry(0.46, 32)); }
function getBlobMat()   {
  return (_blobMat ??= new MeshBasicMaterial({
    map: makeBlobShadowTexture(),
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  }));
}
function getRingGeo()   {
  return (_ringGeo ??= new RingGeometry(0.44, 0.62, 40));
}

function getPaint(color: PlayerColor): MeshPhysicalMaterial {
  let m = _paints.get(color);
  if (!m) {
    m = new MeshPhysicalMaterial({
      color: PLAYER_THEME[color].main,
      roughness: 0.4,
      metalness: 0,
      clearcoat: 0.3,
      clearcoatRoughness: 0.45,
    });
    _paints.set(color, m);
  }
  return m;
}

function getSelectMat(color: PlayerColor): MeshBasicMaterial {
  let m = _selectMats.get(color);
  if (!m) {
    m = new MeshBasicMaterial({
      color: PLAYER_THEME[color].light,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    _selectMats.set(color, m);
  }
  return m;
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface AnimatedPawnProps {
  color: PlayerColor;
  pawnIdx: number;
  /** Posisi otoritatif (dari GameState) — dipakai bila pion tidak sedang dianimasikan. */
  rest: [number, number, number];
  presentation: PresentationController;
  /** Skala ukuran pion (mis. 0.82 bila berbagi petak dengan pion lain). */
  scale?: number;
  /** Apakah pion ini boleh dipilih sekarang (sudah memperhitungkan kunci input). */
  selectable: boolean;
  /** Animasi diizinkan (false = tanpa denyut/lonjakan, hasil tetap sama). */
  animate: boolean;
  /** Mode perayaan setelah permainan selesai. */
  celebrate: boolean;
  onSelect: (pawnIdx: number) => void;
}

const HOVER_LIFT = 0.12;
const PULSE_HZ = 1.4;

export function AnimatedPawn({
  color,
  pawnIdx,
  rest,
  presentation,
  scale = 1,
  selectable,
  animate,
  celebrate,
  onSelect,
}: AnimatedPawnProps) {
  const groupRef = useRef<Group>(null!);
  const ringRef = useRef<Mesh>(null!);
  const hovered = useRef(false);

  const tap = useTap(() => onSelect(pawnIdx), selectable);

  // Reset kursor bila pion berhenti bisa dipilih / komponen dilepas.
  useEffect(() => {
    if (!selectable && hovered.current) {
      hovered.current = false;
      document.body.style.cursor = '';
    }
    return () => {
      if (hovered.current) document.body.style.cursor = '';
    };
  }, [selectable]);

  useFrame(({ clock }) => {
    const g = groupRef.current;
    if (!g) return;
    const t = clock.getElapsedTime();

    // Posisi = otoritatif atau interpolasi sementara; tidak pernah diakumulasi.
    const [x, y, z] = presentation.positionOf(color, pawnIdx, rest);
    let lift = hovered.current && selectable ? HOVER_LIFT : 0;
    if (celebrate && animate) lift += Math.max(0, Math.sin(t * 3.2 - pawnIdx * 0.9)) * 0.14;
    g.position.set(x, y + lift, z);
    g.scale.setScalar(scale);

    const ring = ringRef.current;
    if (ring && selectable) {
      const mat = ring.material as MeshBasicMaterial;
      const pulse = animate ? Math.sin(t * PULSE_HZ * Math.PI * 2) : 0;
      mat.opacity = 0.7 + pulse * 0.2;
      const s = 1 + pulse * 0.05;
      ring.scale.set(s, s, 1);
    }
  });

  return (
    <group
      ref={groupRef}
      position={rest}
      onPointerDown={tap.onPointerDown}
      onPointerUp={tap.onPointerUp}
      onPointerCancel={tap.onPointerCancel}
      onPointerOver={(e) => {
        if (!selectable) return;
        e.stopPropagation();
        hovered.current = true;
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        if (!hovered.current) return;
        hovered.current = false;
        document.body.style.cursor = '';
      }}
    >
      {/* Contact shadow */}
      <mesh
        geometry={getBlobGeo()}
        material={getBlobMat()}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.004, 0]}
        renderOrder={2}
        raycast={() => null}
      />

      {/* Indikator pion yang bisa dipilih: cincin lembut berwarna pemain */}
      {selectable && (
        <mesh
          ref={ringRef}
          geometry={getRingGeo()}
          material={getSelectMat(color)}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.02, 0]}
          renderOrder={3}
          raycast={() => null}
        />
      )}

      {/* Pion */}
      <mesh geometry={getPawnGeo()} material={getPaint(color)} castShadow receiveShadow />

      {/* Area sentuh lebih besar (jari) — hanya saat bisa dipilih */}
      {selectable && (
        <mesh position={[0, 0.4, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.9, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
      )}
    </group>
  );
}
