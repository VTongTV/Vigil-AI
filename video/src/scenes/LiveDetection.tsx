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
import { COLORS, VIOLATION_TYPES, FPS } from "../constants";
import {
  fadeIn,
  fadeInEased,
  stagger,
  floatY,
  shimmerPosition,
  borderGlow,
  pulse,
  glowOp,
  transforms,
  CONFIG_SNAPPY,
  CONFIG_SMOOTH,
  CONFIG_BOUNCY,
} from "../animations";
import { AnimatedBackground } from "../AnimatedBackground";
import { Icon } from "../Icon";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["300", "400", "600", "700", "800"],
  subsets: ["latin"],
});

const TOTAL_FRAMES = 12 * FPS;

// Simulated bounding boxes for detection visualization
const DETECTION_BOXES = [
  { x: 280, y: 180, w: 100, h: 140, label: "No Helmet", color: COLORS.danger, delay: 60 },
  { x: 520, y: 200, w: 90, h: 130, label: "Triple Riding", color: COLORS.warning, delay: 90 },
  { x: 750, y: 160, w: 110, h: 160, label: "No Helmet", color: COLORS.danger, delay: 75 },
];

/**
 * Scene 5: Live Detection
 * Simulated camera feed with CRT scan line,
 * animated bounding boxes, and detection readout.
 */
export const LiveDetection: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Section label
  const labelProgress = spring({ frame, fps, delay: 0, config: CONFIG_SMOOTH });
  const labelOp = interpolate(labelProgress, [0, 1], [0, 1]);

  // Title
  const titleProgress = spring({ frame, fps, delay: 8, config: CONFIG_BOUNCY });
  const titleOp = interpolate(titleProgress, [0, 1], [0, 1]);
  const titleY = interpolate(titleProgress, [0, 1], [20, 0]);

  // CRT scan line position
  const scanY = (frame * 3) % height;

  // "LIVE" indicator pulse
  const livePulse = pulse(frame, 0.06, 0.3, 1);

  // Stats sidebar entrance
  const statsProgress = spring({ frame, fps, delay: 40, config: CONFIG_SMOOTH });
  const statsOp = interpolate(statsProgress, [0, 1], [0, 1]);
  const statsX = interpolate(statsProgress, [0, 1], [30, 0]);

  // Detection counter
  const detectionCount = Math.min(
    3,
    Math.floor(linearProgressFast(frame, 60, 140) * 3),
  );

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {/* Animated background — minimal particles */}
      <AnimatedBackground particleCount={12} glowCount={1} seed={55} />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "50px 60px",
        }}
      >
        {/* Header row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 24,
            opacity: labelOp,
          }}
        >
          <div style={{ width: 20, height: 1, backgroundColor: COLORS.danger }} />
          <span
            style={{
              fontFamily,
              fontSize: 14,
              fontWeight: 600,
              color: COLORS.danger,
              letterSpacing: "0.25em",
              textTransform: "uppercase" as const,
            }}
          >
            Live Detection
          </span>
          <div style={{ width: 20, height: 1, backgroundColor: COLORS.danger }} />
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily,
            fontSize: 44,
            fontWeight: 700,
            color: COLORS.text,
            opacity: titleOp,
            transform: `translateY(${titleY}px)`,
            marginBottom: 30,
          }}
        >
          Real-Time AI Analysis
        </div>

        {/* Main content: Camera feed + Stats */}
        <div style={{ display: "flex", gap: 30, alignItems: "flex-start" }}>
          {/* Camera feed */}
          <div
            style={{
              width: 760,
              height: 460,
              position: "relative",
              borderRadius: 12,
              overflow: "hidden",
              border: `1px solid ${COLORS.border}`,
              boxShadow: `0 4px 30px rgba(0,0,0,0.4), 0 0 60px rgba(6,182,212,0.05)`,
            }}
          >
            {/* Demo image */}
            <Img
              src={staticFile("demo/demo_no_helmet_silkboard-01.jpg")}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: "brightness(0.7) contrast(1.1) saturate(0.8)",
              }}
            />

            {/* CRT scan line */}
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: scanY - 1,
                height: 3,
                background: `linear-gradient(180deg, transparent, rgba(6,182,212,0.15), transparent)`,
                pointerEvents: "none",
              }}
            />

            {/* Slight green tint overlay */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: "rgba(6,182,212,0.03)",
                pointerEvents: "none",
              }}
            />

            {/* Bounding boxes */}
            {DETECTION_BOXES.map((box, i) => {
              if (i >= detectionCount) return null;

              const boxProgress = spring({
                frame,
                fps,
                delay: box.delay,
                config: CONFIG_SNAPPY,
              });
              const boxOp = interpolate(boxProgress, [0, 1], [0, 1]);
              const boxScale = interpolate(boxProgress, [0.5, 1], [1.1, 1]);

              // Bounding box corner flicker
              const flickerOp = glowOp(frame, 0.08 + i * 0.01, 0.5, 1);

              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: box.x,
                    top: box.y,
                    width: box.w,
                    height: box.h,
                    opacity: boxOp,
                    transform: `scale(${boxScale})`,
                  }}
                >
                  {/* Box border — dashed */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      border: `2px solid ${box.color}`,
                      borderRadius: 4,
                      opacity: flickerOp,
                      boxShadow: `0 0 12px ${box.color}40, inset 0 0 12px ${box.color}10`,
                    }}
                  />

                  {/* Corner accents */}
                  {/* Top-left */}
                  <div style={{ position: "absolute", top: -1, left: -1, width: 12, height: 2, backgroundColor: box.color }} />
                  <div style={{ position: "absolute", top: -1, left: -1, width: 2, height: 12, backgroundColor: box.color }} />
                  {/* Bottom-right */}
                  <div style={{ position: "absolute", bottom: -1, right: -1, width: 12, height: 2, backgroundColor: box.color }} />
                  <div style={{ position: "absolute", bottom: -1, right: -1, width: 2, height: 12, backgroundColor: box.color }} />

                  {/* Label */}
                  <div
                    style={{
                      position: "absolute",
                      top: -24,
                      left: 0,
                      fontFamily,
                      fontSize: 11,
                      fontWeight: 600,
                      color: box.color,
                      backgroundColor: `${COLORS.bg}cc`,
                      padding: "2px 8px",
                      borderRadius: 3,
                      letterSpacing: "0.06em",
                      whiteSpace: "nowrap" as const,
                    }}
                  >
                    {box.label}
                  </div>
                </div>
              );
            })}

            {/* LIVE indicator */}
            <div
              style={{
                position: "absolute",
                top: 14,
                left: 14,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: COLORS.danger,
                  transform: `scale(${livePulse})`,
                  boxShadow: `0 0 8px ${COLORS.danger}`,
                }}
              />
              <span
                style={{
                  fontFamily,
                  fontSize: 11,
                  fontWeight: 700,
                  color: COLORS.danger,
                  letterSpacing: "0.15em",
                }}
              >
                LIVE
              </span>
            </div>

            {/* Timestamp */}
            <div
              style={{
                position: "absolute",
                bottom: 12,
                right: 14,
                fontFamily,
                fontSize: 11,
                fontWeight: 500,
                color: COLORS.textSubtle,
                opacity: 0.7,
                letterSpacing: "0.05em",
              }}
            >
              CAM-BLR-0421 · {String(Math.floor(frame / fps)).padStart(2, "0")}:{String((frame % fps) * 2).padStart(4, "0").slice(0, 2)}
            </div>
          </div>

          {/* Stats sidebar */}
          <div
            style={{
              width: 260,
              opacity: statsOp,
              transform: `translateX(${statsX}px)`,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {/* Processing status */}
            <div
              style={{
                backgroundColor: COLORS.bgCard,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                padding: "20px 18px",
              }}
            >
              <div
                style={{
                  fontFamily,
                  fontSize: 11,
                  fontWeight: 600,
                  color: COLORS.textSubtle,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase" as const,
                  marginBottom: 12,
                }}
              >
                Processing
              </div>

              {[
                { label: "COCO Model", status: "Active", color: COLORS.success },
                { label: "Helmet Model", status: "Active", color: COLORS.success },
                { label: "Plate OCR", status: "Standby", color: COLORS.warning },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: i < 2 ? 8 : 0,
                  }}
                >
                  <span style={{ fontFamily, fontSize: 13, color: COLORS.textMuted }}>
                    {item.label}
                  </span>
                  <span
                    style={{
                      fontFamily,
                      fontSize: 12,
                      fontWeight: 600,
                      color: item.color,
                    }}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>

            {/* Detection count */}
            <div
              style={{
                backgroundColor: COLORS.bgCard,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                padding: "20px 18px",
              }}
            >
              <div
                style={{
                  fontFamily,
                  fontSize: 11,
                  fontWeight: 600,
                  color: COLORS.textSubtle,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase" as const,
                  marginBottom: 8,
                }}
              >
                Violations Detected
              </div>
              <div
                style={{
                  fontFamily,
                  fontSize: 42,
                  fontWeight: 800,
                  color: COLORS.danger,
                  letterSpacing: "-0.03em",
                }}
              >
                {detectionCount}
              </div>
            </div>

            {/* Latency */}
            <div
              style={{
                backgroundColor: COLORS.bgCard,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                padding: "20px 18px",
              }}
            >
              <div
                style={{
                  fontFamily,
                  fontSize: 11,
                  fontWeight: 600,
                  color: COLORS.textSubtle,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase" as const,
                  marginBottom: 8,
                }}
              >
                Avg Latency
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span
                  style={{
                    fontFamily,
                    fontSize: 32,
                    fontWeight: 800,
                    color: COLORS.success,
                    letterSpacing: "-0.03em",
                  }}
                >
                  2.4
                </span>
                <span
                  style={{
                    fontFamily,
                    fontSize: 14,
                    color: COLORS.textSubtle,
                  }}
                >
                  seconds
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Fast linear progress helper (local to this scene) */
function linearProgressFast(frame: number, startFrame: number, endFrame: number): number {
  return interpolate(frame, [startFrame, endFrame], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}
