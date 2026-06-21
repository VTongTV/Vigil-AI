/**
 * VigilAI Launch Video — Professional Animation Utilities
 *
 * Reusable helpers built on Remotion's interpolate() and spring().
 * All functions take the *local* frame (from inside a <Sequence>).
 *
 * Design philosophy: No static states. Every element breathes.
 * - Backgrounds drift and pulse
 * - Cards shimmer and float
 * - Icons rotate and pulse
 * - Particles drift across the frame
 * - Borders glow rhythmically
 */

import { interpolate, spring, Easing } from "remotion";

/* ═══════════════════════════ Spring Configs ═══════════════════════════ */

/** Smooth, no bounce — for subtle reveals. */
export const CONFIG_SMOOTH = { damping: 200 } as const;

/** Snappy, minimal bounce — for UI elements. */
export const CONFIG_SNAPPY = { damping: 20, stiffness: 200 } as const;

/** Bouncy entrance — for emphasis. */
export const CONFIG_BOUNCY = { damping: 8 } as const;

/** Heavy, slow, small bounce — for large elements. */
export const CONFIG_HEAVY = { damping: 15, stiffness: 80, mass: 2 } as const;

/** Elastic — for dramatic reveals. */
export const CONFIG_ELASTIC = { damping: 12, stiffness: 150, mass: 0.8 } as const;

/** Gentle — for floating elements. */
export const CONFIG_GENTLE = { damping: 30, stiffness: 60, mass: 1.5 } as const;

/* ═══════════════════════════ Fade ═══════════════════════════ */

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

/** Eased fade-in with cubic easing — more cinematic. */
export function fadeInEased(
  frame: number,
  start: number = 0,
  dur: number = 20,
): number {
  return interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
}

/* ═══════════════════════════ Spring-based Entrances ═══════════════════════════ */

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

/** Spring slide-down: returns translateY offset (px). Settles at 0. */
export function springSlideDown(
  frame: number,
  fps: number,
  delay: number = 0,
  distance: number = 40,
  config: object = CONFIG_SNAPPY,
): number {
  const progress = spring({ frame, fps, delay, config });
  return interpolate(progress, [0, 1], [-distance, 0]);
}

/** Spring slide-right: returns translateX offset (px). Settles at 0. */
export function springSlideRight(
  frame: number,
  fps: number,
  delay: number = 0,
  distance: number = 60,
  config: object = CONFIG_SNAPPY,
): number {
  const progress = spring({ frame, fps, delay, config });
  return interpolate(progress, [0, 1], [-distance, 0]);
}

/** Spring slide-left: returns translateX offset (px). Settles at 0. */
export function springSlideLeft(
  frame: number,
  fps: number,
  delay: number = 0,
  distance: number = 60,
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

/** Spring entrance that combines opacity + translateY + scale. */
export function springEntrance(
  frame: number,
  fps: number,
  delay: number = 0,
  config: object = CONFIG_SNAPPY,
): { opacity: number; translateY: number; scale: number } {
  const progress = spring({ frame, fps, delay, config });
  return {
    opacity: interpolate(progress, [0, 1], [0, 1]),
    translateY: interpolate(progress, [0, 1], [30, 0]),
    scale: interpolate(progress, [0.4, 1], [0.92, 1]),
  };
}

/* ═══════════════════════════ Continuous Motion ═══════════════════════════ */

/** Breathing glow opacity (sinusoidal). */
export function glowOp(
  frame: number,
  speed: number = 0.04,
  lo: number = 0.3,
  hi: number = 0.7,
): number {
  return interpolate(Math.sin(frame * speed), [-1, 1], [lo, hi]);
}

/** Gentle floating Y offset — creates a hovering effect. */
export function floatY(
  frame: number,
  speed: number = 0.025,
  amplitude: number = 6,
  phase: number = 0,
): number {
  return Math.sin(frame * speed + phase) * amplitude;
}

/** Gentle floating X offset — creates a drifting effect. */
export function driftX(
  frame: number,
  speed: number = 0.018,
  amplitude: number = 4,
  phase: number = 0,
): number {
  return Math.cos(frame * speed + phase) * amplitude;
}

/** Continuous slow rotation in degrees. */
export function slowRotate(
  frame: number,
  speed: number = 0.3,
): number {
  return frame * speed;
}

/** Pulse scale — continuous breathing scale. Settles around 1. */
export function pulse(
  frame: number,
  speed: number = 0.04,
  amplitude: number = 0.03,
  base: number = 1,
): number {
  return base + Math.sin(frame * speed) * amplitude;
}

/** Shimmer sweep position (0 → 1 → 0) for card highlight effects. */
export function shimmerPosition(
  frame: number,
  period: number = 120,
  delay: number = 0,
): number {
  const adjustedFrame = Math.max(0, frame - delay);
  const t = (adjustedFrame % period) / period;
  // Smooth in-out using sine
  return (Math.sin(t * Math.PI * 2 - Math.PI / 2) + 1) / 2;
}

/** Border glow intensity — rhythmic pulse. */
export function borderGlow(
  frame: number,
  speed: number = 0.03,
  lo: number = 0.15,
  hi: number = 0.5,
): number {
  return interpolate(Math.sin(frame * speed), [-1, 1], [lo, hi]);
}

/* ═══════════════════════════ Text Animations ═══════════════════════════ */

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

/* ═══════════════════════════ Count-up ═══════════════════════════ */

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

/* ═══════════════════════════ Stagger ═══════════════════════════ */

/** Frame delay for the nth item in a staggered list. */
export function stagger(i: number, gap: number = 6): number {
  return i * gap;
}

/* ═══════════════════════════ Background Effects ═══════════════════════════ */

/**
 * Generate positions for a particle field.
 * Returns an array of {x, y, size, speed, phase} objects
 * that can be used to render floating background particles.
 */
export function generateParticles(
  count: number,
  width: number,
  height: number,
  seed: number = 42,
): Array<{ x: number; y: number; size: number; speed: number; phase: number; opacity: number }> {
  const particles: Array<{ x: number; y: number; size: number; speed: number; phase: number; opacity: number }> = [];
  // Simple deterministic pseudo-random based on seed
  let s = seed;
  const rand = () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };

  for (let i = 0; i < count; i++) {
    particles.push({
      x: rand() * width,
      y: rand() * height,
      size: 1.5 + rand() * 3,
      speed: 0.2 + rand() * 0.5,
      phase: rand() * Math.PI * 2,
      opacity: 0.1 + rand() * 0.25,
    });
  }
  return particles;
}

/** Calculate particle Y position at given frame — drifts upward and loops. */
export function particleY(
  frame: number,
  particle: { y: number; speed: number; phase: number },
  height: number,
): number {
  const yOff = Math.sin(frame * particle.speed * 0.02 + particle.phase) * 20;
  const baseY = (particle.y + yOff) % height;
  return baseY < 0 ? baseY + height : baseY;
}

/** Grid background opacity — subtle breathing. */
export function gridBreath(
  frame: number,
  speed: number = 0.015,
  lo: number = 0.03,
  hi: number = 0.08,
): number {
  return interpolate(Math.sin(frame * speed), [-1, 1], [lo, hi]);
}

/* ═══════════════════════════ Camera Effects ═══════════════════════════ */

/** Subtle zoom effect — slowly scales from 1.0 to target. */
export function cameraZoom(
  frame: number,
  totalFrames: number,
  target: number = 1.08,
): number {
  return interpolate(frame, [0, totalFrames], [1, target], {
    extrapolateRight: "clamp",
  });
}

/* ═══════════════════════════ Utility ═══════════════════════════ */

/** Combine multiple transforms into a single CSS transform string. */
export function transforms(...parts: string[]): string {
  return parts.filter(Boolean).join(" ");
}

/** Linear progress 0→1 for drawing lines, bars, etc. */
export function linearProgress(
  frame: number,
  start: number,
  dur: number,
): number {
  return interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

/** Spring progress 0→1 with custom config. */
export function springProgress(
  frame: number,
  fps: number,
  delay: number = 0,
  config: object = CONFIG_SMOOTH,
): number {
  return spring({ frame, fps, delay, config });
}
