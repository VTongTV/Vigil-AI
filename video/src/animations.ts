/**
 * VigilAI Launch Video — Animation Utilities
 *
 * Reusable helpers built on Remotion's interpolate() and spring().
 * All functions take the *local* frame (from inside a <Sequence>).
 */

import { interpolate, spring, Easing } from "remotion";

/* ──────────────────────── Spring Configs ──────────────────────── */

/** Smooth, no bounce — for subtle reveals. */
export const CONFIG_SMOOTH = { damping: 200 } as const;

/** Snappy, minimal bounce — for UI elements. */
export const CONFIG_SNAPPY = { damping: 20, stiffness: 200 } as const;

/** Bouncy entrance — for emphasis. */
export const CONFIG_BOUNCY = { damping: 8 } as const;

/** Heavy, slow, small bounce — for large elements. */
export const CONFIG_HEAVY = { damping: 15, stiffness: 80, mass: 2 } as const;

/* ──────────────────────── Fade ──────────────────────── */

/** Linear fade-in: 0 → 1. */
export function fadeIn(
  frame: number,
  start: number = 0,
  dur: number = 15,
): number {
  return interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

/** Linear fade-out: 1 → 0. */
export function fadeOut(
  frame: number,
  start: number,
  dur: number = 15,
): number {
  return interpolate(frame, [start, start + dur], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

/* ──────────────────────── Spring-based Entrances ──────────────────────── */

/** Spring slide-up: returns translateY offset (px). Settles at 0. */
export function springSlideUp(
  frame: number,
  fps: number,
  delay: number = 0,
  distance: number = 40,
  config: object = CONFIG_SNAPPY,
): number {
  const progress = spring({ frame, fps, delay, config });
  return interpolate(progress, [0, 1], [distance, 0]);
}

/** Spring scale-up: returns scale value. Settles at 1. */
export function springScale(
  frame: number,
  fps: number,
  delay: number = 0,
  from: number = 0.85,
  config: object = CONFIG_BOUNCY,
): number {
  const progress = spring({ frame, fps, delay, config });
  return interpolate(progress, [0, 1], [from, 1]);
}

/* ──────────────────────── Typewriter ──────────────────────── */

/**
 * Typewriter: returns number of visible characters.
 * Uses string slicing — never per-character opacity.
 */
export function typewriter(
  frame: number,
  fps: number,
  delay: number = 0,
  charsPerSec: number = 18,
): number {
  const elapsed = Math.max(0, (frame - delay) / fps);
  return elapsed * charsPerSec;
}

/* ──────────────────────── Count-up ──────────────────────── */

/** Animated count from 0 to target over `dur` frames. */
export function countUp(
  frame: number,
  target: number,
  start: number = 0,
  dur: number = 45,
): number {
  const progress = interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  return progress * target;
}

/* ──────────────────────── Stagger ──────────────────────── */

/** Frame delay for the nth item in a staggered list. */
export function stagger(i: number, gap: number = 6): number {
  return i * gap;
}

/* ──────────────────────── Glow / Pulse ──────────────────────── */

/** Breathing glow opacity (sinusoidal). */
export function glowOp(
  frame: number,
  speed: number = 0.04,
  lo: number = 0.3,
  hi: number = 0.7,
): number {
  return interpolate(Math.sin(frame * speed), [-1, 1], [lo, hi]);
}
