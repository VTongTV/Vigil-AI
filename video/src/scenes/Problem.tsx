import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS, PROBLEM_STATS, FPS } from "../constants";
import {
  fadeIn,
  fadeInEased,
  springSlideUp,
  stagger,
  floatY,
  shimmerPosition,
  borderGlow,
  pulse,
  cameraZoom,
  transforms,
  CONFIG_SNAPPY,
  CONFIG_SMOOTH,
  CONFIG_BOUNCY,
} from "../animations";
import { AnimatedBackground } from "../AnimatedBackground";
import { Icon } from "../Icon";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["300", "400", "600", "700", "800"],
  subsets: ["latin"],
});

const TOTAL_FRAMES = 10 * FPS;

/**
 * Scene 2: The Problem
 * Stats fly in with severity bars, shimmer effects,
 * and continuous motion. SVG icons replace emojis.
 */
export const Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Camera drift
  const zoom = cameraZoom(frame, TOTAL_FRAMES, 1.04);

  // Title entrance
  const titleProgress = spring({ frame, fps, delay: 5, config: CONFIG_BOUNCY });
  const titleOp = interpolate(titleProgress, [0, 1], [0, 1]);
  const titleY = interpolate(titleProgress, [0, 1], [25, 0]);
  const titleScale = interpolate(titleProgress, [0.4, 1], [0.95, 1]);

  // Section label — slides in from left
  const labelProgress = spring({ frame, fps, delay: 0, config: CONFIG_SMOOTH });
  const labelOp = interpolate(labelProgress, [0, 1], [0, 1]);
  const labelX = interpolate(labelProgress, [0, 1], [-20, 0]);

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {/* Animated background */}
      <AnimatedBackground particleCount={25} seed={21} />

      {/* Camera zoom container */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `scale(${zoom})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 80px",
        }}
      >
        {/* Section label */}
        <div
          style={{
            fontFamily,
            fontSize: 18,
            fontWeight: 600,
            color: COLORS.danger,
            letterSpacing: "0.25em",
            textTransform: "uppercase" as const,
            opacity: labelOp,
            transform: `translateX(${labelX}px)`,
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 20,
              height: 1,
              backgroundColor: COLORS.danger,
              opacity: labelOp,
            }}
          />
          The Problem
          <div
            style={{
              width: 20,
              height: 1,
              backgroundColor: COLORS.danger,
              opacity: labelOp,
            }}
          />
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily,
            fontSize: 54,
            fontWeight: 700,
            color: COLORS.text,
            textAlign: "center",
            opacity: titleOp,
            transform: transforms(
              `translateY(${titleY}px)`,
              `scale(${titleScale})`,
            ),
            marginBottom: 70,
            lineHeight: 1.2,
          }}
        >
          Bengaluru's Traffic Enforcement
          <br />
          <span
            style={{
              color: COLORS.danger,
              textShadow: `0 0 40px rgba(239,68,68,0.3)`,
            }}
          >
            Blind Spots
          </span>
        </div>

        {/* Stats grid */}
        <div style={{ display: "flex", gap: 28, justifyContent: "center", width: "100%" }}>
          {PROBLEM_STATS.map((stat, i) => (
            <StatCard key={i} stat={stat} index={i} frame={frame} fps={fps} />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ──────────────────────── Stat Card with Shimmer ──────────────────────── */

const StatCard: React.FC<{
  stat: typeof PROBLEM_STATS[number];
  index: number;
  frame: number;
  fps: number;
}> = ({ stat, index, frame, fps }) => {
  const delay = stagger(index, 10) + 30;

  // Spring entrance
  const progress = spring({ frame, fps, delay, config: CONFIG_SNAPPY });
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const translateY = interpolate(progress, [0, 1], [50, 0]);
  const scale = interpolate(progress, [0.3, 1], [0.92, 1]);

  // Severity bar fill
  const barProgress = interpolate(
    frame,
    [55 + delay, 100 + delay],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Shimmer sweep
  const shimmerPos = shimmerPosition(frame, 180, delay + 60);

  // Continuous floating
  const cardFloat = floatY(frame, 0.02 + index * 0.003, 2.5, index * 1.2);

  // Border glow
  const glow = borderGlow(frame, 0.03 + index * 0.005);

  // Icon pulse
  const iconPulse = pulse(frame, 0.04 + index * 0.005, 0.05, 1);

  return (
    <div
      style={{
        flex: 1,
        maxWidth: 360,
        backgroundColor: COLORS.bgCard,
        border: `1px solid rgba(239,68,68,${glow * 0.3})`,
        borderRadius: 16,
        padding: "36px 28px",
        opacity,
        transform: transforms(
          `translateY(${translateY + cardFloat}px)`,
          `scale(${scale})`,
        ),
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Shimmer sweep overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(105deg, transparent 40%, rgba(239,68,68,${shimmerPos * 0.06}) 50%, transparent 60%)`,
          pointerEvents: "none",
        }}
      />

      {/* Top accent bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${COLORS.danger}, ${COLORS.warning})`,
          opacity: barProgress,
        }}
      />

      {/* Icon */}
      <div
        style={{
          marginBottom: 16,
          transform: `scale(${iconPulse})`,
        }}
      >
        <Icon name={stat.icon} size={32} color={COLORS.danger} />
      </div>

      {/* Value */}
      <div
        style={{
          fontFamily,
          fontSize: 44,
          fontWeight: 800,
          color: COLORS.text,
          letterSpacing: "-0.03em",
          marginBottom: 8,
        }}
      >
        {stat.value}
      </div>

      {/* Label */}
      <div
        style={{
          fontFamily,
          fontSize: 18,
          color: COLORS.textMuted,
          lineHeight: 1.5,
        }}
      >
        {stat.label}
      </div>

      {/* Severity bar */}
      <div
        style={{
          marginTop: 20,
          height: 4,
          backgroundColor: COLORS.border,
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${barProgress * 100}%`,
            background: `linear-gradient(90deg, ${COLORS.danger}, ${COLORS.warning})`,
            borderRadius: 2,
            boxShadow: `0 0 8px rgba(239,68,68,${barProgress * 0.3})`,
          }}
        />
      </div>
    </div>
  );
};
