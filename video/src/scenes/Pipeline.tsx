import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS, PIPELINE_STAGES, FPS } from "../constants";
import {
  fadeIn,
  fadeInEased,
  stagger,
  floatY,
  shimmerPosition,
  borderGlow,
  pulse,
  glowOp,
  linearProgress,
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

const TOTAL_FRAMES = 14 * FPS;
const STEP_COUNT = PIPELINE_STAGES.length;

/**
 * Scene 4: AI Pipeline
 * Animated flow diagram with connectors that draw in,
 * cards that shimmer and float, and SVG icons.
 */
export const Pipeline: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Section label
  const labelProgress = spring({ frame, fps, delay: 0, config: CONFIG_SMOOTH });
  const labelOp = interpolate(labelProgress, [0, 1], [0, 1]);
  const labelX = interpolate(labelProgress, [0, 1], [-20, 0]);

  // Title entrance
  const titleProgress = spring({ frame, fps, delay: 8, config: CONFIG_BOUNCY });
  const titleOp = interpolate(titleProgress, [0, 1], [0, 1]);
  const titleY = interpolate(titleProgress, [0, 1], [20, 0]);

  // Subtitle entrance
  const subProgress = spring({ frame, fps, delay: 20, config: CONFIG_SMOOTH });
  const subOp = interpolate(subProgress, [0, 1], [0, 1]);

  // Data flow line progress — draws across the full pipeline
  const flowProgress = linearProgress(frame, 30, 180);

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {/* Animated background */}
      <AnimatedBackground particleCount={20} seed={33} />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 80px",
        }}
      >
        {/* Section label */}
        <div
          style={{
            fontFamily,
            fontSize: 18,
            fontWeight: 600,
            color: COLORS.secondary,
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
          <div style={{ width: 20, height: 1, backgroundColor: COLORS.secondary }} />
          How It Works
          <div style={{ width: 20, height: 1, backgroundColor: COLORS.secondary }} />
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily,
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            textAlign: "center",
            opacity: titleOp,
            transform: `translateY(${titleY}px)`,
            marginBottom: 12,
          }}
        >
          Detection Pipeline
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily,
            fontSize: 24,
            fontWeight: 400,
            color: COLORS.textMuted,
            opacity: subOp,
            marginBottom: 60,
          }}
        >
          From camera frame to court-ready evidence in &lt;3 seconds
        </div>

        {/* Pipeline steps with connectors */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 0,
            position: "relative",
          }}
        >
          {PIPELINE_STAGES.map((step: typeof PIPELINE_STAGES[number], i: number) => {
            const delay = stagger(i, 12) + 30;

            return (
              <React.Fragment key={i}>
                <PipelineStep
                  step={step}
                  index={i}
                  frame={frame}
                  fps={fps}
                  delay={delay}
                />
                {/* Connector arrow between steps */}
                {i < STEP_COUNT - 1 && (
                  <ConnectorArrow
                    index={i}
                    frame={frame}
                    fps={fps}
                    flowProgress={flowProgress}
                    delay={delay + 10}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Data flow highlight line */}
        <div
          style={{
            marginTop: 40,
            width: "80%",
            height: 2,
            backgroundColor: COLORS.border,
            borderRadius: 1,
            overflow: "hidden",
            opacity: subOp,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${flowProgress * 100}%`,
              background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.secondary})`,
              borderRadius: 1,
              boxShadow: `0 0 10px ${COLORS.primaryGlow}`,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ──────────────────────── Pipeline Step Card ──────────────────────── */

const PipelineStep: React.FC<{
  step: typeof PIPELINE_STAGES[number];
  index: number;
  frame: number;
  fps: number;
  delay: number;
}> = ({ step, index, frame, fps, delay }) => {
  const progress = spring({ frame, fps, delay, config: CONFIG_SNAPPY });
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const translateY = interpolate(progress, [0, 1], [40, 0]);
  const scale = interpolate(progress, [0.3, 1], [0.9, 1]);

  const cardFloat = floatY(frame, 0.02 + index * 0.004, 2, index * 0.8);
  const shimmerPos = shimmerPosition(frame, 160, delay + 20);
  const glow = borderGlow(frame, 0.025 + index * 0.003);
  const iconPulse = pulse(frame, 0.035, 0.06, 1);

  return (
    <div
      style={{
        width: 140,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        opacity,
        transform: transforms(
          `translateY(${translateY + cardFloat}px)`,
          `scale(${scale})`,
        ),
      }}
    >
      {/* Card */}
      <div
        style={{
          width: 120,
          height: 120,
          backgroundColor: COLORS.bgCard,
          border: `1px solid rgba(6,182,212,${glow * 0.4})`,
          borderRadius: 16,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          position: "relative",
          overflow: "hidden",
          boxShadow: `0 4px 20px rgba(0,0,0,0.3)`,
        }}
      >
        {/* Shimmer sweep */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(105deg, transparent 40%, rgba(6,182,212,${shimmerPos * 0.05}) 50%, transparent 60%)`,
            pointerEvents: "none",
          }}
        />

        {/* Icon */}
        <div style={{ transform: `scale(${iconPulse})` }}>
          <Icon name={step.icon} size={28} color={COLORS.primary} />
        </div>

        {/* Step number */}
        <div
          style={{
            fontFamily,
            fontSize: 16,
            fontWeight: 600,
            color: COLORS.textMuted,
            opacity: 0.85,
            letterSpacing: "0.1em",
          }}
        >
          {String(index + 1).padStart(2, "0")}
        </div>
      </div>

      {/* Label */}
      <div
        style={{
          fontFamily,
          fontSize: 16,
          fontWeight: 500,
          color: COLORS.textMuted,
          marginTop: 12,
          textAlign: "center",
          lineHeight: 1.3,
        }}
      >
        {step.label}
      </div>
    </div>
  );
};

/* ──────────────────────── Connector Arrow ──────────────────────── */

const ConnectorArrow: React.FC<{
  index: number;
  frame: number;
  fps: number;
  flowProgress: number;
  delay: number;
}> = ({ index, frame, fps, flowProgress, delay }) => {
  const progress = spring({ frame, fps, delay, config: CONFIG_SMOOTH });
  const opacity = interpolate(progress, [0, 1], [0, 1]);

  // Determine if the flow has reached this connector
  const connectorStart = index / (STEP_COUNT - 1);
  const connectorEnd = (index + 1) / (STEP_COUNT - 1);
  const isActive = flowProgress >= connectorStart;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        opacity,
        margin: "0 4px",
      }}
    >
      <div
        style={{
          width: 32,
          height: 2,
          backgroundColor: isActive ? COLORS.primary : COLORS.border,
          borderRadius: 1,
          position: "relative",
          transition: "none",
          boxShadow: isActive ? `0 0 8px ${COLORS.primaryGlow}` : "none",
        }}
      >
        {/* Flow dot */}
        {isActive && (
          <div
            style={{
              position: "absolute",
              top: -2,
              left: `${Math.min(1, (flowProgress - connectorStart) / (connectorEnd - connectorStart)) * 100}%`,
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: COLORS.primary,
              boxShadow: `0 0 8px ${COLORS.primary}`,
            }}
          />
        )}
      </div>
      <svg width="8" height="12" viewBox="0 0 8 12" fill="none" style={{ marginLeft: -1 }}>
        <path d="M1 1L6 6L1 11" stroke={isActive ? COLORS.primary : COLORS.border} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
};
