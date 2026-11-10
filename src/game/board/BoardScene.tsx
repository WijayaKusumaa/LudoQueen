import { Environment, Lightformer } from '@react-three/drei';
import { ArenaScenery, ARENA_LIGHT } from './ArenaScenery';
import { useCustomization } from '../customization';
import { BoardTiles } from './BoardTiles';
import { CenterDestination } from './CenterDestination';
import { CrossIsland, HomeBases } from './HomeBases';
import { IslandDetails } from './IslandDetails';
import { Ocean } from './Ocean';
import { SafeZones } from './SafeZones';
import { GameCamera } from '../camera/GameCamera';
import { GameLayer } from '../GameLayer';

export interface BoardSceneProps {
  resetToken: number;
  animate: boolean;
}

/** Seluruh isi dunia 3D: cahaya, laut, pulau, papan, pion game, kamera. */
export function BoardScene({ resetToken, animate }: BoardSceneProps) {
  const { arenaDef } = useCustomization();
  const L = ARENA_LIGHT[arenaDef.id];
  return (
    <>
      <hemisphereLight key={arenaDef.id} args={[L.sky, L.ground, L.hemiI]} />
      <directionalLight
        color={L.sun}
        intensity={L.sunI}
        position={[-9, 15, 10]}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={11}
        shadow-camera-bottom={-11}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-bias={-0.0004}
        shadow-normalBias={0.025}
        shadow-radius={3}
      />
      <Environment resolution={64} environmentIntensity={0.35}>
        <Lightformer form="rect" intensity={2.2} color="#fff0d4" position={[-6, 8, 6]} scale={[10, 6, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.8} color="#bfe8f0" position={[8, 4, -6]} scale={[10, 4, 1]} target={[0, 0, 0]} />
      </Environment>

      <Ocean animate={animate} />
      <CrossIsland />
      <HomeBases />
      <BoardTiles />
      <SafeZones />
      <CenterDestination />
      <IslandDetails />
      <ArenaScenery animate={animate} />

      {/* Game pieces and dice — driven by engine state + animation queue */}
      <GameLayer animate={animate} />

      <GameCamera resetToken={resetToken} />
    </>
  );
}
