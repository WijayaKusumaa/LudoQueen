import { useEffect, useRef, type ElementRef } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { MathUtils, PerspectiveCamera, type Camera } from 'three';
import { ISLAND_HALF_EXTENT } from '../board/boardCoordinates';

const FOV = 38;
const POLAR = 0.55; // rad dari vertikal; cukup menukik agar jalur terbaca jelas
/** Ruang aman di sekitar papan agar HUD tidak menutupi sel. */
const MARGIN = 1.04;

/** Jarak kamera agar seluruh papan (persegi) muat di viewport dengan aspek tertentu.
 * Menyesuaikan margin secara responsif untuk layar ponsel portrait, tablet, maupun layar laptop lebar. */
export function fitDistance(aspect: number): number {
  const vHalf = MathUtils.degToRad(FOV) / 2;
  const tv = Math.tan(vHalf);
  const th = tv * aspect;
  // Di layar ponsel potret (aspek < 0.75), beri sedikit margin ekstra agar pulau tidak terlalu mepet tepi layar
  const dynamicMargin = aspect < 0.75 ? 1.08 : MARGIN;
  const half = ISLAND_HALF_EXTENT * dynamicMargin;
  // sisi dekat/jauh papan memantul ke layar dengan faktor cos/sin sudut tilt
  const dv = (half * Math.cos(POLAR) + 0.4) / tv + half * Math.sin(POLAR);
  const dh = half / th + half * Math.sin(POLAR) * 0.6;
  return Math.max(dv, dh);
}

function place(camera: Camera, distance: number): void {
  camera.position.set(0, Math.cos(POLAR) * distance, Math.sin(POLAR) * distance);
  camera.lookAt(0, 0, 0);
}

/** Kamera perspektif orbit terbatas; menyesuaikan jarak saat ukuran viewport berubah. */
export function GameCamera({ resetToken }: { resetToken: number }) {
  const size = useThree((s) => s.size);
  const camera = useThree((s) => s.camera);
  const controls = useRef<ElementRef<typeof OrbitControls>>(null);
  const aspect = size.width / Math.max(size.height, 1);
  const distance = fitDistance(aspect);

  useEffect(() => {
    if (camera instanceof PerspectiveCamera) {
      camera.fov = FOV;
      camera.near = 0.5;
      camera.far = 300;
      camera.updateProjectionMatrix();
    }
    place(camera, distance);
    controls.current?.target.set(0, 0, 0);
    controls.current?.update();
  }, [camera, distance, resetToken]);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minPolarAngle={0.15}
      maxPolarAngle={1.15}
      minDistance={distance * 0.5}
      maxDistance={distance * 1.15}
      rotateSpeed={0.6}
      zoomSpeed={0.7}
    />
  );
}
