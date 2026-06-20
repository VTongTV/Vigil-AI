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
