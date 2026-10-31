/**
 * presentation.ts
 *
 * Lapisan presentasi murni (tanpa React/three) yang mengubah GameEvent dari engine
 * menjadi urutan langkah animasi, lalu menjawab: "di mana pion ini digambar sekarang?"
 *
 * Invarian:
 *  - Posisi logis TIDAK PERNAH diubah di sini. Engine adalah satu-satunya sumber kebenaran.
 *  - Posisi render = posisi otoritatif (dari GameState) kecuali pion yang masih punya langkah
 *    animasi tertunda; untuk pion itu posisi diambil dari titik awal langkah + progres sementara.
 *  - Setiap koordinat berasal dari coordinateResolver (koordinat papan otoritatif);
 *    tidak ada offset yang diakumulasi.
 *  - Animasi bisa dilewati/diinterupsi kapan saja (skip/clear): pion langsung jatuh
 *    ke posisi otoritatif tanpa efek samping.
 */

import type { PlayerColor } from '../board/boardLayout';
import type { DieValue, GameEvent, GameState, PawnRef } from '../engine/types';
import { locationToWorld, stepToWorld } from './coordinateResolver';

export type Vec3 = [number, number, number];

// ─── Langkah animasi ──────────────────────────────────────────────────────────

export type Landing = 'step' | 'land' | 'enter' | 'home';

export interface DiceStep {
  readonly kind: 'dice';
  readonly value: DieValue;
  readonly ms: number;
}

export interface PauseStep {
  readonly kind: 'pause';
  readonly note: 'noMove' | 'forfeit';
  readonly ms: number;
}

export interface HopStep {
  readonly kind: 'hop';
  readonly color: PlayerColor;
  readonly pawn: number;
  readonly from: Vec3;
  readonly to: Vec3;
  readonly ms: number;
  readonly arc: number;
  readonly landing: Landing;
}

export interface CaptureStep {
  readonly kind: 'capture';
  readonly color: PlayerColor;
  readonly pawn: number;
  readonly from: Vec3;
  readonly to: Vec3;
  readonly ms: number;
  readonly arc: number;
}

export type Step = DiceStep | PauseStep | HopStep | CaptureStep;
type MovingStep = HopStep | CaptureStep;

export const TIMING = {
  dice: 750,
  hop: 200,
  enter: 300,
  home: 360,
  capture: 480,
  pause: 650,
} as const;

const ARC = { hop: 0.2, enter: 0.3, home: 0.3, capture: 0.5 } as const;

/** Lama hidup efek visual sesaat (ms). */
export const EFFECT_MS = 450;

// ─── Efek sesaat (cincin pendaratan, dsb.) ────────────────────────────────────

export interface Effect {
  readonly id: number;
  readonly kind: 'land' | 'capture' | 'home';
  readonly color: PlayerColor;
  readonly pos: Vec3;
  /** Waktu lahir pada jam controller (ms). */
  readonly born: number;
}

// ─── Pembangun langkah ────────────────────────────────────────────────────────

/**
 * Mengubah event engine menjadi langkah animasi berurutan.
 * `prev` = state SEBELUM aksi (dipakai untuk posisi awal korban tangkapan).
 * animate=false → tidak ada langkah (state otoritatif langsung terlihat).
 */
export function buildSteps(prev: GameState, events: readonly GameEvent[], animate: boolean): Step[] {
  if (!animate) return [];
  const steps: Step[] = [];
  const captured: PawnRef[] = [];

  for (const ev of events) {
    switch (ev.type) {
      case 'diceRolled':
        steps.push({ kind: 'dice', value: ev.value, ms: TIMING.dice });
        break;

      case 'noLegalMove':
        steps.push({ kind: 'pause', note: 'noMove', ms: TIMING.pause });
        break;

      case 'turnForfeited':
        steps.push({ kind: 'pause', note: 'forfeit', ms: TIMING.pause });
        break;

      case 'pawnCaptured':
        // Ditunda: korban baru dikembalikan setelah penyerang mendarat.
        captured.push(ev.victim);
        break;

      case 'pawnEntered':
        steps.push({
          kind: 'hop',
          color: ev.player,
          pawn: ev.pawn,
          from: locationToWorld(ev.player, { kind: 'base' }, ev.pawn),
          to: locationToWorld(ev.player, ev.to, ev.pawn),
          ms: TIMING.enter,
          arc: ARC.enter,
          landing: 'enter',
        });
        break;

      case 'pawnMoved': {
        let cursor = locationToWorld(ev.player, ev.from, ev.pawn);
        ev.path.forEach((loc, i) => {
          const to = locationToWorld(ev.player, loc, ev.pawn);
          const last = i === ev.path.length - 1;
          const home = last && ev.to.kind === 'home';
          steps.push({
            kind: 'hop',
            color: ev.player,
            pawn: ev.pawn,
            from: cursor,
            to,
            ms: home ? TIMING.home : TIMING.hop,
            arc: home ? ARC.home : ARC.hop,
            landing: home ? 'home' : last ? 'land' : 'step',
          });
          cursor = to;
        });
        break;
      }

      default:
        break;
    }
  }

  for (const v of captured) {
    steps.push({
      kind: 'capture',
      color: v.color,
      pawn: v.pawn,
      from: stepToWorld(v.color, prev.pawns[v.color][v.pawn] ?? -1, v.pawn),
      to: locationToWorld(v.color, { kind: 'base' }, v.pawn),
      ms: TIMING.capture,
      arc: ARC.capture,
    });
  }

  return steps;
}

// ─── Interpolasi ──────────────────────────────────────────────────────────────

const smooth = (t: number) => t * t * (3 - 2 * t);

function interpolate(step: MovingStep, p: number): Vec3 {
  const t = smooth(Math.min(Math.max(p, 0), 1));
  return [
    step.from[0] + (step.to[0] - step.from[0]) * t,
    step.from[1] + (step.to[1] - step.from[1]) * t + Math.sin(p * Math.PI) * step.arc,
    step.from[2] + (step.to[2] - step.from[2]) * t,
  ];
}

// ─── Controller ───────────────────────────────────────────────────────────────

export interface PresentationSnapshot {
  /** True selama ada langkah animasi tersisa → input dikunci. */
  readonly busy: boolean;
  /** True saat dadu sedang berguling (hasil belum boleh ditampilkan). */
  readonly rolling: boolean;
  readonly notice: 'noMove' | 'forfeit' | null;
  /** Pemain yang ditampilkan sebagai "giliran" selama animasi berlangsung. */
  readonly holdPlayer: PlayerColor | null;
}

export type Cue = 'dice' | 'hop' | 'land' | 'capture' | 'home' | 'win';

const IDLE: PresentationSnapshot = { busy: false, rolling: false, notice: null, holdPlayer: null };

/** Cue suara dari event engine, dipakai saat animasi dimatikan (tanpa langkah). */
function cuesFromEvents(events: readonly GameEvent[]): Cue[] {
  const cues: Cue[] = [];
  for (const ev of events) {
    if (ev.type === 'diceRolled') cues.push('dice');
    else if (ev.type === 'pawnCaptured') cues.push('capture');
    else if (ev.type === 'pawnHome') cues.push('home');
    else if (ev.type === 'pawnMoved' || ev.type === 'pawnEntered') cues.push('land');
  }
  return cues;
}

export class PresentationController {
  /** Pendengar cue suara (opsional). */
  onCue: ((cue: Cue) => void) | null = null;
  private winPending = false;
  private steps: Step[] = [];
  private index = 0;
  private elapsed = 0;
  private clock = 0;
  private effects: Effect[] = [];
  private nextId = 1;
  private hold: PlayerColor | null = null;
  private snap: PresentationSnapshot = IDLE;
  private readonly listeners = new Set<() => void>();

  // Arrow properties agar bisa diteruskan langsung ke useSyncExternalStore.
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): PresentationSnapshot => this.snap;

  get busy(): boolean {
    return this.snap.busy;
  }

  /** Jam internal (ms), untuk umur efek. */
  get time(): number {
    return this.clock;
  }

  get activeEffects(): readonly Effect[] {
    return this.effects;
  }

  /** Progres guliran dadu 0..1, atau null bila tidak sedang berguling. */
  diceProgress(): number | null {
    const s = this.steps[this.index];
    if (!s || s.kind !== 'dice') return null;
    return Math.min(this.elapsed / s.ms, 1);
  }

  /**
   * Mendaftarkan animasi untuk satu transisi state. Bila animasi sebelumnya
   * belum selesai, ia diselesaikan seketika (pion sudah otoritatif) lebih dulu.
   */
  enqueue(prev: GameState, events: readonly GameEvent[], animate: boolean): void {
    this.reset();
    const steps = buildSteps(prev, events, animate);
    const win = events.some((e) => e.type === 'gameOver');
    if (steps.length === 0) {
      cuesFromEvents(events).forEach((c) => this.onCue?.(c));
      if (win) this.onCue?.('win');
      this.publish();
      return;
    }
    this.winPending = win;
    this.steps = steps;
    this.hold = prev.current;
    this.begin(steps[0]!);
    this.publish();
  }

  /** Maju sebesar dtMs. Aman dipanggil tiap frame. */
  advance(dtMs: number): void {
    if (!(dtMs > 0)) return;
    this.clock += dtMs;

    if (this.steps.length > 0) {
      let left = dtMs;
      while (left > 0 && this.index < this.steps.length) {
        const step = this.steps[this.index]!;
        const remaining = step.ms - this.elapsed;
        if (left < remaining) {
          this.elapsed += left;
          left = 0;
          break;
        }
        left -= remaining;
        this.finish(step);
        this.index += 1;
        this.elapsed = 0;
        const next = this.steps[this.index];
        if (next) this.begin(next);
      }
      if (this.index >= this.steps.length) {
        const win = this.winPending;
        this.resetSteps();
        if (win) this.onCue?.('win');
      }
    }

    this.effects = this.effects.filter((e) => this.clock - e.born < EFFECT_MS);
    this.publish();
  }

  /** Lewati seluruh animasi tersisa (tanpa efek). Aman dipanggil kapan saja. */
  skip(): void {
    this.reset();
    this.publish();
  }

  /** Alias semantik untuk rematch/unmount. */
  clear(): void {
    this.skip();
  }

  /**
   * Posisi dunia pion untuk digambar.
   * `rest` = posisi otoritatif dari GameState; dipakai bila pion tidak sedang dianimasikan.
   */
  positionOf(color: PlayerColor, pawn: number, rest: Vec3): Vec3 {
    for (let i = this.index; i < this.steps.length; i++) {
      const s = this.steps[i]!;
      if (s.kind !== 'hop' && s.kind !== 'capture') continue;
      if (s.color !== color || s.pawn !== pawn) continue;
      if (i === this.index) return interpolate(s, Math.min(this.elapsed / s.ms, 1));
      return s.from; // belum giliran: tetap di titik awalnya
    }
    return rest;
  }

  // ── internal ────────────────────────────────────────────────────────────────

  private begin(step: Step): void {
    if (step.kind === 'dice') this.onCue?.('dice');
    if (step.kind === 'capture') {
      this.onCue?.('capture');
      this.addEffect('capture', step.color, step.from);
    }
  }

  private finish(step: Step): void {
    if (step.kind !== 'hop') return;
    if (step.landing === 'step') {
      this.onCue?.('hop');
      return;
    }
    this.onCue?.(step.landing === 'home' ? 'home' : 'land');
    this.addEffect(step.landing === 'home' ? 'home' : 'land', step.color, step.to);
  }

  private addEffect(kind: Effect['kind'], color: PlayerColor, pos: Vec3): void {
    this.effects = [...this.effects, { id: this.nextId++, kind, color, pos, born: this.clock }];
  }

  private resetSteps(): void {
    this.steps = [];
    this.index = 0;
    this.elapsed = 0;
    this.hold = null;
  }

  private reset(): void {
    this.winPending = false;
    this.resetSteps();
    this.effects = [];
  }

  private publish(): void {
    const step = this.steps[this.index];
    const next: PresentationSnapshot = this.steps.length
      ? {
          busy: true,
          rolling: step?.kind === 'dice',
          notice: step?.kind === 'pause' ? step.note : null,
          holdPlayer: this.hold,
        }
      : IDLE;
    const s = this.snap;
    if (
      s.busy === next.busy &&
      s.rolling === next.rolling &&
      s.notice === next.notice &&
      s.holdPlayer === next.holdPlayer
    ) {
      return;
    }
    this.snap = next;
    this.listeners.forEach((l) => l());
  }
}
