/** Zustand store for VigilAI app state. */

import { create } from "zustand";
import type { ASTraMAlert, CameraHealth, ViolationRecord } from "../types/violation";

export type Theme = "dark" | "light";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem("vigilai_theme") as Theme | null;
  if (stored === "dark" || stored === "light") return stored;
  if (typeof window.matchMedia !== "function") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.setAttribute("data-theme", theme);
}

interface AppState {
  /** Demo mode toggle — uses hardcoded responses when backend is unavailable */
  demoMode: boolean;
  setDemoMode: (on: boolean) => void;

  /** Color theme — dark (default) or light */
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;

  /** Currently selected violation for evidence viewing */
  selectedViolation: ViolationRecord | null;
  setSelectedViolation: (v: ViolationRecord | null) => void;

  /** Signal state for red-light detection (operator input) */
  signalState: "unknown" | "red" | "green";
  setSignalState: (s: "unknown" | "red" | "green") => void;

  /** Last detection result */
  lastDetection: ViolationRecord[] | null;
  setLastDetection: (v: ViolationRecord[] | null) => void;

  /** ASTraM real-time alerts (F6) */
  alerts: ASTraMAlert[];
  addAlert: (alert: ASTraMAlert) => void;
  dismissAlert: (id: string) => void;
  clearAlerts: () => void;

  /** Camera health data (F9) */
  cameras: CameraHealth[];
  setCameras: (cameras: CameraHealth[]) => void;

  /** ASTraM alert panel open state */
  alertPanelOpen: boolean;
  setAlertPanelOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  demoMode: localStorage.getItem("vigilai_demo") === "true",
  setDemoMode: (on) => {
    localStorage.setItem("vigilai_demo", String(on));
    set({ demoMode: on });
  },

  selectedViolation: null,
  setSelectedViolation: (v) => set({ selectedViolation: v }),

  theme: getInitialTheme(),
  setTheme: (theme) => {
    localStorage.setItem("vigilai_theme", theme);
    applyTheme(theme);
    set({ theme });
  },
  toggleTheme: () => {
    set((state) => {
      const next = state.theme === "dark" ? "light" : "dark";
      localStorage.setItem("vigilai_theme", next);
      applyTheme(next);
      return { theme: next };
    });
  },

  signalState: "unknown",
  setSignalState: (s) => set({ signalState: s }),

  lastDetection: null,
  setLastDetection: (v) => set({ lastDetection: v }),

  alerts: [],
  addAlert: (alert) =>
    set((state) => ({
      alerts: [alert, ...state.alerts].slice(0, 50), // Keep last 50 alerts
    })),
  dismissAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== id),
    })),
  clearAlerts: () => set({ alerts: [] }),

  cameras: [],
  setCameras: (cameras) => set({ cameras }),

  alertPanelOpen: false,
  setAlertPanelOpen: (open) => set({ alertPanelOpen: open }),
}));
