import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS, PROBLEM_STATS } from "../constants";
import { fadeIn, stagger, CONFIG_SNAPPY } from "../animations";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["300", "400", "600", "700", "800"],
  subsets: ["latin"],
});

/**
 * Scene 2: The Problem
 * Stats fly in with severity bars.
 */
export const Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOp = fadeIn(frame, 5, 20);
  const titleY = springSlideUp(frame, fps, 5, 30);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
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
          marginBottom: 16,
        }}
      >
        The Problem
      </div>

      {/* Title */}
      <div
        style={{
          fontFamily,
          fontSize: 56,
          fontWeight: 700,
          color: COLORS.text,
          textAlign: "center",
          opacity: titleOp,
          marginBottom: 80,
          lineHeight: 1.2,
          transform: `translateY(${titleY}px)`,
        }}
      >
        Bengaluru's Traffic Enforcement
        <br />
        <span style={{ color: COLORS.danger }}>Blind Spots</span>
      </div>

      {/* Stats grid */}
      <div style={{ display: "flex", gap: 32, justifyContent: "center", width: "100%" }}>
        {PROBLEM_STATS.map((stat, i) => {
          const delay = stagger(i, 10);
          const cardOp = fadeIn(frame, 30 + delay, 20);
          const cardY = springSlideUp(frame, fps, 30 + delay, 50, CONFIG_SNAPPY);

          const barProgress = interpolate(
            frame,
            [55 + delay, 90 + delay],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );

          return (
            <div
              key={i}
              style={{
                flex: 1,
                maxWidth: 380,
                backgroundColor: COLORS.bgCard,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 16,
                padding: "40px 32px",
                opacity: cardOp,
                transform: `translateY(${cardY}px)`,
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
                  background: `linear-gradient(90deg, ${COLORS.danger}, ${COLORS.warning})`,
                  opacity: barProgress,
                }}
              />

              <div style={{ fontSize: 36, marginBottom: 16 }}>{stat.icon}</div>

              <div
                style={{
                  fontFamily,
                  fontSize: 48,
                  fontWeight: 800,
                  color: COLORS.text,
                  letterSpacing: "-0.03em",
                  marginBottom: 8,
                }}
              >
                {stat.value}
              </div>

              <div
                style={{
                  fontFamily,
                  fontSize: 16,
                  color: COLORS.textMuted,
                  lineHeight: 1.5,
                }}
              >
                {stat.label}
              </div>

              {/* Severity bar */}
              <div
                style={{
                  marginTop: 20,
                  height: 4,
                  backgroundColor: COLORS.border,
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${barProgress * 100}%`,
                    background: `linear-gradient(90deg, ${COLORS.danger}, ${COLORS.warning})`,
                    borderRadius: 2,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** Reusable spring slide-up. */
function springSlideUp(
  frame: number,
  fps: number,
  delay: number = 0,
  distance: number = 40,
  config: object = CONFIG_SNAPPY,
): number {
  const progress = spring({ frame, fps, delay, config });
  return interpolate(progress, [0, 1], [distance, 0]);
}
