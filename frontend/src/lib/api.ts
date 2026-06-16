/** API client for VigilAI backend. */

import type {
  DetectResponse,
  ViolationListResponse,
  ViolationRecord,
  AnalyticsOverview,
} from "../types/violation";

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
  return fetchJSON<ViolationRecord>(`/violations/${id}`);
}

export async function actionViolation(
  id: string,
  action: "approve" | "reject",
  reason?: string,
): Promise<{ id: string; status: string; message: string }> {
  return fetchJSON(`/violations/${id}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, reason }),
  });
}

export async function getAnalytics(days?: number): Promise<AnalyticsOverview> {
  const qs = days ? `?days=${days}` : "";
  return fetchJSON<AnalyticsOverview>(`/analytics${qs}`);
}

export function getEvidenceUrl(violationId: string): string {
  return `${API_BASE}/evidence/${violationId}`;
}
