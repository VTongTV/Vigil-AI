/** API client for VigilAI backend. */

import type {
  CameraListResponse,
  CitizenDetectResponse,
  DeepfakeResponse,
  DetectResponse,
  ScraperFeedResponse,
  TrackingOverviewResponse,
  VideoDetectResponse,
  ViolationListResponse,
  ViolationRecord,
  AnalyticsOverview,
} from "../types/violation";
import { useAppStore } from "./store";
import {
  MOCK_ANALYTICS,
  MOCK_CAMERAS,
  MOCK_VIOLATIONS,
  MOCK_DETECT_RESPONSE,
} from "./mocks";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api/v1";

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, options);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

export async function detectViolation(
  image: File,
  cameraId?: string,
): Promise<DetectResponse> {
  if (useAppStore.getState().demoMode) {
    await new Promise((r) => setTimeout(r, 400));
    return {
      ...MOCK_DETECT_RESPONSE,
      violations: MOCK_VIOLATIONS.map((v) => ({
        ...v,
        id: `VLN-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      })),
    };
  }

  const form = new FormData();
  form.append("image", image);
  if (cameraId) form.append("camera_id", cameraId);

  return fetchJSON<DetectResponse>("/detect", {
    method: "POST",
    body: form,
  });
}

// ---------------------------------------------------------------------------
// Violations
// ---------------------------------------------------------------------------

export async function listViolations(params?: {
  violation_type?: string;
  status?: string;
  camera_id?: string;
  hide_duplicates?: boolean;
  page?: number;
  page_size?: number;
}): Promise<ViolationListResponse> {
  if (useAppStore.getState().demoMode) {
    let filtered = [...MOCK_VIOLATIONS];
    if (params?.violation_type) {
      filtered = filtered.filter((v) => v.violation_type === params.violation_type);
    }
    if (params?.status) {
      filtered = filtered.filter((v) => v.status === params.status);
    }
    if (params?.camera_id) {
      filtered = filtered.filter((v) => v.camera_id === params.camera_id);
    }
    if (params?.hide_duplicates !== false) {
      filtered = filtered.filter((v) => !v.is_duplicate);
    }
    const page = params?.page ?? 1;
    const page_size = params?.page_size ?? 20;
    return {
      total: filtered.length,
      page,
      page_size,
      violations: filtered,
    };
  }

  const sp = new URLSearchParams();
  if (params?.violation_type) sp.set("violation_type", params.violation_type);
  if (params?.status) sp.set("status", params.status);
  if (params?.camera_id) sp.set("camera_id", params.camera_id);
  if (params?.hide_duplicates !== undefined)
    sp.set("hide_duplicates", String(params.hide_duplicates));
  if (params?.page) sp.set("page", String(params.page));
  if (params?.page_size) sp.set("page_size", String(params.page_size));
  const qs = sp.toString();
  return fetchJSON<ViolationListResponse>(`/violations${qs ? `?${qs}` : ""}`);
}

export async function getViolation(id: string): Promise<ViolationRecord> {
  if (useAppStore.getState().demoMode) {
    const found = MOCK_VIOLATIONS.find((v) => v.id === id);
    return found ? { ...found } : MOCK_VIOLATIONS[0];
  }

  return fetchJSON<ViolationRecord>(`/violations/${id}`);
}

export async function actionViolation(
  id: string,
  action: "review" | "approve" | "issue" | "reject",
  reason?: string,
  officerId?: string,
): Promise<{ id: string; status: string; message: string }> {
  if (useAppStore.getState().demoMode) {
    const statusMap: Record<string, string> = {
      review: "under_review",
      approve: "approved",
      issue: "issued",
      reject: "rejected",
    };
    return {
      id,
      status: statusMap[action] ?? "pending",
      message: `Violation ${action} successfully (demo mode)`,
    };
  }

  return fetchJSON(`/violations/${id}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, reason, officer_id: officerId }),
  });
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export async function getAnalytics(days?: number): Promise<AnalyticsOverview> {
  if (useAppStore.getState().demoMode) {
    return { ...MOCK_ANALYTICS };
  }

  const qs = days ? `?days=${days}` : "";
  return fetchJSON<AnalyticsOverview>(`/analytics${qs}`);
}

// ---------------------------------------------------------------------------
// Cameras (F9)
// ---------------------------------------------------------------------------

export async function listCameras(status?: string): Promise<CameraListResponse> {
  if (useAppStore.getState().demoMode) {
    let cameras = [...MOCK_CAMERAS];
    if (status) {
      cameras = cameras.filter((c) => c.status === status);
    }
    return { total: cameras.length, cameras };
  }

  const qs = status ? `?status=${status}` : "";
  return fetchJSON<CameraListResponse>(`/cameras${qs}`);
}

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

export function getEvidenceUrl(violationId: string): string {
  if (useAppStore.getState().demoMode) {
    return `https://placehold.co/1280x720?text=Evidence+${violationId}`;
  }

  return `${API_BASE}/evidence/${violationId}`;
}

// ---------------------------------------------------------------------------
// Challan PDF (F2)
// ---------------------------------------------------------------------------

export function getChallanPdfUrl(violationId: string): string {
  return `${API_BASE}/evidence/${violationId}/challan-pdf`;
}

export async function generateChallanPdf(violationId: string): Promise<Blob> {
  if (useAppStore.getState().demoMode) {
    // In demo mode, return a valid minimal PDF to prevent "Failed to load PDF document" error
    const base64 = "JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nDPQM1Qo5ypUMFAwALJMLY31jBQsTAz1LBSKUrnCtRTyuVIVUhUScxTSMw1MDHUMdI11jIx0wCxNl8xcLpA2G1w+oDYA2s8PsgplbmRzdHJlYW0KZW5kb2JqCgozIDAgb2JqCjQ4CmVuZG9iagoKMSAwIG9iago8PC9UeXBlL1BhZ2UvTWVkaWFCb3hbMCAwIDU5NSA4NDJdL1Jlc291cmNlczw8L0ZvbnQ8PC9GMSA0IDAgUj4+Pj4vQ29udGVudHMgMiAwIFIvUGFyZW50IDUgMCBSPj4KZW5kb2JqCgo0IDAgb2JqCjw8L1R5cGUvRm9udC9TdWJ0eXBlL1R5cGUxL0Jhc2VGb250L0hlbHZldGljYT4+CmVuZG9iagoKNSAwIG9iago8PC9UeXBlL1BhZ2VzL0NvdW50IDEvS2lkc1sxIDAgUl0+PgplbmRvYmoKCjYgMCBvYmoKPDwvVHlwZS9DYXRhbG9nL1BhZ2VzIDUgMCBSPj4KZW5kb2JqCgo3IDAgb2JqCjw8L1Byb2R1Y2VyKGlUZXh0IDUuNS4xKS9DcmVhdGlvbkRhdGUoRDoyMDIwMTExNzE0MzcwNCswMScwMCcpPj4KZW5kb2JqCgp4cmVmCjAgOAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAxMTEgMDAwMDAgbiAKMDAwMDAwMDAxOSAwMDAwMCBuIAowMDAwMDAwMDkyIDAwMDAwIG4gCjAwMDAwMDAyMTUgMDAwMDAgbiAKMDAwMDAwMDI5NiAwMDAwMCBuIAowMDAwMDAwMzUyIDAwMDAwIG4gCjAwMDAwMDAzOTkgMDAwMDAgbiAKdHJhaWxlcgo8PC9TaXplIDgvUm9vdCA2IDAgUi9JbmZvIDcgMCBSPj4Kc3RhcnR4cmVmCjQ5MQolJUVPRgo=";
    const binary = atob(base64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
    return new Blob([array], { type: "application/pdf" });
  }

  const res = await fetch(`${API_BASE}/evidence/${violationId}/challan-pdf`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error(`Failed to generate Challan PDF: ${res.status}`);
  }
  return res.blob();
}

// ---------------------------------------------------------------------------
// Feature 1: Citizen Reporting
// ---------------------------------------------------------------------------

export async function citizenDetect(
  image: File,
  cameraId?: string,
): Promise<CitizenDetectResponse> {
  if (useAppStore.getState().demoMode) {
    await new Promise((r) => setTimeout(r, 300));
    return {
      success: true,
      processing_time_ms: 847,
      violations_found: 1,
      violation_types: ["no_helmet"],
      image_dimensions: { width: 1280, height: 720 },
      detection_summary: {
        persons: 3,
        riders: 2,
        pedestrians: 1,
        cars: 1,
        motorcycles: 2,
        buses: 0,
        trucks: 0,
        bicycles: 0,
        total_objects: 9,
        vehicle_categories: ["car", "motorcycle"],
      },
      message:
        "Your report has been processed. Thank you for helping keep Bengaluru's roads safe.",
    };
  }

  const form = new FormData();
  form.append("image", image);
  if (cameraId) form.append("camera_id", cameraId);

  return fetchJSON<CitizenDetectResponse>("/citizen/detect", {
    method: "POST",
    body: form,
  });
}

// ---------------------------------------------------------------------------
// Feature 3: Deepfake Detection
// ---------------------------------------------------------------------------

export async function analyzeDeepfake(
  image: File,
): Promise<DeepfakeResponse> {
  if (useAppStore.getState().demoMode) {
    await new Promise((r) => setTimeout(r, 500));
    return {
      is_likely_ai: true,
      confidence: 0.87,
      artifacts_detected: [
        "uncanny_face_symmetry",
        "idealized_license_plate",
        "diffusion_texture_artifacts",
        "anatomical_hand_oddities",
      ],
      explanation:
        "This image exhibits multiple AI-generation artifacts consistent with diffusion-model output: perfectly symmetric facial features, unnaturally clean license plate text, texture bleeding at object boundaries, and anatomical inconsistencies in hand/finger rendering.",
      analysis_details: {
        is_likely_ai: true,
        confidence: 0.87,
        artifacts_detected: [
          "uncanny_face_symmetry",
          "idealized_license_plate",
          "diffusion_texture_artifacts",
          "anatomical_hand_oddities",
        ],
        explanation:
          "Multiple diffusion-model generation artifacts detected with high confidence.",
      },
    };
  }

  const form = new FormData();
  form.append("image", image);

  return fetchJSON<DeepfakeResponse>("/deepfake/analyze", {
    method: "POST",
    body: form,
  });
}

// ---------------------------------------------------------------------------
// Feature 4: Web Scraper
// ---------------------------------------------------------------------------

export async function getScraperFeed(): Promise<ScraperFeedResponse> {
  if (useAppStore.getState().demoMode) {
    return {
      total: 5,
      items: [
        {
          id: "sc-001",
          platform: "twitter",
          source_url: "https://twitter.com/btp_traffic/status/123",
          thumbnail_url: "/demo/demo_no_helmet_mgroad-01.jpg",
          caption: "No helmet rider near MG Road signal. #BengaluruTraffic",
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          location: "MG Road, Bengaluru",
          analysis_status: "pending",
        },
        {
          id: "sc-002",
          platform: "reddit",
          source_url: "https://reddit.com/r/bangalore/comments/abc",
          thumbnail_url: "/demo/demo_triple_riding_whitefield-01.jpg",
          caption: "Triple riding on ITPL road, Whitefield. Daily sight.",
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          location: "Whitefield, Bengaluru",
          analysis_status: "pending",
        },
        {
          id: "sc-003",
          platform: "instagram",
          source_url: "https://instagram.com/p/xyz",
          thumbnail_url: "/demo/demo_wrong_side_driving_bannerghatta-01.jpg",
          caption: "Wrong side driving on Bannerghatta Road 😡",
          timestamp: new Date(Date.now() - 10800000).toISOString(),
          location: "Bannerghatta Road, Bengaluru",
          analysis_status: "analyzed",
        },
        {
          id: "sc-004",
          platform: "twitter",
          source_url: "https://twitter.com/btp_traffic/status/456",
          thumbnail_url: "/demo/demo_illegal_parking_kormangala-01.jpg",
          caption: "Car parked on no-parking zone near Koramangala 100ft Rd",
          timestamp: new Date(Date.now() - 14400000).toISOString(),
          location: "Koramangala, Bengaluru",
          analysis_status: "pending",
        },
        {
          id: "sc-005",
          platform: "facebook",
          source_url: "https://facebook.com/groups/bengalurutraffic/posts/789",
          thumbnail_url: "/demo/demo_red_light_violation_silkboard-01.jpg",
          caption: "Red light jump at Silk Board. When will this stop?",
          timestamp: new Date(Date.now() - 18000000).toISOString(),
          location: "Silk Board, Bengaluru",
          analysis_status: "analyzed",
        },
      ],
      last_scraped: new Date(Date.now() - 300000).toISOString(),
    };
  }

  return fetchJSON<ScraperFeedResponse>("/scraper/feed");
}

// ---------------------------------------------------------------------------
// Feature 5: Video Processing
// ---------------------------------------------------------------------------

export async function detectVideo(
  video: File,
  cameraId?: string,
  fps?: number,
): Promise<VideoDetectResponse> {
  if (useAppStore.getState().demoMode) {
    await new Promise((r) => setTimeout(r, 1500));
    return {
      success: true,
      total_frames: 30,
      frames_processed: 30,
      total_violations: 3,
      processing_time_ms: 4521,
      frame_results: [
        {
          frame_index: 5,
          timestamp_ms: 5000,
          violations_count: 1,
          violation_types: ["no_helmet"],
          evidence_url: null,
        },
        {
          frame_index: 12,
          timestamp_ms: 12000,
          violations_count: 1,
          violation_types: ["triple_riding"],
          evidence_url: null,
        },
        {
          frame_index: 24,
          timestamp_ms: 24000,
          violations_count: 1,
          violation_types: ["wrong_side_driving"],
          evidence_url: null,
        },
      ],
      summary: {
        violation_counts: { no_helmet: 1, triple_riding: 1, wrong_side_driving: 1 },
        frames_with_violations: 3,
        total_frames_processed: 30,
      },
    };
  }

  const form = new FormData();
  form.append("video", video);
  if (cameraId) form.append("camera_id", cameraId);
  if (fps) form.append("fps", String(fps));

  return fetchJSON<VideoDetectResponse>("/video/detect", {
    method: "POST",
    body: form,
  });
}

// ---------------------------------------------------------------------------
// Feature 6: Tracking Dashboard
// ---------------------------------------------------------------------------

export async function getTrackingOverview(): Promise<TrackingOverviewResponse> {
  if (useAppStore.getState().demoMode) {
    return {
      active_cameras: 8,
      total_violations_last_hour: 23,
      alerts_active: 3,
      cameras: [
        {
          camera_id: "MGROAD-01",
          junction_name: "MG Road — Trinity Circle",
          status: "active",
          violations_last_hour: 5,
          last_violation_type: "no_helmet",
          last_violation_time: new Date(Date.now() - 120000).toISOString(),
          feed_url: null,
        },
        {
          camera_id: "SILKBOARD-01",
          junction_name: "Silk Board Junction",
          status: "active",
          violations_last_hour: 4,
          last_violation_type: "red_light_violation",
          last_violation_time: new Date(Date.now() - 300000).toISOString(),
          feed_url: null,
        },
        {
          camera_id: "HEBBAL-01",
          junction_name: "Hebbal Flyover",
          status: "active",
          violations_last_hour: 3,
          last_violation_type: "no_helmet",
          last_violation_time: new Date(Date.now() - 600000).toISOString(),
          feed_url: null,
        },
        {
          camera_id: "WHITEFIELD-01",
          junction_name: "Whitefield Main Road",
          status: "active",
          violations_last_hour: 3,
          last_violation_type: "triple_riding",
          last_violation_time: new Date(Date.now() - 900000).toISOString(),
          feed_url: null,
        },
        {
          camera_id: "ELECTRONIC-01",
          junction_name: "Electronic City Phase 1",
          status: "idle",
          violations_last_hour: 2,
          last_violation_type: "no_seatbelt",
          last_violation_time: new Date(Date.now() - 1500000).toISOString(),
          feed_url: null,
        },
        {
          camera_id: "MARATHAHALLI-01",
          junction_name: "Marathahalli Bridge",
          status: "active",
          violations_last_hour: 3,
          last_violation_type: "triple_riding",
          last_violation_time: new Date(Date.now() - 600000).toISOString(),
          feed_url: null,
        },
        {
          camera_id: "KRPURAM-01",
          junction_name: "KR Puram Railway Junction",
          status: "offline",
          violations_last_hour: 0,
          last_violation_type: null,
          last_violation_time: null,
          feed_url: null,
        },
        {
          camera_id: "KORMANGALA-01",
          junction_name: "Koramangala 100ft Road",
          status: "active",
          violations_last_hour: 3,
          last_violation_type: "illegal_parking",
          last_violation_time: new Date(Date.now() - 420000).toISOString(),
          feed_url: null,
        },
      ],
    };
  }

  return fetchJSON<TrackingOverviewResponse>("/tracking/overview");
}
