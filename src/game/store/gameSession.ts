/**
 * gameSession.ts
 *
 * Sesi permainan non-React: memegang GameState otoritatif + PresentationController.
 * Semua aksi (roll/move/rematch) lewat sini sehingga:
 *  - hasil dadu & langkah ditentukan engine (dispatchAction), bukan animasi;
 *  - input dikunci SINKRON selama animasi berjalan (tidak ada celah antar-render);
 *  - klik ganda ditolak oleh pemeriksaan busy + expectedVersion.
 * React hanya membaca lewat subscribe/getState.
 */

import { createInitialGameState, dispatchAction, type CreateGameOptions } from '../engine/rules';
import type { DieValue, GameState } from '../engine/types';
import type { PlayerColor } from '../board/boardLayout';
import { PresentationController } from '../animation/presentation';

export interface GameSessionOptions extends CreateGameOptions {
  animate?: boolean;
}

export class GameSession {
  readonly presentation = new PresentationController();
  private game: GameState;
  private animate: boolean;
  private options: CreateGameOptions;
  private readonly listeners = new Set<() => void>();

  constructor({ animate = true, ...options }: GameSessionOptions = {}) {
    this.options = options;
    this.animate = animate;
    this.game = createInitialGameState(options);
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getState = (): GameState => this.game;

  setAnimate(animate: boolean): void {
    this.animate = animate;
    if (!animate) this.presentation.skip();
  }

  /** True bila input harus diabaikan (animasi berjalan atau permainan selesai). */
  get locked(): boolean {
    return this.presentation.busy || this.game.phase === 'finished';
  }

  /** Lempar dadu. `forcedValue` hanya kait tes (sama seperti engine). */
  roll(forcedValue?: DieValue): boolean {
    if (this.locked) return false;
    const g = this.game;
    return this.apply(g, {
      type: 'ROLL',
      player: g.current,
      expectedVersion: g.version,
      ...(forcedValue !== undefined ? { forcedValue } : {}),
    });
  }

  move(pawn: number): boolean {
    if (this.locked) return false;
    const g = this.game;
    return this.apply(g, { type: 'MOVE', pawn, player: g.current, expectedVersion: g.version });
  }

  /** Mulai permainan baru; `players` opsional mengganti daftar pemain (dari layar setup). */
  rematch(players?: readonly PlayerColor[]): void {
    if (players) this.options = { ...this.options, players };
    this.presentation.clear();
    this.game = createInitialGameState(this.options);
    this.emit();
  }

  /** Dipanggil saat unmount: batalkan animasi tertunda. */
  dispose(): void {
    this.presentation.clear();
  }

  private apply(prev: GameState, action: Parameters<typeof dispatchAction>[1]): boolean {
    const result = dispatchAction(prev, action);
    if (!result.ok) return false;
    this.game = result.state;
    this.presentation.enqueue(prev, result.events, this.animate);
    this.emit();
    return true;
  }

  private emit(): void {
    this.listeners.forEach((l) => l());
  }
}
