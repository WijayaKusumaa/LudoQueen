/**
 * coordinateResolver.ts
 * Maps authoritative engine step integers and PawnLocation values to Three.js world positions.
 * This is the single source of truth: all rendered pawn positions derive from here.
 * Animation only interpolates between positions returned by these functions.
 */

import {
  HOME_LANES,
  START_INDEX,
  TRACK,
  TRACK_LENGTH,
  type PlayerColor,
} from '../board/boardLayout';
import { HEIGHTS, baseSlotPawnPosition, gridToPawnPosition } from '../board/boardCoordinates';
import type { PawnLocation } from '../engine/types';
import { BASE, HOME, FIRST_LANE_STEP } from '../engine/types';

/** Y altitude at the peak of the hop arc during step-by-step movement. */
export const ARC_PEAK_Y = 1.1;

/**
 * The canonical world position for a pawn given its authoritative PawnLocation.
 * `slot` is only used for the 'base' case (each pawn occupies a distinct slot 0-3).
 */
export function locationToWorld(
  color: PlayerColor,
  location: PawnLocation,
  slot: number,
): [number, number, number] {
  switch (location.kind) {
    case 'base':
      return baseSlotPawnPosition(color, slot);

    case 'track': {
      const cell = TRACK[location.index];
      if (!cell) return [0, HEIGHTS.tileTop, 0];
      return gridToPawnPosition(cell);
    }

    case 'lane': {
      const lane = HOME_LANES[color];
      const cell = lane[location.index];
      if (!cell) return [0, HEIGHTS.tileTop, 0];
      return gridToPawnPosition(cell);
    }

    case 'home':
      return [0, 0.22, 0];
  }
}

/**
 * The canonical world position for a pawn given its raw engine step integer.
 * `slot` is only used when step === BASE.
 */
export function stepToWorld(
  color: PlayerColor,
  step: number,
  slot: number,
): [number, number, number] {
  if (step === BASE) return baseSlotPawnPosition(color, slot);
  if (step === HOME) return [0, 0.22, 0];

  // Shared track steps 0–50
  if (step >= 0 && step <= 50) {
    const idx = (START_INDEX[color] + step) % TRACK_LENGTH;
    const cell = TRACK[idx];
    if (!cell) return [0, HEIGHTS.tileTop, 0];
    return gridToPawnPosition(cell);
  }

  // Home lane steps 51–55 → lane index 0–4
  if (step >= FIRST_LANE_STEP && step < HOME) {
    const lane = HOME_LANES[color];
    const cell = lane[step - FIRST_LANE_STEP];
    if (!cell) return [0, HEIGHTS.tileTop, 0];
    return gridToPawnPosition(cell);
  }

  return [0, HEIGHTS.tileTop, 0];
}

/**
 * Build the full list of world waypoints a pawn travels through
 * for a move from `fromStep` to `toStep`.
 * Each step in the path gets its own waypoint for step-by-step animation.
 */
export function buildMovePath(
  color: PlayerColor,
  fromStep: number,
  toStep: number,
  slot: number,
): Array<[number, number, number]> {
  const waypoints: Array<[number, number, number]> = [];
  // fromStep is the starting position (already rendered), so start from fromStep+1
  for (let s = fromStep + 1; s <= toStep; s++) {
    waypoints.push(stepToWorld(color, s, slot));
  }
  if (waypoints.length === 0) {
    // 'enter' move: fromStep is BASE (-1), jump straight to step 0
    waypoints.push(stepToWorld(color, toStep, slot));
  }
  return waypoints;
}
