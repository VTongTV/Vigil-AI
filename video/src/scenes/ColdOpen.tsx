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
  typewriter,
  fadeIn,
  fadeInEased,
  floatY,
  glowOp,
  slowRotate,
  cameraZoom,
  pulse,
  transforms,
  CONFIG_SMOOTH,
  CONFIG_BOUNCY,
  visibleFloat,
  visibleBreathe,
  sceneExit,
} from "../animations";
import { AnimatedBackground } from "../AnimatedBackground";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["300", "400", "600", "700", "800"],
  subsets: ["latin"],
});

const TOTAL_FRAMES = 5 * FPS;

/**
 * Scene 1: Cold Open
 * Cinematic typewriter reveal with floating particles,
 * grid background, and continuous ambient motion.
 */
export const ColdOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Camera slow zoom
  const zoom = cameraZoom(frame, TOTAL_FRAMES, 1.06);

  // Scene exit
  const exit = sceneExit(frame, TOTAL_FRAMES, 18);

  // Line 1 typewriter — fast punchy reveal
  const line1Full = "Every 4 minutes,";
  const line1CharsPerSec = 24;
  const line1Visible = Math.min(
    line1Full.length,
    Math.floor(typewriter(frame, fps, 0, line1CharsPerSec)),
  );
  const line1 = line1Full.slice(0, line1Visible);

  // Line 2 typewriter (starts after line 1 finishes)
  const line2Full = "a traffic violation goes undetected";
  const line2CharsPerSec = 26;
  const line2StartSec = line1Full.length / line1CharsPerSec + 0.3;
  const line2Visible = Math.min(
    line2Full.length,
    Math.floor(typewriter(frame, fps, Math.round(line2StartSec * fps), line2CharsPerSec)),
  );
  const line2 = line2Full.slice(0, line2Visible);

  // Line 3 typewriter (emphasized)
  const line3Full = "in Bengaluru.";
  const line3CharsPerSec = 20;
  const line3StartSec = line2StartSec + line2Full.length / line2CharsPerSec + 0.2;
  const line3StartFrame = Math.round(line3StartSec * fps);
  const line3Visible = Math.min(
    line3Full.length,
    Math.floor(typewriter(frame, fps, line3StartFrame, line3CharsPerSec)),
  );
  const line3 = line3Full.slice(0, line3Visible);
  const line3Done = line3Visible >= line3Full.length;
  const line3DoneFrame = line3StartFrame + Math.ceil((line3Full.length / line3CharsPerSec) * fps);

  // Cursor blink — faster for urgency
  const cursorOn = frame % 30 < 15;

  // Subtitle with spring entrance
  const subtitleProgress = spring({ frame, fps, delay: Math.round(3.2 * fps), config: CONFIG_SMOOTH });
  const subtitleOp = interpolate(subtitleProgress, [0, 1], [0, 1]);
  const subtitleY = interpolate(subtitleProgress, [0, 1], [12, 0]);

  // Subtitle idle float — visible amplitude
  const subtitleIdle = visibleFloat(frame, 0.04, 12, 1.5);

  // Counter highlight line — draws across bottom
  const accentProgress = interpolate(frame, [Math.round(0.5 * fps), Math.round(2.5 * fps)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Floating "4" stat — breathes and drifts
  const statFloat = floatY(frame, 0.02, 4);
  const statPulse = pulse(frame, 0.04, 0.04, 1);
  const statProgress = spring({ frame, fps, delay: Math.round(0.8 * fps), config: CONFIG_BOUNCY });
  const statBaseOp = interpolate(statProgress, [0, 1], [0, 0.15]);

  // Post-typewriter: "4" opacity pulsates more visibly
  const statPostTypewriterOp = line3Done
    ? glowOp(frame, 0.05, 0.10, 0.28)
    : statBaseOp;
  const statOp = line3Done ? statPostTypewriterOp : statBaseOp;

  // Post-typewriter: glow intensification on "in Bengaluru."
  const glowIntensity = line3Done
    ? interpolate(frame, [line3DoneFrame, line3DoneFrame + 25], [1, 2.8], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;
  const line3GlowPulse = line3Done ? glowOp(frame, 0.06, 0.7, 1.0) : 1;
  const line3ShadowBlur = 30 * glowIntensity * line3GlowPulse;
  const line3ShadowOpacity = 0.4 * glowIntensity * line3GlowPulse;

  // Decorative corner brackets
  const bracketProgress = spring({ frame, fps, delay: Math.round(0.3 * fps), config: CONFIG_SMOOTH });
  const bracketOp = interpolate(bracketProgress, [0, 1], [0, 0.25]);

  // Idle motion for brackets — visible amplitude
  const bracketIdle = visibleFloat(frame, 0.03, 12, 0.5);

  // Idle breathe for text content — visible amplitude
  const textBreathe = visibleBreathe(frame, 0.03, 0.02);

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {/* Animated background */}
      <AnimatedBackground particleCount={20} glowCount={2} seed={7} />

      {/* Camera zoom container */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          opacity: exit.opacity,
          transform: `scale(${zoom}) translateY(${exit.translateY}px)`,
        }}
      >
        {/* Large floating "4" in background */}
        <div
          style={{
            position: "absolute",
            fontFamily,
            fontSize: 600,
            fontWeight: 800,
            color: COLORS.primary,
            opacity: statOp,
            transform: transforms(
              `translateY(${statFloat}px)`,
              `scale(${statPulse})`,
            ),
            letterSpacing: "-0.06em",
            lineHeight: 1,
            userSelect: "none",
          }}
        >
          4
        </div>

        {/* Text content */}
        <div style={{ position: "relative", zIndex: 2, textAlign: "center", transform: `scale(${textBreathe})` }}>
          {/* Line 1 */}
          <div
            style={{
              fontFamily,
              fontSize: 68,
              fontWeight: 300,
              color: COLORS.textMuted,
              letterSpacing: "-0.02em",
              lineHeight: 1.35,
            }}
          >
            {line1}
            {line1Visible < line1Full.length && cursorOn && (
              <span style={{ color: COLORS.primary, fontWeight: 200 }}>|</span>
            )}
          </div>

          {/* Line 2 */}
          <div
            style={{
              fontFamily,
              fontSize: 68,
              fontWeight: 300,
              color: COLORS.textMuted,
              letterSpacing: "-0.02em",
              lineHeight: 1.35,
            }}
          >
            {line2}
            {line2Visible > 0 && line2Visible < line2Full.length && cursorOn && (
              <span style={{ color: COLORS.primary, fontWeight: 200 }}>|</span>
            )}
          </div>

          {/* Line 3 — emphasized with dynamic glow */}
          <div
            style={{
              fontFamily,
              fontSize: 68,
              fontWeight: 700,
              color: COLORS.primary,
              letterSpacing: "-0.02em",
              lineHeight: 1.35,
              textShadow: `0 0 ${line3ShadowBlur}px rgba(239,68,68,${line3ShadowOpacity})`,
            }}
          >
            {line3}
            {line3Visible > 0 && line3Visible < line3Full.length && cursorOn && (
              <span style={{ color: COLORS.primary, fontWeight: 200 }}>|</span>
            )}
            {line3Done && cursorOn && (
              <span style={{ color: COLORS.primary, opacity: 0.5, fontWeight: 200 }}>▎</span>
            )}
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontFamily,
              fontSize: 24,
              fontWeight: 400,
              color: COLORS.textSubtle,
              opacity: subtitleOp,
              transform: `translateY(${subtitleY + subtitleIdle}px)`,
              marginTop: 36,
              letterSpacing: "0.14em",
              textTransform: "uppercase" as const,
            }}
          >
            500+ junctions · Zero AI coverage
          </div>
        </div>
      </div>

      {/* Decorative corner brackets */}
      {/* Top-left */}
      <div style={{ position: "absolute", top: 40, left: 40, opacity: bracketOp, transform: `translateY(${bracketIdle}px)` }}>
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none" stroke={COLORS.primary} strokeWidth="1.5">
          <line x1="0" y1="30" x2="0" y2="0" />
          <line x1="0" y1="0" x2="30" y2="0" />
        </svg>
      </div>
      {/* Bottom-right */}
      <div style={{ position: "absolute", bottom: 40, right: 40, opacity: bracketOp, transform: `translateY(${bracketIdle}px)` }}>
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none" stroke={COLORS.primary} strokeWidth="1.5">
          <line x1="30" y1="0" x2="30" y2="30" />
          <line x1="30" y1="30" x2="0" y2="30" />
        </svg>
      </div>

      {/* Bottom accent line — draws in */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 2,
        }}
      >
        <div
          style={{
            height: "100%",
            background: `linear-gradient(90deg, transparent, ${COLORS.primary}, transparent)`,
            transform: `scaleX(${accentProgress})`,
            transformOrigin: "center",
            opacity: 0.4,
          }}
        />
      </div>

      {/* Top accent line — mirrors bottom */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
        }}
      >
        <div
          style={{
            height: "100%",
            background: `linear-gradient(90deg, transparent, ${COLORS.secondary}, transparent)`,
            transform: `scaleX(${accentProgress * 0.6})`,
            transformOrigin: "center",
            opacity: 0.2,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
