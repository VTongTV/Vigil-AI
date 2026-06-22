import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS, FPS, IMPACT_METRICS } from "../constants";
import {
  fadeIn,
  fadeInEased,
  stagger,
  floatY,
  shimmerPosition,
  borderGlow,
  pulse,
  glowOp,
  slowRotate,
  linearProgress,
  transforms,
  visibleFloat,
  visibleBreathe,
  countUpEased,
  highlightSweep,
  sceneExit,
  CONFIG_SNAPPY,
  CONFIG_SMOOTH,
  CONFIG_BOUNCY,
  CONFIG_GENTLE,
} from "../animations";
import { AnimatedBackground } from "../AnimatedBackground";
import { Icon } from "../Icon";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["300", "400", "600", "700", "800"],
  subsets: ["latin"],
});

/** 10 seconds at 60 fps = 600 frames. */
const TOTAL_FRAMES = 10 * FPS;

/**
 * Metric definitions with numeric count targets for countUpEased.
 * Each metric maps to an IMPACT_METRICS entry for labels and subtexts.
 */
const METRICS = [
  {
    label: "Cost per Junction",
    countTarget: 25,
    prefix: "₹",
    suffix: "K",
    sub: "vs ₹50K+ competitors",
    icon: "money" as const,
    countStart: 40,
    countDur: 100,
  },
  {
    label: "End-to-End Latency",
    countTarget: 1.2,
    prefix: "",
    suffix: "s",
    sub: "upload → evidence",
    icon: "cpu" as const,
    isDecimal: true,
    countStart: 55,
    countDur: 90,
  },
  {
    label: "VRAM Footprint",
    countTarget: 4,
    prefix: "",
    suffix: " GB",
    sub: "RTX 3050 consumer GPU",
    icon: "gpu" as const,
    countStart: 70,
    countDur: 70,
  },
  {
    label: "Annual ROI",
    countTarget: 87,
    prefix: "",
    suffix: "×",
    sub: "₹438 Cr potential",
    icon: "roi" as const,
    countStart: 85,
    countDur: 80,
  },
];

/**
 * Scene 10: Impact / Closing (10 seconds)
 *
 * Narrative progression:
 * - Numbers count up dramatically from 0 to target
 * - Metric cards highlight in sequence via highlightSweep
 * - CTA and branding entrance with spring bounce
 * - Continuous visible ambient motion on all elements
 */
export const Impact: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* ── Section label ── */
  const labelProgress = spring({ frame, fps, delay: 0, config: CONFIG_SMOOTH });
  const labelOp = interpolate(labelProgress, [0, 1], [0, 1]);

  /* ── Title ── */
  const titleProgress = spring({ frame, fps, delay: 10, config: CONFIG_BOUNCY });
  const titleOp = interpolate(titleProgress, [0, 1], [0, 1]);
  const titleY = interpolate(titleProgress, [0, 1], [20, 0]);

  /* ── CTA entrance ── */
  const ctaProgress = spring({ frame, fps, delay: Math.round(6 * fps), config: CONFIG_BOUNCY });
  const ctaOp = interpolate(ctaProgress, [0, 1], [0, 1]);
  const ctaScale = interpolate(ctaProgress, [0.3, 1], [0.9, 1]);

  /* ── CTA pulse ── */
  const ctaPulse = pulse(frame, 0.03, 0.02, 1);

  /* ── Brand entrance ── */
  const brandProgress = spring({ frame, fps, delay: Math.round(7 * fps), config: CONFIG_SMOOTH });
  const brandOp = interpolate(brandProgress, [0, 1], [0, 1]);

  /* ── Scene exit ── */
  const exit = sceneExit(frame, TOTAL_FRAMES, 18);

  /* ── Visible ambient motion (8-10px drift, ±2% breathe) ── */
  const labelIdle = visibleFloat(frame, 0.04, 10, 0);
  const titleIdle = visibleFloat(frame, 0.045, 12, 0.5);
  const ctaIdle = visibleFloat(frame, 0.04, 10, 2.0);
  const brandIdle = visibleFloat(frame, 0.035, 8, 3.0);
  const accentShimmer = visibleFloat(frame, 0.025, 0.15, 0);

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AnimatedBackground particleCount={35} seed={99} />

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
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 10,
            transform: `translateY(${labelIdle}px)`,
          }}
        >
          <div style={{ width: 20, height: 1, backgroundColor: COLORS.primary }} />
          Impact
          <div style={{ width: 20, height: 1, backgroundColor: COLORS.primary }} />
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily,
            fontSize: 50,
            fontWeight: 700,
            color: COLORS.text,
            textAlign: "center",
            opacity: titleOp,
            transform: `translateY(${titleY + titleIdle}px)`,
            marginBottom: 60,
          }}
        >
          Transforming Bengaluru's
          <br />
          <span
            style={{
              color: COLORS.primary,
              textShadow: `0 0 30px ${COLORS.primaryGlow}`,
            }}
          >
            Traffic Enforcement
          </span>
        </div>

        {/* Metrics grid — with highlightSweep and countUpEased */}
        <div
          style={{
            display: "flex",
            gap: 24,
            marginBottom: 60,
          }}
        >
          {METRICS.map((metric, i) => (
            <MetricCard key={i} metric={metric} index={i} frame={frame} fps={fps} />
          ))}
        </div>

        {/* CTA */}
        <div
          style={{
            opacity: ctaOp,
            transform: transforms(
              `translateY(${ctaIdle}px)`,
              `scale(${ctaScale * ctaPulse})`,
            ),
          }}
        >
          <div
            style={{
              fontFamily,
              fontSize: 24,
              fontWeight: 700,
              color: COLORS.bg,
              backgroundColor: COLORS.primary,
              padding: "16px 48px",
              borderRadius: 12,
              boxShadow: `0 0 30px ${COLORS.primaryGlow}, 0 4px 20px rgba(0,0,0,0.3)`,
              textAlign: "center",
            }}
          >
            Deploy VigilAI at Your Junction
          </div>
        </div>

        {/* Brand */}
        <div
          style={{
            marginTop: 30,
            display: "flex",
            alignItems: "center",
            gap: 10,
            opacity: brandOp,
            transform: `translateY(${brandIdle}px)`,
          }}
        >
          <Icon name="shield" size={20} color={COLORS.primary} />
          <span
            style={{
              fontFamily,
              fontSize: 20,
              fontWeight: 700,
              color: COLORS.textMuted,
              letterSpacing: "0.02em",
            }}
          >
            Vigil
            <span style={{ color: COLORS.primary }}>AI</span>
          </span>
          <span
            style={{
              fontFamily,
              fontSize: 16,
              color: COLORS.textMuted,
              marginLeft: 12,
            }}
          >
            Flipkart GridLock 2.0 · Track 3
          </span>
        </div>
      </div>

      {/* Bottom accent line */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
        }}
      >
        <div
          style={{
            height: "100%",
            background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.secondary}, ${COLORS.primary})`,
            opacity: 0.6 + accentShimmer,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

/* ──────────────────────── Metric Card ──────────────────────── */

const MetricCard: React.FC<{
  metric: typeof METRICS[number];
  index: number;
  frame: number;
  fps: number;
}> = ({ metric, index, frame, fps }) => {
  const delay = stagger(index, 10) + 30;

  const progress = spring({ frame, fps, delay, config: CONFIG_SNAPPY });
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const translateY = interpolate(progress, [0, 1], [30, 0]);

  /* ── Visible ambient motion ── */
  const cardFloat = visibleFloat(frame, 0.03 + index * 0.004, 10, index * 0.6);
  const shimmerPos = shimmerPosition(frame, 200, delay + 30);
  const glow = borderGlow(frame, 0.02 + index * 0.003);
  const iconPulse = pulse(frame, 0.03, 0.06, 1);
  const cardBreathe = visibleBreathe(frame, 0.03 + index * 0.003, 0.018);

  /* ── CountUpEased: numbers count from 0 → target ── */
  const counted = countUpEased(frame, metric.countStart, metric.countDur, 0, metric.countTarget);
  const countDone = frame >= metric.countStart + metric.countDur;
  const displayValue = metric.isDecimal
    ? counted.toFixed(1)
    : Math.round(counted).toLocaleString();

  /* ── Highlight sweep: cards light up in sequence ── */
  const sweepIntensity = highlightSweep(frame, 100, 60, index, 4);
  const isSweepActive = sweepIntensity > 0.5;
  const sweepScale = interpolate(sweepIntensity, [0, 1], [1, 1.05]);
  const sweepBorderOpacity = interpolate(sweepIntensity, [0, 1], [0.15, 0.8], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width: 220,
        backgroundColor: COLORS.bgCard,
        border: `1px solid rgba(6,182,212,${isSweepActive ? sweepBorderOpacity : glow * 0.3})`,
        borderRadius: 14,
        padding: "28px 22px",
        textAlign: "center",
        opacity,
        transform: transforms(
          `translateY(${translateY + cardFloat}px)`,
          `scale(${cardBreathe * sweepScale})`,
        ),
        position: "relative",
        overflow: "hidden",
        boxShadow: isSweepActive
          ? `0 0 24px rgba(6,182,212,${sweepIntensity * 0.2}), inset 0 0 30px rgba(6,182,212,${sweepIntensity * 0.05})`
          : "none",
      }}
    >
      {/* Shimmer */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(105deg, transparent 40%, rgba(6,182,212,${shimmerPos * 0.04}) 50%, transparent 60%)`,
          pointerEvents: "none",
        }}
      />

      {/* Icon with glow when sweep active */}
      <div
        style={{
          transform: `scale(${iconPulse * (1 + sweepIntensity * 0.1)})`,
          marginBottom: 14,
          filter: isSweepActive ? `drop-shadow(0 0 8px ${COLORS.primary})` : "none",
        }}
      >
        <Icon name={metric.icon} size={24} color={COLORS.primary} />
      </div>

      {/* Value — countUpEased display */}
      <div
        style={{
          fontFamily,
          fontSize: 36,
          fontWeight: 800,
          color: isSweepActive ? COLORS.primary : COLORS.text,
          letterSpacing: "-0.03em",
          marginBottom: 6,
          transition: "none",
        }}
      >
        {metric.prefix}{displayValue}
        <span
          style={{
            fontSize: 24,
            fontWeight: 600,
            color: COLORS.primary,
            opacity: countDone ? 1 : 0.5,
          }}
        >
          {metric.suffix}
        </span>
      </div>

      {/* Label */}
      <div
        style={{
          fontFamily,
          fontSize: 16,
          color: COLORS.textMuted,
          letterSpacing: "0.04em",
          marginBottom: 4,
        }}
      >
        {metric.label}
      </div>

      {/* Sub-text — fades in with sweep */}
      <div
        style={{
          fontFamily,
          fontSize: 13,
          color: COLORS.textSubtle,
          opacity: interpolate(sweepIntensity, [0, 0.5, 1], [0.3, 0.6, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {metric.sub}
      </div>
    </div>
  );
};
