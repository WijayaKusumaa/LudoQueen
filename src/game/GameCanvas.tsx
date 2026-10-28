import { Canvas } from '@react-three/fiber';
import { NeutralToneMapping } from 'three';
import { BoardScene } from './board/BoardScene';

import { refreshAllCanvasTextures } from './board/boardTextures';

export interface GameCanvasProps {
  resetToken: number;
  animate: boolean;
  onReady: () => void;
}

/** Pembungkus Canvas R3F; terpisah dari antarmuka DOM. */
export default function GameCanvas({ resetToken, animate, onReady }: GameCanvasProps) {
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 2]}
      camera={{ fov: 38, position: [0, 20, 12] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = NeutralToneMapping;
        gl.toneMappingExposure = 1;
        gl.domElement.addEventListener('webglcontextrestored', () => {
          refreshAllCanvasTextures();
        });
        requestAnimationFrame(() => requestAnimationFrame(onReady));
      }}
      aria-label="Papan Ludo 3D"
    >
      <BoardScene resetToken={resetToken} animate={animate} />
    </Canvas>
  );
}
