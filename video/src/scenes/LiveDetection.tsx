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
import { COLORS, MOCK_DETECTION } from "../constants";
import { fadeIn, CONFIG_SNAPPY, CONFIG_SMOOTH } from "../animations";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["300", "400", "600", "700", "800"],
  subsets: ["latin"],
});

/**
 * Scene 5: Live Detection Demo
 * Shows a real demo image with bounding boxes animating in,
 * OCR result, and violation cards.
 */
export const LiveDetection: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOp = fadeIn(frame, 5, 20);

  // Image slides in from left
  const imgProgress = spring({ frame, fps, delay: 10, config: CONFIG_SMOOTH });
  const imgX = interpolate(imgProgress, [0, 1], [-100, 0]);
  const imgOp = interpolate(imgProgress, [0, 1], [0, 1]);

  // Bounding boxes appear
  const bbox1Progress = spring({ frame, fps, delay: 70, config: CONFIG_SNAPPY });
  const bbox2Progress = spring({ frame, fps, delay: 90, config: CONFIG_SNAPPY });

  // OCR text reveals
  const ocrOp = fadeIn(frame, 130, 20);

  // Violation cards
  const card1Progress = spring({ frame, fps, delay: 160, config: CONFIG_SNAPPY });
  const card2Progress = spring({ frame, fps, delay: 175, config: CONFIG_SNAPPY });

  // Processing time
  const timeOp = fadeIn(frame, 200, 15);

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
        Live Detection
      </div>

      <div
        style={{
          fontFamily,
          fontSize: 44,
          fontWeight: 700,
          color: COLORS.text,
          textAlign: "center",
          opacity: titleOp,
          marginBottom: 40,
        }}
      >
        Real Images. <span style={{ color: COLORS.primary }}>Real Results.</span>
      </div>

      {/* Main content: image + results side by side */}
      <div style={{ display: "flex", gap: 48, width: "100%", justifyContent: "center" }}>
        {/* Image with bounding boxes */}
        <div
          style={{
            position: "relative",
            width: 720,
            height: 480,
            borderRadius: 12,
            overflow: "hidden",
            border: `1px solid ${COLORS.border}`,
            opacity: imgOp,
            transform: `translateX(${imgX}px)`,
          }}
        >
          <Img
            src={staticFile(MOCK_DETECTION.image)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />

          {/* Scan line */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              height: 2,
              backgroundColor: COLORS.primary,
              opacity: 0.6,
              top: `${interpolate(frame, [40, 250], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}%`,
              boxShadow: `0 0 12px ${COLORS.primary}`,
            }}
          />

          {/* Bounding box 1 */}
          <div
            style={{
              position: "absolute",
              left: MOCK_DETECTION.violations[0].bbox.x * (720 / 1280),
              top: MOCK_DETECTION.violations[0].bbox.y * (480 / 720),
              width: MOCK_DETECTION.violations[0].bbox.width * (720 / 1280),
              height: MOCK_DETECTION.violations[0].bbox.height * (480 / 720),
              border: `2px solid ${COLORS.danger}`,
              opacity: bbox1Progress,
              borderRadius: 4,
            }}
          >
            {/* Label */}
            <div
              style={{
                position: "absolute",
                top: -22,
                left: 0,
                fontFamily,
                fontSize: 11,
                fontWeight: 600,
                color: COLORS.text,
                backgroundColor: COLORS.danger,
                padding: "2px 6px",
                borderRadius: 3,
                opacity: bbox1Progress,
              }}
            >
              NO HELMET 94%
            </div>
          </div>

          {/* Bounding box 2 */}
          <div
            style={{
              position: "absolute",
              left: MOCK_DETECTION.violations[1].bbox.x * (720 / 1280),
              top: MOCK_DETECTION.violations[1].bbox.y * (480 / 720),
              width: MOCK_DETECTION.violations[1].bbox.width * (720 / 1280),
              height: MOCK_DETECTION.violations[1].bbox.height * (480 / 720),
              border: `2px solid ${COLORS.warning}`,
              opacity: bbox2Progress,
              borderRadius: 4,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -22,
                left: 0,
                fontFamily,
                fontSize: 11,
                fontWeight: 600,
                color: COLORS.text,
                backgroundColor: COLORS.warning,
                padding: "2px 6px",
                borderRadius: 3,
                opacity: bbox2Progress,
              }}
            >
              NO HELMET 87%
            </div>
          </div>
        </div>

        {/* Results panel */}
        <div style={{ width: 400, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* OCR result */}
          <div
            style={{
              backgroundColor: COLORS.bgCard,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              padding: "24px 20px",
              opacity: ocrOp,
            }}
          >
            <div style={{ fontFamily, fontSize: 12, color: COLORS.textSubtle, marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>
              License Plate OCR
            </div>
            <div style={{ fontFamily, fontSize: 36, fontWeight: 800, color: COLORS.primary, letterSpacing: "0.06em" }}>
              KA-01-MF-4291
            </div>
            <div style={{ fontFamily, fontSize: 13, color: COLORS.success, marginTop: 6 }}>
              ✓ Matches Indian plate regex
            </div>
          </div>

          {/* Violation cards */}
          <ViolationCard
            type="No Helmet"
            confidence={94}
            fine="₹500"
            section="Sec 129"
            color={COLORS.danger}
            progress={card1Progress}
          />
          <ViolationCard
            type="No Helmet"
            confidence={87}
            fine="₹500"
            section="Sec 129"
            color={COLORS.warning}
            progress={card2Progress}
          />

          {/* Processing time */}
          <div
            style={{
              fontFamily,
              fontSize: 14,
              color: COLORS.textSubtle,
              opacity: timeOp,
              textAlign: "center",
            }}
          >
            Total processing: <span style={{ color: COLORS.primary, fontWeight: 600 }}>{MOCK_DETECTION.processingTime}ms</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ──────────────────────── Violation Card ──────────────────────── */

const ViolationCard: React.FC<{
  type: string;
  confidence: number;
  fine: string;
  section: string;
  color: string;
  progress: number;
}> = ({ type, confidence, fine, section, color, progress }) => {
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const translateY = interpolate(progress, [0, 1], [15, 0]);

  return (
    <div
      style={{
        backgroundColor: COLORS.bgCard,
        border: `1px solid ${color}33`,
        borderRadius: 10,
        padding: "16px 20px",
        opacity,
        transform: `translateY(${translateY}px)`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>
        <div style={{ fontFamily, fontSize: 16, fontWeight: 600, color: COLORS.text }}>
          {type}
        </div>
        <div style={{ fontFamily, fontSize: 12, color: COLORS.textSubtle, marginTop: 2 }}>
          MV Act {section} · Confidence {confidence}%
        </div>
      </div>
      <div
        style={{
          fontFamily,
          fontSize: 18,
          fontWeight: 700,
          color,
        }}
      >
        {fine}
      </div>
    </div>
  );
};
