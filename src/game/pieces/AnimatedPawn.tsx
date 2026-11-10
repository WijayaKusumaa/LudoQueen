/**
 * AnimatedPawn.tsx
 *
 * A single pawn rendered at an animated world position with custom 3D geometries
 * and unique personality animations for each pawn skin:
 * - classic: Timeless ludo wooden/acrylic pawn silhouette
 * - crystal: Faceted diamond gem with floating levitation & crystalline spin
 * - robot: Mecha android with chest screen, blinking antenna LED & mechanical ticks
 * - knight: Island defender with golden royal crown & proud noble breathing
 * - neon: Cyberpunk pawn with independent orbiting glowing neon rings
 * - cute: Adorable bear pawn with bear ears, cute face & jelly squash-and-stretch
 */

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh, Group } from 'three';
import {
  BoxGeometry,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  LatheGeometry,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  RingGeometry,
  SphereGeometry,
  SplineCurve,
  TorusGeometry,
  Vector2,
  type BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { PlayerColor } from '../board/boardLayout';
import { makeBlobShadowTexture } from '../board/boardTextures';
import { PLAYER_THEME } from '../palette';
import { useTap } from '../interaction/useTap';
import type { PresentationController } from '../animation/presentation';
import { useCustomization, type PawnSkinDef } from '../customization';

// ─── Shared Geometries Cache ──────────────────────────────────────────────────

let _blobGeo: CircleGeometry | null = null;
let _blobMat: MeshBasicMaterial | null = null;
let _ringGeo: RingGeometry | null = null;

// Classic
let _classicGeo: BufferGeometry | null = null;

// Crystal
let _crystalOuterGeo: BufferGeometry | null = null;
let _crystalInnerGeo: BufferGeometry | null = null;

// Robot
let _robotBaseGeo: CylinderGeometry | null = null;
let _robotTorsoGeo: BoxGeometry | null = null;
let _robotChestGeo: BoxGeometry | null = null;
let _robotHeadGeo: BoxGeometry | null = null;
let _robotVisorGeo: BoxGeometry | null = null;
let _robotAntennaGeo: CylinderGeometry | null = null;
let _robotLedGeo: SphereGeometry | null = null;

// Knight
let _knightMantleGeo: BufferGeometry | null = null;
let _knightHeadGeo: SphereGeometry | null = null;
let _knightCollarGeo: TorusGeometry | null = null;
let _knightCrownBaseGeo: CylinderGeometry | null = null;
let _knightCrownPeakGeo: ConeGeometry | null = null;
let _knightRubyGeo: SphereGeometry | null = null;

// Neon
let _neonBodyGeo: BufferGeometry | null = null;
let _neonWaistRingGeo: TorusGeometry | null = null;
let _neonNeckRingGeo: TorusGeometry | null = null;
let _neonCoreGeo: SphereGeometry | null = null;

// Cute
let _cuteBodyGeo: BufferGeometry | null = null;
let _cuteHeadGeo: SphereGeometry | null = null;
let _cuteEarGeo: SphereGeometry | null = null;
let _cuteInnerEarGeo: SphereGeometry | null = null;
let _cuteEyeGeo: SphereGeometry | null = null;
let _cuteSnoutGeo: SphereGeometry | null = null;
let _cuteNoseGeo: SphereGeometry | null = null;

function getBlobGeo() { return (_blobGeo ??= new CircleGeometry(0.46, 32)); }
function getBlobMat() {
  return (_blobMat ??= new MeshBasicMaterial({
    map: makeBlobShadowTexture(),
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  }));
}
function getRingGeo() { return (_ringGeo ??= new RingGeometry(0.44, 0.62, 40)); }

function getClassicGeo(): BufferGeometry {
  if (!_classicGeo) {
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
    _classicGeo = mergeGeometries([body, head]);
    body.dispose();
    head.dispose();
  }
  return _classicGeo;
}

function getCrystalOuterGeo(): BufferGeometry {
  if (!_crystalOuterGeo) {
    const profile = [
      new Vector2(0.001, 0.02),
      new Vector2(0.15, 0.02),
      new Vector2(0.24, 0.32),
      new Vector2(0.29, 0.56),
      new Vector2(0.001, 0.88),
    ];
    _crystalOuterGeo = new LatheGeometry(profile, 6);
  }
  return _crystalOuterGeo;
}

function getCrystalInnerGeo(): BufferGeometry {
  if (!_crystalInnerGeo) {
    const profile = [
      new Vector2(0.001, 0.28),
      new Vector2(0.13, 0.48),
      new Vector2(0.001, 0.68),
    ];
    _crystalInnerGeo = new LatheGeometry(profile, 6);
  }
  return _crystalInnerGeo;
}

function getKnightMantleGeo(): BufferGeometry {
  if (!_knightMantleGeo) {
    const profile = new SplineCurve([
      new Vector2(0.001, 0),
      new Vector2(0.32, 0),
      new Vector2(0.33, 0.06),
      new Vector2(0.26, 0.14),
      new Vector2(0.18, 0.34),
      new Vector2(0.25, 0.44),
      new Vector2(0.14, 0.50),
      new Vector2(0.001, 0.52),
    ]).getPoints(36);
    _knightMantleGeo = new LatheGeometry(profile, 32);
  }
  return _knightMantleGeo;
}

function getNeonBodyGeo(): BufferGeometry {
  if (!_neonBodyGeo) {
    const profile = new SplineCurve([
      new Vector2(0.001, 0),
      new Vector2(0.29, 0),
      new Vector2(0.30, 0.05),
      new Vector2(0.23, 0.12),
      new Vector2(0.16, 0.28),
      new Vector2(0.11, 0.48),
      new Vector2(0.001, 0.52),
    ]).getPoints(36);
    const body = new LatheGeometry(profile, 36);
    const head = new SphereGeometry(0.16, 28, 20);
    head.translate(0, 0.64, 0);
    _neonBodyGeo = mergeGeometries([body, head]);
    body.dispose();
    head.dispose();
  }
  return _neonBodyGeo;
}

function getCuteBodyGeo(): BufferGeometry {
  if (!_cuteBodyGeo) {
    const profile = new SplineCurve([
      new Vector2(0.001, 0),
      new Vector2(0.28, 0),
      new Vector2(0.30, 0.08),
      new Vector2(0.26, 0.24),
      new Vector2(0.16, 0.38),
      new Vector2(0.001, 0.42),
    ]).getPoints(32);
    _cuteBodyGeo = new LatheGeometry(profile, 36);
  }
  return _cuteBodyGeo;
}

// ─── Shared Materials Cache ───────────────────────────────────────────────────

const _paints = new Map<string, MeshPhysicalMaterial>();
const _selectMats = new Map<PlayerColor, MeshBasicMaterial>();

// Fixed Accent Materials
let _goldMat: MeshPhysicalMaterial | null = null;
let _rubyMat: MeshPhysicalMaterial | null = null;
let _robotMetalMat: MeshPhysicalMaterial | null = null;
let _cyanScreenMat: MeshBasicMaterial | null = null;
let _robotLedMat: MeshStandardMaterial | null = null;
let _neonWaistRingMat: MeshStandardMaterial | null = null;
let _neonNeckRingMat: MeshStandardMaterial | null = null;
let _neonDarkMat: MeshPhysicalMaterial | null = null;
let _cuteFaceMat: MeshStandardMaterial | null = null;
let _cuteSnoutMat: MeshStandardMaterial | null = null;
let _cuteInnerEarMat: MeshStandardMaterial | null = null;

function getGoldMat() {
  return (_goldMat ??= new MeshPhysicalMaterial({
    color: '#facc15',
    metalness: 0.85,
    roughness: 0.2,
    clearcoat: 0.6,
  }));
}

function getRubyMat() {
  return (_rubyMat ??= new MeshPhysicalMaterial({
    color: '#dc2626',
    emissive: '#ef4444',
    emissiveIntensity: 0.7,
    roughness: 0.1,
    clearcoat: 1.0,
  }));
}

function getRobotMetalMat() {
  return (_robotMetalMat ??= new MeshPhysicalMaterial({
    color: '#64748b',
    metalness: 0.75,
    roughness: 0.25,
    clearcoat: 0.4,
  }));
}

function getCyanScreenMat() {
  return (_cyanScreenMat ??= new MeshBasicMaterial({
    color: '#22d3ee',
  }));
}

function getRobotLedMat() {
  return (_robotLedMat ??= new MeshStandardMaterial({
    color: '#ef4444',
    emissive: '#ef4444',
    emissiveIntensity: 1.2,
    roughness: 0.2,
  }));
}

function getNeonWaistRingMat() {
  return (_neonWaistRingMat ??= new MeshStandardMaterial({
    color: '#c084fc',
    emissive: '#a855f7',
    emissiveIntensity: 1.5,
    roughness: 0.1,
  }));
}

function getNeonNeckRingMat() {
  return (_neonNeckRingMat ??= new MeshStandardMaterial({
    color: '#67e8f9',
    emissive: '#22d3ee',
    emissiveIntensity: 1.5,
    roughness: 0.1,
  }));
}

function getNeonDarkMat() {
  return (_neonDarkMat ??= new MeshPhysicalMaterial({
    color: '#111827',
    metalness: 0.4,
    roughness: 0.2,
    clearcoat: 0.7,
  }));
}

function getCuteFaceMat() {
  return (_cuteFaceMat ??= new MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.3,
  }));
}

function getCuteSnoutMat() {
  return (_cuteSnoutMat ??= new MeshStandardMaterial({
    color: '#fff1f2',
    roughness: 0.4,
  }));
}

function getCuteInnerEarMat() {
  return (_cuteInnerEarMat ??= new MeshStandardMaterial({
    color: '#f472b6',
    roughness: 0.4,
  }));
}

function getPaint(color: PlayerColor, pawnDef: PawnSkinDef): MeshPhysicalMaterial {
  const key = `${color}:${pawnDef.id}`;
  let m = _paints.get(key);
  if (!m) {
    const isCrystal = pawnDef.id === 'crystal';
    m = new MeshPhysicalMaterial({
      color: PLAYER_THEME[color].main,
      emissive: isCrystal ? '#38bdf8' : PLAYER_THEME[color].main,
      emissiveIntensity: isCrystal ? 0.25 : pawnDef.style.emissiveBoost,
      roughness: pawnDef.style.roughness,
      metalness: pawnDef.style.metalness,
      clearcoat: pawnDef.style.clearcoat,
      clearcoatRoughness: 0.2,
      flatShading: isCrystal,
    });
    _paints.set(key, m);
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

// ─── Component Props ──────────────────────────────────────────────────────────

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
  const { pawnDef } = useCustomization();
  const groupRef = useRef<Group>(null!);
  const ringRef = useRef<Mesh>(null!);
  const skinGroupRef = useRef<Group>(null!);
  const hovered = useRef(false);

  // Sub-element animation refs
  const crystalInnerRef = useRef<Mesh>(null!);
  const robotHeadRef = useRef<Group>(null!);
  const robotAntennaRef = useRef<Group>(null!);
  const robotLedRef = useRef<Mesh>(null!);
  const neonWaistRingRef = useRef<Mesh>(null!);
  const neonNeckRingRef = useRef<Mesh>(null!);
  const cuteLeftEarRef = useRef<Group>(null!);
  const cuteRightEarRef = useRef<Group>(null!);

  const tap = useTap(() => onSelect(pawnIdx), selectable);

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

    // 1. Authoritative / interpolated world position
    const [x, y, z] = presentation.positionOf(color, pawnIdx, rest);
    let lift = hovered.current && selectable ? HOVER_LIFT : 0;
    if (celebrate && animate) lift += Math.max(0, Math.sin(t * 3.2 - pawnIdx * 0.9)) * 0.14;
    g.position.set(x, y + lift, z);
    g.scale.setScalar(scale);

    // Hop detection
    const hopHeight = Math.max(0, y - rest[1]);
    const isMoving = hopHeight > 0.005;

    // Selection ring pulse
    const ring = ringRef.current;
    if (ring && selectable) {
      const mat = ring.material as MeshBasicMaterial;
      const pulse = animate ? Math.sin(t * PULSE_HZ * Math.PI * 2) : 0;
      mat.opacity = 0.7 + pulse * 0.2;
      const s = 1 + pulse * 0.05;
      ring.scale.set(s, s, 1);
    }

    // 2. Skin-specific personality animations
    const sg = skinGroupRef.current;
    if (!sg) return;

    if (pawnDef.id === 'crystal') {
      // Floating levitation + crystalline spinning
      const floatY = 0.04 + (animate ? Math.sin(t * 2.2 + pawnIdx) * 0.035 : 0);
      sg.position.set(0, floatY, 0);
      if (animate) {
        sg.rotation.y = t * (isMoving ? 3.2 : 0.9) + pawnIdx;
        sg.rotation.z = Math.sin(t * 1.8 + pawnIdx) * 0.04;
      }
      if (crystalInnerRef.current && animate) {
        crystalInnerRef.current.rotation.y = -t * 1.6;
      }
    } else if (pawnDef.id === 'robot') {
      sg.position.set(0, 0, 0);
      if (animate) {
        // Red antenna LED blinking
        if (robotLedRef.current) {
          const mat = robotLedRef.current.material as MeshStandardMaterial;
          mat.emissiveIntensity = Math.sin(t * 6) > 0.15 ? 1.5 : 0.15;
        }
        // Antenna spring vibration
        if (robotAntennaRef.current) {
          robotAntennaRef.current.rotation.z = Math.sin(t * 14) * (isMoving ? 0.25 : 0.05);
        }
        // Stepped robotic servo head twitch
        if (robotHeadRef.current) {
          const step = Math.floor(t * 1.5 + pawnIdx * 0.5) % 4;
          const targetRotY = step === 1 ? 0.14 : step === 3 ? -0.14 : 0;
          robotHeadRef.current.rotation.y += (targetRotY - robotHeadRef.current.rotation.y) * 0.25;
        }
        // Mechanical step wobble when in motion
        sg.rotation.z = isMoving ? Math.sin(t * 22) * 0.07 : 0;
      }
    } else if (pawnDef.id === 'knight') {
      sg.position.set(0, 0, 0);
      if (animate) {
        // Proud noble breathing sway & stately hop tilt
        sg.rotation.z = Math.sin(t * 1.6 + pawnIdx) * 0.025;
        sg.rotation.x = isMoving ? -0.12 : 0;
      }
    } else if (pawnDef.id === 'neon') {
      sg.position.set(0, 0, 0);
      if (animate) {
        // Floating independent rotating neon rings
        if (neonWaistRingRef.current) {
          neonWaistRingRef.current.rotation.y = t * 1.8;
          neonWaistRingRef.current.rotation.x = Math.sin(t * 2.2) * 0.25;
          neonWaistRingRef.current.position.y = 0.32 + Math.sin(t * 3.0) * 0.025;
          const mat = neonWaistRingRef.current.material as MeshStandardMaterial;
          mat.emissiveIntensity = (isMoving ? 2.2 : 1.3) + Math.sin(t * 4.2) * 0.3;
        }
        if (neonNeckRingRef.current) {
          neonNeckRingRef.current.rotation.y = -t * 2.4;
          neonNeckRingRef.current.rotation.z = Math.cos(t * 2.5) * 0.25;
          neonNeckRingRef.current.position.y = 0.58 + Math.cos(t * 3.0) * 0.02;
          const mat = neonNeckRingRef.current.material as MeshStandardMaterial;
          mat.emissiveIntensity = (isMoving ? 2.2 : 1.3) + Math.sin(t * 4.2) * 0.3;
        }
      }
    } else if (pawnDef.id === 'cute') {
      sg.position.set(0, 0, 0);
      if (animate) {
        if (isMoving) {
          // Cartoon squash and stretch in flight
          const stretch = Math.min(hopHeight * 2.2, 0.32);
          sg.scale.y = 1.0 + stretch;
          sg.scale.x = 1.0 - stretch * 0.45;
          sg.scale.z = 1.0 - stretch * 0.45;
        } else {
          // Soft jelly breathing idle
          const breath = Math.sin(t * 2.8 + pawnIdx * 0.8) * 0.035;
          sg.scale.y = 1.0 + breath;
          sg.scale.x = 1.0 - breath * 0.5;
          sg.scale.z = 1.0 - breath * 0.5;
        }
        // Cute ear twitch
        const earWiggle = Math.sin(t * 12) * (Math.sin(t * 1.2 + pawnIdx) > 0.65 ? 0.16 : 0);
        if (cuteLeftEarRef.current) cuteLeftEarRef.current.rotation.z = earWiggle;
        if (cuteRightEarRef.current) cuteRightEarRef.current.rotation.z = -earWiggle;
      }
    } else {
      // Classic
      sg.position.set(0, 0, 0);
      sg.scale.set(1, 1, 1);
      sg.rotation.set(0, 0, 0);
    }
  });

  const paintMat = getPaint(color, pawnDef);

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

      {/* Model Pion dengan Sub-Elemen & Animasi Khusus */}
      <group ref={skinGroupRef}>
        {pawnDef.id === 'crystal' && (
          <group>
            {/* Outer Faceted Diamond Gem */}
            <mesh
              geometry={getCrystalOuterGeo()}
              material={paintMat}
              castShadow
              receiveShadow
            />
            {/* Inner Floating Crystal Core */}
            <mesh
              ref={crystalInnerRef}
              geometry={getCrystalInnerGeo()}
              material={getCyanScreenMat()}
            />
          </group>
        )}

        {pawnDef.id === 'robot' && (
          <group>
            {/* Sturdy Mecha Base Pedestal */}
            <mesh
              geometry={(_robotBaseGeo ??= new CylinderGeometry(0.24, 0.28, 0.07, 16))}
              material={getRobotMetalMat()}
              position={[0, 0.035, 0]}
              castShadow
            />
            {/* Rectangular Torso in Player Team Color */}
            <mesh
              geometry={(_robotTorsoGeo ??= new BoxGeometry(0.36, 0.30, 0.26))}
              material={paintMat}
              position={[0, 0.22, 0]}
              castShadow
              receiveShadow
            />
            {/* Chest Status Monitor */}
            <mesh
              geometry={(_robotChestGeo ??= new BoxGeometry(0.22, 0.14, 0.02))}
              material={getCyanScreenMat()}
              position={[0, 0.22, 0.132]}
            />
            {/* Mecha Head Group */}
            <group ref={robotHeadRef} position={[0, 0.49, 0]}>
              <mesh
                geometry={(_robotHeadGeo ??= new BoxGeometry(0.28, 0.20, 0.24))}
                material={getRobotMetalMat()}
                castShadow
              />
              {/* Cyan Digital Visor Screen */}
              <mesh
                geometry={(_robotVisorGeo ??= new BoxGeometry(0.18, 0.065, 0.02))}
                material={getCyanScreenMat()}
                position={[0, 0.01, 0.122]}
              />
              {/* Antenna with Blinking Red LED Light */}
              <group ref={robotAntennaRef} position={[0, 0.10, 0]}>
                <mesh
                  geometry={(_robotAntennaGeo ??= new CylinderGeometry(0.012, 0.012, 0.14, 8))}
                  material={getRobotMetalMat()}
                  position={[0, 0.07, 0]}
                />
                <mesh
                  ref={robotLedRef}
                  geometry={(_robotLedGeo ??= new SphereGeometry(0.045, 12, 12))}
                  material={getRobotLedMat()}
                  position={[0, 0.15, 0]}
                />
              </group>
            </group>
          </group>
        )}

        {pawnDef.id === 'knight' && (
          <group>
            {/* Regal Mantle Silhouette */}
            <mesh
              geometry={getKnightMantleGeo()}
              material={paintMat}
              castShadow
              receiveShadow
            />
            {/* Royal Golden Collar / Gorget */}
            <mesh
              geometry={(_knightCollarGeo ??= new TorusGeometry(0.17, 0.03, 12, 28))}
              material={getGoldMat()}
              position={[0, 0.46, 0]}
              rotation={[Math.PI / 2, 0, 0]}
            />
            {/* Head */}
            <mesh
              geometry={(_knightHeadGeo ??= new SphereGeometry(0.16, 24, 20))}
              material={paintMat}
              position={[0, 0.58, 0]}
              castShadow
            />
            {/* Royal Golden Crown */}
            <group position={[0, 0.68, 0]}>
              <mesh
                geometry={(_knightCrownBaseGeo ??= new CylinderGeometry(0.18, 0.15, 0.08, 16))}
                material={getGoldMat()}
              />
              {/* 4 Golden Crown Crenellation Peaks */}
              {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle, i) => (
                <mesh
                  key={i}
                  geometry={(_knightCrownPeakGeo ??= new ConeGeometry(0.04, 0.08, 4))}
                  material={getGoldMat()}
                  position={[Math.sin(angle) * 0.16, 0.06, Math.cos(angle) * 0.16]}
                />
              ))}
              {/* Front Crown Crest Ruby Gem */}
              <mesh
                geometry={(_knightRubyGeo ??= new SphereGeometry(0.038, 12, 12))}
                material={getRubyMat()}
                position={[0, 0.02, 0.17]}
              />
            </group>
          </group>
        )}

        {pawnDef.id === 'neon' && (
          <group>
            {/* Sleek Dark Carbon Body */}
            <mesh
              geometry={getNeonBodyGeo()}
              material={getNeonDarkMat()}
              castShadow
              receiveShadow
            />
            {/* Glowing Neon Cyber Core */}
            <mesh
              geometry={(_neonCoreGeo ??= new SphereGeometry(0.09, 16, 16))}
              material={getCyanScreenMat()}
              position={[0, 0.64, 0.08]}
            />
            {/* Orbiting Waist Neon Ring */}
            <mesh
              ref={neonWaistRingRef}
              geometry={(_neonWaistRingGeo ??= new TorusGeometry(0.26, 0.024, 14, 32))}
              material={getNeonWaistRingMat()}
              position={[0, 0.32, 0]}
              rotation={[Math.PI / 2, 0, 0]}
            />
            {/* Orbiting Neck/Head Neon Ring */}
            <mesh
              ref={neonNeckRingRef}
              geometry={(_neonNeckRingGeo ??= new TorusGeometry(0.19, 0.022, 14, 32))}
              material={getNeonNeckRingMat()}
              position={[0, 0.58, 0]}
              rotation={[Math.PI / 2, 0, 0]}
            />
          </group>
        )}

        {pawnDef.id === 'cute' && (
          <group>
            {/* Chubby Round Bear Body */}
            <mesh
              geometry={getCuteBodyGeo()}
              material={paintMat}
              castShadow
              receiveShadow
            />
            {/* Large Round Bear Head */}
            <mesh
              geometry={(_cuteHeadGeo ??= new SphereGeometry(0.22, 28, 24))}
              material={paintMat}
              position={[0, 0.54, 0]}
              castShadow
            />
            {/* Left Bear Ear */}
            <group ref={cuteLeftEarRef} position={[-0.15, 0.72, 0]}>
              <mesh
                geometry={(_cuteEarGeo ??= new SphereGeometry(0.075, 16, 16))}
                material={paintMat}
              />
              <mesh
                geometry={(_cuteInnerEarGeo ??= new SphereGeometry(0.045, 12, 12))}
                material={getCuteInnerEarMat()}
                position={[0, 0, 0.03]}
              />
            </group>
            {/* Right Bear Ear */}
            <group ref={cuteRightEarRef} position={[0.15, 0.72, 0]}>
              <mesh
                geometry={_cuteEarGeo}
                material={paintMat}
              />
              <mesh
                geometry={_cuteInnerEarGeo}
                material={getCuteInnerEarMat()}
                position={[0, 0, 0.03]}
              />
            </group>
            {/* Bear Face Features */}
            <group position={[0, 0.54, 0]}>
              {/* Button Eyes */}
              <mesh
                geometry={(_cuteEyeGeo ??= new SphereGeometry(0.022, 10, 10))}
                material={getCuteFaceMat()}
                position={[-0.065, 0.01, 0.205]}
              />
              <mesh
                geometry={_cuteEyeGeo}
                material={getCuteFaceMat()}
                position={[0.065, 0.01, 0.205]}
              />
              {/* Soft Cream Muzzle / Snout */}
              <mesh
                geometry={(_cuteSnoutGeo ??= new SphereGeometry(0.045, 14, 10))}
                material={getCuteSnoutMat()}
                position={[0, -0.04, 0.205]}
              />
              {/* Cute Button Nose */}
              <mesh
                geometry={(_cuteNoseGeo ??= new SphereGeometry(0.016, 8, 8))}
                material={getCuteFaceMat()}
                position={[0, -0.025, 0.245]}
              />
            </group>
          </group>
        )}

        {pawnDef.id === 'classic' && (
          <mesh
            geometry={getClassicGeo()}
            material={paintMat}
            castShadow
            receiveShadow
          />
        )}
      </group>

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
