/**
 * AnimatedCreatures.tsx
 *
 * Hewan 3D animasi dan interaktif di sekitar pulau dan lautan:
 * 1. Lumba-lumba (Dolphin) yang berenang dan melompat anggun di lautan.
 * 2. Penyu Laut (Sea Turtle) yang mendayung santai di perairan dangkal.
 * 3. Kepiting Pantai (Beach Crab) yang lincah menggerakkan capit di atas batu karang.
 * 4. Burung Camar (Seagull) yang terbang melayang di angkasa.
 *
 * Semua hewan dapat disentuh/diketuk (interaktif):
 * - Bereaksi dengan animasi gembira (lompat tinggi, berputar, atau mengibaskan capit/sirip).
 * - Menghasilkan efek cipratan air atau partikel ceria.
 * - Membunyikan nada suara interaktif.
 */

import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Group,
  Mesh,
  MeshBasicMaterial,
} from 'three';
import { audio } from '../audio/audio';

// ─── Efek Partikel / Cipratan Air Sederhana ───────────────────────────────────

function SplashRing({ pos, trigger }: { pos: [number, number, number]; trigger: number }) {
  const meshRef = useRef<Mesh>(null!);
  const [active, setActive] = useState(false);
  const startTime = useRef(0);

  useMemo(() => {
    if (trigger > 0) {
      setActive(true);
      startTime.current = performance.now();
    }
  }, [trigger]);

  useFrame(() => {
    if (!active || !meshRef.current) return;
    const elapsed = (performance.now() - startTime.current) / 1000;
    if (elapsed > 0.8) {
      setActive(false);
      return;
    }
    const progress = elapsed / 0.8;
    const s = 0.4 + progress * 1.6;
    meshRef.current.scale.set(s, s, 1);
    const mat = meshRef.current.material as MeshBasicMaterial;
    mat.opacity = (1 - progress) * 0.75;
  });

  if (!active) return null;

  return (
    <mesh
      ref={meshRef}
      position={[pos[0], 0.05, pos[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <ringGeometry args={[0.3, 0.48, 24]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.7} depthWrite={false} />
    </mesh>
  );
}

// ─── 1. Lumba-lumba Interaktif (Interactive Dolphin) ─────────────────────────

export function InteractiveDolphin({ animate }: { animate: boolean }) {
  const groupRef = useRef<Group>(null!);
  const tailRef = useRef<Group>(null!);
  const [, setExcited] = useState(0);
  const [splashCount, setSplashCount] = useState(0);
  const splashPos = useRef<[number, number, number]>([0, 0, 0]);
  const excitedTime = useRef(0);

  const handlePointerOver = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    document.body.style.cursor = '';
  };

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    audio.cue('hop');
    setExcited((c) => c + 1);
    excitedTime.current = 1.6; // durasi lompatan akrobatik
    if (groupRef.current) {
      splashPos.current = [groupRef.current.position.x, 0, groupRef.current.position.z];
      setSplashCount((c) => c + 1);
    }
  };

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;

    const dt = Math.min(delta, 0.1);
    if (excitedTime.current > 0) {
      excitedTime.current -= dt;
    }

    if (!animate) return;

    const t = performance.now() * 0.001;
    const speed = excitedTime.current > 0 ? 0.9 : 0.35;
    const angle = t * speed;

    // Jalur berenang mengitari pulau di lautan lepas
    const radiusX = 10.2;
    const radiusZ = 9.8;
    const x = Math.cos(angle) * radiusX;
    const z = Math.sin(angle) * radiusZ;

    // Gerak vertikal berenang atau lompatan spektakuler saat disentuh
    let y = -0.15 + Math.sin(t * 3.5) * 0.3;
    let roll = 0;
    let pitch = -Math.cos(t * 3.5) * 0.35;

    if (excitedTime.current > 0) {
      const p = 1 - excitedTime.current / 1.6;
      // Kurva lompat tinggi keluar air
      y = Math.sin(p * Math.PI) * 2.2 - 0.2;
      // Putaran corkscrew akrobatik di udara
      roll = p * Math.PI * 4;
      pitch = (0.5 - p) * 1.5;
    }

    g.position.set(x, y, z);
    // Hadap searah gerak keliling
    g.rotation.y = -angle + Math.PI / 2;
    g.rotation.x = pitch;
    g.rotation.z = roll;

    // Gerak kibas ekor lumba-lumba
    if (tailRef.current) {
      tailRef.current.rotation.x = Math.sin(t * (excitedTime.current > 0 ? 12 : 7)) * 0.45;
    }
  });

  return (
    <>
      <group
        ref={groupRef}
        position={[10.2, 0, 0]}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onPointerDown={handleClick}
      >
        {/* Badan Utama Lumba-lumba (Biru Laut Tropis) */}
        <mesh castShadow position={[0, 0, 0]} scale={[0.42, 0.46, 1.25]}>
          <sphereGeometry args={[1, 18, 14]} />
          <meshStandardMaterial color="#0284c7" roughness={0.3} metalness={0.1} />
        </mesh>

        {/* Perut Putih Halus */}
        <mesh position={[0, -0.16, 0.05]} scale={[0.34, 0.24, 0.95]}>
          <sphereGeometry args={[1, 16, 12]} />
          <meshStandardMaterial color="#f0f9ff" roughness={0.4} />
        </mesh>

        {/* Moncong Lumba-lumba */}
        <mesh position={[0, -0.06, 1.18]} rotation={[Math.PI / 2, 0, 0]} scale={[0.16, 0.32, 0.14]}>
          <coneGeometry args={[1, 1.5, 12]} />
          <meshStandardMaterial color="#38bdf8" roughness={0.35} />
        </mesh>

        {/* Sirip Punggung (Dorsal Fin) */}
        <mesh position={[0, 0.45, -0.1]} rotation={[-0.45, 0, 0]} scale={[0.07, 0.38, 0.25]}>
          <coneGeometry args={[1, 1, 8]} />
          <meshStandardMaterial color="#0369a1" roughness={0.3} />
        </mesh>

        {/* Sirip Dada Kiri & Kanan */}
        <mesh position={[-0.42, -0.15, 0.25]} rotation={[0.3, 0.4, -0.6]} scale={[0.32, 0.06, 0.18]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#0284c7" roughness={0.3} />
        </mesh>
        <mesh position={[0.42, -0.15, 0.25]} rotation={[0.3, -0.4, 0.6]} scale={[0.32, 0.06, 0.18]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#0284c7" roughness={0.3} />
        </mesh>

        {/* Bagian Ekor Bergerak */}
        <group ref={tailRef} position={[0, 0, -1.05]}>
          <mesh scale={[0.22, 0.22, 0.65]} position={[0, 0, -0.25]}>
            <coneGeometry args={[1, 1, 12]} />
            <meshStandardMaterial color="#0284c7" roughness={0.3} />
          </mesh>
          {/* Sirip Ekor Fluke */}
          <mesh position={[0, 0, -0.65]} scale={[0.7, 0.06, 0.24]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#0369a1" roughness={0.3} />
          </mesh>
        </group>

        {/* Mata Lumba-lumba */}
        <mesh position={[-0.26, 0.12, 0.72]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color="#0f172a" />
        </mesh>
        <mesh position={[0.26, 0.12, 0.72]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color="#0f172a" />
        </mesh>

        {/* Invisible larger hit target for easy touch on mobile */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[1.3, 8, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
      </group>

      <SplashRing pos={splashPos.current} trigger={splashCount} />
    </>
  );
}

// ─── 2. Penyu Laut Lucu (Interactive Sea Turtle) ─────────────────────────────

export function InteractiveTurtle({ animate }: { animate: boolean }) {
  const groupRef = useRef<Group>(null!);
  const leftFlipper = useRef<Mesh>(null!);
  const rightFlipper = useRef<Mesh>(null!);
  const headRef = useRef<Group>(null!);
  const excitedTime = useRef(0);

  const handlePointerOver = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
  };
  const handlePointerOut = () => {
    document.body.style.cursor = '';
  };
  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    audio.cue('land');
    excitedTime.current = 1.4; // berputar gembira
  };

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;

    const dt = Math.min(delta, 0.1);
    if (excitedTime.current > 0) excitedTime.current -= dt;

    if (!animate) return;

    const t = performance.now() * 0.001;
    const speed = excitedTime.current > 0 ? 0.6 : 0.22;
    // Berenang di perairan dangkal dekat pantai
    const angle = -t * speed + 1.2;
    const rx = 7.6;
    const rz = 7.4;
    const x = Math.sin(angle) * rx;
    const z = Math.cos(angle) * rz;

    const bob = Math.sin(t * 2.5) * 0.08;
    let roll = 0;
    if (excitedTime.current > 0) {
      const p = 1 - excitedTime.current / 1.4;
      roll = p * Math.PI * 2; // spin roll saat disentuh
    }

    g.position.set(x, -0.1 + bob, z);
    g.rotation.y = angle + Math.PI;
    g.rotation.z = roll;

    // Dayungan sirip penyu
    const flapSpeed = excitedTime.current > 0 ? 14 : 4.5;
    const flap = Math.sin(t * flapSpeed) * 0.4;
    if (leftFlipper.current) leftFlipper.current.rotation.z = -flap;
    if (rightFlipper.current) rightFlipper.current.rotation.z = flap;

    // Gerakan kepala penyu
    if (headRef.current) {
      headRef.current.position.y = 0.08 + Math.sin(t * 3) * 0.04;
    }
  });

  return (
    <group
      ref={groupRef}
      position={[-6.8, -0.1, 4.2]}
      scale={0.75}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onPointerDown={handleClick}
    >
      {/* Tempurung Penyu (Carapace Hijau Zaitun Bergaya Kartun) */}
      <mesh castShadow receiveShadow position={[0, 0.14, 0]} scale={[0.82, 0.44, 1.05]}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial color="#15803d" roughness={0.65} metalness={0.1} />
      </mesh>
      {/* Pola Tepi Tempurung */}
      <mesh position={[0, 0.06, 0]} scale={[0.88, 0.12, 1.12]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ca8a04" roughness={0.7} />
      </mesh>

      {/* Kepala Penyu */}
      <group ref={headRef} position={[0, 0.08, 0.95]}>
        <mesh scale={[0.26, 0.22, 0.32]}>
          <sphereGeometry args={[1, 12, 10]} />
          <meshStandardMaterial color="#4ade80" roughness={0.5} />
        </mesh>
        {/* Mata Penyu */}
        <mesh position={[-0.18, 0.08, 0.08]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color="#0f172a" />
        </mesh>
        <mesh position={[0.18, 0.08, 0.08]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color="#0f172a" />
        </mesh>
      </group>

      {/* Sirip Depan Kiri & Kanan */}
      <mesh ref={leftFlipper} position={[-0.7, 0.04, 0.42]} scale={[0.62, 0.07, 0.28]} rotation={[0, 0.5, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#22c55e" roughness={0.5} />
      </mesh>
      <mesh ref={rightFlipper} position={[0.7, 0.04, 0.42]} scale={[0.62, 0.07, 0.28]} rotation={[0, -0.5, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#22c55e" roughness={0.5} />
      </mesh>

      {/* Sirip Belakang */}
      <mesh position={[-0.45, 0.02, -0.72]} scale={[0.28, 0.06, 0.22]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#16a34a" roughness={0.5} />
      </mesh>
      <mesh position={[0.45, 0.02, -0.72]} scale={[0.28, 0.06, 0.22]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#16a34a" roughness={0.5} />
      </mesh>

      {/* Area sentuh luas */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1.2, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
}

// ─── 3. Kepiting Pantai Menggemaskan (Interactive Beach Crab) ────────────────

export function InteractiveBeachCrab({ animate }: { animate: boolean }) {
  const groupRef = useRef<Group>(null!);
  const leftClaw = useRef<Group>(null!);
  const rightClaw = useRef<Group>(null!);
  const jumpTime = useRef(0);

  const handlePointerOver = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
  };
  const handlePointerOut = () => {
    document.body.style.cursor = '';
  };
  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    audio.cue('dice');
    jumpTime.current = 0.9; // lompat senang sambil goyang capit
  };

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;

    const dt = Math.min(delta, 0.1);
    if (jumpTime.current > 0) jumpTime.current -= dt;

    if (!animate) return;

    const t = performance.now() * 0.001;

    // Gerak santai di atas batu karang
    let y = 0.12;
    if (jumpTime.current > 0) {
      const p = 1 - jumpTime.current / 0.9;
      y = 0.12 + Math.sin(p * Math.PI) * 0.45;
    }

    g.position.y = y;
    g.rotation.y = Math.sin(t * 1.5) * 0.25 - 0.4;

    // Goyangan capit kepiting (buka-tutup cepat saat disentuh)
    const clawRate = jumpTime.current > 0 ? 18 : 4;
    const clawWave = Math.sin(t * clawRate) * 0.35;
    if (leftClaw.current) {
      leftClaw.current.rotation.z = 0.3 + clawWave;
      leftClaw.current.position.y = 0.16 + (jumpTime.current > 0 ? 0.1 : 0);
    }
    if (rightClaw.current) {
      rightClaw.current.rotation.z = -0.3 - clawWave;
      rightClaw.current.position.y = 0.16 + (jumpTime.current > 0 ? 0.1 : 0);
    }
  });

  return (
    // Diposisikan di atas salah satu batu pantai di sisi kiri
    <group
      ref={groupRef}
      position={[-7.9, 0.12, -5.9]}
      scale={0.55}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onPointerDown={handleClick}
    >
      {/* Tubuh Kepiting Merah Oranye */}
      <mesh castShadow scale={[0.48, 0.28, 0.38]}>
        <sphereGeometry args={[1, 14, 10]} />
        <meshStandardMaterial color="#f97316" roughness={0.4} />
      </mesh>

      {/* Tangkai & Mata Bulat Lucu */}
      <mesh position={[-0.14, 0.32, 0.18]}>
        <cylinderGeometry args={[0.04, 0.04, 0.22, 8]} />
        <meshStandardMaterial color="#ea580c" />
      </mesh>
      <mesh position={[-0.14, 0.44, 0.18]}>
        <sphereGeometry args={[0.09, 10, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[-0.14, 0.44, 0.25]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshBasicMaterial color="#0f172a" />
      </mesh>

      <mesh position={[0.14, 0.32, 0.18]}>
        <cylinderGeometry args={[0.04, 0.04, 0.22, 8]} />
        <meshStandardMaterial color="#ea580c" />
      </mesh>
      <mesh position={[0.14, 0.44, 0.18]}>
        <sphereGeometry args={[0.09, 10, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.14, 0.44, 0.25]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshBasicMaterial color="#0f172a" />
      </mesh>

      {/* Capit Kiri */}
      <group ref={leftClaw} position={[-0.48, 0.14, 0.22]}>
        <mesh scale={[0.26, 0.22, 0.15]} rotation={[0, 0, 0.4]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial color="#ef4444" roughness={0.35} />
        </mesh>
      </group>

      {/* Capit Kanan */}
      <group ref={rightClaw} position={[0.48, 0.14, 0.22]}>
        <mesh scale={[0.26, 0.22, 0.15]} rotation={[0, 0, -0.4]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial color="#ef4444" roughness={0.35} />
        </mesh>
      </group>

      {/* Kaki Kecil */}
      {[-0.3, -0.15, 0, 0.15, 0.3].map((off, i) => (
        <group key={i}>
          <mesh position={[-0.42, -0.1, off]} rotation={[0, 0, -0.6]} scale={[0.18, 0.04, 0.05]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#ea580c" />
          </mesh>
          <mesh position={[0.42, -0.1, off]} rotation={[0, 0, 0.6]} scale={[0.18, 0.04, 0.05]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#ea580c" />
          </mesh>
        </group>
      ))}

      {/* Area sentuh mudah di klik */}
      <mesh position={[0, 0.1, 0]}>
        <sphereGeometry args={[1.0, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
}

// ─── 4. Burung Camar Terbang (Interactive Flying Seagull) ─────────────────────

export function InteractiveSeagull({ animate }: { animate: boolean }) {
  const groupRef = useRef<Group>(null!);
  const leftWing = useRef<Mesh>(null!);
  const rightWing = useRef<Mesh>(null!);
  const barrelRoll = useRef(0);

  const handlePointerOver = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
  };
  const handlePointerOut = () => {
    document.body.style.cursor = '';
  };
  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    audio.cue('hop');
    barrelRoll.current = 1.0; // manuver akrobatik di angkasa
  };

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;

    const dt = Math.min(delta, 0.1);
    if (barrelRoll.current > 0) barrelRoll.current -= dt;

    if (!animate) return;

    const t = performance.now() * 0.001;
    const angle = t * 0.45;
    const x = Math.sin(angle) * 8.8;
    const z = Math.cos(angle) * 8.4;
    const y = 5.2 + Math.sin(t * 1.8) * 0.4;

    g.position.set(x, y, z);
    g.rotation.y = angle + Math.PI / 2;

    if (barrelRoll.current > 0) {
      const p = 1 - barrelRoll.current / 1.0;
      g.rotation.z = p * Math.PI * 2;
    } else {
      g.rotation.z = Math.sin(t * 1.5) * 0.15;
    }

    // Kepakan sayap burung
    const flap = Math.sin(t * (barrelRoll.current > 0 ? 16 : 6)) * 0.45;
    if (leftWing.current) leftWing.current.rotation.z = -flap;
    if (rightWing.current) rightWing.current.rotation.z = flap;
  });

  return (
    <group
      ref={groupRef}
      position={[0, 5.2, 8.5]}
      scale={0.4}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onPointerDown={handleClick}
    >
      {/* Tubuh Burung Putih */}
      <mesh scale={[0.32, 0.32, 0.85]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.5} />
      </mesh>
      {/* Paruh Kuning */}
      <mesh position={[0, -0.05, 0.9]} rotation={[Math.PI / 2, 0, 0]} scale={[0.12, 0.35, 0.12]}>
        <coneGeometry args={[1, 1, 8]} />
        <meshStandardMaterial color="#f59e0b" roughness={0.4} />
      </mesh>
      {/* Sayap Kiri & Kanan */}
      <mesh ref={leftWing} position={[-0.65, 0.08, 0]} scale={[0.85, 0.05, 0.32]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.6} />
      </mesh>
      <mesh ref={rightWing} position={[0.65, 0.08, 0]} scale={[0.85, 0.05, 0.32]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.6} />
      </mesh>

      {/* Target sentuh luas */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1.6, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
}

// ─── Wadah Utama Seluruh Hewan Animasi & Interaktif ──────────────────────────

export function AnimatedCreatures({ animate = true }: { animate?: boolean }) {
  return (
    <group name="animated-creatures">
      {/* Lumba-lumba berenang di lautan */}
      <InteractiveDolphin animate={animate} />
      {/* Penyu laut mendayung di perairan dangkal */}
      <InteractiveTurtle animate={animate} />
      {/* Kepiting lucu di atas karang pantai */}
      <InteractiveBeachCrab animate={animate} />
      {/* Burung camar melayang di angkasa */}
      <InteractiveSeagull animate={animate} />
    </group>
  );
}
