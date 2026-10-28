import { describe, expect, it } from 'vitest';
import { PLAYER_ORDER, PAWNS_PER_PLAYER, START_INDEX } from '../game/board/boardLayout';
import { stepToWorld } from '../game/animation/coordinateResolver';
import {
  buildSteps,
  PresentationController,
  TIMING,
  type HopStep,
} from '../game/animation/presentation';
import { createInitialGameState, dispatchAction, getSelectablePawns } from '../game/engine/rules';
import type { GameState } from '../game/engine/types';
import { GameSession } from '../game/store/gameSession';
import { isTap } from '../game/interaction/useTap';

const restOf = (s: GameState, color: (typeof PLAYER_ORDER)[number], i: number) =>
  stepToWorld(color, s.pawns[color][i] ?? -1, i);

const close = (a: number[], b: number[]) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i]!, 6));

function settle(session: GameSession) {
  session.presentation.advance(60_000);
}

function expectAllAtRest(session: GameSession) {
  const s = session.getState();
  for (const c of PLAYER_ORDER)
    for (let i = 0; i < PAWNS_PER_PLAYER; i++)
      close(session.presentation.positionOf(c, i, restOf(s, c, i)), restOf(s, c, i));
}

describe('GameSession + presentation', () => {
  it('mengunci input selama animasi dan menolak aksi ganda', () => {
    const s = new GameSession({ animate: true });
    expect(s.roll(6)).toBe(true);
    const v = s.getState().version;
    expect(s.presentation.busy).toBe(true);
    expect(s.roll(6)).toBe(false);
    expect(s.move(0)).toBe(false);
    expect(s.getState().version).toBe(v);

    settle(s);
    expect(s.presentation.busy).toBe(false);
    expect(s.move(0)).toBe(true);
    expect(s.move(0)).toBe(false); // sedang animasi
    settle(s);
    expect(s.getState().version).toBe(v + 1);
  });

  it('hasil dadu ditentukan engine, bukan animasi (dadu bergulir lalu hasil tetap)', () => {
    const s = new GameSession({ animate: true });
    s.roll(4);
    expect(s.presentation.getSnapshot().rolling).toBe(true);
    expect(s.presentation.diceProgress()).toBe(0);
    s.presentation.advance(TIMING.dice / 2);
    expect(s.presentation.diceProgress()).toBeCloseTo(0.5, 2);
    expect(s.getState().lastRoll?.value).toBe(4);
    s.presentation.advance(TIMING.dice);
    expect(s.presentation.getSnapshot().rolling).toBe(false);
    expect(s.getState().lastRoll?.value).toBe(4);
  });

  it('pion bergerak langkah demi langkah di antara koordinat papan otoritatif', () => {
    const s = new GameSession({ animate: true });
    s.roll(6);
    settle(s);
    s.move(0); // masuk
    settle(s);
    s.roll(3);
    settle(s);
    const before = s.getState();
    const startPos = restOf(before, 'yellow', 0);
    s.move(0);
    const after = s.getState();
    const endPos = restOf(after, 'yellow', 0);
    expect(after.pawns.yellow[0]).toBe(before.pawns.yellow[0]! + 3);

    const pc = s.presentation;
    // Segera setelah aksi: pion masih di titik awal (bukan langsung di tujuan).
    close(pc.positionOf('yellow', 0, endPos), startPos);

    // Di tengah hop pertama: antara titik awal dan sel berikutnya.
    pc.advance(TIMING.hop / 2);
    const mid = pc.positionOf('yellow', 0, endPos);
    expect(mid).not.toEqual(startPos);
    expect(mid).not.toEqual(endPos);

    // Seluruh langkah selesai → tepat di posisi otoritatif.
    pc.advance(10_000);
    close(pc.positionOf('yellow', 0, endPos), endPos);
    expect(pc.busy).toBe(false);
  });

  it('skip di tengah animasi langsung ke posisi otoritatif tanpa efek tersisa', () => {
    const s = new GameSession({ animate: true });
    s.roll(6);
    s.presentation.advance(100);
    s.presentation.skip();
    expect(s.presentation.busy).toBe(false);
    expect(s.presentation.activeEffects).toHaveLength(0);
    expectAllAtRest(s);
    expect(s.getState().phase).toBe('awaitingMove'); // state tidak terpengaruh
  });

  it('animasi dimatikan: tidak ada kunci, hasil identik', () => {
    const s = new GameSession({ animate: false });
    expect(s.roll(6)).toBe(true);
    expect(s.presentation.busy).toBe(false);
    expect(s.move(0)).toBe(true);
    expect(s.getState().pawns.yellow[0]).toBe(0);
    expectAllAtRest(s);
  });

  it('setAnimate(false) saat animasi berjalan menyelesaikannya seketika', () => {
    const s = new GameSession({ animate: true });
    s.roll(6);
    s.setAnimate(false);
    expect(s.presentation.busy).toBe(false);
  });

  it('rematch di tengah animasi mereset state dan animasi', () => {
    const s = new GameSession({ animate: true });
    s.roll(6);
    s.rematch();
    expect(s.presentation.busy).toBe(false);
    expect(s.getState().version).toBe(1);
    expect(s.getState().phase).toBe('awaitingRoll');
    expect(s.roll(2)).toBe(true);
  });

  it('dispose (unmount) membatalkan animasi; advance sesudahnya aman', () => {
    const s = new GameSession({ animate: true });
    let notified = 0;
    s.presentation.subscribe(() => notified++);
    s.roll(6);
    s.dispose();
    const n = notified;
    s.presentation.advance(1000);
    expect(s.presentation.busy).toBe(false);
    expect(notified).toBe(n);
  });

  it('enqueue saat animasi lama belum selesai menyelesaikan yang lama lebih dulu', () => {
    const pc = new PresentationController();
    const g0 = createInitialGameState();
    const r1 = dispatchAction(g0, { type: 'ROLL', forcedValue: 6 });
    if (!r1.ok) throw new Error('roll');
    pc.enqueue(g0, r1.events, true);
    pc.advance(100);
    const r2 = dispatchAction(r1.state, { type: 'MOVE', pawn: 0 });
    if (!r2.ok) throw new Error('move');
    pc.enqueue(r1.state, r2.events, true);
    expect(pc.getSnapshot().rolling).toBe(false); // langsung ke hop, dadu lama sudah dibuang
    pc.advance(10_000);
    expect(pc.busy).toBe(false);
  });
});

describe('capture & home', () => {
  it('korban tetap di sel sampai penyerang mendarat, lalu kembali ke base', () => {
    const base = createInitialGameState();
    const yellowStep = 3;
    const target = yellowStep + 2;
    const absTarget = (START_INDEX.yellow + target) % 52;
    const blueStep = (absTarget - START_INDEX.blue + 52) % 52;
    const setup: GameState = {
      ...base,
      pawns: { ...base.pawns, yellow: [yellowStep, -1, -1, -1], blue: [blueStep, -1, -1, -1] },
    };
    const roll = dispatchAction(setup, { type: 'ROLL', forcedValue: 2 });
    if (!roll.ok) throw new Error('roll');
    const move = dispatchAction(roll.state, { type: 'MOVE', pawn: 0 });
    if (!move.ok) throw new Error('move');
    expect(move.events.some((e) => e.type === 'pawnCaptured')).toBe(true);

    const pc = new PresentationController();
    pc.enqueue(roll.state, move.events, true);

    const victimCell = stepToWorld('blue', blueStep, 0);
    const victimBase = restOf(move.state, 'blue', 0);
    expect(move.state.pawns.blue[0]).toBe(-1);

    // Selama penyerang berjalan (2 hop), korban masih di selnya.
    pc.advance(TIMING.hop * 2 - 1);
    close(pc.positionOf('blue', 0, victimBase), victimCell);
    expect(pc.activeEffects.filter((e) => e.kind === 'capture')).toHaveLength(0);

    // Penyerang mendarat → efek pendaratan; korban mulai terbang ke base + efek capture.
    pc.advance(2);
    expect(pc.activeEffects.map((e) => e.kind).sort()).toEqual(['capture', 'land']);

    pc.advance(TIMING.capture + 10);
    close(pc.positionOf('blue', 0, victimBase), victimBase);
    expect(pc.busy).toBe(false);
  });

  it('langkah terakhir ke home memakai hop home + efek home', () => {
    const base = createInitialGameState();
    const setup: GameState = { ...base, pawns: { ...base.pawns, yellow: [54, 56, 56, 56] } };
    const roll = dispatchAction(setup, { type: 'ROLL', forcedValue: 2 });
    if (!roll.ok) throw new Error('roll');
    const move = dispatchAction(roll.state, { type: 'MOVE', pawn: 0 });
    if (!move.ok) throw new Error('move');
    const steps = buildSteps(roll.state, move.events, true);
    const hops = steps.filter((s): s is HopStep => s.kind === 'hop');
    expect(hops.at(-1)?.landing).toBe('home');

    const pc = new PresentationController();
    pc.enqueue(roll.state, move.events, true);
    pc.advance(10_000);
    expect(pc.activeEffects.some((e) => e.kind === 'home')).toBe(true);
  });
});

describe('konsistensi animasi vs tanpa animasi', () => {
  function playFull(animate: boolean, seed: number) {
    const s = new GameSession({ animate, seed });
    let guard = 0;
    while (s.getState().phase !== 'finished' && guard++ < 20_000) {
      const st = s.getState();
      if (st.phase === 'awaitingRoll') s.roll();
      else s.move(getSelectablePawns(st)[0]!);
      if (animate) {
        settle(s);
        expectAllAtRest(s);
      }
    }
    return s.getState();
  }

  it('permainan penuh menghasilkan state akhir identik dan pemenang valid', () => {
    for (const seed of [1, 42, 20261021]) {
      const on = playFull(true, seed);
      const off = playFull(false, seed);
      expect(on.phase).toBe('finished');
      expect(JSON.stringify(on)).toBe(JSON.stringify(off));
    }
  });
});

describe('isTap', () => {
  const start = { x: 100, y: 100, t: 0, id: 1 };
  it('tap singkat tanpa bergeser = tap', () => {
    expect(isTap(start, { x: 103, y: 99, t: 150, id: 1 })).toBe(true);
  });
  it('drag (rotasi kamera) bukan tap', () => {
    expect(isTap(start, { x: 160, y: 100, t: 150, id: 1 })).toBe(false);
  });
  it('tekan terlalu lama atau pointer berbeda bukan tap', () => {
    expect(isTap(start, { x: 100, y: 100, t: 2000, id: 1 })).toBe(false);
    expect(isTap(start, { x: 100, y: 100, t: 100, id: 2 })).toBe(false);
  });
});
