import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS, IMPACT_METRICS } from "../constants";
import { fadeIn, stagger, CONFIG_SMOOTH, CONFIG_BOUNCY } from "../animations";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["300", "400", "600", "700", "800"],
  subsets: ["latin"],
});

/**
 * Scene 9: Impact & Closing CTA
 * ROI metrics + final logo + tagline.
 */
export const Impact: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOp = fadeIn(frame, 5, 20);

  // Impact cards
  const cardsStart = 25;

  // Logo + CTA at the end
  const ctaDelay = Math.round(4.5 * fps);
  const ctaProgress = spring({ frame, fps, delay: ctaDelay, config: CONFIG_BOUNCY });
  const ctaScale = interpolate(ctaProgress, [0, 1], [0.8, 1]);
  const ctaOp = fadeIn(frame, ctaDelay, 20);

  // Tagline
  const tagOp = fadeIn(frame, ctaDelay + 30, 25);

  // Ambient glow
  const glowAlpha = interpolate(
    Math.sin(frame * 0.025),
    [-1, 1],
    [0.08, 0.2],
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
        Impact
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
        Built for <span style={{ color: COLORS.primary }}>Bengaluru</span>. Ready for India.
      </div>

      {/* Impact metric cards */}
      <div style={{ display: "flex", gap: 24, justifyContent: "center", width: "100%", marginBottom: 60 }}>
        {IMPACT_METRICS.map((metric, i) => {
          const delay = stagger(i, 8) + cardsStart;
          const progress = spring({ frame, fps, delay, config: CONFIG_SMOOTH });
          const opacity = interpolate(progress, [0, 1], [0, 1]);
          const translateY = interpolate(progress, [0, 1], [30, 0]);

          return (
            <div
              key={i}
              style={{
                flex: 1,
                maxWidth: 320,
                backgroundColor: COLORS.bgCard,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 14,
                padding: "32px 24px",
                opacity,
                transform: `translateY(${translateY}px)`,
                textAlign: "center",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Accent */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.secondary})`,
                }}
              />

              <div
                style={{
                  fontFamily,
                  fontSize: 36,
                  fontWeight: 800,
                  color: COLORS.primary,
                  letterSpacing: "-0.02em",
                  marginBottom: 6,
                }}
              >
                {metric.value}
              </div>
              <div
                style={{
                  fontFamily,
                  fontSize: 15,
                  fontWeight: 600,
                  color: COLORS.text,
                  marginBottom: 4,
                }}
              >
                {metric.label}
              </div>
              <div
                style={{
                  fontFamily,
                  fontSize: 12,
                  color: COLORS.textSubtle,
                }}
              >
                {metric.sub}
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA logo + tagline */}
      <div style={{ textAlign: "center", opacity: ctaOp, transform: `scale(${ctaScale})` }}>
        {/* Mini shield */}
        <div style={{ width: 60, height: 60, margin: "0 auto 16px" }}>
          <svg width="60" height="60" viewBox="0 0 140 140" fill="none">
            <path
              d="M70 10 L120 35 L120 75 Q120 110 70 130 Q20 110 20 75 L20 35 Z"
              stroke={COLORS.primary}
              strokeWidth="3"
              fill="rgba(6,182,212,0.08)"
            />
            <circle cx="70" cy="65" r="18" stroke={COLORS.primary} strokeWidth="2" fill="none" />
            <circle cx="70" cy="65" r="6" fill={COLORS.primary} />
          </svg>
        </div>

        <div
          style={{
            fontFamily,
            fontSize: 52,
            fontWeight: 800,
            color: COLORS.text,
            letterSpacing: "-0.04em",
          }}
        >
          Vigil<span style={{ color: COLORS.primary }}>AI</span>
        </div>
      </div>

      <div
        style={{
          fontFamily,
          fontSize: 20,
          color: COLORS.textMuted,
          opacity: tagOp,
          marginTop: 12,
          letterSpacing: "0.02em",
        }}
      >
        AI assists. Officers decide. Justice prevails.
      </div>
    </AbsoluteFill>
  );
};
