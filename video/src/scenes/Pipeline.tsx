import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS, PIPELINE_STAGES } from "../constants";
import { fadeIn, stagger, CONFIG_SMOOTH, CONFIG_SNAPPY } from "../animations";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["300", "400", "600", "700", "800"],
  subsets: ["latin"],
});

/**
 * Scene 4: Pipeline Animation
 * 8-stage detection pipeline flows left-to-right with staggered reveals.
 */
export const Pipeline: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOp = fadeIn(frame, 5, 20);
  const titleY = spring({ frame, fps, delay: 5, config: CONFIG_SMOOTH });
  const titleTranslateY = interpolate(titleY, [0, 1], [20, 0]);

  // Connection line draw progress
  const lineDrawStart = 40;
  const lineDrawProgress = interpolate(
    frame,
    [lineDrawStart, lineDrawStart + 60],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Total timing bar
  const timingBarProgress = interpolate(
    frame,
    [Math.round(15 * fps * 0.8), Math.round(15 * fps)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
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
          fontSize: 16,
          fontWeight: 600,
          color: COLORS.primary,
          letterSpacing: "0.2em",
          textTransform: "uppercase" as const,
          opacity: fadeIn(frame, 0, 15),
          marginBottom: 12,
        }}
      >
        The Pipeline
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
          transform: `translateY(${titleTranslateY}px)`,
          marginBottom: 60,
        }}
      >
        7-Stage Detection in <span style={{ color: COLORS.primary }}>1.2 Seconds</span>
      </div>

      {/* Pipeline stages — 2 rows of 4 */}
      <div style={{ width: "100%", position: "relative" }}>
        {/* Row 1 */}
        <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 24 }}>
          {PIPELINE_STAGES.slice(0, 4).map((stage, i) => (
            <PipelineCard key={i} stage={stage} index={i} frame={frame} fps={fps} />
          ))}
        </div>

        {/* Row 2 */}
        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          {PIPELINE_STAGES.slice(4, 8).map((stage, i) => (
            <PipelineCard key={i + 4} stage={stage} index={i + 4} frame={frame} fps={fps} />
          ))}
        </div>
      </div>

      {/* Total timing bar */}
      <div
        style={{
          marginTop: 50,
          width: 600,
          opacity: fadeIn(frame, Math.round(12 * fps), 30),
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontFamily, fontSize: 14, color: COLORS.textSubtle }}>
            Total Processing Time
          </span>
          <span style={{ fontFamily, fontSize: 14, color: COLORS.primary, fontWeight: 600 }}>
            700 ms
          </span>
        </div>
        <div
          style={{
            height: 6,
            backgroundColor: COLORS.border,
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${timingBarProgress * 100}%`,
              background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.secondary})`,
              borderRadius: 3,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ──────────────────────── Pipeline Card Sub-component ──────────────────────── */

const PipelineCard: React.FC<{
  stage: typeof PIPELINE_STAGES[number];
  index: number;
  frame: number;
  fps: number;
}> = ({ stage, index, frame, fps }) => {
  const delay = stagger(index, 8) + 25;
  const progress = spring({ frame, fps, delay, config: CONFIG_SMOOTH });
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const translateY = interpolate(progress, [0, 1], [30, 0]);
  const scale = interpolate(progress, [0, 1], [0.9, 1]);

  // Active pulse for completed stages
  const isActive = frame > delay + 20;

  return (
    <div
      style={{
        width: 200,
        backgroundColor: COLORS.bgCard,
        border: `1px solid ${isActive ? stage.color + "44" : COLORS.border}`,
        borderRadius: 12,
        padding: "24px 16px",
        opacity,
        transform: `translateY(${translateY}px) scale(${scale})`,
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
          height: 2,
          backgroundColor: stage.color,
          opacity: isActive ? 1 : 0.3,
        }}
      />

      {/* Icon */}
      <div style={{ fontSize: 28, marginBottom: 10 }}>{stage.icon}</div>

      {/* Label */}
      <div
        style={{
          fontFamily,
          fontSize: 14,
          fontWeight: 600,
          color: COLORS.text,
          marginBottom: 6,
        }}
      >
        {stage.label}
      </div>

      {/* Timing */}
      <div
        style={{
          fontFamily,
          fontSize: 13,
          color: isActive ? stage.color : COLORS.textSubtle,
          fontWeight: isActive ? 600 : 400,
        }}
      >
        {stage.timing}
      </div>
    </div>
  );
};
