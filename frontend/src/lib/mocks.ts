/**
 * Mock data for VigilAI demo mode.
 *
 * When the frontend runs without a live backend, API functions return these
 * hardcoded responses so the dashboard, upload page, and violations list
 * all work with realistic Bengaluru traffic-violation data.
 */

import type {
  AnalyticsOverview,
  DetectResponse,
  ViolationRecord,
} from "../types/violation";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** ISO date string for `offset` days ago (0 = today). */
function daysAgo(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
}

/** Deterministic pseudo-id so records look real in the UI. */
let _seq = 1000;
function seqId(): string {
  _seq += 1;
  return `VLN-${String(_seq).padStart(5, "0")}`;
}

// ---------------------------------------------------------------------------
// MOCK_VIOLATIONS — 5 typical detections
// ---------------------------------------------------------------------------

export const MOCK_VIOLATIONS: ViolationRecord[] = [
  {
    id: seqId(),
    violation_type: "no_helmet",
    confidence: 0.91,
    confidence_tier: "high",
    bbox: { x1: 312, y1: 184, x2: 427, y2: 340 },
    person_bbox: { x1: 290, y1: 120, x2: 450, y2: 400 },
    metadata: {},
    mv_act_section: "S.129",
    fine_amount: 500,
    license_plate: null,
    status: "pending",
    data_source: "live",
    camera_id: "MGROAD-01",
    junction_name: "MG Road — Trinity Circle",
    latitude: 12.9758,
    longitude: 77.6085,
    timestamp: "2026-06-17T09:14:32Z",
    evidence_url: null,
    evidence_hash: null,
  },
  {
    id: seqId(),
    violation_type: "triple_riding",
    confidence: 0.72,
    confidence_tier: "medium",
    bbox: { x1: 502, y1: 210, x2: 680, y2: 395 },
    person_bbox: null,
    metadata: { rider_count: 3 },
    mv_act_section: "S.184",
    fine_amount: 1000,
    license_plate: null,
    status: "pending",
    data_source: "live",
    camera_id: "SILKBOARD-01",
    junction_name: "Silk Board Junction",
    latitude: 12.9172,
    longitude: 77.6228,
    timestamp: "2026-06-17T10:02:15Z",
    evidence_url: null,
    evidence_hash: null,
  },
  {
    id: seqId(),
    violation_type: "wrong_side_driving",
    confidence: 0.88,
    confidence_tier: "high",
    bbox: { x1: 120, y1: 260, x2: 310, y2: 430 },
    person_bbox: null,
    metadata: {},
    mv_act_section: "S.184",
    fine_amount: 1000,
    license_plate: null,
    status: "pending",
    data_source: "live",
    camera_id: "HEBBAL-01",
    junction_name: "Hebbal Flyover",
    latitude: 13.0358,
    longitude: 77.5970,
    timestamp: "2026-06-17T08:45:50Z",
    evidence_url: null,
    evidence_hash: null,
  },
  {
    id: seqId(),
    violation_type: "illegal_parking",
    confidence: 0.58,
    confidence_tier: "low",
    bbox: { x1: 700, y1: 310, x2: 900, y2: 480 },
    person_bbox: null,
    metadata: {},
    mv_act_section: "S.122",
    fine_amount: 200,
    license_plate: null,
    status: "pending",
    data_source: "live",
    camera_id: "WHITEFIELD-01",
    junction_name: "Whitefield Main Road",
    latitude: 12.9698,
    longitude: 77.7500,
    timestamp: "2026-06-17T11:30:05Z",
    evidence_url: null,
    evidence_hash: null,
  },
  {
    id: seqId(),
    violation_type: "no_helmet",
    confidence: 0.85,
    confidence_tier: "high",
    bbox: { x1: 240, y1: 150, x2: 360, y2: 320 },
    person_bbox: { x1: 220, y1: 100, x2: 380, y2: 380 },
    metadata: {},
    mv_act_section: "S.129",
    fine_amount: 500,
    license_plate: {
      text: "KA01AB1234",
      confidence: 0.93,
      bbox: { x1: 260, y1: 330, x2: 350, y2: 365 },
    },
    status: "pending",
    data_source: "live",
    camera_id: "ELECTRONIC-01",
    junction_name: "Electronic City Phase 1",
    latitude: 12.8454,
    longitude: 77.6604,
    timestamp: "2026-06-17T12:05:44Z",
    evidence_url: null,
    evidence_hash: null,
  },
];

// ---------------------------------------------------------------------------
// MOCK_DETECT_RESPONSE
// ---------------------------------------------------------------------------

export const MOCK_DETECT_RESPONSE: DetectResponse = {
  success: true,
  processing_time_ms: 347,
  timing_breakdown: {
    preprocess_ms: 28,
    detect_coco_ms: 95,
    detect_helmet_ms: 72,
    violation_logic_ms: 18,
    detect_plate_ms: 54,
    ocr_ms: 42,
    evidence_gen_ms: 38,
  },
  violations: MOCK_VIOLATIONS,
  image_dimensions: { width: 1280, height: 720 },
};

// ---------------------------------------------------------------------------
// MOCK_ANALYTICS
// ---------------------------------------------------------------------------

export const MOCK_ANALYTICS: AnalyticsOverview = {
  total_violations: 281,
  violations_by_type: {
    no_helmet: 132,
    triple_riding: 53,
    wrong_side_driving: 39,
    illegal_parking: 28,
    no_seatbelt: 12,
    stop_line_violation: 9,
    red_light_violation: 5,
    license_plate_mismatch: 3,
  },
  violations_by_tier: {
    high: 168,
    medium: 89,
    low: 24,
  },
  violations_by_status: {
    pending: 228,
    approved: 42,
    rejected: 11,
  },
  avg_confidence: 0.74,
  total_fines: 178500,
  daily_counts: [
    { date: daysAgo(6), count: 42 },
    { date: daysAgo(5), count: 37 },
    { date: daysAgo(4), count: 45 },
    { date: daysAgo(3), count: 33 },
    { date: daysAgo(2), count: 48 },
    { date: daysAgo(1), count: 40 },
    { date: daysAgo(0), count: 36 },
  ],
  top_cameras: [
    { camera_id: "MGROAD-01", count: 64 },
    { camera_id: "SILKBOARD-01", count: 52 },
    { camera_id: "HEBBAL-01", count: 45 },
    { camera_id: "WHITEFIELD-01", count: 39 },
    { camera_id: "KORMANGALA-01", count: 34 },
  ],
};
