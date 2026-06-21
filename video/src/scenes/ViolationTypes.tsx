import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS, VIOLATION_TYPES } from "../constants";
import { fadeIn, stagger, CONFIG_SMOOTH } from "../animations";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["300", "400", "600", "700", "800"],
  subsets: ["latin"],
});

/**
 * Scene 6: 7 Violation Types
 * Bento-style grid of all violation types with icons, fines, and MV Act sections.
 */
export const ViolationTypes: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOp = fadeIn(frame, 5, 20);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 100px",
      }}
    >
      {/* Section label */}
      <div
        style={{
          fontFamily,
          fontSize: 16,
          fontWeight: 600,
          color: COLORS.primary,
          letterSpacing: "0.2em",
          textTransform: "uppercase" as const,
          opacity: fadeIn(frame, 0, 15),
          marginBottom: 12,
        }}
      >
        Violation Detection
      </div>

      <div
        style={{
          fontFamily,
          fontSize: 44,
          fontWeight: 700,
          color: COLORS.text,
          textAlign: "center",
          opacity: titleOp,
          marginBottom: 50,
        }}
      >
        7 Violation Types. <span style={{ color: COLORS.primary }}>One Pipeline.</span>
      </div>

      {/* Grid — 4 top, 3 bottom centered */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 16 }}>
          {VIOLATION_TYPES.slice(0, 4).map((v, i) => (
            <ViolationCard key={i} violation={v} index={i} frame={frame} fps={fps} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {VIOLATION_TYPES.slice(4, 7).map((v, i) => (
            <ViolationCard key={i + 4} violation={v} index={i + 4} frame={frame} fps={fps} />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ──────────────────────── Card ──────────────────────── */

const ViolationCard: React.FC<{
  violation: typeof VIOLATION_TYPES[number];
  index: number;
  frame: number;
  fps: number;
}> = ({ violation, index, frame, fps }) => {
  const delay = stagger(index, 7) + 20;
  const progress = spring({ frame, fps, delay, config: CONFIG_SMOOTH });
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const translateY = interpolate(progress, [0, 1], [25, 0]);

  return (
    <div
      style={{
        width: 240,
        backgroundColor: COLORS.bgCard,
        border: `1px solid ${violation.color}22`,
        borderRadius: 14,
        padding: "28px 22px",
        opacity,
        transform: `translateY(${translateY}px)`,
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top accent */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          backgroundColor: violation.color,
          opacity: 0.8,
        }}
      />

      <div style={{ fontSize: 32, marginBottom: 14 }}>{violation.icon}</div>

      <div
        style={{
          fontFamily,
          fontSize: 16,
          fontWeight: 600,
          color: COLORS.text,
          marginBottom: 8,
        }}
      >
        {violation.type}
      </div>

      <div
        style={{
          fontFamily,
          fontSize: 26,
          fontWeight: 800,
          color: violation.color,
          marginBottom: 6,
        }}
      >
        {violation.fine}
      </div>

      <div
        style={{
          fontFamily,
          fontSize: 12,
          color: COLORS.textSubtle,
        }}
      >
        {violation.section}
      </div>
    </div>
  );
};
