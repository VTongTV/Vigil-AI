/** API client for VigilAI backend. */

import type {
  CameraListResponse,
  DetectResponse,
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
// FIR PDF (F2)
// ---------------------------------------------------------------------------

export function getFirPdfUrl(violationId: string): string {
  return `${API_BASE}/evidence/${violationId}/fir-pdf`;
}

export async function generateFirPdf(violationId: string): Promise<Blob> {
  if (useAppStore.getState().demoMode) {
    // In demo mode, return a placeholder text blob
    const text = `FIR PDF for violation ${violationId}\n\nThis is a demo placeholder.\nIn production, this would be a court-admissible PDF.`;
    return new Blob([text], { type: "application/pdf" });
  }

  const res = await fetch(`${API_BASE}/evidence/${violationId}/fir-pdf`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error(`Failed to generate FIR PDF: ${res.status}`);
  }
  return res.blob();
}
