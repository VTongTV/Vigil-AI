import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
  staticFile,
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
  linearProgress,
  glowOp,
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

// Chain of custody steps
const CHAIN_STEPS = [
  { label: "Image Capture", icon: "camera" as const },
  { label: "AI Detection", icon: "scan" as const },
  { label: "Violation Log", icon: "alert" as const },
  { label: "OCR + Hash", icon: "hash" as const },
  { label: "Evidence Pack", icon: "shield" as const },
];

/**
 * Scene 8: Evidence Generation
 * Chain of custody visualization with animated nodes,
 * drawing connector lines, SHA-256 hash reveal,
 * and simulated evidence image.
 */
export const Evidence: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Section label
  const labelProgress = spring({ frame, fps, delay: 0, config: CONFIG_SMOOTH });
  const labelOp = interpolate(labelProgress, [0, 1], [0, 1]);

  // Title
  const titleProgress = spring({ frame, fps, delay: 8, config: CONFIG_BOUNCY });
  const titleOp = interpolate(titleProgress, [0, 1], [0, 1]);
  const titleY = interpolate(titleProgress, [0, 1], [20, 0]);

  // Chain line draw progress
  const lineProgress = linearProgress(frame, 30, 160);

  // SHA-256 reveal
  const hashProgress = spring({ frame, fps, delay: 120, config: CONFIG_SMOOTH });
  const hashOp = interpolate(hashProgress, [0, 1], [0, 1]);

  // Evidence image entrance
  const imgProgress = spring({ frame, fps, delay: 50, config: CONFIG_BOUNCY });
  const imgOp = interpolate(imgProgress, [0, 1], [0, 1]);
  const imgScale = interpolate(imgProgress, [0.3, 1], [0.9, 1]);

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {/* Animated background */}
      <AnimatedBackground particleCount={15} seed={77} />

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
            color: COLORS.warning,
            letterSpacing: "0.25em",
            textTransform: "uppercase" as const,
            opacity: labelOp,
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ width: 20, height: 1, backgroundColor: COLORS.warning }} />
          Court-Admissible
          <div style={{ width: 20, height: 1, backgroundColor: COLORS.warning }} />
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily,
            fontSize: 44,
            fontWeight: 700,
            color: COLORS.text,
            textAlign: "center",
            opacity: titleOp,
            transform: `translateY(${titleY}px)`,
            marginBottom: 40,
          }}
        >
          Evidence Generation
        </div>

        {/* Main content: Chain + Evidence image */}
        <div style={{ display: "flex", gap: 50, alignItems: "center" }}>
          {/* Chain of custody */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {CHAIN_STEPS.map((step, i) => (
              <React.Fragment key={i}>
                <ChainNode
                  step={step}
                  index={i}
                  frame={frame}
                  fps={fps}
                  isActive={lineProgress >= i / (CHAIN_STEPS.length - 0.5)}
                />
                {i < CHAIN_STEPS.length - 1 && (
                  <ChainConnector
                    index={i}
                    frame={frame}
                    fps={fps}
                    progress={lineProgress}
                    totalSteps={CHAIN_STEPS.length}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Evidence image with annotations */}
          <div
            style={{
              width: 500,
              height: 320,
              position: "relative",
              borderRadius: 12,
              overflow: "hidden",
              border: `1px solid ${COLORS.border}`,
              opacity: imgOp,
              transform: `scale(${imgScale})`,
              boxShadow: `0 8px 40px rgba(0,0,0,0.4), 0 0 60px rgba(6,182,212,0.05)`,
            }}
          >
            {/* Demo image */}
            <Img
              src={staticFile("demo/demo_triple_riding_whitefield-01.jpg")}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: "brightness(0.8) contrast(1.05)",
              }}
            />

            {/* Overlay with violation annotations */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: "rgba(6,182,212,0.03)",
              }}
            />

            {/* Violation bounding box */}
            <div
              style={{
                position: "absolute",
                left: 120,
                top: 60,
                width: 140,
                height: 180,
                border: `2px solid ${COLORS.danger}`,
                borderRadius: 4,
                boxShadow: `0 0 20px rgba(239,68,68,0.2)`,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -22,
                  left: 0,
                  fontFamily,
                  fontSize: 13,
                  fontWeight: 600,
                  color: COLORS.danger,
                  backgroundColor: `${COLORS.bg}dd`,
                  padding: "2px 8px",
                  borderRadius: 3,
                  whiteSpace: "nowrap" as const,
                }}
              >
                NO HELMET · 87%
              </div>
            </div>

            {/* License plate crop */}
            <div
              style={{
                position: "absolute",
                bottom: 40,
                right: 40,
                backgroundColor: COLORS.bgCard,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 6,
                padding: "6px 12px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Icon name="hash" size={14} color={COLORS.warning} />
              <span
                style={{
                  fontFamily,
                  fontSize: 17,
                  fontWeight: 700,
                  color: COLORS.warning,
                  letterSpacing: "0.12em",
                }}
              >
                KA 01 AB 1234
              </span>
            </div>

            {/* Timestamp */}
            <div
              style={{
                position: "absolute",
                top: 10,
                right: 12,
                fontFamily,
                fontSize: 13,
                color: COLORS.textMuted,
                opacity: 0.85,
              }}
            >
              2026-06-21 14:32:07 IST
            </div>
          </div>
        </div>

        {/* SHA-256 Hash */}
        <div
          style={{
            marginTop: 36,
            display: "flex",
            alignItems: "center",
            gap: 12,
            opacity: hashOp,
          }}
        >
          <Icon name="hash" size={16} color={COLORS.textSubtle} />
          <div
            style={{
              fontFamily,
              fontSize: 14,
              fontWeight: 400,
              color: COLORS.textMuted,
              backgroundColor: COLORS.bgElevated,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 6,
              padding: "8px 16px",
              letterSpacing: "0.05em",
            }}
          >
            SHA-256: a3f7c9e2b1d4...8f6e2a9c1b5d
          </div>
          <div
            style={{
              fontFamily,
              fontSize: 13,
              fontWeight: 600,
              color: COLORS.success,
              backgroundColor: `${COLORS.success}15`,
              padding: "4px 10px",
              borderRadius: 4,
              letterSpacing: "0.06em",
            }}
          >
            VERIFIED
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ──────────────────────── Chain Node ──────────────────────── */

const ChainNode: React.FC<{
  step: typeof CHAIN_STEPS[number];
  index: number;
  frame: number;
  fps: number;
  isActive: boolean;
}> = ({ step, index, frame, fps, isActive }) => {
  const delay = stagger(index, 10) + 25;

  const progress = spring({ frame, fps, delay, config: CONFIG_SNAPPY });
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const translateX = interpolate(progress, [0, 1], [-20, 0]);

  const nodePulse = isActive ? pulse(frame, 0.04, 0.06, 1) : 1;
  const nodeFloat = floatY(frame, 0.012 + index * 0.002, 1.5, index * 0.5);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        opacity,
        transform: transforms(
          `translateX(${translateX}px)`,
          `translateY(${nodeFloat}px)`,
        ),
      }}
    >
      {/* Node circle */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          backgroundColor: isActive ? `${COLORS.primary}20` : COLORS.bgElevated,
          border: `2px solid ${isActive ? COLORS.primary : COLORS.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${nodePulse})`,
          boxShadow: isActive ? `0 0 12px ${COLORS.primaryGlow}` : "none",
          transition: "none",
        }}
      >
        <Icon name={step.icon} size={16} color={isActive ? COLORS.primary : COLORS.textSubtle} />
      </div>

      {/* Label */}
      <span
        style={{
          fontFamily,
          fontSize: 18,
          fontWeight: isActive ? 600 : 400,
          color: isActive ? COLORS.text : COLORS.textMuted,
        }}
      >
        {step.label}
      </span>

      {/* Active indicator */}
      {isActive && (
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: COLORS.primary,
            boxShadow: `0 0 8px ${COLORS.primary}`,
          }}
        />
      )}
    </div>
  );
};

/* ──────────────────────── Chain Connector ──────────────────────── */

const ChainConnector: React.FC<{
  index: number;
  frame: number;
  fps: number;
  progress: number;
  totalSteps: number;
}> = ({ index, frame, fps, progress, totalSteps }) => {
  const startThreshold = index / (totalSteps - 0.5);
  const endThreshold = (index + 0.5) / (totalSteps - 0.5);
  const fillAmount = interpolate(
    progress,
    [startThreshold, endThreshold],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <div
      style={{
        marginLeft: 17,
        width: 2,
        height: 24,
        backgroundColor: COLORS.border,
        borderRadius: 1,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: `${fillAmount * 100}%`,
          backgroundColor: COLORS.primary,
          borderRadius: 1,
          boxShadow: fillAmount > 0 ? `0 0 6px ${COLORS.primaryGlow}` : "none",
        }}
      />
    </div>
  );
};
