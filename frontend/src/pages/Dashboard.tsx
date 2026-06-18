/**
 * Dashboard — Signal Console overview.
 *
 * Design direction: refined gov-tech startup.
 * Calm hierarchy, signal-blue emphasis, measured density, and clearer
 * separation between monitoring data and operational status.
 */

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  IndianRupee,
  ShieldAlert,
  Activity,
  Wifi,
  WifiOff,
  Clock,
} from "lucide-react";
import { getAnalytics, listCameras } from "@/lib/api";
import type {
  AnalyticsOverview,
  CameraHealth,
  CameraStatus,
  TrendForecast,
} from "@/types/violation";
import {
  VIOLATION_LABELS,
  VIOLATION_COLORS,
  type ViolationType,
} from "@/types/violation";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { TrendArrow, CameraPulse } from "@/components/icons";

type StatCard = {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  glow: string;
  trend?: string;
  trendDirection?: "up" | "down" | "stable";
  trendPercentage?: number;
  sparkline?: number[];
};

/** Map trend direction to animated icon component. */
function TrendIcon({ direction }: { direction: "up" | "down" | "stable" }) {
  return (
    <TrendArrow
      direction={direction}
      className={cn(
        "h-3 w-3",
        direction === "up" && "text-[var(--color-danger)]",
        direction === "down" && "text-[var(--color-success)]",
        direction === "stable" && "text-[var(--color-ink-faint)]",
      )}
    />
  );
}

/** Mini sparkline SVG from an array of values. */
function Sparkline({
  data,
  color,
  width = 60,
  height = 20,
  className,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const points = data
    .map((v, i) => `${i * step},${height - ((v - min) / range) * height}`)
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.7}
      />
    </svg>
  );
}

/** Camera status indicator. */
function CameraStatusBadge({ status }: { status: CameraStatus }) {
  const config: Record<CameraStatus, { icon: React.ElementType; color: string; label: string }> = {
    active: { icon: Wifi, color: "var(--color-success)", label: "Active" },
    idle: { icon: Clock, color: "var(--color-warning)", label: "Idle" },
    offline: { icon: WifiOff, color: "var(--color-danger)", label: "Offline" },
  };
  const { icon: Icon, color, label } = config[status];

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium"
      style={{
        backgroundColor: `color-mix(in oklch, ${color} 10%, transparent)`,
        color,
        border: `1px solid color-mix(in oklch, ${color} 20%, transparent)`,
      }}
    >
      <Icon className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

export default function Dashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [cameras, setCameras] = useState<CameraHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const setCamerasStore = useAppStore((s) => s.setCameras);
  const demoMode = useAppStore((s) => s.demoMode);

  useEffect(() => {
    Promise.all([
      getAnalytics(30).catch(() => null),
      listCameras().catch(() => ({ total: 0, cameras: [] })),
    ])
      .then(([analyticsData, camerasData]) => {
        if (analyticsData) setAnalytics(analyticsData);
        const camList = camerasData?.cameras ?? [];
        setCameras(camList);
        setCamerasStore(camList);
      })
      .finally(() => setLoading(false));
  }, [setCamerasStore, demoMode]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-8 w-8 rounded-full border-2 border-t-transparent border-[var(--color-accent)] animate-spin" />
          <p className="text-xs tracking-wider text-[var(--color-ink-faint)] uppercase">
            Loading command data
          </p>
        </div>
      </div>
    );
  }

  const totalViolations = analytics?.total_violations ?? 0;
  const totalFines = analytics?.total_fines ?? 0;
  const avgConf = (analytics?.avg_confidence ?? 0) * 100;

  // Extract trend data for stat cards
  const trendMap: Record<string, TrendForecast> = {};
  for (const tf of analytics?.trend_forecast ?? []) {
    trendMap[tf.violation_type] = tf;
  }

  // Overall trend: average of all violation type trends
  const overallTrend = analytics?.trend_forecast?.length
    ? analytics.trend_forecast.reduce((acc, tf) => {
        if (tf.trend_direction === "up") return acc + 1;
        if (tf.trend_direction === "down") return acc - 1;
        return acc;
      }, 0) > 0
      ? "up" as const
      : analytics.trend_forecast.reduce((acc, tf) => {
            if (tf.trend_direction === "up") return acc + 1;
            if (tf.trend_direction === "down") return acc - 1;
            return acc;
          }, 0) < 0
        ? "down" as const
        : "stable" as const
    : undefined;

  const overallTrendPct = analytics?.trend_forecast?.length
    ? Math.round(
        analytics.trend_forecast.reduce((acc, tf) => acc + tf.trend_percentage, 0) /
          analytics.trend_forecast.length,
      )
    : undefined;

  // Sparkline data from daily_counts
  const sparklineData = analytics?.daily_counts?.map((d) => d.count) ?? [];

  const stats: StatCard[] = [
    {
      label: "Total Violations",
      value: totalViolations.toLocaleString("en-IN"),
      icon: AlertTriangle,
      color: "var(--color-accent)",
      glow: "glow-accent",
      trend: "30d",
      trendDirection: overallTrend,
      trendPercentage: overallTrendPct,
      sparkline: sparklineData,
    },
    {
      label: "Fines Imposed",
      value: `₹${totalFines.toLocaleString("en-IN")}`,
      icon: IndianRupee,
      color: "var(--color-accent-bright)",
      glow: "glow-accent",
    },
    {
      label: "Avg Confidence",
      value: `${avgConf.toFixed(1)}%`,
      icon: Activity,
      color: "var(--color-phosphor)",
      glow: "glow-phosphor",
    },
    {
      label: "Active Cameras",
      value: cameras.filter((c) => c.status === "active").length,
      icon: CameraPulse,
      color: "var(--color-phosphor-bright)",
      glow: "glow-phosphor",
    },
  ];

  const typeEntries = analytics
    ? Object.entries(analytics.violations_by_type).sort(([, a], [, b]) => b - a)
    : [];

  const dailyCounts = analytics?.daily_counts ?? [];
  const maxDaily = Math.max(...dailyCounts.map((d) => d.count), 1);
  const recentDays = [...dailyCounts].reverse().slice(0, 21);

  // Camera health summary
  const activeCams = cameras.filter((c) => c.status === "active").length;
  const idleCams = cameras.filter((c) => c.status === "idle").length;
  const offlineCams = cameras.filter((c) => c.status === "offline").length;

  return (
    <div className="min-h-full p-5 lg:p-6">
      {/* Header */}
      <header className="mb-5">
        <div className="flex items-center gap-3">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-accent-soft)] border border-[var(--color-accent)]/20">
            <ShieldAlert className="h-4 w-4 text-[var(--color-accent)]" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">
              Command Center
            </h1>
            <p className="text-[12px] text-[var(--color-ink-faint)]">
              Real-time traffic violation interception — Bengaluru Traffic Police
            </p>
          </div>
        </div>
      </header>

      {/* Stat cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color, glow, trend, trendDirection, trendPercentage, sparkline }) => (
          <Card
            key={label}
            className={cn(
              "group relative overflow-hidden border-[var(--rule-color)] bg-[var(--color-paper-1)] transition-all duration-300 hover:border-[var(--color-accent)]/25",
              glow,
            )}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-accent)]/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <CardContent className="p-3.5">
              <div className="flex items-start justify-between">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-md border"
                  style={{
                    backgroundColor: `color-mix(in oklch, ${color} 10%, transparent)`,
                    borderColor: `color-mix(in oklch, ${color} 20%, transparent)`,
                  }}
                >
                  <Icon className="h-4 w-4" style={{ color }} />
                </div>
                <div className="flex items-center gap-1.5">
                  {/* Trend arrow + percentage (F8) */}
                  {trendDirection && (
                    <span className="flex items-center gap-1 rounded bg-[var(--color-paper-3)]/50 px-1.5 py-0.5 font-mono text-[11px] border border-[var(--color-paper-3)]/30">
                      <TrendIcon direction={trendDirection} />
                      {trendPercentage !== undefined && (
                        <span
                          className={cn(
                            trendDirection === "up" && "text-[var(--color-danger)]",
                            trendDirection === "down" && "text-[var(--color-success)]",
                            trendDirection === "stable" && "text-[var(--color-ink-faint)]",
                          )}
                        >
                          {trendPercentage}%
                        </span>
                      )}
                    </span>
                  )}
                  {trend && !trendDirection && (
                    <span className="rounded bg-[var(--color-paper-3)]/50 px-1.5 py-0.5 font-mono text-[11px] text-[var(--color-ink-faint)] border border-[var(--color-paper-3)]/30">
                      {trend}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="mt-2 font-mono text-[22px] font-bold tabular-nums tracking-tight text-[var(--color-ink)]">
                  {value}
                </p>
                {/* Sparkline (F8) */}
                {sparkline && sparkline.length > 1 && (
                  <Sparkline data={sparkline} color={color} className="mb-1" />
                )}
              </div>
              <p className="mt-0.5 text-[11px] tracking-wider text-[var(--color-ink-faint)] uppercase">
                {label}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content — 2-column */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Left: Violations by type — 3 cols */}
        <Card className="border-[var(--color-paper-3)]/50 bg-[var(--color-paper-1)]/80 lg:col-span-3">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[13px] font-semibold text-[var(--color-ink)]">
                <Activity className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                Violations by Type
              </h2>
              <span className="font-mono text-[11px] tabular-nums text-[var(--color-phosphor)]">
                {totalViolations} total
              </span>
            </div>
            <div className="space-y-2">
              {typeEntries.length > 0 ? (
                typeEntries.map(([type, count]) => {
                  const vType = type as ViolationType;
                  const color = VIOLATION_COLORS[vType] ?? "var(--color-accent)";
                  const label = VIOLATION_LABELS[vType] ?? type;
                  const pct = totalViolations > 0 ? (count / totalViolations) * 100 : 0;
                  const tf = trendMap[type];
                  return (
                    <div key={type} className="group flex items-center gap-2.5">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full transition-transform group-hover:scale-125"
                        style={{ backgroundColor: color }}
                      />
                      <span className="w-24 shrink-0 truncate text-[11px] text-[var(--color-ink-muted)]">
                        {label}
                      </span>
                      <div className="flex-1">
                        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-paper-3)]/40">
                          <div
                            className="h-1.5 rounded-full transition-all duration-700"
                            style={{
                              width: `${Math.min(pct, 100)}%`,
                              backgroundColor: color,
                              opacity: 0.8,
                            }}
                          />
                        </div>
                      </div>
                      <span className="w-8 shrink-0 text-right font-mono text-[11px] tabular-nums font-medium text-[var(--color-ink)]">
                        {count}
                      </span>
                      <span className="w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-[var(--color-ink-faint)]">
                        {pct.toFixed(0)}%
                      </span>
                      {/* Trend arrow per type (F8) */}
                      {tf && (
                        <span className="w-8 shrink-0 flex items-center justify-end gap-0.5">
                          <TrendIcon direction={tf.trend_direction} />
                          <span className={cn(
                            "font-mono text-[11px] tabular-nums",
                            tf.trend_direction === "up" && "text-[var(--color-danger)]",
                            tf.trend_direction === "down" && "text-[var(--color-success)]",
                            tf.trend_direction === "stable" && "text-[var(--color-ink-faint)]",
                          )}>
                            {tf.trend_percentage.toFixed(0)}%
                          </span>
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="py-4 text-center text-xs text-[var(--color-ink-faint)]">
                  No data available
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right: Daily trend — 2 cols */}
        <Card className="border-[var(--color-paper-3)]/50 bg-[var(--color-paper-1)]/80 lg:col-span-2">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[13px] font-semibold text-[var(--color-ink)]">
                <TrendArrow direction="up" className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                Daily Trend
              </h2>
              <span className="font-mono text-[11px] text-[var(--color-phosphor)]">
                21 days
              </span>
            </div>
            {/* Mini bar chart — amber bars with phosphor hover */}
            <div className="flex items-end gap-[3px]" style={{ height: 120 }}>
              {recentDays.length > 0 ? (
                recentDays.map(({ date, count }) => {
                  const h = Math.max((count / maxDaily) * 100, 4);
                  return (
                    <div
                      key={date}
                      className="group relative flex-1 cursor-default"
                      style={{ height: `${h}%` }}
                    >
                      <div className="absolute inset-0 rounded-sm bg-[var(--color-accent)]/40 transition-colors group-hover:bg-[var(--color-accent)]/70" />
                      <div className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-[var(--color-paper-2)] px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-[var(--color-accent)] opacity-0 shadow-lg ring-1 ring-[var(--color-paper-3)]/30 transition-opacity group-hover:opacity-100">
                        {count}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <p className="text-xs text-[var(--color-ink-faint)]">No data</p>
                </div>
              )}
            </div>
            {/* Date labels */}
            {recentDays.length > 0 && (
              <div className="mt-1.5 flex gap-[3px]">
                {recentDays.map(({ date }, i) => (
                  <div
                    key={date}
                    className="flex-1 text-center font-mono text-[11px] text-[var(--color-ink-faint)]"
                  >
                    {i % 7 === 0 ? date.slice(8) : ""}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom: Top cameras + Camera health + Status breakdown */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Top cameras */}
        <Card className="border-[var(--color-paper-3)]/50 bg-[var(--color-paper-1)]/80">
          <CardContent className="p-4">
            <h2 className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-[var(--color-ink)]">
              <CameraPulse className="h-3.5 w-3.5 text-[var(--color-accent)]" />
              Top Cameras
            </h2>
            <div className="space-y-2">
              {(analytics?.top_cameras ?? []).slice(0, 6).map((cam, i) => {
                const topCount = analytics?.top_cameras[0]?.count ?? 1;
                const camHealth = cameras.find((c) => c.camera_id === cam.camera_id);
                return (
                  <div key={cam.camera_id} className="flex items-center gap-2.5">
                    <span className="w-4 text-right font-mono text-[11px] tabular-nums text-[var(--color-ink-faint)]">
                      {i + 1}
                    </span>
                    <span className="w-32 truncate font-mono text-[11px] text-[var(--color-phosphor)]">
                      {cam.camera_id}
                    </span>
                    <div className="flex-1">
                      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-paper-3)]/40">
                        <div
                          className="h-1.5 rounded-full bg-[var(--color-accent)]/50 transition-all duration-500"
                          style={{ width: `${(cam.count / topCount) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-8 text-right font-mono text-[11px] tabular-nums font-medium text-[var(--color-ink)]">
                      {cam.count}
                    </span>
                    {camHealth && <CameraStatusBadge status={camHealth.status} />}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Camera health panel (F9) */}
        <Card className="border-[var(--color-paper-3)]/50 bg-[var(--color-paper-1)]/80">
          <CardContent className="p-4">
            <h2 className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-[var(--color-ink)]">
              <Wifi className="h-3.5 w-3.5 text-[var(--color-accent)]" />
              Camera Health
            </h2>
            {/* Summary row */}
            <div className="mb-3 flex items-center gap-3">
              <span className="flex items-center gap-1 text-[11px] text-[var(--color-success)]">
                <Wifi className="h-3 w-3" />
                <span className="font-mono font-semibold">{activeCams}</span>
                <span className="text-[var(--color-ink-faint)]">active</span>
              </span>
              <span className="flex items-center gap-1 text-[11px] text-[var(--color-warning)]">
                <Clock className="h-3 w-3" />
                <span className="font-mono font-semibold">{idleCams}</span>
                <span className="text-[var(--color-ink-faint)]">idle</span>
              </span>
              <span className="flex items-center gap-1 text-[11px] text-[var(--color-danger)]">
                <WifiOff className="h-3 w-3" />
                <span className="font-mono font-semibold">{offlineCams}</span>
                <span className="text-[var(--color-ink-faint)]">offline</span>
              </span>
            </div>
            {/* Camera list */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {cameras.length > 0 ? (
                cameras.map((cam) => (
                  <div key={cam.camera_id} className="flex items-center gap-2 py-0.5">
                    <CameraStatusBadge status={cam.status} />
                    <span className="flex-1 truncate font-mono text-[11px] text-[var(--color-ink-muted)]">
                      {cam.junction_name}
                    </span>
                    <span className="font-mono text-[11px] tabular-nums text-[var(--color-ink-faint)]">
                      {cam.violation_count_24h}v/24h
                    </span>
                    {cam.avg_latency_ms != null && (
                      <span className="font-mono text-[11px] tabular-nums text-[var(--color-ink-faint)]">
                        {cam.avg_latency_ms}ms
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-xs text-[var(--color-ink-faint)]">
                  No camera data
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status breakdown */}
        <Card className="border-[var(--color-paper-3)]/50 bg-[var(--color-paper-1)]/80">
          <CardContent className="p-4">
            <h2 className="mb-3 text-[13px] font-semibold text-[var(--color-ink)]">
              Review Status
            </h2>
            <div className="space-y-3">
              {analytics
                ? Object.entries(analytics.violations_by_status).map(
                    ([status, count]) => {
                      const total = totalViolations || 1;
                      const pct = ((count / total) * 100).toFixed(0);
                      const colorMap: Record<string, string> = {
                        pending: "var(--color-accent)",
                        under_review: "#3b82f6",
                        approved: "var(--color-phosphor)",
                        issued: "#06b6d4",
                        rejected: "var(--color-danger)",
                      };
                      const color = colorMap[status] ?? "var(--color-accent)";
                      return (
                        <div key={status}>
                          <div className="mb-1 flex items-center justify-between">
                            <span className="flex items-center gap-2 text-[11px] capitalize text-[var(--color-ink-muted)]">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: color }}
                              />
                              {status.replace("_", " ")}
                            </span>
                            <span className="font-mono text-[11px] tabular-nums text-[var(--color-ink)]">
                              {count}
                              <span className="ml-1 text-[var(--color-ink-faint)]">
                                ({pct}%)
                              </span>
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-paper-3)]/40">
                            <div
                              className="h-1.5 rounded-full transition-all duration-700"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: color,
                                opacity: 0.7,
                              }}
                            />
                          </div>
                        </div>
                      );
                    },
                  )
                : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
