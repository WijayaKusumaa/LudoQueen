/**
 * GameLayer.tsx
 *
 * Lapisan game 3D di dalam Canvas. Menghubungkan GameSession (state otoritatif)
 * dengan PresentationController (animasi sementara) dan menggambar pion, dadu, efek.
 */

import { useFrame } from '@react-three/fiber';
import { PAWNS_PER_PLAYER, type PlayerColor } from './board/boardLayout';
import { useGame } from './store/GameContext';
import { stepToWorld } from './animation/coordinateResolver';
import { EffectsLayer } from './animation/EffectsLayer';
import { AnimatedPawn } from './pieces/AnimatedPawn';
import { DiceDisplay } from './dice/DiceDisplay';

export interface GameLayerProps {
  animate: boolean;
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
          const rest = stepToWorld(color, state.pawns[color][pawnIdx] ?? -1, pawnIdx);
          const selectable =
            !locked && state.current === color && selectablePawns.includes(pawnIdx);

          return (
            <AnimatedPawn
              key={`${color}-${pawnIdx}`}
              color={color}
              pawnIdx={pawnIdx}
              rest={rest}
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
