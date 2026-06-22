import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS, FPS } from "../constants";
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
  visibleFloat,
  visibleBreathe,
  countUpEased,
  pulseRing,
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

/** 12 seconds at 60 fps = 720 frames. */
const TOTAL_FRAMES = 12 * FPS;

/**
 * Dashboard KPI cards with numeric values for countUpEased animation.
 * Values count from 0 → target starting at staggered delays.
 */
const KPI_CARDS = [
  { label: "Violations Today", numericValue: 281, suffix: "", icon: "alert" as const, color: COLORS.danger, delta: "+12%", isDecimal: false, countStart: 60, countDur: 120 },
  { label: "Approval Rate", numericValue: 94.2, suffix: "%", icon: "check" as const, color: COLORS.success, delta: "", isDecimal: true, countStart: 75, countDur: 100 },
  { label: "Avg Processing", numericValue: 2.4, suffix: "s", icon: "clock" as const, color: COLORS.primary, delta: "-0.3s", isDecimal: true, countStart: 90, countDur: 90 },
  { label: "Active Cameras", numericValue: 142, suffix: "", icon: "camera" as const, color: COLORS.secondary, delta: "+8", isDecimal: false, countStart: 105, countDur: 100 },
];

/**
 * Recent violations feed — items appear progressively every ~90 frames.
 * First batch visible from frame 50, new entries slide in at 140, 230, 320, 410.
 */
const FEED_ITEMS = [
  { time: "14:32", type: "No Helmet", location: "MG Road Junction", severity: "high" as const, appearFrame: 50 },
  { time: "14:28", type: "Triple Riding", location: "Koramangala Signal", severity: "high" as const, appearFrame: 50 },
  { time: "14:25", type: "Illegal Parking", location: "Indiranagar 100ft Rd", severity: "low" as const, appearFrame: 140 },
  { time: "14:21", type: "Wrong Side", location: "Hebbal Flyover", severity: "medium" as const, appearFrame: 230 },
  { time: "14:18", type: "No Helmet", location: "Whitefield Main Rd", severity: "high" as const, appearFrame: 320 },
  { time: "14:12", type: "No Seatbelt", location: "Outer Ring Road", severity: "high" as const, appearFrame: 410 },
];

/**
 * Scene 7: Command Center Dashboard (12 seconds)
 *
 * Narrative progression:
 * - KPI counters tick up from 0 to target values
 * - Feed items slide in progressively at intervals
 * - Camera dot pulses visibly
 * - Continuous visible ambient motion on all elements
 */
export const Dashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* ── Section label ── */
  const labelProgress = spring({ frame, fps, delay: 0, config: CONFIG_SMOOTH });
  const labelOp = interpolate(labelProgress, [0, 1], [0, 1]);

  /* ── Title ── */
  const titleProgress = spring({ frame, fps, delay: 8, config: CONFIG_BOUNCY });
  const titleOp = interpolate(titleProgress, [0, 1], [0, 1]);
  const titleY = interpolate(titleProgress, [0, 1], [20, 0]);

  /* ── Dashboard container entrance ── */
  const dashProgress = spring({ frame, fps, delay: 20, config: CONFIG_SMOOTH });
  const dashOp = interpolate(dashProgress, [0, 1], [0, 1]);
  const dashScale = interpolate(dashProgress, [0.5, 1], [0.97, 1]);

  /* ── Scene exit ── */
  const exit = sceneExit(frame, TOTAL_FRAMES, 18);

  /* ── Visible ambient motion (8-10px drift, ±2% breathe) ── */
  const labelIdle = visibleFloat(frame, 0.04, 10, 0);
  const titleIdle = visibleFloat(frame, 0.045, 12, 0.5);
  const dashBreathe = visibleBreathe(frame, 0.035, 0.015);

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AnimatedBackground particleCount={15} seed={66} />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 50px",
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
            color: COLORS.success,
            letterSpacing: "0.25em",
            textTransform: "uppercase" as const,
            opacity: labelOp,
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 10,
            transform: `translateY(${labelIdle}px)`,
          }}
        >
          <div style={{ width: 20, height: 1, backgroundColor: COLORS.success }} />
          Command Center
          <div style={{ width: 20, height: 1, backgroundColor: COLORS.success }} />
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily,
            fontSize: 44,
            fontWeight: 700,
            color: COLORS.text,
            opacity: titleOp,
            transform: `translateY(${titleY + titleIdle}px)`,
            marginBottom: 30,
          }}
        >
          Real-Time Dashboard
        </div>

        {/* Dashboard frame */}
        <div
          style={{
            width: 1060,
            backgroundColor: COLORS.bgCard,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 16,
            overflow: "hidden",
            opacity: dashOp,
            transform: `scale(${dashScale * dashBreathe})`,
            boxShadow: `0 8px 40px rgba(0,0,0,0.4), 0 0 80px rgba(6,182,212,0.04)`,
          }}
        >
          {/* Top bar */}
          <div
            style={{
              height: 40,
              backgroundColor: COLORS.bgElevated,
              borderBottom: `1px solid ${COLORS.border}`,
              display: "flex",
              alignItems: "center",
              padding: "0 16px",
              gap: 8,
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: COLORS.danger }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: COLORS.warning }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: COLORS.success }} />
            <span
              style={{
                fontFamily,
                fontSize: 14,
                color: COLORS.textMuted,
                marginLeft: 12,
              }}
            >
              VigilAI Dashboard — Bengaluru Traffic Police
            </span>
          </div>

          <div style={{ padding: 24, display: "flex", gap: 24 }}>
            {/* Left column: KPI cards with countUp */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
              {KPI_CARDS.map((kpi, i) => (
                <KpiCard key={i} kpi={kpi} index={i} frame={frame} fps={fps} />
              ))}
            </div>

            {/* Right column: Violation feed */}
            <div style={{ width: 420 }}>
              <div
                style={{
                  fontFamily,
                  fontSize: 14,
                  fontWeight: 600,
                  color: COLORS.textMuted,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase" as const,
                  marginBottom: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {/* Pulsing live indicator dot with ring effect */}
                <div style={{ position: "relative", width: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div
                    style={{
                      position: "absolute",
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      border: `1.5px solid ${COLORS.danger}`,
                      opacity: pulseRing(frame, 0, 60, 2.5).opacity * 0.5,
                      transform: `scale(${pulseRing(frame, 0, 60, 2.5).scale})`,
                    }}
                  />
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: COLORS.danger,
                      transform: `scale(${pulse(frame, 0.06, 0.25, 1)})`,
                      boxShadow: `0 0 10px ${COLORS.danger}`,
                    }}
                  />
                </div>
                Recent Violations
              </div>

              {FEED_ITEMS.map((item, i) => (
                <FeedItem key={i} item={item} index={i} frame={frame} fps={fps} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ──────────────────────── KPI Card ──────────────────────── */

const KpiCard: React.FC<{
  kpi: typeof KPI_CARDS[number];
  index: number;
  frame: number;
  fps: number;
}> = ({ kpi, index, frame, fps }) => {
  const delay = stagger(index, 8) + 30;

  const progress = spring({ frame, fps, delay, config: CONFIG_SNAPPY });
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const translateX = interpolate(progress, [0, 1], [-20, 0]);

  const shimmerPos = shimmerPosition(frame, 180, delay + 20);
  const cardFloat = visibleFloat(frame, 0.03 + index * 0.004, 8, index * 0.6);
  const iconPulse = pulse(frame, 0.03 + index * 0.004, 0.06, 1);
  const cardBreathe = visibleBreathe(frame, 0.03 + index * 0.004, 0.018);

  /* ── CountUpEased for numeric value ── */
  const counted = countUpEased(frame, kpi.countStart, kpi.countDur, 0, kpi.numericValue);
  const countDone = frame >= kpi.countStart + kpi.countDur;
  const displayValue = kpi.isDecimal
    ? counted.toFixed(1)
    : Math.round(counted).toLocaleString();

  return (
    <div
      style={{
        backgroundColor: COLORS.bgElevated,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 10,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        opacity,
        transform: transforms(
          `translateX(${translateX}px)`,
          `translateY(${cardFloat}px)`,
          `scale(${cardBreathe})`,
        ),
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Shimmer */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(105deg, transparent 40%, rgba(6,182,212,${shimmerPos * 0.03}) 50%, transparent 60%)`,
          pointerEvents: "none",
        }}
      />

      {/* Icon */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          backgroundColor: `${kpi.color}15`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${iconPulse})`,
        }}
      >
        <Icon name={kpi.icon} size={18} color={kpi.color} />
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily,
            fontSize: 14,
            color: COLORS.textMuted,
            marginBottom: 2,
          }}
        >
          {kpi.label}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span
            style={{
              fontFamily,
              fontSize: 26,
              fontWeight: 700,
              color: COLORS.text,
              letterSpacing: "-0.02em",
            }}
          >
            {displayValue}
          </span>
          {/* Only show suffix after count completes */}
          {countDone && kpi.suffix && (
            <span
              style={{
                fontFamily,
                fontSize: 18,
                fontWeight: 600,
                color: COLORS.textMuted,
              }}
            >
              {kpi.suffix}
            </span>
          )}
          {kpi.delta && countDone && (
            <span
              style={{
                fontFamily,
                fontSize: 13,
                fontWeight: 600,
                color: kpi.delta.startsWith("+")
                  ? COLORS.success
                  : COLORS.success,
              }}
            >
              {kpi.delta}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

/* ──────────────────────── Feed Item ──────────────────────── */

const FeedItem: React.FC<{
  item: typeof FEED_ITEMS[number];
  index: number;
  frame: number;
  fps: number;
}> = ({ item, index, frame, fps }) => {
  /* Staggered entrance based on each item's appearFrame */
  const itemProgress = spring({
    frame,
    fps,
    delay: item.appearFrame,
    config: CONFIG_SMOOTH,
  });
  const opacity = interpolate(itemProgress, [0, 1], [0, 1]);
  const translateY = interpolate(itemProgress, [0, 1], [16, 0]);

  const feedIdle = visibleFloat(frame, 0.04, 8, index * 0.4);

  const severityColor =
    item.severity === "high"
      ? COLORS.danger
      : item.severity === "medium"
        ? COLORS.warning
        : COLORS.success;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 10px",
        borderRadius: 6,
        backgroundColor: index % 2 === 0 ? "transparent" : `${COLORS.bgElevated}`,
        opacity,
        transform: `translateY(${translateY + feedIdle}px)`,
        marginBottom: 2,
      }}
    >
      {/* Severity dot */}
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          backgroundColor: severityColor,
          flexShrink: 0,
        }}
      />

      {/* Time */}
      <span
        style={{
          fontFamily,
          fontSize: 13,
          color: COLORS.textMuted,
          width: 40,
          flexShrink: 0,
        }}
      >
        {item.time}
      </span>

      {/* Type */}
      <span
        style={{
          fontFamily,
          fontSize: 14,
          fontWeight: 600,
          color: COLORS.text,
          flex: 1,
        }}
      >
        {item.type}
      </span>

      {/* Location */}
      <span
        style={{
          fontFamily,
          fontSize: 13,
          color: COLORS.textMuted,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap" as const,
        }}
      >
        {item.location}
      </span>
    </div>
  );
};
