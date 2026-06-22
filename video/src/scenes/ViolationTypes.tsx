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
  stagger,
  shimmerPosition,
  borderGlow,
  pulse,
  transforms,
  CONFIG_SNAPPY,
  CONFIG_SMOOTH,
  CONFIG_BOUNCY,
  visibleFloat,
  visibleBreathe,
  highlightSweep,
  sceneExit,
} from "../animations";
import { AnimatedBackground } from "../AnimatedBackground";
import { Icon } from "../Icon";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["300", "400", "600", "700", "800"],
  subsets: ["latin"],
});

const TOTAL_FRAMES = 10 * FPS;

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
 * SVG icons, severity indicators, highlight sweep, and continuous motion.
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

  // Visible continuous motion (8-10px amplitude)
  const labelFloat = visibleFloat(frame, 0.035, 8, 0);
  const titleFloat = visibleFloat(frame, 0.04, 10, 0.5);

  // Title pulse after entrance
  const titlePulse = interpolate(
    Math.sin(frame * 0.025),
    [-1, 1],
    [0.98, 1.02],
  );

  // Scene exit
  const exit = sceneExit(frame, TOTAL_FRAMES, 18);

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
          opacity: exit.opacity,
          transform: `translateY(${exit.translateY}px)`,
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
            transform: `translateY(${labelFloat}px)`,
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

        {/* Title — with subtle pulse */}
        <div
          style={{
            fontFamily,
            fontSize: 46,
            fontWeight: 700,
            color: COLORS.text,
            textAlign: "center",
            opacity: titleOp,
            transform: `translateY(${titleY + titleFloat}px) scale(${titlePulse})`,
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
                    totalCards={VIOLATION_TYPES.length}
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
  totalCards: number;
}> = ({ violation, index, frame, fps, totalCards }) => {
  const delay = stagger(index, 8) + 25;

  const progress = spring({ frame, fps, delay, config: CONFIG_SNAPPY });
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const translateY = interpolate(progress, [0, 1], [35, 0]);
  const scale = interpolate(progress, [0.3, 1], [0.92, 1]);

  // Visible continuous motion (8-10px, different phase per card)
  const cardFloat = visibleFloat(frame, 0.018 + index * 0.002, 9, index * 0.7);
  const shimmerPos = shimmerPosition(frame, 200, delay + 30);
  const glow = borderGlow(frame, 0.02 + index * 0.003);
  const iconPulse = pulse(frame, 0.03 + index * 0.003, 0.08, 1);
  const cardBreathe = visibleBreathe(frame, 0.03 + index * 0.003, 0.018);

  // Highlight sweep — after cards enter (~frame 80+)
  const sweepIntensity = highlightSweep(frame, 80, 40, index, totalCards);
  const isSweepActive = sweepIntensity > 0.5;

  // Dynamic border opacity: sweep makes border brighter
  const borderOpacity = interpolate(sweepIntensity, [0, 1], [0.3, 0.7]);
  const borderActiveOpacity = isSweepActive
    ? interpolate(sweepIntensity, [0.5, 1], [0, 0.5], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  // Sweep-driven scale boost
  const sweepScale = interpolate(sweepIntensity, [0, 1], [1, 1.04]);

  // Severity color based on fine string
  const severityColor =
    violation.color === COLORS.danger
      ? COLORS.danger
      : violation.color === COLORS.warning
        ? COLORS.warning
        : COLORS.success;

  // Fine text gets brighter during sweep
  const fineBrightness = interpolate(sweepIntensity, [0, 1], [0.85, 1.2]);
  const fineColor = isSweepActive ? COLORS.text : severityColor;

  return (
    <div
      style={{
        width: 210,
        backgroundColor: COLORS.bgCard,
        border: `1px solid rgba(6,182,212,${borderOpacity + borderActiveOpacity})`,
        borderRadius: 14,
        padding: "12px 16px",
        opacity,
        transform: transforms(
          `translateY(${translateY + cardFloat}px)`,
          `scale(${scale * cardBreathe * sweepScale})`,
        ),
        position: "relative",
        overflow: "hidden",
        // Active highlight: brighter border + subtle glow
        boxShadow: isSweepActive
          ? `0 0 20px rgba(6,182,212,${borderActiveOpacity * 0.3}), inset 0 0 15px rgba(6,182,212,${borderActiveOpacity * 0.05})`
          : "none",
      }}
    >
      {/* Active border overlay */}
      {isSweepActive && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            border: `2px solid rgba(6,182,212,${borderActiveOpacity})`,
            borderRadius: 14,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Shimmer sweep */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(105deg, transparent 40%, rgba(6,182,212,${(shimmerPos + sweepIntensity * 0.5) * 0.04}) 50%, transparent 60%)`,
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
          opacity: interpolate(sweepIntensity, [0, 1], [0.7, 1]),
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
        <div
          style={{
            transform: `scale(${iconPulse})`,
            filter: isSweepActive
              ? `drop-shadow(0 0 6px rgba(6,182,212,0.5))`
              : "none",
          }}
        >
          <Icon
            name={violation.icon}
            size={20}
            color={isSweepActive ? COLORS.primary : COLORS.primary}
          />
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
            color: fineColor,
            filter: `brightness(${fineBrightness})`,
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
