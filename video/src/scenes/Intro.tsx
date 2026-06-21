import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS } from "../constants";
import { fadeIn, CONFIG_BOUNCY, CONFIG_SMOOTH } from "../animations";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["300", "400", "600", "700", "800"],
  subsets: ["latin"],
});

/**
 * Scene 3: VigilAI Intro
 * Logo reveal with rotating accent rings and tagline.
 */
export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo spring entrance
  const logoProgress = spring({ frame, fps, delay: 5, config: CONFIG_BOUNCY });
  const logoScale = interpolate(logoProgress, [0, 1], [0.7, 1]);
  const logoOp = fadeIn(frame, 5, 15);

  // Tagline
  const tagProgress = spring({ frame, fps, delay: 40, config: CONFIG_SMOOTH });
  const tagY = interpolate(tagProgress, [0, 1], [15, 0]);
  const tagOp = fadeIn(frame, 40, 20);

  // Subtitle
  const subOp = fadeIn(frame, 70, 20);

  // Ring rotation
  const ringRot = interpolate(frame, [0, 5 * fps], [0, 45]);

  // Ambient glow
  const glowAlpha = interpolate(
    Math.sin(frame * 0.03),
    [-1, 1],
    [0.1, 0.22],
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Glow */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(6,182,212,${glowAlpha}), transparent 60%)`,
          filter: "blur(60px)",
        }}
      />

      {/* Rotating rings */}
      <div
        style={{
          position: "absolute",
          width: 320,
          height: 320,
          borderRadius: "50%",
          border: `1px solid rgba(6,182,212,0.2)`,
          transform: `rotate(${ringRot}deg)`,
          opacity: logoOp * 0.4,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          border: `1px solid rgba(59,130,246,0.12)`,
          transform: `rotate(${-ringRot * 0.7}deg)`,
          opacity: logoOp * 0.25,
        }}
      />

      {/* Logo + Title */}
      <div
        style={{
          opacity: logoOp,
          transform: `scale(${logoScale})`,
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* Shield SVG */}
        <div style={{ width: 120, height: 120, margin: "0 auto 28px" }}>
          <svg width="120" height="120" viewBox="0 0 140 140" fill="none">
            <path
              d="M70 10 L120 35 L120 75 Q120 110 70 130 Q20 110 20 75 L20 35 Z"
              stroke={COLORS.primary}
              strokeWidth="2.5"
              fill="rgba(6,182,212,0.06)"
            />
            <circle cx="70" cy="65" r="18" stroke={COLORS.primary} strokeWidth="2" fill="none" />
            <circle cx="70" cy="65" r="6" fill={COLORS.primary} />
            <line x1="38" y1="95" x2="102" y2="95" stroke={COLORS.primary} strokeWidth="1" opacity="0.4" />
            <line x1="45" y1="102" x2="95" y2="102" stroke={COLORS.primary} strokeWidth="1" opacity="0.25" />
          </svg>
        </div>

        {/* Product name */}
        <div
          style={{
            fontFamily,
            fontSize: 80,
            fontWeight: 800,
            color: COLORS.text,
            textAlign: "center",
            letterSpacing: "-0.04em",
          }}
        >
          Vigil<span style={{ color: COLORS.primary }}>AI</span>
        </div>
      </div>

      {/* Tagline */}
      <div
        style={{
          fontFamily,
          fontSize: 28,
          fontWeight: 400,
          color: COLORS.textMuted,
          textAlign: "center",
          opacity: tagOp,
          transform: `translateY(${tagY}px)`,
          marginTop: 8,
        }}
      >
        AI-Powered Traffic Enforcement
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontFamily,
          fontSize: 18,
          fontWeight: 400,
          color: COLORS.textSubtle,
          textAlign: "center",
          opacity: subOp,
          marginTop: 24,
          letterSpacing: "0.04em",
        }}
      >
        Retrofits onto any CCTV camera. No hardware upgrade needed.
      </div>
    </AbsoluteFill>
  );
};
