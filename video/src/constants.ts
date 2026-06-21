/**
 * VigilAI Launch Video — Shared Constants & Theme
 *
 * Every scene references these values so the visual language
 * stays consistent. All durations are in SECONDS — multiply by
 * fps from useVideoConfig() when converting to frames.
 */

/** Video resolution. */
export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;
export const FPS = 60;

/** Total duration in seconds. */
export const TOTAL_DURATION_SECS = 90;

/* ──────────────────────── Scene Timings (seconds) ──────────────────────── */

export const SCENES = {
  coldOpen:       { start: 0,  duration: 5 },
  problem:        { start: 5,  duration: 10 },
  intro:          { start: 15, duration: 5 },
  pipeline:       { start: 20, duration: 20 },
  liveDetection:  { start: 40, duration: 15 },
  violationTypes: { start: 55, duration: 10 },
  dashboard:      { start: 65, duration: 12 },
  evidence:       { start: 77, duration: 5 },
  impact:         { start: 82, duration: 8 },
} as const;

/** Transition duration in frames between scenes. */
export const TRANSITION_FRAMES = 15;

/* ──────────────────────── Color Palette ──────────────────────── */

export const COLORS = {
  bg:            "#0A0E1A",
  bgCard:        "#111827",
  border:        "#1E293B",
  primary:       "#06B6D4",
  primaryGlow:   "rgba(6, 182, 212, 0.4)",
  secondary:     "#3B82F6",
  danger:        "#EF4444",
  warning:       "#F59E0B",
  success:       "#10B981",
  text:          "#FFFFFF",
  textMuted:     "#94A3B8",
  textSubtle:    "#64748B",
} as const;

/* ──────────────────────── Staged Data ──────────────────────── */

export const PIPELINE_STAGES = [
  { label: "Upload",           timing: "—",      icon: "📤", color: COLORS.secondary },
  { label: "Preprocess",       timing: "12 ms",  icon: "🔧", color: "#8B5CF6" },
  { label: "COCO Detect",     timing: "180 ms", icon: "👁️", color: COLORS.primary },
  { label: "Helmet Detect",    timing: "95 ms",  icon: "🪖", color: COLORS.success },
  { label: "Violation Logic", timing: "8 ms",   icon: "⚖️", color: COLORS.warning },
  { label: "Plate Detect",     timing: "210 ms", icon: "🔢", color: "#EC4899" },
  { label: "OCR + Regex",      timing: "150 ms", icon: "🔤", color: "#F97316" },
  { label: "Evidence Gen",     timing: "45 ms",  icon: "📋", color: COLORS.danger },
] as const;

export const VIOLATION_TYPES = [
  { type: "No Helmet",          fine: "₹500",  section: "Sec 129",  icon: "🪖", color: COLORS.danger },
  { type: "Triple Riding",     fine: "₹1,000", section: "Sec 184", icon: "🏍️", color: COLORS.warning },
  { type: "Wrong Side",        fine: "₹1,000", section: "Sec 184", icon: "⛔", color: "#EC4899" },
  { type: "Illegal Parking",   fine: "₹200",  section: "Sec 122",  icon: "🅿️", color: COLORS.secondary },
  { type: "No Seatbelt",       fine: "₹1,000", section: "Sec 194B",icon: "💺", color: "#8B5CF6" },
  { type: "Stop Line",         fine: "₹1,000", section: "Sec 184", icon: "🛑", color: "#F97316" },
  { type: "Red Light",         fine: "₹1,000", section: "Sec 184", icon: "🔴", color: COLORS.danger },
] as const;

export const IMPACT_METRICS = [
  { label: "Cost per Junction", value: "₹25K", sub: "vs ₹50K+ competitors" },
  { label: "End-to-End Latency", value: "1.2s", sub: "upload → evidence" },
  { label: "VRAM Footprint", value: "4 GB", sub: "RTX 3050 consumer GPU" },
  { label: "Annual ROI", value: "87×", sub: "₹438 Cr potential" },
] as const;

export const PROBLEM_STATS = [
  { value: "500+", label: "Unmonitored Junctions", icon: "📹" },
  { value: "42%",  label: "Evidence Rejection Rate", icon: "📄" },
  { value: "₹438 Cr", label: "Revenue Lost Annually", icon: "💸" },
  { value: "75 L", label: "Violations per Year", icon: "⚠️" },
] as const;

export const DASHBOARD_COUNTERS = [
  { label: "Violations", value: 281, suffix: "", color: COLORS.danger },
  { label: "Confidence", value: 94.2, suffix: "%", color: COLORS.success },
  { label: "Revenue", value: 438, suffix: "Cr", color: COLORS.primary },
  { label: "Coverage", value: 87, suffix: "%", color: COLORS.warning },
] as const;

export const MOCK_DETECTION = {
  image: "demo/demo_no_helmet_mgroad-01.jpg",
  violations: [
    {
      type: "No Helmet",
      confidence: 0.94,
      bbox: { x: 680, y: 220, width: 180, height: 340 },
      plate: "KA-01-MF-4291",
    },
    {
      type: "No Helmet",
      confidence: 0.87,
      bbox: { x: 1050, y: 260, width: 160, height: 300 },
      plate: null,
    },
  ],
  processingTime: 1247,
} as const;
