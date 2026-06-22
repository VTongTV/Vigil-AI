import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS, VIOLATION_TYPES, FPS } from "../constants";
import {
  fadeIn,
  fadeInEased,
  stagger,
  floatY,
  shimmerPosition,
  borderGlow,
  pulse,
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

const TOTAL_FRAMES = 12 * FPS;

// Bento layout — 2 rows of 4 cards each
const LAYOUT = [
  // Row 1
  [0, 1, 2, 3],
  // Row 2
  [4, 5, 6, 7],
];

/**
 * Scene 6: Violation Types
 * Bento grid with animated cards, shimmer effects,
 * SVG icons, severity indicators, and continuous motion.
 */
export const ViolationTypes: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Section label
  const labelProgress = spring({ frame, fps, delay: 0, config: CONFIG_SMOOTH });
  const labelOp = interpolate(labelProgress, [0, 1], [0, 1]);

  // Title
  const titleProgress = spring({ frame, fps, delay: 8, config: CONFIG_BOUNCY });
  const titleOp = interpolate(titleProgress, [0, 1], [0, 1]);
  const titleY = interpolate(titleProgress, [0, 1], [20, 0]);

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {/* Animated background */}
      <AnimatedBackground particleCount={18} seed={42} />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "50px 60px",
        }}
      >
        {/* Section label */}
        <div
          style={{
            fontFamily,
            fontSize: 18,
            fontWeight: 600,
            color: COLORS.primary,
            letterSpacing: "0.25em",
            textTransform: "uppercase" as const,
            opacity: labelOp,
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ width: 20, height: 1, backgroundColor: COLORS.primary }} />
          Detection Capabilities
          <div style={{ width: 20, height: 1, backgroundColor: COLORS.primary }} />
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily,
            fontSize: 46,
            fontWeight: 700,
            color: COLORS.text,
            textAlign: "center",
            opacity: titleOp,
            transform: `translateY(${titleY}px)`,
            marginBottom: 50,
          }}
        >
          8 Violation Types
        </div>

        {/* Bento grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {LAYOUT.map((row, rowIdx) => (
            <div key={rowIdx} style={{ display: "flex", gap: 16 }}>
              {row.map((violationIdx) => {
                const v = VIOLATION_TYPES[violationIdx];
                if (!v) return null;

                return (
                  <ViolationCard
                    key={violationIdx}
                    violation={v}
                    index={violationIdx}
                    frame={frame}
                    fps={fps}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ──────────────────────── Violation Card ──────────────────────── */

const ViolationCard: React.FC<{
  violation: typeof VIOLATION_TYPES[number];
  index: number;
  frame: number;
  fps: number;
}> = ({ violation, index, frame, fps }) => {
  const delay = stagger(index, 8) + 25;

  const progress = spring({ frame, fps, delay, config: CONFIG_SNAPPY });
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const translateY = interpolate(progress, [0, 1], [35, 0]);
  const scale = interpolate(progress, [0.3, 1], [0.92, 1]);

  const cardFloat = floatY(frame, 0.018 + index * 0.002, 2, index * 0.7);
  const shimmerPos = shimmerPosition(frame, 200, delay + 30);
  const glow = borderGlow(frame, 0.02 + index * 0.003);
  const iconPulse = pulse(frame, 0.03 + index * 0.003, 0.05, 1);

  // Severity color based on fine string
  const severityColor =
    violation.color === COLORS.danger
      ? COLORS.danger
      : violation.color === COLORS.warning
        ? COLORS.warning
        : COLORS.success;

  return (
    <div
      style={{
        width: 210,
        backgroundColor: COLORS.bgCard,
        border: `1px solid rgba(6,182,212,${glow * 0.3})`,
        borderRadius: 14,
        padding: "12px 16px",
        opacity,
        transform: transforms(
          `translateY(${translateY + cardFloat}px)`,
          `scale(${scale})`,
        ),
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Shimmer sweep */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(105deg, transparent 40%, rgba(6,182,212,${shimmerPos * 0.04}) 50%, transparent 60%)`,
          pointerEvents: "none",
        }}
      />

      {/* Severity indicator — left accent */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 12,
          bottom: 12,
          width: 3,
          backgroundColor: severityColor,
          borderRadius: 2,
          opacity: 0.7,
        }}
      />

      {/* Icon + Name row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 10,
          paddingLeft: 6,
        }}
      >
        <div style={{ transform: `scale(${iconPulse})` }}>
          <Icon name={violation.icon} size={20} color={COLORS.primary} />
        </div>
        <div
          style={{
            fontFamily,
            fontSize: 18,
            fontWeight: 600,
            color: COLORS.text,
          }}
        >
          {violation.type}
        </div>
      </div>

      {/* Section + Fine */}
      <div
        style={{
          paddingLeft: 6,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontFamily,
            fontSize: 14,
            color: COLORS.textMuted,
          }}
        >
          {violation.section}
        </div>
        <div
          style={{
            fontFamily,
            fontSize: 16,
            fontWeight: 700,
            color: severityColor,
          }}
        >
          {violation.fine}
        </div>
      </div>

      {/* Section reference */}
      <div
        style={{
          marginTop: 10,
          paddingLeft: 6,
        }}
      >
        <span
          style={{
            fontFamily,
            fontSize: 14,
            fontWeight: 600,
            color: COLORS.textMuted,
            backgroundColor: COLORS.bgElevated,
            padding: "3px 8px",
            borderRadius: 4,
            letterSpacing: "0.06em",
            textTransform: "uppercase" as const,
          }}
        >
          {violation.section}
        </span>
      </div>
    </div>
  );
};
