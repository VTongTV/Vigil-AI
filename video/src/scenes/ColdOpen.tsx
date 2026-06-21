import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS } from "../constants";
import { typewriter, fadeIn } from "../animations";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["300", "400", "600", "700", "800"],
  subsets: ["latin"],
});

/**
 * Scene 1: Cold Open
 * Typewriter text: "Every 4 minutes, a traffic violation goes undetected in Bengaluru."
 */
export const ColdOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Line 1 typewriter
  const line1Full = "Every 4 minutes,";
  const line1Visible = Math.min(
    line1Full.length,
    Math.floor(typewriter(frame, fps, 0, 14)),
  );
  const line1 = line1Full.slice(0, line1Visible);

  // Line 2 typewriter (starts after line 1 finishes)
  const line2Full = "a traffic violation goes undetected";
  const line2StartSec = line1Full.length / 14 + 0.3;
  const line2Visible = Math.min(
    line2Full.length,
    Math.floor(typewriter(frame, fps, Math.round(line2StartSec * fps), 16)),
  );
  const line2 = line2Full.slice(0, line2Visible);

  // Line 3 typewriter (emphasized)
  const line3Full = "in Bengaluru.";
  const line3StartSec = line2StartSec + line2Full.length / 16 + 0.2;
  const line3Visible = Math.min(
    line3Full.length,
    Math.floor(typewriter(frame, fps, Math.round(line3StartSec * fps), 10)),
  );
  const line3 = line3Full.slice(0, line3Visible);

  // Cursor blink
  const cursorOn = frame % 40 < 20;

  // Subtitle
  const subtitleOp = fadeIn(frame, Math.round(3.5 * fps), 25);

  // Ambient glow
  const glowAlpha = interpolate(
    Math.sin(frame * 0.03),
    [-1, 1],
    [0.06, 0.16],
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: "absolute",
          width: 800,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, rgba(6,182,212,${glowAlpha}), transparent 70%)`,
          filter: "blur(80px)",
        }}
      />

      <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
        {/* Line 1 */}
        <div
          style={{
            fontFamily,
            fontSize: 72,
            fontWeight: 300,
            color: COLORS.textMuted,
            letterSpacing: "-0.02em",
            lineHeight: 1.35,
          }}
        >
          {line1}
          {line1Visible < line1Full.length && cursorOn && (
            <span style={{ color: COLORS.primary }}>|</span>
          )}
        </div>

        {/* Line 2 */}
        <div
          style={{
            fontFamily,
            fontSize: 72,
            fontWeight: 300,
            color: COLORS.textMuted,
            letterSpacing: "-0.02em",
            lineHeight: 1.35,
          }}
        >
          {line2}
          {line2Visible > 0 && line2Visible < line2Full.length && cursorOn && (
            <span style={{ color: COLORS.primary }}>|</span>
          )}
        </div>

        {/* Line 3 — emphasized */}
        <div
          style={{
            fontFamily,
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.primary,
            letterSpacing: "-0.02em",
            lineHeight: 1.35,
          }}
        >
          {line3}
          {line3Visible > 0 && line3Visible < line3Full.length && cursorOn && (
            <span style={{ color: COLORS.primary }}>|</span>
          )}
          {line3Visible >= line3Full.length && cursorOn && (
            <span style={{ color: COLORS.primary, opacity: 0.5 }}>▎</span>
          )}
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily,
            fontSize: 22,
            fontWeight: 400,
            color: COLORS.textSubtle,
            opacity: subtitleOp,
            marginTop: 40,
            letterSpacing: "0.12em",
            textTransform: "uppercase" as const,
          }}
        >
          500+ junctions · Zero AI coverage
        </div>
      </div>

      {/* Bottom accent line */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${COLORS.primary}, transparent)`,
          opacity: 0.3,
        }}
      />
    </AbsoluteFill>
  );
};
