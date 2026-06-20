/**
 * Mock data for VigilAI demo mode.
 *
 * When the frontend runs without a live backend, API functions return these
 * hardcoded responses so the dashboard, upload page, and violations list
 * all work with realistic Bengaluru traffic-violation data.
 */

import type {
  AnalyticsOverview,
  ASTraMAlert,
  CameraHealth,
  DetectResponse,
  TrendForecast,
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
// MOCK_VIOLATIONS — 6 typical detections with new fields
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
    evidence_hash: "a3f2c8d9e1b4f6a7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1",
    danger_score: 46,
    ai_explanation: "No helmet detected on rider at bbox (312,184)-(427,340) with 91% confidence. Person bounding box confirms motorcycle rider. Fine: ₹500 under S.129.",
    is_duplicate: false,
    duplicate_group_id: null,
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
    status: "under_review",
    data_source: "live",
    camera_id: "SILKBOARD-01",
    junction_name: "Silk Board Junction",
    latitude: 12.9172,
    longitude: 77.6228,
    timestamp: "2026-06-17T10:02:15Z",
    evidence_url: null,
    evidence_hash: "b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5",
    danger_score: 108,
    ai_explanation: "Triple riding detected: 3 persons on single motorcycle at bbox (502,210)-(680,395). High danger due to compound violation factor (1.5x). Fine: ₹1,000 under S.184.",
    is_duplicate: false,
    duplicate_group_id: null,
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
    status: "approved",
    data_source: "live",
    camera_id: "HEBBAL-01",
    junction_name: "Hebbal Flyover",
    latitude: 13.0358,
    longitude: 77.5970,
    timestamp: "2026-06-17T08:45:50Z",
    evidence_url: null,
    evidence_hash: "c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
    danger_score: 88,
    ai_explanation: "Wrong-side driving detected: vehicle in contraflow lane at bbox (120,260)-(310,430). Confidence 88% with lane-position heuristic (0.75x discount applied). Fine: ₹1,000 under S.184.",
    is_duplicate: false,
    duplicate_group_id: null,
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
    status: "issued",
    data_source: "live",
    camera_id: "WHITEFIELD-01",
    junction_name: "Whitefield Main Road",
    latitude: 12.9698,
    longitude: 77.7500,
    timestamp: "2026-06-17T11:30:05Z",
    evidence_url: null,
    evidence_hash: "d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7",
    danger_score: 12,
    ai_explanation: "Illegal parking detected: stationary vehicle in no-parking zone at bbox (700,310)-(900,480). Low confidence (58%) — zone-based heuristic. Fine: ₹200 under S.122.",
    is_duplicate: false,
    duplicate_group_id: null,
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
    evidence_hash: "e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8",
    danger_score: 43,
    ai_explanation: "No helmet detected on rider at bbox (240,150)-(360,320) with 85% confidence. License plate KA01AB1234 read with 93% OCR confidence. Fine: ₹500 under S.129.",
    is_duplicate: false,
    duplicate_group_id: null,
  },
  {
    id: seqId(),
    violation_type: "no_helmet",
    confidence: 0.89,
    confidence_tier: "high",
    bbox: { x1: 320, y1: 190, x2: 435, y2: 345 },
    person_bbox: { x1: 300, y1: 125, x2: 455, y2: 405 },
    metadata: {},
    mv_act_section: "S.129",
    fine_amount: 500,
    license_plate: null,
    status: "rejected",
    data_source: "live",
    camera_id: "MGROAD-01",
    junction_name: "MG Road — Trinity Circle",
    latitude: 12.9758,
    longitude: 77.6085,
    timestamp: "2026-06-17T09:14:40Z",
    evidence_url: null,
    evidence_hash: "f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9",
    danger_score: 45,
    ai_explanation: "No helmet detected on rider at bbox (320,190)-(435,345) with 89% confidence. Duplicate of earlier detection at same camera within 5 min. Fine: ₹500 under S.129.",
    is_duplicate: true,
    duplicate_group_id: "DUP-MGROAD-01-20260617",
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
  detection_summary: {
    persons: 4,
    riders: 3,
    pedestrians: 1,
    cars: 2,
    motorcycles: 3,
    buses: 0,
    trucks: 1,
    bicycles: 0,
    total_objects: 14,
    vehicle_categories: ["car", "motorcycle", "truck"],
  },
  preprocessing_applied: {
    steps: [
      { name: "CLAHE Denoise", enabled: true, parameters: { clip_limit: 2.0 } },
      { name: "Gamma Correction", enabled: true, parameters: { gamma: 1.2 } },
      { name: "Sharpen", enabled: false, parameters: {} },
    ],
    image_brightness: 112.45,
    image_contrast: 48.32,
    condition_flags: ["low_light_detected"],
  },
};

// ---------------------------------------------------------------------------
// MOCK_ANALYTICS — with trend_forecast
// ---------------------------------------------------------------------------

const MOCK_TREND_FORECAST: TrendForecast[] = [
  {
    violation_type: "no_helmet",
    trend_direction: "up",
    trend_percentage: 15.2,
    forecast: [
      { date: daysAgo(-1), predicted_count: 22 },
      { date: daysAgo(-2), predicted_count: 20 },
      { date: daysAgo(-3), predicted_count: 19 },
      { date: daysAgo(-4), predicted_count: 21 },
      { date: daysAgo(-5), predicted_count: 20 },
      { date: daysAgo(-6), predicted_count: 19 },
      { date: daysAgo(-7), predicted_count: 18 },
    ],
  },
  {
    violation_type: "triple_riding",
    trend_direction: "down",
    trend_percentage: 8.3,
    forecast: [
      { date: daysAgo(-1), predicted_count: 7 },
      { date: daysAgo(-2), predicted_count: 8 },
      { date: daysAgo(-3), predicted_count: 7 },
      { date: daysAgo(-4), predicted_count: 8 },
      { date: daysAgo(-5), predicted_count: 7 },
      { date: daysAgo(-6), predicted_count: 8 },
      { date: daysAgo(-7), predicted_count: 8 },
    ],
  },
  {
    violation_type: "wrong_side_driving",
    trend_direction: "stable",
    trend_percentage: 2.1,
    forecast: [
      { date: daysAgo(-1), predicted_count: 6 },
      { date: daysAgo(-2), predicted_count: 5 },
      { date: daysAgo(-3), predicted_count: 6 },
      { date: daysAgo(-4), predicted_count: 5 },
      { date: daysAgo(-5), predicted_count: 6 },
      { date: daysAgo(-6), predicted_count: 5 },
      { date: daysAgo(-7), predicted_count: 6 },
    ],
  },
];

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
    pending: 180,
    under_review: 35,
    approved: 42,
    issued: 13,
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
  trend_forecast: MOCK_TREND_FORECAST,
};

// ---------------------------------------------------------------------------
// MOCK_CAMERAS — 10 Bengaluru junctions with health status
// ---------------------------------------------------------------------------

export const MOCK_CAMERAS: CameraHealth[] = [
  {
    camera_id: "MGROAD-01",
    junction_name: "MG Road — Trinity Circle",
    latitude: 12.9758,
    longitude: 77.6045,
    status: "active",
    last_seen: new Date().toISOString(),
    violation_count_24h: 64,
    avg_latency_ms: 342,
  },
  {
    camera_id: "SILKBOARD-01",
    junction_name: "Silk Board Junction",
    latitude: 12.9177,
    longitude: 77.6238,
    status: "active",
    last_seen: new Date(Date.now() - 120000).toISOString(),
    violation_count_24h: 52,
    avg_latency_ms: 389,
  },
  {
    camera_id: "HEBBAL-01",
    junction_name: "Hebbal Flyover",
    latitude: 13.0358,
    longitude: 77.597,
    status: "idle",
    last_seen: new Date(Date.now() - 1800000).toISOString(),
    violation_count_24h: 45,
    avg_latency_ms: 412,
  },
  {
    camera_id: "WHITEFIELD-01",
    junction_name: "Whitefield Main Road",
    latitude: 12.9698,
    longitude: 77.75,
    status: "active",
    last_seen: new Date(Date.now() - 60000).toISOString(),
    violation_count_24h: 39,
    avg_latency_ms: 356,
  },
  {
    camera_id: "ELECTRONIC-01",
    junction_name: "Electronic City Phase 1",
    latitude: 12.8456,
    longitude: 77.6603,
    status: "idle",
    last_seen: new Date(Date.now() - 2400000).toISOString(),
    violation_count_24h: 28,
    avg_latency_ms: 478,
  },
  {
    camera_id: "MARATHAHALLI-01",
    junction_name: "Marathahalli Bridge",
    latitude: 12.9591,
    longitude: 77.6974,
    status: "offline",
    last_seen: new Date(Date.now() - 7200000).toISOString(),
    violation_count_24h: 0,
    avg_latency_ms: null,
  },
  {
    camera_id: "KRPURAM-01",
    junction_name: "KR Puram Railway Junction",
    latitude: 12.997,
    longitude: 77.6844,
    status: "active",
    last_seen: new Date(Date.now() - 180000).toISOString(),
    violation_count_24h: 18,
    avg_latency_ms: 395,
  },
  {
    camera_id: "YELAHANKA-01",
    junction_name: "Yelahanka New Town",
    latitude: 13.1007,
    longitude: 77.5963,
    status: "offline",
    last_seen: new Date(Date.now() - 14400000).toISOString(),
    violation_count_24h: 0,
    avg_latency_ms: null,
  },
  {
    camera_id: "BANNERGHATTA-01",
    junction_name: "Bannerghatta Road — Jayadeva",
    latitude: 12.9135,
    longitude: 77.5985,
    status: "active",
    last_seen: new Date(Date.now() - 90000).toISOString(),
    violation_count_24h: 22,
    avg_latency_ms: 367,
  },
  {
    camera_id: "KORMANGALA-01",
    junction_name: "Koramangala 100ft Road",
    latitude: 12.9352,
    longitude: 77.6245,
    status: "idle",
    last_seen: new Date(Date.now() - 3600000).toISOString(),
    violation_count_24h: 13,
    avg_latency_ms: 445,
  },
];

// ---------------------------------------------------------------------------
// MOCK_ASTRAM_ALERTS — Real-time violation alerts
// ---------------------------------------------------------------------------

export const MOCK_ASTRAM_ALERTS: ASTraMAlert[] = [
  {
    id: "alert-001",
    violation_type: "no_helmet",
    camera_id: "MGROAD-01",
    junction_name: "MG Road — Trinity Circle",
    danger_score: 46,
    confidence: 0.91,
    timestamp: new Date().toISOString(),
    license_plate: null,
  },
  {
    id: "alert-002",
    violation_type: "triple_riding",
    camera_id: "SILKBOARD-01",
    junction_name: "Silk Board Junction",
    danger_score: 108,
    confidence: 0.72,
    timestamp: new Date(Date.now() - 15000).toISOString(),
    license_plate: null,
  },
  {
    id: "alert-003",
    violation_type: "wrong_side_driving",
    camera_id: "HEBBAL-01",
    junction_name: "Hebbal Flyover",
    danger_score: 88,
    confidence: 0.88,
    timestamp: new Date(Date.now() - 45000).toISOString(),
    license_plate: null,
  },
  {
    id: "alert-004",
    violation_type: "no_helmet",
    camera_id: "ELECTRONIC-01",
    junction_name: "Electronic City Phase 1",
    danger_score: 43,
    confidence: 0.85,
    timestamp: new Date(Date.now() - 90000).toISOString(),
    license_plate: "KA01AB1234",
  },
  {
    id: "alert-005",
    violation_type: "illegal_parking",
    camera_id: "WHITEFIELD-01",
    junction_name: "Whitefield Main Road",
    danger_score: 12,
    confidence: 0.58,
    timestamp: new Date(Date.now() - 180000).toISOString(),
    license_plate: null,
  },
];
