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
  fadeIn,
  fadeInEased,
  stagger,
  shimmerPosition,
  pulse,
  linearProgress,
  transforms,
  visibleFloat,
  visibleBreathe,
  kenBurns,
  typewriter,
  sceneExit,
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

/** 5 seconds at 60 fps = 300 frames. */
const TOTAL_FRAMES = 5 * FPS;

/** Full SHA-256 hash string for progressive reveal. */
const FULL_HASH = "a3f7c9e2b1d4f8a6c2e1b5d7f3a9c8e4b6d2f1a8e3c5b7d9f2a4c6e8b1d3f5";

/** License plate text for typewriter. */
const PLATE_TEXT = "KA-01-AB-1234";

/**
 * Scene 8: Evidence Generation (5 seconds — tight timeline)
 *
 * Progressive annotation timeline:
 * - Frame 0-40:   Section label + title appear
 * - Frame 40-100: Demo image springs in
 * - Frame 100-160: Bounding box appears with spring
 * - Frame 160-200: OCR/license plate typewriter
 * - Frame 200-250: SHA-256 hash reveals progressively
 * - Frame 250-280: "COURT ADMISSIBLE" badge pops in
 * - Frame 280-300: sceneExit
 */
export const Evidence: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* ── Section label — frame 0-40 entrance ── */
  const labelProgress = spring({ frame, fps, delay: 0, config: CONFIG_SMOOTH });
  const labelOp = interpolate(labelProgress, [0, 1], [0, 1]);
  const labelX = interpolate(labelProgress, [0, 1], [-30, 0]);

  /* ── Title — frame 5-40 entrance ── */
  const titleProgress = spring({ frame, fps, delay: 5, config: CONFIG_BOUNCY });
  const titleOp = interpolate(titleProgress, [0, 1], [0, 1]);
  const titleY = interpolate(titleProgress, [0, 1], [20, 0]);

  /* ── Evidence image — frame 40-100 spring entrance ── */
  const imgProgress = spring({ frame, fps, delay: 40, config: CONFIG_BOUNCY });
  const imgOp = interpolate(imgProgress, [0, 1], [0, 1]);
  const imgScale = interpolate(imgProgress, [0.3, 1], [0.9, 1]);
  const imgY = interpolate(imgProgress, [0, 1], [30, 0]);

  /* ── Bounding box — frame 100-160 spring ── */
  const bboxProgress = spring({ frame, fps, delay: 100, config: CONFIG_SNAPPY });
  const bboxOp = interpolate(bboxProgress, [0, 1], [0, 1]);
  const bboxScale = interpolate(bboxProgress, [0, 1], [0.8, 1]);

  /* ── OCR text — frame 160-200 typewriter ── */
  const plateChars = typewriter(frame, fps, 160, 25);
  const plateVisible = PLATE_TEXT.slice(0, Math.floor(plateChars));
  const plateComplete = plateChars >= PLATE_TEXT.length;

  /* ── SHA-256 hash — frame 200-250 progressive reveal ── */
  const hashChars = interpolate(frame, [200, 250], [0, FULL_HASH.length], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const hashVisible = FULL_HASH.slice(0, Math.floor(hashChars));
  const hashComplete = frame >= 250;
  const hashOp = interpolate(frame, [195, 205], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  /* ── "COURT ADMISSIBLE" badge — frame 250-280 spring pop ── */
  const badgeProgress = spring({ frame, fps, delay: 250, config: CONFIG_BOUNCY });
  const badgeOp = interpolate(badgeProgress, [0, 1], [0, 1]);
  const badgeScale = interpolate(badgeProgress, [0, 1], [0.5, 1]);

  /* ── Scene exit — last 18 frames ── */
  const exit = sceneExit(frame, TOTAL_FRAMES, 18);

  /* ── Visible ambient motion ── */
  const labelIdle = visibleFloat(frame, 0.04, 10, 0);
  const titleIdle = visibleFloat(frame, 0.045, 12, 0.5);
  const hashIdle = visibleFloat(frame, 0.04, 8, 2.0);

  /* ── Ken Burns for evidence image ── */
  const kb = kenBurns(frame, TOTAL_FRAMES, 1.02, 4, 2);

  /* ── Timeline step indicators ── */
  const steps = [
    { label: "Image Capture", frame: 40 },
    { label: "AI Detection", frame: 100 },
    { label: "OCR + Plate", frame: 160 },
    { label: "Hash Seal", frame: 200 },
    { label: "Court Admissible", frame: 250 },
  ];

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AnimatedBackground particleCount={15} seed={77} />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "50px 60px",
          opacity: exit.opacity,
          transform: `translateY(${exit.translateY}px)`,
        }}
      >
        {/* Section label */}
        <div
          style={{
            fontFamily,
            fontSize: 18,
            fontWeight: 600,
            color: COLORS.warning,
            letterSpacing: "0.25em",
            textTransform: "uppercase" as const,
            opacity: labelOp,
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 10,
            transform: `translateX(${labelX}px) translateY(${labelIdle}px)`,
          }}
        >
          <div style={{ width: 20, height: 1, backgroundColor: COLORS.warning }} />
          Court-Admissible
          <div style={{ width: 20, height: 1, backgroundColor: COLORS.warning }} />
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily,
            fontSize: 44,
            fontWeight: 700,
            color: COLORS.text,
            textAlign: "center",
            opacity: titleOp,
            transform: `translateY(${titleY + titleIdle}px)`,
            marginBottom: 36,
          }}
        >
          Evidence Generation
        </div>

        {/* Main content: Image + Timeline */}
        <div style={{ display: "flex", gap: 48, alignItems: "flex-start" }}>
          {/* Left: Evidence image with overlays */}
          <div
            style={{
              width: 520,
              height: 340,
              position: "relative",
              borderRadius: 12,
              overflow: "hidden",
              border: `1px solid ${COLORS.border}`,
              opacity: imgOp,
              transform: `translateY(${imgY}px) scale(${imgScale})`,
              boxShadow: `0 8px 40px rgba(0,0,0,0.4), 0 0 60px rgba(6,182,212,0.05)`,
            }}
          >
            {/* Demo image with Ken Burns */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                transform: `scale(${kb.scale}) translate(${kb.x}px, ${kb.y}px)`,
                transformOrigin: "center center",
              }}
            >
              <Img
                src={staticFile("demo/demo_triple_riding_whitefield-01.jpg")}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: "brightness(0.8) contrast(1.05)",
                }}
              />
            </div>

            {/* Subtle overlay */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: "rgba(6,182,212,0.03)",
              }}
            />

            {/* Bounding box — appears at frame 100 */}
            <div
              style={{
                position: "absolute",
                left: 120,
                top: 60,
                width: 140,
                height: 180,
                border: `2px solid ${COLORS.danger}`,
                borderRadius: 4,
                boxShadow: `0 0 20px rgba(239,68,68,0.25)`,
                opacity: bboxOp,
                transform: `scale(${bboxScale})`,
                transformOrigin: "top left",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -24,
                  left: 0,
                  fontFamily,
                  fontSize: 13,
                  fontWeight: 600,
                  color: COLORS.danger,
                  backgroundColor: `${COLORS.bg}dd`,
                  padding: "3px 8px",
                  borderRadius: 3,
                  whiteSpace: "nowrap" as const,
                }}
              >
                NO HELMET · 87%
              </div>
            </div>

            {/* License plate — typewriter at frame 160 */}
            <div
              style={{
                position: "absolute",
                bottom: 36,
                right: 36,
                backgroundColor: COLORS.bgCard,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 6,
                padding: "6px 14px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                opacity: interpolate(frame, [155, 165], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              }}
            >
              <Icon name="hash" size={14} color={COLORS.warning} />
              <span
                style={{
                  fontFamily,
                  fontSize: 18,
                  fontWeight: 700,
                  color: COLORS.warning,
                  letterSpacing: "0.12em",
                }}
              >
                {plateVisible}
                {!plateComplete && (
                  <span
                    style={{
                      opacity: Math.sin(frame * 0.15) > 0 ? 1 : 0,
                      color: COLORS.warning,
                    }}
                  >
                    |
                  </span>
                )}
              </span>
            </div>

            {/* Timestamp */}
            <div
              style={{
                position: "absolute",
                top: 10,
                right: 12,
                fontFamily,
                fontSize: 13,
                color: COLORS.textMuted,
                opacity: 0.85,
              }}
            >
              2026-06-21 14:32:07 IST
            </div>
          </div>

          {/* Right: Progressive annotation timeline */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              width: 340,
            }}
          >
            {steps.map((step, i) => {
              const stepActive = frame >= step.frame;
              const stepOpacity = interpolate(
                frame,
                [step.frame, step.frame + 12],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
              );
              const stepX = interpolate(
                frame,
                [step.frame, step.frame + 15],
                [20, 0],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
              );

              const isLast = i === steps.length - 1;
              const activeColor = isLast ? COLORS.success : COLORS.primary;

              return (
                <React.Fragment key={i}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      opacity: stepOpacity,
                      transform: `translateX(${stepX}px)`,
                      padding: "8px 12px",
                      borderRadius: 8,
                      backgroundColor: stepActive
                        ? `${activeColor}10`
                        : "transparent",
                      borderLeft: `3px solid ${stepActive ? activeColor : COLORS.border}`,
                    }}
                  >
                    {/* Step indicator dot */}
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        backgroundColor: stepActive ? activeColor : COLORS.border,
                        boxShadow: stepActive ? `0 0 8px ${activeColor}` : "none",
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontFamily,
                        fontSize: 15,
                        fontWeight: stepActive ? 600 : 400,
                        color: stepActive ? COLORS.text : COLORS.textMuted,
                      }}
                    >
                      {step.label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      style={{
                        marginLeft: 4,
                        width: 2,
                        height: 10,
                        backgroundColor: frame >= steps[i + 1]?.frame
                          ? COLORS.primary
                          : COLORS.border,
                        borderRadius: 1,
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* SHA-256 Hash — progressive reveal */}
        <div
          style={{
            marginTop: 28,
            display: "flex",
            alignItems: "center",
            gap: 12,
            opacity: hashOp,
            transform: `translateY(${hashIdle}px)`,
          }}
        >
          <Icon name="hash" size={16} color={COLORS.textSubtle} />
          <div
            style={{
              fontFamily,
              fontSize: 14,
              fontWeight: 400,
              color: COLORS.textMuted,
              backgroundColor: COLORS.bgElevated,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 6,
              padding: "8px 16px",
              letterSpacing: "0.05em",
              minWidth: 320,
            }}
          >
            SHA-256: {hashVisible}
            {hashComplete && (
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  color: COLORS.success,
                }}
              >
                ✓ SEALED
              </span>
            )}
          </div>
        </div>

        {/* "COURT ADMISSIBLE" badge — frame 250-280 */}
        <div
          style={{
            marginTop: 20,
            opacity: badgeOp,
            transform: `scale(${badgeScale})`,
          }}
        >
          <div
            style={{
              fontFamily,
              fontSize: 20,
              fontWeight: 800,
              color: COLORS.success,
              backgroundColor: `${COLORS.success}18`,
              border: `2px solid ${COLORS.success}`,
              borderRadius: 10,
              padding: "10px 28px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              letterSpacing: "0.15em",
              textTransform: "uppercase" as const,
              boxShadow: `0 0 24px rgba(16,185,129,0.2), 0 4px 16px rgba(0,0,0,0.3)`,
            }}
          >
            <Icon name="shield" size={20} color={COLORS.success} />
            COURT ADMISSIBLE
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
