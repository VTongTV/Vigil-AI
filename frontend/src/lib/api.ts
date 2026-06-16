/** API client for VigilAI backend. */

import type {
  DetectResponse,
  ViolationListResponse,
  ViolationRecord,
  AnalyticsOverview,
} from "../types/violation";
import { useAppStore } from "./store";
import { MOCK_ANALYTICS, MOCK_VIOLATIONS, MOCK_DETECT_RESPONSE } from "./mocks";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api/v1";

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, options);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

export async function detectViolation(
  image: File,
  cameraId?: string,
): Promise<DetectResponse> {
  if (useAppStore.getState().demoMode) {
    // Simulate a short processing delay for realism
    await new Promise((r) => setTimeout(r, 400));
    return {
      ...MOCK_DETECT_RESPONSE,
      violations: MOCK_VIOLATIONS.map((v) => ({ ...v, id: `VLN-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}` })),
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

export async function listViolations(params?: {
  violation_type?: string;
  status?: string;
  camera_id?: string;
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
  action: "approve" | "reject",
  reason?: string,
): Promise<{ id: string; status: string; message: string }> {
  if (useAppStore.getState().demoMode) {
    const status = action === "approve" ? "approved" : "rejected";
    return {
      id,
      status,
      message: `Violation ${status} successfully (demo mode)`,
    };
  }

  return fetchJSON(`/violations/${id}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, reason }),
  });
}

export async function getAnalytics(days?: number): Promise<AnalyticsOverview> {
  if (useAppStore.getState().demoMode) {
    return { ...MOCK_ANALYTICS };
  }

  const qs = days ? `?days=${days}` : "";
  return fetchJSON<AnalyticsOverview>(`/analytics${qs}`);
}

export function getEvidenceUrl(violationId: string): string {
  if (useAppStore.getState().demoMode) {
    return `https://placehold.co/1280x720?text=Evidence+${violationId}`;
  }

  return `${API_BASE}/evidence/${violationId}`;
}
