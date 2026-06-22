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
  idleFloat,
  idleBreathe,
  idleDrift,
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

const TOTAL_FRAMES = 12 * FPS;

// Dashboard KPI cards
const KPI_CARDS = [
  { label: "Violations Today", value: "1,247", icon: "alert" as const, color: COLORS.danger, delta: "+12%" },
  { label: "Approval Rate", value: "94%", icon: "check" as const, color: COLORS.success, delta: "" },
  { label: "Avg Processing", value: "2.4s", icon: "clock" as const, color: COLORS.primary, delta: "-0.3s" },
  { label: "Active Cameras", value: "142", icon: "camera" as const, color: COLORS.secondary, delta: "+8" },
];

// Recent violations feed
const FEED_ITEMS = [
  { time: "14:32", type: "No Helmet", location: "MG Road Junction", severity: "high" },
  { time: "14:28", type: "Triple Riding", location: "Koramangala Signal", severity: "high" },
  { time: "14:25", type: "Illegal Parking", location: "Indiranagar 100ft Rd", severity: "low" },
  { time: "14:21", type: "Wrong Side", location: "Hebbal Flyover", severity: "medium" },
  { time: "14:18", type: "No Helmet", location: "Whitefield Main Rd", severity: "high" },
];

/**
 * Scene 7: Command Center Dashboard
 * Simulated live dashboard with KPI cards, violation feed,
 * pulsing indicators, and continuous motion.
 */
export const Dashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Section label
  const labelProgress = spring({ frame, fps, delay: 0, config: CONFIG_SMOOTH });
  const labelOp = interpolate(labelProgress, [0, 1], [0, 1]);

  // Title
  const titleProgress = spring({ frame, fps, delay: 8, config: CONFIG_BOUNCY });
  const titleOp = interpolate(titleProgress, [0, 1], [0, 1]);
  const titleY = interpolate(titleProgress, [0, 1], [20, 0]);

  // Dashboard container entrance
  const dashProgress = spring({ frame, fps, delay: 20, config: CONFIG_SMOOTH });
  const dashOp = interpolate(dashProgress, [0, 1], [0, 1]);
  const dashScale = interpolate(dashProgress, [0.5, 1], [0.97, 1]);

  // Scene exit
  const exit = sceneExit(frame, TOTAL_FRAMES, 18);

  // Idle motion
  const labelIdle = idleFloat(frame, 0.035, 1.5, 0);
  const titleIdle = idleFloat(frame, 0.04, 2, 0.5);
  const dashBreathe = idleBreathe(frame, 0.02, 0.002);

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {/* Animated background */}
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
            {/* Left column: KPI cards */}
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
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor: COLORS.danger,
                    transform: `scale(${pulse(frame, 0.05, 0.2, 1)})`,
                    boxShadow: `0 0 6px ${COLORS.danger}`,
                  }}
                />
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
  const cardFloat = floatY(frame, 0.015 + index * 0.003, 1.5, index * 0.6);
  const iconPulse = pulse(frame, 0.03 + index * 0.004, 0.04, 1);
  const cardBreathe = idleBreathe(frame, 0.03 + index * 0.004, 0.003);

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
            {kpi.value}
          </span>
          {kpi.delta && (
            <span
              style={{
                fontFamily,
                fontSize: 13,
                fontWeight: 600,
                color: kpi.delta.startsWith("+") || kpi.delta.startsWith("-0")
                  ? COLORS.success
                  : kpi.delta.startsWith("+")
                    ? COLORS.danger
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
  const delay = stagger(index, 6) + 50;

  const progress = spring({ frame, fps, delay, config: CONFIG_SMOOTH });
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const translateY = interpolate(progress, [0, 1], [10, 0]);

  const feedIdle = idleFloat(frame, 0.035, 1, index * 0.4);

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
