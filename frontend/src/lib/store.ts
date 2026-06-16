/** Zustand store for VigilAI app state. */

import { create } from "zustand";
import type { ViolationRecord } from "../types/violation";

interface AppState {
  /** Demo mode toggle — uses hardcoded responses when backend is unavailable */
  demoMode: boolean;
  setDemoMode: (on: boolean) => void;

  /** Currently selected violation for evidence viewing */
  selectedViolation: ViolationRecord | null;
  setSelectedViolation: (v: ViolationRecord | null) => void;

  /** Signal state for red-light detection (operator input) */
  signalState: "unknown" | "red" | "green";
  setSignalState: (s: "unknown" | "red" | "green") => void;

  /** Last detection result */
  lastDetection: ViolationRecord[] | null;
  setLastDetection: (v: ViolationRecord[] | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  demoMode: localStorage.getItem("vigilai_demo") === "true",
  setDemoMode: (on) => {
    localStorage.setItem("vigilai_demo", String(on));
    set({ demoMode: on });
  },

  selectedViolation: null,
  setSelectedViolation: (v) => set({ selectedViolation: v }),

  signalState: "unknown",
  setSignalState: (s) => set({ signalState: s }),

  lastDetection: null,
  setLastDetection: (v) => set({ lastDetection: v }),
}));
