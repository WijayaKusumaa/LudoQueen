/**
 * useTap.ts
 *
 * Deteksi "tap/klik" yang tahan terhadap OrbitControls dan jari yang sedikit bergeser.
 * Mouse dan sentuh memakai jalur yang sama (pointer events). Drag untuk memutar kamera,
 * tekan-tahan lama, dan multi-touch (pinch) TIDAK dihitung sebagai tap.
 */

import { useMemo, useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';

/** Jarak maksimum (px) antara pointerdown dan pointerup agar masih dianggap tap.
 * Toleran terhadap pergeseran jari lembut pada layar sentuh HP dan tablet. */
export const TAP_SLOP_PX = 18;
/** Durasi maksimum (ms) sebuah tap. */
export const TAP_MAX_MS = 700;

export interface TapStart {
  readonly x: number;
  readonly y: number;
  readonly t: number;
  readonly id: number;
}

export function isTap(start: TapStart, end: { x: number; y: number; t: number; id: number }): boolean {
  return (
    start.id === end.id &&
    Math.hypot(end.x - start.x, end.y - start.y) <= TAP_SLOP_PX &&
    end.t - start.t <= TAP_MAX_MS
  );
}

export function useTap(onTap: () => void, enabled: boolean) {
  const start = useRef<TapStart | null>(null);

  return useMemo(
    () => ({
      onPointerDown(e: ThreeEvent<PointerEvent>) {
        // Pointer kedua (pinch) membatalkan tap yang sedang berjalan.
        if (!enabled || !e.nativeEvent.isPrimary) {
          start.current = null;
          return;
        }
        start.current = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
      },
      onPointerUp(e: ThreeEvent<PointerEvent>) {
        const s = start.current;
        start.current = null;
        if (!enabled || !s) return;
        const end = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
        if (!isTap(s, end)) return;
        e.stopPropagation();
        onTap();
      },
      onPointerCancel() {
        start.current = null;
      },
    }),
    [onTap, enabled],
  );
}
