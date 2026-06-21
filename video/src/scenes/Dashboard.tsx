import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS, DASHBOARD_COUNTERS } from "../constants";
import { fadeIn, countUp, stagger, CONFIG_SMOOTH, CONFIG_SNAPPY } from "../animations";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["300", "400", "600", "700", "800"],
  subsets: ["latin"],
});

/**
 * Scene 7: Dashboard Walkthrough
 * Command-center style counters, bar chart, and camera health.
 */
export const Dashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOp = fadeIn(frame, 5, 20);

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
        Command Center
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
        BTP <span style={{ color: COLORS.primary }}>Dashboard</span>
      </div>

      {/* Stat cards row */}
      <div style={{ display: "flex", gap: 24, width: "100%", justifyContent: "center", marginBottom: 40 }}>
        {DASHBOARD_COUNTERS.map((counter, i) => (
          <StatCard key={i} counter={counter} index={i} frame={frame} fps={fps} />
        ))}
      </div>

      {/* Bar chart + side panel */}
      <div style={{ display: "flex", gap: 24, width: "100%", justifyContent: "center" }}>
        {/* Mini bar chart */}
        <BarChart frame={frame} fps={fps} />

        {/* Side panel — camera health */}
        <CameraHealthPanel frame={frame} fps={fps} />
      </div>
    </AbsoluteFill>
  );
};

/* ──────────────────────── Stat Card ──────────────────────── */

const StatCard: React.FC<{
  counter: typeof DASHBOARD_COUNTERS[number];
  index: number;
  frame: number;
  fps: number;
}> = ({ counter, index, frame, fps }) => {
  const delay = stagger(index, 8) + 20;
  const progress = spring({ frame, fps, delay, config: CONFIG_SMOOTH });
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const translateY = interpolate(progress, [0, 1], [20, 0]);

  const animatedValue = countUp(frame, counter.value, delay + 15, 40);

  const displayValue = counter.suffix === "%"
    ? (Number.isInteger(counter.value) ? Math.round(animatedValue) : animatedValue.toFixed(1))
    : Math.round(animatedValue);

  return (
    <div
      style={{
        flex: 1,
        maxWidth: 280,
        backgroundColor: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 14,
        padding: "28px 24px",
        opacity,
        transform: `translateY(${translateY}px)`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          backgroundColor: counter.color,
        }}
      />
      <div
        style={{
          fontFamily,
          fontSize: 13,
          color: COLORS.textSubtle,
          marginBottom: 8,
        }}
      >
        {counter.label}
      </div>
      <div
        style={{
          fontFamily,
          fontSize: 36,
          fontWeight: 800,
          color: counter.color,
          letterSpacing: "-0.02em",
        }}
      >
        {displayValue}{counter.suffix}
      </div>
    </div>
  );
};

/* ──────────────────────── Bar Chart ──────────────────────── */

const CHART_DATA = [
  { label: "No Helmet", value: 78, color: COLORS.danger },
  { label: "Triple", value: 42, color: COLORS.warning },
  { label: "Wrong Side", value: 35, color: "#EC4899" },
  { label: "Parking", value: 28, color: COLORS.secondary },
  { label: "Seatbelt", value: 22, color: "#8B5CF6" },
  { label: "Stop Line", value: 18, color: "#F97316" },
  { label: "Red Light", value: 15, color: COLORS.danger },
];

const BarChart: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const chartOp = fadeIn(frame, 60, 20);

  return (
    <div
      style={{
        flex: 1,
        maxWidth: 700,
        backgroundColor: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 14,
        padding: "24px 28px",
        opacity: chartOp,
      }}
    >
      <div
        style={{
          fontFamily,
          fontSize: 14,
          fontWeight: 600,
          color: COLORS.textMuted,
          marginBottom: 20,
        }}
      >
        Violations by Type
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {CHART_DATA.map((d, i) => {
          const delay = stagger(i, 4) + 70;
          const barProgress = spring({ frame, fps, delay, config: CONFIG_SMOOTH });
          const barWidth = interpolate(barProgress, [0, 1], [0, d.value]);

          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  fontFamily,
                  fontSize: 12,
                  color: COLORS.textSubtle,
                  width: 80,
                  textAlign: "right",
                }}
              >
                {d.label}
              </div>
              <div
                style={{
                  flex: 1,
                  height: 18,
                  backgroundColor: COLORS.border,
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${barWidth}%`,
                    backgroundColor: d.color,
                    borderRadius: 4,
                    opacity: 0.85,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ──────────────────────── Camera Health Panel ──────────────────────── */

const CAMERAS = [
  { name: "MG Road", status: "Online", uptime: 99.2 },
  { name: "Silk Board", status: "Online", uptime: 98.7 },
  { name: "Hebbal", status: "Online", uptime: 97.1 },
  { name: "Whitefield", status: "Degraded", uptime: 84.3 },
];

const CameraHealthPanel: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const panelOp = fadeIn(frame, 80, 20);

  return (
    <div
      style={{
        width: 300,
        backgroundColor: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 14,
        padding: "24px 20px",
        opacity: panelOp,
      }}
    >
      <div
        style={{
          fontFamily,
          fontSize: 14,
          fontWeight: 600,
          color: COLORS.textMuted,
          marginBottom: 16,
        }}
      >
        Camera Health
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {CAMERAS.map((cam, i) => {
          const delay = stagger(i, 6) + 90;
          const itemOp = fadeIn(frame, delay, 15);
          const isOnline = cam.status === "Online";

          return (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                opacity: itemOp,
                padding: "8px 0",
                borderBottom: `1px solid ${COLORS.border}`,
              }}
            >
              <div>
                <div style={{ fontFamily, fontSize: 13, fontWeight: 600, color: COLORS.text }}>
                  {cam.name}
                </div>
                <div style={{ fontFamily, fontSize: 11, color: COLORS.textSubtle }}>
                  {cam.uptime}% uptime
                </div>
              </div>
              <div
                style={{
                  fontFamily,
                  fontSize: 11,
                  fontWeight: 600,
                  color: isOnline ? COLORS.success : COLORS.warning,
                  backgroundColor: isOnline ? `${COLORS.success}15` : `${COLORS.warning}15`,
                  padding: "3px 8px",
                  borderRadius: 6,
                }}
              >
                {cam.status}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
