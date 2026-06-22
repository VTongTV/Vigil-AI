/**
 * Live Tracking Console — real-time camera overview and violation monitoring.
 *
 * Displays camera statuses across Bengaluru junctions with auto-refresh,
 * violation bars, and last-violation context. Designed for the command
 * center demo view.
 *
 * Hierarchy (mirrors Dashboard reference):
 *   L1 Hero     → font-mono text-[22px] font-bold tabular-nums
 *   L4 Label    → text-[11px] tracking-wider uppercase text-faint
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, Camera, AlertTriangle, Radio, Clock, Eye } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getTrackingOverview } from "@/lib/api";
import type { TrackingOverviewResponse, TrackingCamera, CameraStatus } from "@/types/violation";
import { VIOLATION_LABELS } from "@/types/violation";
import { useAppStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const REFRESH_MS = 30_000;
const MAX_BAR = 10;

const STATUS_STYLE: Record<CameraStatus, { dot: string; badge: string; label: string }> = {
  active: { dot: "bg-emerald-500", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Active" },
  idle: { dot: "bg-amber-500", badge: "bg-amber-500/10 text-amber-400 border-amber-500/20", label: "Idle" },
  offline: { dot: "bg-red-500", badge: "bg-red-500/10 text-red-400 border-red-500/20", label: "Offline" },
};

const containerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const cardVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 280, damping: 26 } },
};

export default function Tracking() {
  const [data, setData] = useState<TrackingOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [countdown, setCountdown] = useState(REFRESH_MS / 1000);
  const demoMode = useAppStore((s) => s.demoMode);
  const prefersReduced = useReducedMotion() ?? false;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      const result = await getTrackingOverview();
      setData(result);
      setLastRefresh(new Date());
      setCountdown(REFRESH_MS / 1000);
    } catch { /* keep previous data */ }
    finally { setLoading(false); }
  }, [demoMode]);

  useEffect(() => { setLoading(true); fetchOverview(); }, [fetchOverview]);

  useEffect(() => {
    intervalRef.current = setInterval(fetchOverview, REFRESH_MS);
    countdownRef.current = setInterval(() => setCountdown((p) => (p > 0 ? p - 1 : REFRESH_MS / 1000)), 1000);
    return () => { clearInterval(intervalRef.current!); clearInterval(countdownRef.current!); };
  }, [fetchOverview]);

  const mv = prefersReduced ? { hidden: {}, visible: {} } : cardVariants;
  const mc = prefersReduced ? { hidden: {}, visible: {} } : containerVariants;

  if (loading && !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-8 w-8 rounded-full border-2 border-t-transparent border-[var(--color-accent)] animate-spin" />
          <p className="text-xs tracking-wider text-[var(--color-ink-faint)] uppercase">Connecting to tracking feed</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="p-5 lg:p-6"
      initial={prefersReduced ? {} : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* ── Header ── */}
      <header className="mb-6 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-accent-soft)] ring-1 ring-[var(--color-accent)]/15">
          <Radio className="h-4 w-4 text-[var(--color-accent)]" />
        </div>
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-[var(--color-ink)]">
            Live Tracking
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <Badge variant="outline" className="h-5 gap-1 border-emerald-500/25 bg-emerald-500/10 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Live
            </Badge>
          </h1>
          <p className="text-[11px] text-[var(--color-ink-faint)]">Real-time camera monitoring across Bengaluru</p>
        </div>
      </header>

      {/* ── Stats row ── */}
      <motion.div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3" variants={mc} initial="hidden" animate="visible">
        <motion.div variants={mv}>
          <StatCard icon={Camera} label="Active Cameras" value={data?.active_cameras ?? 0} total={data?.cameras.length ?? 0} color="var(--color-accent)" />
        </motion.div>
        <motion.div variants={mv}>
          <StatCard icon={AlertTriangle} label="Violations (1h)" value={data?.total_violations_last_hour ?? 0} color="var(--color-helmet)" />
        </motion.div>
        <motion.div variants={mv}>
          <StatCard icon={Activity} label="Active Alerts" value={data?.alerts_active ?? 0} color="var(--color-redlight)" />
        </motion.div>
      </motion.div>

      {/* ── Camera grid ── */}
      <motion.div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" variants={mc} initial="hidden" animate="visible">
        <AnimatePresence>
          {(data?.cameras ?? []).map((cam) => (
            <motion.div key={cam.camera_id} variants={mv} layout>
              <CameraCard camera={cam} prefersReduced={prefersReduced} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* ── Footer: refresh timer ── */}
      <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-[var(--color-ink-faint)]">
        <Clock className="h-3 w-3" />
        <span>
          Next refresh in <span className="font-mono tabular-nums">{countdown}s</span>
          {" · "}Updated <span className="font-mono tabular-nums">
            {lastRefresh.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        </span>
      </div>
    </motion.div>
  );
}

/* ── Stat hero card ── */
function StatCard({ icon: Icon, label, value, total, color }: {
  icon: React.ElementType; label: string; value: number; total?: number; color: string;
}) {
  return (
    <Card className="group relative overflow-hidden border-[var(--rule-color)] bg-[var(--color-paper-1)] transition-colors duration-200 hover:border-[var(--color-accent)]/25">
      <CardContent className="p-4">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-md border"
          style={{ backgroundColor: `color-mix(in oklch, ${color} 10%, transparent)`, borderColor: `color-mix(in oklch, ${color} 20%, transparent)` }}
        >
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        <p className="mt-3 font-mono text-[22px] font-bold tabular-nums tracking-tight text-[var(--color-ink)]">
          {value}{total !== undefined && <span className="text-[14px] font-medium text-[var(--color-ink-faint)]"> / {total}</span>}
        </p>
        <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-[var(--color-ink-faint)]">{label}</p>
      </CardContent>
    </Card>
  );
}

/* ── Camera card ── */
function CameraCard({ camera, prefersReduced }: { camera: TrackingCamera; prefersReduced: boolean }) {
  const style = STATUS_STYLE[camera.status];
  const violationLabel = camera.last_violation_type
    ? VIOLATION_LABELS[camera.last_violation_type as keyof typeof VIOLATION_LABELS] ?? camera.last_violation_type
    : null;
  const barWidth = Math.min((camera.violations_last_hour / MAX_BAR) * 100, 100);
  const isAlert = camera.violations_last_hour >= 3;

  return (
    <Card className={cn("group relative overflow-hidden border-[var(--rule-color)] bg-[var(--color-paper-1)] transition-all duration-200 hover:border-[var(--color-accent)]/25", isAlert && "ring-1 ring-[var(--color-redlight)]/15")}>
      {isAlert && <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-redlight)]/50 to-transparent" />}
      <CardContent className="p-3.5">
        {/* Camera header */}
        <div className="mb-2.5 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-[12px] font-semibold text-[var(--color-phosphor)]">{camera.camera_id}</p>
            <p className="mt-0.5 truncate text-[11px] text-[var(--color-ink-muted)]">{camera.junction_name}</p>
          </div>
          <Badge variant="outline" className={cn("h-5 shrink-0 gap-1 border text-[10px] font-medium", style.badge)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />{style.label}
          </Badge>
        </div>

        {/* Violation bar */}
        <div className="mb-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-ink-faint)]">Violations (1h)</span>
            <span className="font-mono text-[12px] font-semibold tabular-nums text-[var(--color-ink)]">{camera.violations_last_hour}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-paper-3)]/50">
            <motion.div
              className={cn("h-1.5 rounded-full", isAlert ? "bg-[var(--color-redlight)]" : "bg-[var(--color-accent)]/60")}
              initial={prefersReduced ? { width: `${barWidth}%` } : { width: 0 }}
              animate={{ width: `${barWidth}%` }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>

        {/* Last violation */}
        <div className="mb-3 min-h-[34px]">
          {violationLabel ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[var(--color-ink-faint)]">Last:</span>
              <span className="text-[11px] font-medium text-[var(--color-ink-muted)]">{violationLabel}</span>
              {camera.last_violation_time && (
                <span className="text-[10px] tabular-nums text-[var(--color-ink-faint)]">
                  {new Date(camera.last_violation_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          ) : (
            <span className="text-[11px] text-[var(--color-ink-faint)]">No violations recorded</span>
          )}
        </div>

        {/* View feed button */}
        <Button variant="outline" size="sm" disabled
          className="h-7 w-full gap-1.5 border-[var(--rule-color)] bg-[var(--color-paper-2)] text-[11px] font-medium text-[var(--color-ink-muted)]">
          <Eye className="h-3 w-3" />View Feed
        </Button>
      </CardContent>
    </Card>
  );
}
