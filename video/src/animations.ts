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

/* ═══════════════════════════ Idle Motion (Always Alive) ═══════════════════════════ */

/**
 * Idle float — sine-wave vertical drift that keeps elements alive
 * after their spring entrance settles.
 *
 * Apply by adding to the element's translateY:
 *   const y = interpolate(springProgress, [0, 1], [30, 0]) + idleFloat(frame, phase);
 *
 * Args:
 *   frame: Current frame from useCurrentFrame().
 *   speed: Oscillation speed. 0.05 = ~2s period at 60fps. Default 0.05.
 *   amplitude: Max pixels of drift. 3-5px is subtle, 8+px is noticeable. Default 3.
 *   phase: Phase offset — use elementIndex * 0.5 to desync. Default 0.
 */
export function idleFloat(
  frame: number,
  speed: number = 0.05,
  amplitude: number = 3,
  phase: number = 0,
): number {
  return Math.sin(frame * speed + phase) * amplitude;
}

/**
 * Idle breathe — subtle scale oscillation that creates a "breathing" effect.
 * Returns a multiplier centered around 1.0.
 *
 * Apply as a scale multiplier:
 *   const scale = entranceScale * idleBreathe(frame);
 *
 * Args:
 *   frame: Current frame from useCurrentFrame().
 *   speed: Oscillation speed. Default 0.04.
 *   amplitude: Scale deviation. 0.005 = ±0.5%, barely visible. 0.01 = ±1%. Default 0.006.
 */
export function idleBreathe(
  frame: number,
  speed: number = 0.04,
  amplitude: number = 0.006,
): number {
  return 1 + Math.sin(frame * speed) * amplitude;
}

/**
 * Idle horizontal drift — slow sine-wave X movement.
 * Use alongside idleFloat for 2D wandering motion.
 */
export function idleDrift(
  frame: number,
  speed: number = 0.03,
  amplitude: number = 2,
  phase: number = 0,
): number {
  return Math.cos(frame * speed + phase) * amplitude;
}

/* ═══════════════════════════ Ken Burns (Image Zoom) ═══════════════════════════ */

/**
 * Ken Burns effect — slow, imperceptible zoom + pan for images.
 * Apple never zooms more than 3%; this defaults to 2%.
 *
 * Usage on an image wrapper div:
 *   const kb = kenBurns(frame, TOTAL_FRAMES);
 *   style={{ transform: `scale(${kb.scale}) translate(${kb.x}px, ${kb.y}px)` }}
 *
 * Args:
 *   frame: Current frame.
 *   totalFrames: Scene duration in frames.
 *   zoomTarget: Final scale. 1.02 = 2% zoom. Max 1.03. Default 1.02.
 *   panX: Max horizontal pan in px. Default 6.
 *   panY: Max vertical pan in px. Default 3.
 */
export function kenBurns(
  frame: number,
  totalFrames: number,
  zoomTarget: number = 1.02,
  panX: number = 6,
  panY: number = 3,
): { scale: number; x: number; y: number } {
  const t = interpolate(frame, [0, totalFrames], [0, 1], {
    extrapolateRight: "clamp",
  });
  return {
    scale: interpolate(t, [0, 1], [1, zoomTarget]),
    x: interpolate(t, [0, 1], [0, -panX]),
    y: interpolate(t, [0, 1], [0, -panY]),
  };
}

/* ═══════════════════════════ Scene Exit ═══════════════════════════ */

/**
 * Scene exit animation — fade + slide-up in the last N frames.
 *
 * Wrap the scene's content in a div with:
 *   const exit = sceneExit(frame, TOTAL_FRAMES, 18);
 *   style={{ opacity: exit.opacity, transform: `translateY(${exit.translateY}px)` }}
 *
 * Args:
 *   frame: Current frame.
 *   totalFrames: Scene duration in frames.
 *   exitDuration: Frames before end to start exit. Default 18.
 */
export function sceneExit(
  frame: number,
  totalFrames: number,
  exitDuration: number = 18,
): { opacity: number; translateY: number } {
  const exitStart = totalFrames - exitDuration;
  if (frame < exitStart) return { opacity: 1, translateY: 0 };
  const progress = interpolate(frame, [exitStart, totalFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return {
    opacity: interpolate(progress, [0, 1], [1, 0]),
    translateY: interpolate(progress, [0, 1], [0, -15]),
  };
}

/* ═══════════════════════════ Parallax Drift ═══════════════════════════ */

/**
 * Parallax drift — slow orbital movement for background layers.
 * Different layers with different speeds create depth illusion.
 *
 * Usage:
 *   const bg1 = parallaxDrift(frame, TOTAL_FRAMES, 1, 15, 10);
 *   const bg2 = parallaxDrift(frame, TOTAL_FRAMES, 0.5, 8, 5);
 *
 * Args:
 *   frame: Current frame.
 *   totalFrames: Scene duration.
 *   speed: Multiplier for orbit speed. Default 1.
 *   amplitudeX: Max horizontal drift in px. Default 15.
 *   amplitudeY: Max vertical drift in px. Default 10.
 */
export function parallaxDrift(
  frame: number,
  totalFrames: number,
  speed: number = 1,
  amplitudeX: number = 15,
  amplitudeY: number = 10,
): { x: number; y: number } {
  const t = (frame / totalFrames) * Math.PI * 2 * speed;
  return {
    x: Math.sin(t) * amplitudeX,
    y: Math.cos(t * 0.7) * amplitudeY,
  };
}
