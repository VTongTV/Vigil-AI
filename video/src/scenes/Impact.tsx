import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS, FPS } from "../constants";
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

const TOTAL_FRAMES = 10 * FPS;

// Impact metrics
const METRICS = [
  { label: "Violations Detected", value: 12847, suffix: "", icon: "alert" as const },
  { label: "Evidence Generated", value: 11203, suffix: "", icon: "shield" as const },
  { label: "Cameras Deployed", value: 142, suffix: "+", icon: "camera" as const },
  { label: "Avg Response Time", value: 2.4, suffix: "s", icon: "clock" as const, isDecimal: true },
];

/**
 * Scene 9: Impact / Closing
 * Animated counters, particle atmosphere,
 * CTA, and VigilAI branding.
 */
export const Impact: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Section label
  const labelProgress = spring({ frame, fps, delay: 0, config: CONFIG_SMOOTH });
  const labelOp = interpolate(labelProgress, [0, 1], [0, 1]);

  // Title
  const titleProgress = spring({ frame, fps, delay: 10, config: CONFIG_BOUNCY });
  const titleOp = interpolate(titleProgress, [0, 1], [0, 1]);
  const titleY = interpolate(titleProgress, [0, 1], [20, 0]);

  // CTA entrance
  const ctaProgress = spring({ frame, fps, delay: Math.round(6 * fps), config: CONFIG_BOUNCY });
  const ctaOp = interpolate(ctaProgress, [0, 1], [0, 1]);
  const ctaScale = interpolate(ctaProgress, [0.3, 1], [0.9, 1]);

  // CTA pulse
  const ctaPulse = pulse(frame, 0.03, 0.02, 1);

  // Brand entrance
  const brandProgress = spring({ frame, fps, delay: Math.round(7 * fps), config: CONFIG_SMOOTH });
  const brandOp = interpolate(brandProgress, [0, 1], [0, 1]);

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {/* Animated background — more particles for closing */}
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
        }}
      >
        {/* Section label */}
        <div
          style={{
            fontFamily,
            fontSize: 14,
            fontWeight: 600,
            color: COLORS.primary,
            letterSpacing: "0.25em",
            textTransform: "uppercase" as const,
            opacity: labelOp,
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 10,
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
            transform: `translateY(${titleY}px)`,
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

        {/* Metrics grid */}
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
              `scale(${ctaScale * ctaPulse})`,
            ),
          }}
        >
          <div
            style={{
              fontFamily,
              fontSize: 20,
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
          }}
        >
          <Icon name="shield" size={20} color={COLORS.primary} />
          <span
            style={{
              fontFamily,
              fontSize: 18,
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
              fontSize: 13,
              color: COLORS.textSubtle,
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
            opacity: 0.6,
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

  const cardFloat = floatY(frame, 0.015 + index * 0.003, 2, index * 0.6);
  const shimmerPos = shimmerPosition(frame, 200, delay + 30);
  const glow = borderGlow(frame, 0.02 + index * 0.003);
  const iconPulse = pulse(frame, 0.03, 0.05, 1);

  // Counter animation
  const counterProgress = linearProgress(frame, delay, delay + 80);
  const displayValue = metric.isDecimal
    ? (metric.value * counterProgress).toFixed(1)
    : Math.floor(metric.value * counterProgress).toLocaleString();

  return (
    <div
      style={{
        width: 220,
        backgroundColor: COLORS.bgCard,
        border: `1px solid rgba(6,182,212,${glow * 0.3})`,
        borderRadius: 14,
        padding: "28px 22px",
        textAlign: "center",
        opacity,
        transform: transforms(
          `translateY(${translateY + cardFloat}px)`,
        ),
        position: "relative",
        overflow: "hidden",
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

      {/* Icon */}
      <div style={{ transform: `scale(${iconPulse})`, marginBottom: 14 }}>
        <Icon name={metric.icon} size={24} color={COLORS.primary} />
      </div>

      {/* Value */}
      <div
        style={{
          fontFamily,
          fontSize: 36,
          fontWeight: 800,
          color: COLORS.text,
          letterSpacing: "-0.03em",
          marginBottom: 6,
        }}
      >
        {displayValue}
        <span
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: COLORS.primary,
          }}
        >
          {metric.suffix}
        </span>
      </div>

      {/* Label */}
      <div
        style={{
          fontFamily,
          fontSize: 12,
          color: COLORS.textSubtle,
          letterSpacing: "0.04em",
        }}
      >
        {metric.label}
      </div>
    </div>
  );
};
