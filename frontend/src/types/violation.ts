/** TypeScript types mirroring backend Pydantic schemas. */

export type ViolationType =
  | "no_helmet"
  | "triple_riding"
  | "wrong_side_driving"
  | "illegal_parking"
  | "no_seatbelt"
  | "stop_line_violation"
  | "red_light_violation"
  | "license_plate_mismatch";

export type DataSource = "seeded" | "live";
export type ConfidenceTier = "high" | "medium" | "low";
export type ViolationStatus = "pending" | "under_review" | "approved" | "issued" | "rejected";
export type CameraStatus = "active" | "idle" | "offline";

export interface Bbox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface LicensePlateResult {
  text: string;
  confidence: number;
  bbox: Bbox;
}

export interface ViolationRecord {
  id: string;
  violation_type: ViolationType;
  confidence: number;
  confidence_tier: ConfidenceTier;
  bbox: Bbox;
  person_bbox: Bbox | null;
  metadata: Record<string, unknown>;
  mv_act_section: string;
  fine_amount: number;
  license_plate: LicensePlateResult | null;
  status: ViolationStatus;
  data_source: DataSource;
  camera_id: string | null;
  junction_name: string | null;
  latitude: number | null;
  longitude: number | null;
  timestamp: string;
  evidence_url: string | null;
  evidence_hash: string | null;
  danger_score: number;
  ai_explanation: string | null;
  is_duplicate: boolean;
  duplicate_group_id: string | null;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface TimingBreakdown {
  preprocess_ms: number;
  detect_coco_ms: number;
  detect_helmet_ms: number;
  violation_logic_ms: number;
  detect_plate_ms: number;
  ocr_ms: number;
  evidence_gen_ms: number;
}

export interface DetectionSummary {
  persons: number;
  riders: number;
  pedestrians: number;
  cars: number;
  motorcycles: number;
  buses: number;
  trucks: number;
  bicycles: number;
  total_objects: number;
  vehicle_categories: string[];
}

export interface PreprocessingStep {
  name: string;
  enabled: boolean;
  parameters: Record<string, unknown>;
}

export interface PreprocessingApplied {
  steps: PreprocessingStep[];
  image_brightness: number | null;
  image_contrast: number | null;
  condition_flags: string[];
}

export interface DetectResponse {
  success: boolean;
  processing_time_ms: number;
  timing_breakdown: TimingBreakdown;
  violations: ViolationRecord[];
  image_dimensions: ImageDimensions;
  detection_summary: DetectionSummary;
  preprocessing_applied: PreprocessingApplied;
}

export interface ViolationListResponse {
  total: number;
  page: number;
  page_size: number;
  violations: ViolationRecord[];
}

export interface TrendForecast {
  violation_type: string;
  trend_direction: "up" | "down" | "stable";
  trend_percentage: number;
  forecast: { date: string; predicted_count: number }[];
}

export interface AnalyticsOverview {
  total_violations: number;
  violations_by_type: Record<string, number>;
  violations_by_tier: Record<string, number>;
  violations_by_status: Record<string, number>;
  avg_confidence: number;
  total_fines: number;
  daily_counts: { date: string; count: number }[];
  top_cameras: { camera_id: string; count: number }[];
  trend_forecast: TrendForecast[];
}

export interface CameraHealth {
  camera_id: string;
  junction_name: string;
  latitude: number;
  longitude: number;
  status: CameraStatus;
  last_seen: string | null;
  violation_count_24h: number;
  avg_latency_ms: number | null;
}

export interface CameraListResponse {
  total: number;
  cameras: CameraHealth[];
}

export interface ASTraMAlert {
  id: string;
  violation_type: ViolationType;
  camera_id: string;
  junction_name: string;
  danger_score: number;
  confidence: number;
  timestamp: string;
  license_plate: string | null;
}

export const VIOLATION_LABELS: Record<ViolationType, string> = {
  no_helmet: "No Helmet",
  triple_riding: "Triple Riding",
  wrong_side_driving: "Wrong Side",
  illegal_parking: "Illegal Parking",
  no_seatbelt: "No Seatbelt",
  stop_line_violation: "Stop-Line",
  red_light_violation: "Red-Light",
  license_plate_mismatch: "Plate Mismatch",
};

export const VIOLATION_COLORS: Record<ViolationType, string> = {
  no_helmet: "var(--color-helmet)",
  triple_riding: "var(--color-triple)",
  wrong_side_driving: "var(--color-wrong-side)",
  illegal_parking: "var(--color-parking)",
  no_seatbelt: "var(--color-seatbelt)",
  stop_line_violation: "var(--color-stopline)",
  red_light_violation: "var(--color-redlight)",
  license_plate_mismatch: "var(--color-plate)",
};

export const VIOLATION_SECTIONS: Record<ViolationType, string> = {
  no_helmet: "S.129",
  triple_riding: "S.184",
  wrong_side_driving: "S.184",
  illegal_parking: "S.122",
  no_seatbelt: "S.194B",
  stop_line_violation: "S.184",
  red_light_violation: "S.184",
  license_plate_mismatch: "S.177",
};

export const STATUS_LABELS: Record<ViolationStatus, string> = {
  pending: "Pending",
  under_review: "Under Review",
  approved: "Approved",
  issued: "Issued",
  rejected: "Rejected",
};

export const STATUS_COLORS: Record<ViolationStatus, string> = {
  pending: "#f59e0b",
  under_review: "#3b82f6",
  approved: "#10b981",
  issued: "#06b6d4",
  rejected: "#ef4444",
};

// ---------------------------------------------------------------------------
// Feature 1: Citizen Reporting
// ---------------------------------------------------------------------------

export interface CitizenDetectResponse {
  success: boolean;
  processing_time_ms: number;
  violations_found: number;
  violation_types: string[];
  image_dimensions: ImageDimensions;
  detection_summary: DetectionSummary;
  message: string;
}

// ---------------------------------------------------------------------------
// Feature 3: Deepfake Detection
// ---------------------------------------------------------------------------

export interface DeepfakeAnalysis {
  is_likely_ai: boolean;
  confidence: number;
  artifacts_detected: string[];
  explanation: string;
}

export interface DeepfakeResponse {
  is_likely_ai: boolean;
  confidence: number;
  artifacts_detected: string[];
  explanation: string;
  analysis_details: DeepfakeAnalysis;
}

// ---------------------------------------------------------------------------
// Feature 4: Web Scraper
// ---------------------------------------------------------------------------

export interface ScrapedFeedItem {
  id: string;
  platform: string;
  source_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  timestamp: string;
  location: string | null;
  analysis_status: string;
}

export interface ScraperFeedResponse {
  total: number;
  items: ScrapedFeedItem[];
  last_scraped: string | null;
}

// ---------------------------------------------------------------------------
// Feature 5: Video Processing
// ---------------------------------------------------------------------------

export interface VideoFrameResult {
  frame_index: number;
  timestamp_ms: number;
  violations_count: number;
  violation_types: string[];
  evidence_url: string | null;
}

export interface VideoDetectResponse {
  success: boolean;
  total_frames: number;
  frames_processed: number;
  total_violations: number;
  processing_time_ms: number;
  frame_results: VideoFrameResult[];
  summary: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Feature 6: Tracking Dashboard
// ---------------------------------------------------------------------------

export interface TrackingCamera {
  camera_id: string;
  junction_name: string;
  status: CameraStatus;
  violations_last_hour: number;
  last_violation_type: string | null;
  last_violation_time: string | null;
  feed_url: string | null;
}

export interface TrackingOverviewResponse {
  active_cameras: number;
  total_violations_last_hour: number;
  alerts_active: number;
  cameras: TrackingCamera[];
}
