/**
 * ASTraMAlertFeed — floating alert panel for real-time violation notifications.
 *
 * F6: ASTraM (AI-powered Smart Traffic Alert & Monitoring)
 * - Floating panel anchored bottom-right of the Layout
 * - Shows recent alerts from Zustand store
 * - Web Audio API beep for critical alerts (danger_score >= 80)
 * - Auto-dismiss non-critical alerts after 10 seconds
 * - Compact feed with violation type, camera, danger score
 */

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { ASTraMAlert } from "@/types/violation";
import { VIOLATION_LABELS, VIOLATION_COLORS } from "@/types/violation";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { AlertBell, DangerGauge } from "@/components/icons";

/** Threshold for "critical" alerts that trigger audio beep. */
const CRITICAL_DANGER_THRESHOLD = 80;

/** Auto-dismiss delay for non-critical alerts (ms). */
const AUTO_DISMISS_MS = 10_000;

/** Web Audio API context (lazy-initialized, reused). */
let _audioCtx: AudioContext | null = null;

/** Play a short beep using Web Audio API. */
function playAlertBeep(): void {
  try {
    if (!_audioCtx) {
      _audioCtx = new AudioContext();
    }
    const ctx = _audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Audio not available — silent fallback
  }
}

export default function ASTraMAlertFeed() {
  const alerts = useAppStore((s) => s.alerts);
  const addAlert = useAppStore((s) => s.addAlert);
  const dismissAlert = useAppStore((s) => s.dismissAlert);
  const clearAlerts = useAppStore((s) => s.clearAlerts);
  const alertPanelOpen = useAppStore((s) => s.alertPanelOpen);
  const setAlertPanelOpen = useAppStore((s) => s.setAlertPanelOpen);

  /** Track which alerts have already been beeped to avoid re-beeps on re-render. */
  const beepedIds = useRef<Set<string>>(new Set());

  /** Track auto-dismiss timers. */
  const dismissTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  /** Play beep for critical new alerts and set auto-dismiss timers. */
  useEffect(() => {
    for (const alert of alerts) {
      // Beep for critical alerts not yet beeped
      if (alert.danger_score >= CRITICAL_DANGER_THRESHOLD && !beepedIds.current.has(alert.id)) {
        beepedIds.current.add(alert.id);
        playAlertBeep();
      }

      // Auto-dismiss non-critical alerts after timeout
      if (alert.danger_score < CRITICAL_DANGER_THRESHOLD && !dismissTimers.current.has(alert.id)) {
        const timer = setTimeout(() => {
          dismissAlert(alert.id);
          dismissTimers.current.delete(alert.id);
        }, AUTO_DISMISS_MS);
        dismissTimers.current.set(alert.id, timer);
      }
    }

    // Clean up timers for dismissed alerts
    for (const [id] of dismissTimers.current) {
      if (!alerts.find((a) => a.id === id)) {
        const timer = dismissTimers.current.get(id);
        if (timer) clearTimeout(timer);
        dismissTimers.current.delete(id);
      }
    }
  }, [alerts, dismissAlert]);

  /** Seed initial demo alerts on first render. */
  const seeded = useRef(false);
  const demoMode = useAppStore((s) => s.demoMode);
  useEffect(() => {
    if (demoMode && !seeded.current && alerts.length === 0) {
      seeded.current = true;
      // Import mock alerts lazily to avoid circular deps at module level
      import("@/lib/mocks").then(({ MOCK_ASTRAM_ALERTS }) => {
        for (const alert of MOCK_ASTRAM_ALERTS) {
          addAlert(alert);
        }
      });
    }
  }, [demoMode, alerts.length, addAlert]);

  const criticalCount = alerts.filter((a) => a.danger_score >= CRITICAL_DANGER_THRESHOLD).length;

  if (!alertPanelOpen && alerts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {/* Toggle button */}
      <button
        onClick={() => setAlertPanelOpen(!alertPanelOpen)}
        className={cn(
          "pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full shadow-lg transition-all duration-200",
          criticalCount > 0
            ? "bg-[var(--color-danger)] text-white hover:bg-[var(--color-danger-bright)]"
            : "bg-[var(--color-paper-1)] text-[var(--color-ink-muted)] border border-[var(--rule-color)] hover:text-[var(--color-ink)]",
        )}
      >
        <AlertBell
          className="h-4 w-4"
          critical={criticalCount > 0}
        />
        {alerts.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-danger)] text-[11px] font-bold text-white">
            {alerts.length > 9 ? "9+" : alerts.length}
          </span>
        )}
      </button>

      {/* Alert feed panel */}
      {alertPanelOpen && (
        <Card className="pointer-events-auto w-80 max-h-96 overflow-y-auto border-[var(--rule-color)] bg-[var(--color-paper-1)] shadow-2xl">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--rule-color)] bg-[var(--color-paper-1)] px-3 py-2">
            <div className="flex items-center gap-2">
              <AlertBell className="h-3.5 w-3.5 text-[var(--color-accent)]" critical={criticalCount > 0} />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
                ASTraM Alerts
              </span>
              {criticalCount > 0 && (
                <span className="rounded-full bg-[var(--color-danger-soft)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--color-danger)] ring-1 ring-[var(--color-danger)]/20">
                  {criticalCount} critical
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {alerts.length > 0 && (
                <button
                  onClick={clearAlerts}
                  className="rounded p-1 text-[var(--color-ink-faint)] hover:bg-[var(--color-paper-3)]/30 hover:text-[var(--color-ink-muted)] transition-colors"
                  title="Clear all alerts"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          <div className="p-2 space-y-1.5">
            {alerts.length === 0 ? (
              <p className="py-4 text-center text-[11px] text-[var(--color-ink-faint)]">
                No active alerts
              </p>
            ) : (
              alerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} onDismiss={dismissAlert} />
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

/** Single alert card in the feed. */
function AlertCard({
  alert,
  onDismiss,
}: {
  alert: ASTraMAlert;
  onDismiss: (id: string) => void;
}) {
  const isCritical = alert.danger_score >= CRITICAL_DANGER_THRESHOLD;
  const vColor = VIOLATION_COLORS[alert.violation_type] ?? "var(--color-accent)";
  const vLabel = VIOLATION_LABELS[alert.violation_type] ?? alert.violation_type;

  const timeAgo = getTimeAgo(alert.timestamp);

  return (
    <div
      className={cn(
        "group relative rounded-md border p-2 transition-all duration-200",
        isCritical
          ? "border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)]"
          : "border-[var(--rule-color)] bg-[var(--color-paper-2)]",
      )}
    >
      <div className="flex items-start gap-2">
        {/* Violation type indicator */}
        <div
          className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: vColor }}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-[var(--color-ink)] truncate">
              {vLabel}
            </span>
            {isCritical && (
              <span className="shrink-0 rounded bg-[var(--color-danger-soft)] px-1 py-0.5 text-[11px] font-bold uppercase text-[var(--color-danger)] ring-1 ring-[var(--color-danger)]/20">
                Critical
              </span>
            )}
          </div>
          <p className="text-[11px] text-[var(--color-ink-faint)] truncate">
            {alert.junction_name} · {alert.camera_id}
          </p>
          <div className="mt-0.5 flex items-center gap-2">
            <span
              className={cn(
                "flex items-center gap-1 font-mono text-[11px] tabular-nums font-semibold",
                isCritical ? "text-[var(--color-danger)]" : "text-[var(--color-warning)]",
              )}
            >
              <DangerGauge size={12} value={alert.danger_score} />
              {alert.danger_score}
            </span>
            {alert.license_plate && (
              <span className="font-mono text-[11px] text-[var(--color-accent)]">
                {alert.license_plate}
              </span>
            )}
            <span className="ml-auto text-[11px] text-[var(--color-ink-faint)]">
              {timeAgo}
            </span>
          </div>
        </div>

        {/* Dismiss button */}
        <button
          onClick={() => onDismiss(alert.id)}
          className="shrink-0 rounded p-0.5 text-[var(--color-ink-faint)] opacity-0 transition-opacity group-hover:opacity-100 hover:text-[var(--color-ink-muted)]"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

/** Compute a human-readable "time ago" string from an ISO timestamp. */
function getTimeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
}
