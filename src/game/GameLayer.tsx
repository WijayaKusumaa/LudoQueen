/**
 * GameLayer.tsx
 *
 * Lapisan game 3D di dalam Canvas. Menghubungkan GameSession (state otoritatif)
 * dengan PresentationController (animasi sementara) dan menggambar pion, dadu, efek.
 */

import { useFrame } from '@react-three/fiber';
import { PAWNS_PER_PLAYER, START_INDEX, TRACK_LENGTH, type PlayerColor } from './board/boardLayout';
import { useGame } from './store/GameContext';
import { stepToWorld } from './animation/coordinateResolver';
import { EffectsLayer } from './animation/EffectsLayer';
import { AnimatedPawn } from './pieces/AnimatedPawn';
import { DiceDisplay } from './dice/DiceDisplay';
import type { GameState } from './engine/types';

export interface GameLayerProps {
  animate: boolean;
}

/**
 * Menghitung offset penempatan jika beberapa pion berada pada petak jalur yang sama (mis. di petak bintang).
 * Pion diatur berdampingan agar tidak saling bertumpuk/clipping.
 */
function getPawnTileOffset(
  state: GameState,
  color: PlayerColor,
  pawnIdx: number,
): { offset: [number, number, number]; count: number } {
  const step = state.pawns[color]?.[pawnIdx];
  if (step === undefined || step < 0 || step > 50) {
    return { offset: [0, 0, 0], count: 1 };
  }

  const trackIdx = (START_INDEX[color] + step) % TRACK_LENGTH;
  const occupants: Array<{ color: PlayerColor; pawnIdx: number }> = [];

  for (const p of state.players) {
    const list = state.pawns[p];
    if (!list) continue;
    list.forEach((s, idx) => {
      if (s >= 0 && s <= 50 && (START_INDEX[p] + s) % TRACK_LENGTH === trackIdx) {
        occupants.push({ color: p, pawnIdx: idx });
      }
    });
  }

  if (occupants.length <= 1) {
    return { offset: [0, 0, 0], count: 1 };
  }

  const subIdx = occupants.findIndex((o) => o.color === color && o.pawnIdx === pawnIdx);
  if (occupants.length === 2) {
    const d = subIdx === 0 ? -0.15 : 0.15;
    return { offset: [d, 0, d], count: 2 };
  }
  if (occupants.length === 3) {
    if (subIdx === 0) return { offset: [-0.15, 0, -0.13], count: 3 };
    if (subIdx === 1) return { offset: [0.15, 0, -0.13], count: 3 };
    return { offset: [0, 0, 0.15], count: 3 };
  }
  const dx = subIdx % 2 === 0 ? -0.15 : 0.15;
  const dz = subIdx < 2 ? -0.15 : 0.15;
  return { offset: [dx, 0, dz], count: occupants.length };
}

export function GameLayer({ animate }: GameLayerProps) {
  const { state, selectablePawns, locked, presentation, anim, roll, move } = useGame();

  // Prioritas negatif: controller maju sebelum pion membaca posisinya di frame yang sama.
  useFrame((_, delta) => presentation.advance(Math.min(delta, 0.1) * 1000), -1);

  const celebrate = state.phase === 'finished' && !anim.busy;
  const turnPlayer = anim.holdPlayer ?? state.current;

  return (
    <>
      {state.players.flatMap((color: PlayerColor) =>
        Array.from({ length: PAWNS_PER_PLAYER }, (_, pawnIdx) => {
          const baseRest = stepToWorld(color, state.pawns[color][pawnIdx] ?? -1, pawnIdx);
          const { offset, count } = getPawnTileOffset(state, color, pawnIdx);
          const rest: [number, number, number] = [
            baseRest[0] + offset[0],
            baseRest[1] + offset[1],
            baseRest[2] + offset[2],
          ];
          const selectable =
            !locked && state.current === color && selectablePawns.includes(pawnIdx);

          return (
            <AnimatedPawn
              key={`${color}-${pawnIdx}`}
              color={color}
              pawnIdx={pawnIdx}
              rest={rest}
              scale={count > 1 ? 0.82 : 1}
              presentation={presentation}
              selectable={selectable}
              animate={animate}
              celebrate={celebrate && state.winner === color}
              onSelect={move}
            />
          );
        }),
      )}

      <DiceDisplay
        value={state.lastRoll?.value ?? null}
        player={turnPlayer}
        canRoll={!locked && state.phase === 'awaitingRoll'}
        animate={animate}
        presentation={presentation}
        onRoll={roll}
      />

      <EffectsLayer presentation={presentation} />
    </>
  );
}
