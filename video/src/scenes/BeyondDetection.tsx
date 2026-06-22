import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import {
  COLORS,
  FPS,
  BEYOND_DETECTION_FEATURES,
  type IconName,
} from "../constants";
import {
  transforms,
  CONFIG_ELASTIC,
  CONFIG_SMOOTH,
  visibleFloat,
  visibleBreathe,
  highlightSweep,
  fadeInEased,
  sceneExit,
} from "../animations";
import { AnimatedBackground } from "../AnimatedBackground";
import { Icon } from "../Icon";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["300", "400", "600", "700", "800"],
  subsets: ["latin"],
});

/** 8 seconds at 60 fps = 480 frames. */
const TOTAL_FRAMES = 8 * FPS;

/** Stagger gap between card entrances in seconds. */
const STAGGER_SEC = 0.12;
/** Convert stagger gap to frames. */
const STAGGER_FRAMES = Math.round(STAGGER_SEC * FPS);

/** 3-column × 2-row grid layout index mapping. */
const GRID_ROWS = [
  [0, 1, 2],
  [3, 4, 5],
];

/* ──────────────────────────────────────────────────────────────── */

/**
 * Scene 9: Beyond Detection
 *
 * Showcases six advanced features of VigilAI that go beyond
 * basic violation detection. Each feature enters with a spring
 * animation and then floats/breathes continuously.
 */
export const BeyondDetection: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* ── Section label — enters from left ── */
  const labelDelay = 0;
  const labelProgress = spring({
    frame,
    fps,
    delay: labelDelay,
    config: CONFIG_SMOOTH,
  });
  const labelOpacity = interpolate(labelProgress, [0, 1], [0, 1]);
  const labelX = interpolate(labelProgress, [0, 1], [-40, 0]);

  /* ── Title — spring entrance ── */
  const titleDelay = 6;
  const titleProgress = spring({
    frame,
    fps,
    delay: titleDelay,
    config: CONFIG_ELASTIC,
  });
  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);
  const titleY = interpolate(titleProgress, [0, 1], [30, 0]);
  const titleScale = interpolate(titleProgress, [0.3, 1], [0.92, 1]);

  /* ── Continuous visible motion for text ── */
  const labelIdle = visibleFloat(frame, 0.04, 10, 0);
  const titleIdle = visibleFloat(frame, 0.045, 12, 0.5);

  /* ── Scene exit ── */
  const exit = sceneExit(frame, TOTAL_FRAMES, 18);

  /* ── Card base delay — starts after title ── */
  const cardBaseDelay = 20;

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {/* Animated background */}
      <AnimatedBackground showGrid glowCount={2} />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "50px 80px",
          opacity: exit.opacity,
          transform: `translateY(${exit.translateY}px)`,
        }}
      >
        {/* Section label — small uppercase, entering from left */}
        <div
          style={{
            fontFamily,
            fontSize: 16,
            fontWeight: 600,
            color: COLORS.textMuted,
            letterSpacing: "0.3em",
            textTransform: "uppercase" as const,
            opacity: labelOpacity,
            transform: `translateX(${labelX}px) translateY(${labelIdle}px)`,
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 24,
              height: 1,
              backgroundColor: COLORS.textMuted,
            }}
          />
          Beyond Detection
          <div
            style={{
              width: 24,
              height: 1,
              backgroundColor: COLORS.textMuted,
            }}
          />
        </div>

        {/* Title — large bold, spring entrance */}
        <div
          style={{
            fontFamily,
            fontSize: 44,
            fontWeight: 700,
            color: COLORS.text,
            textAlign: "center",
            opacity: titleOpacity,
            transform: transforms(
              `translateY(${titleY + titleIdle}px)`,
              `scale(${titleScale})`,
            ),
            marginBottom: 48,
          }}
        >
          Intelligent Enforcement Ecosystem
        </div>

        {/* Feature grid — 3 columns × 2 rows */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            width: "100%",
            maxWidth: 1200,
          }}
        >
          {GRID_ROWS.map((row) => (
            <div
              key={row.join("-")}
              style={{
                display: "flex",
                gap: 16,
                justifyContent: "center",
              }}
            >
              {row.map((featureIdx) => {
                const feature = BEYOND_DETECTION_FEATURES[featureIdx];
                if (!feature) return null;

                return (
                  <FeatureCard
                    key={featureIdx}
                    label={feature.label}
                    desc={feature.desc}
                    icon={feature.icon}
                    color={feature.color}
                    index={featureIdx}
                    frame={frame}
                    fps={fps}
                    baseDelay={cardBaseDelay}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ──────────────────────── Feature Card ──────────────────────── */

interface FeatureCardProps {
  label: string;
  desc: string;
  icon: IconName;
  color: string;
  index: number;
  frame: number;
  fps: number;
  baseDelay: number;
}

/**
 * Individual feature card with colored icon, label, description,
 * spring entrance, highlight sweep, and continuous visible motion.
 *
 * After entrance (frame ~60+), cards highlight one by one via
 * highlightSweep. The active card gets a brighter border, scale
 * boost, glowing icon, and its description text fades in.
 */
const FeatureCard: React.FC<FeatureCardProps> = ({
  label,
  desc,
  icon,
  color,
  index,
  frame,
  fps,
  baseDelay,
}) => {
  const delay = baseDelay + index * STAGGER_FRAMES;

  const progress = spring({ frame, fps, delay, config: CONFIG_ELASTIC });
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const translateY = interpolate(progress, [0, 1], [35, 0]);
  const entranceScale = interpolate(progress, [0.3, 1], [0.9, 1]);

  /* ── Highlight sweep: each card lights up sequentially after frame 60 ── */
  const sweepIntensity = highlightSweep(frame, 60, 60, index, 6);
  const isActive = sweepIntensity > 0.5;

  /* ── Visible ambient motion (10-12px drift, ±2% breathe) ── */
  const breathe = visibleBreathe(frame, 0.04, 0.02);
  const float = visibleFloat(frame, 0.045, 12, index * 0.6);

  /* ── Active card scale boost ── */
  const sweepScale = interpolate(sweepIntensity, [0, 1], [1, 1.04]);

  /* ── Icon glow when active ── */
  const iconGlow = interpolate(sweepIntensity, [0, 1], [0, 0.8]);

  /* ── Description text fades in when card is highlighted ── */
  const descOpacity = interpolate(sweepIntensity, [0, 0.5, 1], [0.4, 0.7, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  /* ── Border brightness based on sweep ── */
  const borderOpacity = interpolate(sweepIntensity, [0, 1], [0.3, 0.9], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: COLORS.bgCard,
        borderRadius: 12,
        padding: "20px 22px",
        opacity,
        transform: transforms(
          `translateY(${translateY + float}px)`,
          `scale(${entranceScale * breathe * sweepScale})`,
        ),
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        boxShadow: isActive
          ? `0 0 20px ${color}30, inset 0 0 30px ${color}08`
          : "none",
        border: isActive
          ? `1px solid ${color}${Math.round(borderOpacity * 99).toString().padStart(2, "0")}`
          : `1px solid ${COLORS.border}`,
        borderLeft: `4px solid ${color}`,
      }}
    >
      {/* Icon with glow when active */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          backgroundColor: `${color}18`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: iconGlow > 0 ? `0 0 ${12 * iconGlow}px ${color}60` : "none",
          transform: `scale(${1 + iconGlow * 0.08})`,
        }}
      >
        <Icon name={icon} size={22} color={color} />
      </div>

      {/* Text content */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div
          style={{
            fontFamily,
            fontSize: 18,
            fontWeight: 700,
            color: isActive ? COLORS.text : COLORS.textMuted,
            lineHeight: 1.2,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily,
            fontSize: 14,
            fontWeight: 400,
            color: COLORS.textMuted,
            lineHeight: 1.4,
            opacity: descOpacity,
          }}
        >
          {desc}
        </div>
      </div>
    </div>
  );
};
