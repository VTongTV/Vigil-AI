import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FPS } from "./constants";
import {
  generateParticles,
  particleY,
  gridBreath,
  driftX,
  floatY,
  glowOp,
  parallaxDrift,
} from "./animations";

/**
 * VigilAI Launch Video — Shared Animated Background
 *
 * Every scene gets this layered background:
 * 1. Solid dark base
 * 2. Subtle animated grid
 * 3. Floating particles
 * 4. Ambient glow orbs
 *
 * This eliminates the "slideshow on black" feel and adds
 * continuous ambient motion to every frame.
 */

interface AnimatedBackgroundProps {
  /** Particle count. Default 30. */
  particleCount?: number;
  /** Show grid overlay. Default true. */
  showGrid?: boolean;
  /** Grid size in px. Default 60. */
  gridSize?: number;
  /** Number of glow orbs. Default 2. */
  glowCount?: number;
  /** Seed for deterministic particle positions. Default 42. */
  seed?: number;
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  particleCount = 30,
  showGrid = true,
  gridSize = 60,
  glowCount = 2,
  seed = 42,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  // Approximate scene length — backgrounds don't know exact duration,
  // so use a long cycle. The sin/cos functions are cyclic anyway.
  const approxDuration = 12 * FPS;

  const particles = React.useMemo(
    () => generateParticles(particleCount, width, height, seed),
    [particleCount, width, height, seed],
  );

  const gridOp = gridBreath(frame);

  // Parallax drift for grid layer — slow, barely perceptible
  const gridDrift = parallaxDrift(frame, approxDuration, 0.3, 6, 4);

  // Glow orbs orbit — different speeds for depth
  const orb1Drift = parallaxDrift(frame, approxDuration, 0.4, 40, 30);
  const orb2Drift = parallaxDrift(frame, approxDuration, 0.25, 30, 25);

  return (
    <>
      {/* Layer 1: Solid base */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: COLORS.bg,
        }}
      />

      {/* Layer 2: Animated grid with parallax drift */}
      {showGrid && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: gridOp,
            backgroundImage: `
              linear-gradient(rgba(6,182,212,0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6,182,212,0.08) 1px, transparent 1px)
            `,
            backgroundSize: `${gridSize}px ${gridSize}px`,
            transform: `translate(${gridDrift.x}px, ${gridDrift.y}px)`,
          }}
        />
      )}

      {/* Layer 3: Floating particles */}
      {particles.map((p, i) => {
        const py = particleY(frame, p, height);
        const px = p.x + driftX(frame, p.speed * 0.015, 8, p.phase);
        const pFloat = floatY(frame, p.speed * 0.03, p.size * 0.5, p.phase);

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: px % width,
              top: (py + pFloat) % height,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              backgroundColor: COLORS.primary,
              opacity: p.opacity * glowOp(frame, 0.02 + p.speed * 0.01, 0.3, 1),
              filter: `blur(${p.size * 0.5}px)`,
            }}
          />
        );
      })}

      {/* Layer 4: Ambient glow orbs — orbiting for cinematic depth */}
      {glowCount >= 1 && (
        <div
          style={{
            position: "absolute",
            width: 600 + floatY(frame, 0.012, 30),
            height: 300 + floatY(frame, 0.01, 20, 1.5),
            borderRadius: "50%",
            background: `radial-gradient(ellipse, rgba(6,182,212,${glowOp(frame, 0.02, 0.04, 0.12)}), transparent 70%)`,
            filter: "blur(80px)",
            left: `calc(15% + ${orb1Drift.x}px)`,
            top: `calc(25% + ${orb1Drift.y}px)`,
          }}
        />
      )}
      {glowCount >= 2 && (
        <div
          style={{
            position: "absolute",
            width: 500 + floatY(frame, 0.015, 20, 2.5),
            height: 250 + floatY(frame, 0.013, 15, 3),
            borderRadius: "50%",
            background: `radial-gradient(ellipse, rgba(59,130,246,${glowOp(frame, 0.025, 0.03, 0.08)}), transparent 70%)`,
            filter: "blur(100px)",
            right: `calc(10% - ${orb2Drift.x}px)`,
            bottom: `calc(20% - ${orb2Drift.y}px)`,
          }}
        />
      )}
    </>
  );
};
