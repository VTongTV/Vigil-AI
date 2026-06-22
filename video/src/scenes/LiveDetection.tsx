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
import { COLORS, FPS } from "../constants";
import {
  pulse,
  glowOp,
  CONFIG_SNAPPY,
  CONFIG_SMOOTH,
  CONFIG_BOUNCY,
  visibleFloat,
  visibleBreathe,
  kenBurns,
  sceneExit,
} from "../animations";
import { AnimatedBackground } from "../AnimatedBackground";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["300", "400", "600", "700", "800"],
  subsets: ["latin"],
});

const TOTAL_FRAMES = 15 * FPS;

/** Detection set: boxes visible during a time window. */
interface DetectionBox {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  color: string;
}

/**
 * 3 cycling sets of detections with frame ranges.
 * Each set fades in with spring, previous set fades out.
 */
const DETECTION_SETS: Array<{
  startFrame: number;
  endFrame: number;
  cumulativeCount: number;
  boxes: DetectionBox[];
}> = [
  {
    startFrame: 60,
    endFrame: 240,
    cumulativeCount: 2,
    boxes: [
      { x: 280, y: 180, w: 100, h: 140, label: "No Helmet", color: COLORS.danger },
      { x: 520, y: 200, w: 90, h: 130, label: "Triple Riding", color: COLORS.warning },
    ],
  },
  {
    startFrame: 240,
    endFrame: 480,
    cumulativeCount: 5,
    boxes: [
      { x: 350, y: 160, w: 110, h: 160, label: "No Helmet", color: COLORS.danger },
      { x: 650, y: 200, w: 95, h: 140, label: "Wrong Side", color: "#EC4899" },
      { x: 800, y: 180, w: 90, h: 130, label: "No Helmet", color: COLORS.danger },
    ],
  },
  {
    startFrame: 480,
    endFrame: 720,
    cumulativeCount: 7,
    boxes: [
      { x: 420, y: 300, w: 140, h: 100, label: "Illegal Parking", color: COLORS.secondary },
      { x: 600, y: 150, w: 100, h: 150, label: "No Helmet", color: COLORS.danger },
    ],
  },
];

/**
 * Scene 5: Live Detection
 * Simulated camera feed with CRT scan line,
 * cycling bounding box sets, and live detection readout.
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

  // Visible continuous motion (10-12px amplitude)
  const labelFloat = visibleFloat(frame, 0.035, 10, 0);
  const titleFloat = visibleFloat(frame, 0.04, 12, 0.5);
  const kb = kenBurns(frame, TOTAL_FRAMES, 1.01, 3, 2);
  const sidebarBreathe = visibleBreathe(frame, 0.03, 0.02);
  const sidebarFloat1 = visibleFloat(frame, 0.025, 10, 0);
  const sidebarFloat2 = visibleFloat(frame, 0.03, 10, 1.5);
  const sidebarFloat3 = visibleFloat(frame, 0.028, 10, 3.0);

  // Scene exit
  const exit = sceneExit(frame, TOTAL_FRAMES, 18);

  // Fluctuating latency
  const latency = (2.4 + Math.sin(frame * 0.03) * 0.3).toFixed(1);

  // Determine which detection set is active and render boxes with transitions
  const activeSetIndex = DETECTION_SETS.findIndex(
    (s) => frame >= s.startFrame && frame < s.endFrame,
  );
  const prevSetIndex = activeSetIndex > 0 ? activeSetIndex - 1 : -1;

  // Detection counter: 0→2→5→7 based on sets
  const detectionCount = (() => {
    for (let i = DETECTION_SETS.length - 1; i >= 0; i--) {
      if (frame >= DETECTION_SETS[i].startFrame) {
        return DETECTION_SETS[i].cumulativeCount;
      }
    }
    return 0;
  })();

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
          opacity: exit.opacity,
          transform: `translateY(${exit.translateY}px)`,
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
            transform: `translateY(${labelFloat}px)`,
          }}
        >
          <div style={{ width: 20, height: 1, backgroundColor: COLORS.danger }} />
          <span
            style={{
              fontFamily,
              fontSize: 18,
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
            transform: `translateY(${titleY + titleFloat}px)`,
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
            <div
              style={{
                position: "absolute",
                inset: 0,
                transform: `scale(${kb.scale}) translate(${kb.x}px, ${kb.y}px)`,
                transformOrigin: "center center",
              }}
            >
              <Img
                src={staticFile("demo/demo_no_helmet_silkboard-01.jpg")}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: "brightness(0.7) contrast(1.1) saturate(0.8)",
                }}
              />
            </div>

            {/* CRT scan line — increased opacity */}
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: scanY - 1,
                height: 3,
                background: `linear-gradient(180deg, transparent, rgba(6,182,212,0.3), transparent)`,
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

            {/* Previous set — fading out */}
            {prevSetIndex >= 0 &&
              DETECTION_SETS[prevSetIndex].boxes.map((box, i) => {
                const fadeOutProgress = interpolate(
                  frame,
                  [DETECTION_SETS[prevSetIndex].endFrame - 20, DETECTION_SETS[prevSetIndex].endFrame],
                  [1, 0],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
                );
                if (fadeOutProgress <= 0) return null;
                const flickerOp = glowOp(frame, 0.08 + i * 0.01, 0.5, 1);
                return (
                  <div
                    key={`prev-${prevSetIndex}-${i}`}
                    style={{
                      position: "absolute",
                      left: box.x,
                      top: box.y,
                      width: box.w,
                      height: box.h,
                      opacity: fadeOutProgress * 0.6,
                      transform: `scale(1)`,
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        border: `2px solid ${box.color}`,
                        borderRadius: 4,
                        opacity: flickerOp * fadeOutProgress,
                        boxShadow: `0 0 12px ${box.color}40`,
                      }}
                    />
                  </div>
                );
              })}

            {/* Active set — springing in */}
            {activeSetIndex >= 0 &&
              DETECTION_SETS[activeSetIndex].boxes.map((box, i) => {
                const boxSpring = spring({
                  frame: frame - DETECTION_SETS[activeSetIndex].startFrame,
                  fps,
                  delay: i * 10,
                  config: CONFIG_SNAPPY,
                });
                const boxOp = interpolate(boxSpring, [0, 1], [0, 1]);
                const boxScale = interpolate(boxSpring, [0.5, 1], [1.15, 1]);
                const flickerOp = glowOp(frame, 0.08 + i * 0.01, 0.5, 1);
                const labelFloatVal = visibleFloat(frame, 0.06, 6, i);

                return (
                  <div
                    key={`active-${activeSetIndex}-${i}`}
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
                        fontSize: 13,
                        fontWeight: 600,
                        color: box.color,
                        backgroundColor: `${COLORS.bg}cc`,
                        padding: "2px 6px",
                        borderRadius: 3,
                        letterSpacing: "0.06em",
                        whiteSpace: "nowrap" as const,
                        transform: `translateY(${labelFloatVal}px)`,
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
                  fontSize: 13,
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
                fontSize: 13,
                fontWeight: 500,
                color: COLORS.textMuted,
                opacity: 0.85,
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
            <div style={{ transform: `translateY(${sidebarFloat1}px) scale(${sidebarBreathe})` }}>
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
                  fontSize: 14,
                  fontWeight: 600,
                  color: COLORS.textMuted,
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
                  <span style={{ fontFamily, fontSize: 15, color: COLORS.textMuted }}>
                    {item.label}
                  </span>
                  <span
                    style={{
                      fontFamily,
                      fontSize: 14,
                      fontWeight: 600,
                      color: item.color,
                    }}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
              </div>
            </div>

            {/* Detection count */}
            <div style={{ transform: `translateY(${sidebarFloat2}px) scale(${sidebarBreathe})` }}>
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
                  fontSize: 14,
                  fontWeight: 600,
                  color: COLORS.textMuted,
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
            </div>

            {/* Latency — fluctuating */}
            <div style={{ transform: `translateY(${sidebarFloat3}px) scale(${sidebarBreathe})` }}>
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
                  fontSize: 14,
                  fontWeight: 600,
                  color: COLORS.textMuted,
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
                  {latency}
                </span>
                <span
                  style={{
                  fontFamily,
                  fontSize: 16,
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
      </div>
    </AbsoluteFill>
  );
};
