import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS } from "../constants";
import { fadeIn, CONFIG_SMOOTH, CONFIG_SNAPPY } from "../animations";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["300", "400", "600", "700", "800"],
  subsets: ["latin"],
});

/**
 * Scene 8: Court-Admissible Evidence
 * Shows the chain: Annotated Image → SHA-256 Hash → E-Challan PDF → Chain of Custody.
 */
export const Evidence: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOp = fadeIn(frame, 5, 20);

  // Steps stagger in
  const step1 = spring({ frame, fps, delay: 15, config: CONFIG_SMOOTH });
  const step2 = spring({ frame, fps, delay: 50, config: CONFIG_SMOOTH });
  const step3 = spring({ frame, fps, delay: 85, config: CONFIG_SMOOTH });
  const step4 = spring({ frame, fps, delay: 120, config: CONFIG_SMOOTH });

  // Connection line
  const lineProgress = interpolate(frame, [30, 180], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "50px 80px",
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
        Evidence Integrity
      </div>

      <div
        style={{
          fontFamily,
          fontSize: 44,
          fontWeight: 700,
          color: COLORS.text,
          textAlign: "center",
          opacity: titleOp,
          marginBottom: 60,
        }}
      >
        Court-Admissible. <span style={{ color: COLORS.primary }}>Tamper-Proof.</span>
      </div>

      {/* Evidence chain — horizontal steps */}
      <div style={{ display: "flex", gap: 0, alignItems: "center", position: "relative" }}>
        {/* Connecting line */}
        <div
          style={{
            position: "absolute",
            top: 50,
            left: 100,
            right: 100,
            height: 2,
            backgroundColor: COLORS.border,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 50,
            left: 100,
            height: 2,
            backgroundColor: COLORS.primary,
            width: `${lineProgress * (1920 - 200)}px`,
            maxWidth: "100%",
          }}
        />

        <EvidenceStep
          icon="🖼️"
          title="Annotated Image"
          desc="Bounding boxes + violation labels"
          color={COLORS.secondary}
          progress={step1}
        />
        <EvidenceStep
          icon="🔐"
          title="SHA-256 Hash"
          desc="a4f2c8...e91b3d"
          color={COLORS.primary}
          progress={step2}
        />
        <EvidenceStep
          icon="📄"
          title="E-Challan PDF"
          desc="Fine + MV Act section"
          color={COLORS.warning}
          progress={step3}
        />
        <EvidenceStep
          icon="📋"
          title="Chain of Custody"
          desc="Timestamp + camera + officer"
          color={COLORS.success}
          progress={step4}
        />
      </div>
    </AbsoluteFill>
  );
};

/* ──────────────────────── Evidence Step ──────────────────────── */

const EvidenceStep: React.FC<{
  icon: string;
  title: string;
  desc: string;
  color: string;
  progress: number;
}> = ({ icon, title, desc, color, progress }) => {
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const scale = interpolate(progress, [0, 1], [0.85, 1]);

  return (
    <div
      style={{
        width: 200,
        textAlign: "center",
        opacity,
        transform: `scale(${scale})`,
        position: "relative",
        zIndex: 1,
      }}
    >
      {/* Circle node */}
      <div
        style={{
          width: 100,
          height: 100,
          borderRadius: "50%",
          backgroundColor: `${color}15`,
          border: `2px solid ${color}44`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
          fontSize: 36,
        }}
      />
      <div
        style={{
          fontFamily,
          fontSize: 16,
          fontWeight: 700,
          color: COLORS.text,
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily,
          fontSize: 13,
          color: COLORS.textSubtle,
        }}
      >
        {desc}
      </div>
    </div>
  );
};
