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
  visibleFloat,
  visibleBreathe,
  travelingActivation,
  countUpEased,
  sceneExit,
} from "../animations";
import { AnimatedBackground } from "../AnimatedBackground";
import { Icon } from "../Icon";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["300", "400", "600", "700", "800"],
  subsets: ["latin"],
});

const TOTAL_FRAMES = 20 * FPS;
const STEP_COUNT = PIPELINE_STAGES.length;

/** Total processing time across all pipeline stages (ms). */
const TOTAL_PROCESSING_MS = 750;

/**
 * Scene 4: AI Pipeline
 * Animated flow diagram with traveling activation dot,
 * sequential timing reveals, and total time counter.
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

  // Visible idle motion (10-12px drift)
  const labelIdle = visibleFloat(frame, 0.035, 10, 0);
  const titleIdle = visibleFloat(frame, 0.04, 10, 0.5);
  const subIdle = visibleFloat(frame, 0.04, 10, 1.2);

  // Scene exit — triggers at frame 1182 (1200-18)
  const exit = sceneExit(frame, TOTAL_FRAMES, 18);

  // Data flow line progress — draws across the full pipeline
  const flowProgress = linearProgress(frame, 30, 180);

  // Traveling activation — "data packet" flows through pipeline
  // Starts at frame 60, takes 420 frames (7s) to traverse 9 cards
  const activations = Array.from({ length: STEP_COUNT }, (_, i) =>
    travelingActivation(frame, 60, 420, i, STEP_COUNT),
  );

  // Total processing time counter — appears after all cards activated (~frame 480)
  const totalTime = countUpEased(frame, 500, 120, 0, TOTAL_PROCESSING_MS);
  const totalTimeOp = interpolate(frame, [490, 510], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Flow progress bar pulse
  const barPulse = pulse(frame, 0.03, 0.05, 1);

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
            color: COLORS.secondary,
            letterSpacing: "0.25em",
            textTransform: "uppercase" as const,
            opacity: labelOp,
            transform: `translateX(${labelX}px) translateY(${labelIdle}px)`,
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
            transform: `translateY(${titleY + titleIdle}px)`,
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
            transform: `translateY(${subIdle}px)`,
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
            const delay = stagger(i, 10) + 30;

            return (
              <React.Fragment key={i}>
                <PipelineStep
                  step={step}
                  index={i}
                  frame={frame}
                  fps={fps}
                  delay={delay}
                  activation={activations[i]}
                />
                {/* Connector arrow between steps */}
                {i < STEP_COUNT - 1 && (
                  <ConnectorArrow
                    index={i}
                    frame={frame}
                    fps={fps}
                    flowProgress={flowProgress}
                    activation={activations[i]}
                    delay={delay + 8}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Processing time counter */}
        <div
          style={{
            fontFamily,
            fontSize: 28,
            fontWeight: 700,
            color: COLORS.primary,
            marginTop: 30,
            opacity: totalTimeOp,
            letterSpacing: "0.05em",
            textShadow: `0 0 20px ${COLORS.primaryGlow}`,
          }}
        >
          Total: {Math.round(totalTime)} ms
        </div>

        {/* Data flow highlight line with pulse */}
        <div
          style={{
            marginTop: 20,
            width: "80%",
            height: 2,
            backgroundColor: COLORS.border,
            borderRadius: 1,
            overflow: "hidden",
            opacity: subOp * barPulse,
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
  activation: number;
}> = ({ step, index, frame, fps, delay, activation }) => {
  const progress = spring({ frame, fps, delay, config: CONFIG_SNAPPY });
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const translateY = interpolate(progress, [0, 1], [40, 0]);
  const scale = interpolate(progress, [0.3, 1], [0.9, 1]);

  const cardFloat = floatY(frame, 0.02 + index * 0.004, 2, index * 0.8);
  const shimmerPos = shimmerPosition(frame, 160, delay + 20);
  const glow = borderGlow(frame, 0.025 + index * 0.003);
  const iconPulse = pulse(frame, 0.035, 0.06, 1);
  const cardBreathe = visibleBreathe(frame, 0.035, 0.02);

  // Activation-driven styles — card brightens when traveling dot reaches it
  const isActive = activation > 0;
  const activationIntensity = activation;

  // Border color shifts from default to card's accent color when activated
  const borderOpacity = interpolate(activationIntensity, [0, 1], [glow * 0.4, 0.8], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Icon glow intensity increases with activation
  const iconGlow = interpolate(activationIntensity, [0, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Timing text spring reveal — hidden until activated
  const timingOpacity = interpolate(activationIntensity, [0.6, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const timingY = interpolate(activationIntensity, [0.6, 1], [6, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width: 120,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        opacity,
        transform: transforms(
          `translateY(${translateY + cardFloat}px)`,
          `scale(${scale * cardBreathe})`,
        ),
      }}
    >
      {/* Card */}
      <div
        style={{
          width: 105,
          height: 105,
          backgroundColor: COLORS.bgCard,
          border: `1px solid ${step.color}${Math.round(borderOpacity * 255).toString(16).padStart(2, "0")}`,
          borderRadius: 16,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          position: "relative",
          overflow: "hidden",
          boxShadow: isActive
            ? `0 4px 20px rgba(0,0,0,0.3), 0 0 20px ${step.color}40`
            : `0 4px 20px rgba(0,0,0,0.3)`,
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

        {/* Activation glow overlay */}
        {isActive && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `radial-gradient(circle at center, ${step.color}${Math.round(iconGlow * 30).toString(16).padStart(2, "0")}, transparent 70%)`,
              pointerEvents: "none",
            }}
          />
        )}

        {/* Icon */}
        <div
          style={{
            transform: `scale(${iconPulse + iconGlow * 0.1})`,
            filter: isActive ? `drop-shadow(0 0 6px ${step.color})` : "none",
          }}
        >
          <Icon name={step.icon} size={24} color={isActive ? step.color : COLORS.primary} />
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
          fontSize: 14,
          fontWeight: 500,
          color: COLORS.textMuted,
          marginTop: 10,
          textAlign: "center",
          lineHeight: 1.3,
        }}
      >
        {step.label}
      </div>

      {/* Timing — revealed when traveling dot reaches this card */}
      <div
        style={{
          fontFamily,
          fontSize: 12,
          fontWeight: 600,
          color: step.color,
          marginTop: 4,
          opacity: timingOpacity,
          transform: `translateY(${timingY}px)`,
          letterSpacing: "0.05em",
        }}
      >
        {step.timing}
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
  activation: number;
  delay: number;
}> = ({ index, frame, fps, flowProgress, activation, delay }) => {
  const progress = spring({ frame, fps, delay, config: CONFIG_SMOOTH });
  const opacity = interpolate(progress, [0, 1], [0, 1]);

  // Determine if the flow has reached this connector
  const connectorStart = index / (STEP_COUNT - 1);
  const isActive = flowProgress >= connectorStart || activation > 0;

  // Glowing dot on connector when the preceding card is activated
  const dotOp = interpolate(activation, [0.8, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        opacity,
        margin: "0 2px",
      }}
    >
      <div
        style={{
          width: 24,
          height: 2,
          backgroundColor: isActive ? COLORS.primary : COLORS.border,
          borderRadius: 1,
          position: "relative",
          boxShadow: isActive ? `0 0 8px ${COLORS.primaryGlow}` : "none",
        }}
      >
        {/* Flow dot from linear progress */}
        {isActive && (
          <div
            style={{
              position: "absolute",
              top: -2,
              left: `${Math.min(1, (flowProgress - connectorStart) / (1 / (STEP_COUNT - 1))) * 100}%`,
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: COLORS.primary,
              boxShadow: `0 0 8px ${COLORS.primary}`,
            }}
          />
        )}

        {/* Activation dot — glowing dot on connector when card activates */}
        {dotOp > 0 && (
          <div
            style={{
              position: "absolute",
              top: -3,
              right: -2,
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: COLORS.primary,
              opacity: dotOp,
              boxShadow: `0 0 12px ${COLORS.primary}, 0 0 24px ${COLORS.primaryGlow}`,
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
