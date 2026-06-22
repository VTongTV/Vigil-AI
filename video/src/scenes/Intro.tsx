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
  floatY,
  glowOp,
  slowRotate,
  pulse,
  cameraZoom,
  transforms,
  CONFIG_BOUNCY,
  CONFIG_SMOOTH,
  CONFIG_GENTLE,
  visibleFloat,
  visibleBreathe,
  highlightSweep,
  pulseRing,
  sceneExit,
} from "../animations";
import { AnimatedBackground } from "../AnimatedBackground";
import { Icon } from "../Icon";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["300", "400", "600", "700", "800"],
  subsets: ["latin"],
});

const TOTAL_FRAMES = 5 * FPS;
const RING_PARTICLES = 24;
const FEATURE_COUNT = 3;

/**
 * Scene 3: VigilAI Introduction
 * Logo reveal with rotating particle ring, expanding pulse rings,
 * sequential feature highlights, and continuous visible animations.
 */
export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Camera slow drift
  const zoom = cameraZoom(frame, TOTAL_FRAMES, 1.03);

  // Scene exit — triggers at frame 282 (300-18)
  const exit = sceneExit(frame, TOTAL_FRAMES, 18);

  // Logo spring entrance
  const logoProgress = spring({ frame, fps, delay: 10, config: CONFIG_BOUNCY });
  const logoScale = interpolate(logoProgress, [0, 1], [0.3, 1]);
  const logoOp = interpolate(logoProgress, [0, 1], [0, 1]);

  // Ring rotation (continuous)
  const ringRotation = slowRotate(frame, 0.08);

  // Ring particles scale in
  const ringScale = spring({ frame, fps, delay: 20, config: CONFIG_GENTLE });
  const ringOp = interpolate(ringScale, [0, 1], [0, 1]);

  // Pulse rings radiating from logo (staggered after logo appears)
  const ring1 = pulseRing(frame, 40, 50, 3);
  const ring2 = pulseRing(frame, 100, 50, 3);
  const ring3 = pulseRing(frame, 160, 50, 3);

  // Title entrance
  const titleProgress = spring({ frame, fps, delay: 35, config: CONFIG_SMOOTH });
  const titleOp = interpolate(titleProgress, [0, 1], [0, 1]);
  const titleY = interpolate(titleProgress, [0, 1], [20, 0]);

  // Tagline entrance
  const tagProgress = spring({ frame, fps, delay: 55, config: CONFIG_SMOOTH });
  const tagOp = interpolate(tagProgress, [0, 1], [0, 1]);
  const tagY = interpolate(tagProgress, [0, 1], [12, 0]);

  // Visible idle motions (10-12px drift instead of 2-3px)
  const titleIdle = visibleFloat(frame, 0.045, 10, 0);
  const tagIdle = visibleFloat(frame, 0.04, 10, 1.0);
  const logoBreathe = visibleBreathe(frame, 0.035, 0.02);

  // Feature entrance + highlight sweep
  const featureLabels = ["AI-Powered Detection", "Real-Time Evidence", "Court-Admissible"];

  // Icon pulse
  const iconPulse = pulse(frame, 0.03, 0.08, 1);

  // Center of composition
  const cx = width / 2;
  const cy = height / 2 - 30;

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {/* Animated background */}
      <AnimatedBackground particleCount={15} glowCount={2} seed={14} />

      {/* Camera zoom container */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: exit.opacity,
          transform: `scale(${zoom}) translateY(${exit.translateY}px)`,
        }}
      >
        {/* Rotating particle ring */}
        <div
          style={{
            position: "absolute",
            left: cx - 120,
            top: cy - 120,
            width: 240,
            height: 240,
            opacity: ringOp,
            transform: `rotate(${ringRotation}deg)`,
          }}
        >
          {Array.from({ length: RING_PARTICLES }).map((_, i) => {
            const angle = (i / RING_PARTICLES) * Math.PI * 2;
            const radius = 115 + floatY(frame, 0.015 + i * 0.001, 3, i);
            const px = 120 + Math.cos(angle) * radius;
            const py = 120 + Math.sin(angle) * radius;
            const particleOp = glowOp(frame, 0.025 + i * 0.002, 0.2, 0.8);

            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: px - 2,
                  top: py - 2,
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  backgroundColor: COLORS.primary,
                  opacity: particleOp,
                  boxShadow: `0 0 6px ${COLORS.primaryGlow}`,
                }}
              />
            );
          })}
        </div>

        {/* Pulse rings — expanding circles radiating from logo */}
        {[ring1, ring2, ring3].map((ring, i) => (
          <div
            key={`pulse-ring-${i}`}
            style={{
              position: "absolute",
              left: cx - 40,
              top: cy - 40,
              width: 80,
              height: 80,
              borderRadius: "50%",
              border: `2px solid ${COLORS.primary}`,
              opacity: ring.opacity,
              transform: `scale(${ring.scale})`,
              pointerEvents: "none",
            }}
          />
        ))}

        {/* Central logo */}
        <div
          style={{
            opacity: logoOp,
            transform: `scale(${logoScale * logoBreathe})`,
            position: "relative",
            zIndex: 2,
          }}
        >
          {/* Glow ring behind icon */}
          <div
            style={{
              position: "absolute",
              inset: -20,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${COLORS.primaryGlow}, transparent 70%)`,
              opacity: glowOp(frame, 0.025, 0.15, 0.4),
              filter: "blur(15px)",
            }}
          />

          {/* Icon container */}
          <div
            style={{
              width: 80,
              height: 80,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 20,
              backgroundColor: COLORS.bgCard,
              border: `1px solid ${COLORS.border}`,
              transform: `scale(${iconPulse})`,
              boxShadow: `0 0 40px ${COLORS.primaryGlow}, 0 4px 20px rgba(0,0,0,0.3)`,
            }}
          >
            <Icon name="shield" size={40} color={COLORS.primary} />
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily,
            fontSize: 72,
            fontWeight: 800,
            color: COLORS.text,
            letterSpacing: "-0.03em",
            opacity: titleOp,
            transform: `translateY(${titleY + titleIdle}px)`,
            marginTop: 28,
          }}
        >
          Vigil
          <span style={{ color: COLORS.primary }}>AI</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontFamily,
            fontSize: 26,
            fontWeight: 400,
            color: COLORS.textMuted,
            letterSpacing: "0.12em",
            opacity: tagOp,
            transform: `translateY(${tagY + tagIdle}px)`,
            marginTop: 12,
            textTransform: "uppercase" as const,
          }}
        >
          Intelligent Traffic Enforcement
        </div>

        {/* Feature pills with sequential highlight sweep */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 40,
          }}
        >
          {featureLabels.map((label, i) => {
            const fp = spring({
              frame,
              fps,
              delay: 70 + i * 8,
              config: CONFIG_SMOOTH,
            });
            const fop = interpolate(fp, [0, 1], [0, 1]);
            const fy = interpolate(fp, [0, 1], [15, 0]);
            const pillIdle = visibleFloat(frame, 0.04, 8, i * 0.7);

            // Sequential highlight: active pill gets brighter border + text
            const highlight = highlightSweep(frame, 80, 40, i, FEATURE_COUNT);
            const pillBorderColor = interpolate(
              highlight,
              [0, 0.3, 1],
              [0, 0.2, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            );
            const pillTextColor = interpolate(
              highlight,
              [0, 0.3, 1],
              [0, 0.3, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            );

            return (
              <div
                key={i}
                style={{
                  fontFamily,
                  fontSize: 16,
                  fontWeight: 500,
                  color: interpolate(pillTextColor, [0, 1], [0, 1]) > 0.5
                    ? COLORS.primary
                    : COLORS.textMuted,
                  backgroundColor: COLORS.bgElevated,
                  border: `1px solid ${interpolate(
                    pillBorderColor,
                    [0, 1],
                    [0.3, 1],
                    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
                  ) > 0.5 ? COLORS.primary : COLORS.border}`,
                  borderRadius: 20,
                  padding: "8px 20px",
                  opacity: fop,
                  transform: `translateY(${fy + pillIdle}px)`,
                  letterSpacing: "0.04em",
                  boxShadow: highlight > 0.5
                    ? `0 0 12px ${COLORS.primaryGlow}`
                    : "none",
                }}
              >
                {label}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
