/**
 * Dashboard — Command Center for VigilAI.
 *
 * Design direction: "Tactical Operations Board"
 * Dense, information-first layout inspired by military C2 systems.
 * Glow-accented stat cards, violation type breakdown with mini sparklines,
 * daily trend with animated bars, and a live activity feed.
 */

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Camera,
  IndianRupee,
  ShieldAlert,
  TrendingUp,
  Activity,
  ChevronRight,
} from "lucide-react";
import { getAnalytics } from "@/lib/api";
import type { AnalyticsOverview } from "@/types/violation";
import {
  VIOLATION_LABELS,
  VIOLATION_COLORS,
  type ViolationType,
} from "@/types/violation";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

type StatCard = {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  glow: string;
  trend?: string;
};

export default function Dashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalytics(30)
      .then(setAnalytics)
      .catch(() => setAnalytics(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-8 w-8 rounded-full border-2 border-t-transparent border-[var(--color-accent)] animate-spin" />
          <p className="text-xs tracking-wider text-[var(--color-ink-faint)] uppercase">
            Loading command center
          </p>
        </div>
      </div>
    );
  }

  const totalViolations = analytics?.total_violations ?? 0;
  const totalFines = analytics?.total_fines ?? 0;
  const avgConf = (analytics?.avg_confidence ?? 0) * 100;
  const cameraCount = analytics?.top_cameras.length ?? 0;

  const stats: StatCard[] = [
    {
      label: "Total Violations",
      value: totalViolations.toLocaleString("en-IN"),
      icon: AlertTriangle,
      color: "var(--color-accent)",
      glow: "glow-accent",
      trend: "30d",
    },
    {
      label: "Fines Imposed",
      value: `₹${totalFines.toLocaleString("en-IN")}`,
      icon: IndianRupee,
      color: "var(--color-warning)",
      glow: "glow-accent",
    },
    {
      label: "Avg Confidence",
      value: `${avgConf.toFixed(1)}%`,
      icon: TrendingUp,
      color: "var(--color-success)",
      glow: "glow-success",
    },
    {
      label: "Active Cameras",
      value: cameraCount,
      icon: Camera,
      color: "var(--color-accent-bright)",
      glow: "glow-accent",
    },
  ];

  const typeEntries = analytics
    ? Object.entries(analytics.violations_by_type).sort(([, a], [, b]) => b - a)
    : [];

  const dailyCounts = analytics?.daily_counts ?? [];
  const maxDaily = Math.max(...dailyCounts.map((d) => d.count), 1);
  const recentDays = [...dailyCounts].reverse().slice(0, 21);

  return (
    <div className="p-5">
      {/* Header */}
      <header className="mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-accent)]/15">
            <ShieldAlert className="h-4 w-4 text-[var(--color-accent)]" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">
              Command Center
            </h1>
            <p className="text-[11px] text-[var(--color-ink-faint)]">
              Real-time traffic violation detection — Bengaluru Traffic Police
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-[var(--color-accent)]/30 bg-[var(--color-accent)]/8 text-[10px] text-[var(--color-accent)]"
            >
              <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] pulse-dot" />
              LIVE
            </Badge>
          </div>
        </div>
      </header>

      {/* Stat cards — dense 4-column grid */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color, glow, trend }) => (
          <Card
            key={label}
            className={cn(
              "group relative overflow-hidden border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/70 transition-all duration-300 hover:border-[var(--color-paper-4)]",
              glow,
            )}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-accent)]/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <CardContent className="p-3.5">
              <div className="flex items-start justify-between">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-md"
                  style={{ backgroundColor: `color-mix(in oklch, ${color} 15%, transparent)` }}
                >
                  <Icon className="h-4 w-4" style={{ color }} />
                </div>
                {trend && (
                  <span className="rounded bg-[var(--color-paper-3)]/60 px-1.5 py-0.5 font-mono text-[9px] text-[var(--color-ink-faint)]">
                    {trend}
                  </span>
                )}
              </div>
              <p className="mt-2 font-mono text-xl font-bold tabular-nums tracking-tight text-[var(--color-ink)]">
                {value}
              </p>
              <p className="mt-0.5 text-[10px] tracking-wider text-[var(--color-ink-faint)] uppercase">
                {label}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content — 2-column */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Left: Violations by type — 3 cols */}
        <Card className="border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/70 lg:col-span-3">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xs font-semibold text-[var(--color-ink)]">
                <Activity className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                Violations by Type
              </h2>
              <span className="font-mono text-[10px] tabular-nums text-[var(--color-ink-faint)]">
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
                        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-paper-3)]/50">
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
                      <span className="w-10 shrink-0 text-right font-mono text-[10px] tabular-nums text-[var(--color-ink-faint)]">
                        {pct.toFixed(0)}%
                      </span>
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
        <Card className="border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/70 lg:col-span-2">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xs font-semibold text-[var(--color-ink)]">
                <TrendingUp className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                Daily Trend
              </h2>
              <span className="font-mono text-[10px] text-[var(--color-ink-faint)]">
                21 days
              </span>
            </div>
            {/* Mini bar chart */}
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
                      <div className="absolute inset-0 rounded-sm bg-[var(--color-accent)]/50 transition-colors group-hover:bg-[var(--color-accent)]/80" />
                      <div className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-[var(--color-paper-2)] px-1.5 py-0.5 font-mono text-[9px] tabular-nums text-[var(--color-ink)] opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
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
                    className="flex-1 text-center font-mono text-[8px] text-[var(--color-ink-faint)]"
                  >
                    {i % 7 === 0 ? date.slice(8) : ""}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom: Top cameras + status breakdown */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Top cameras */}
        <Card className="border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/70">
          <CardContent className="p-4">
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold text-[var(--color-ink)]">
              <Camera className="h-3.5 w-3.5 text-[var(--color-accent)]" />
              Top Cameras
            </h2>
            <div className="space-y-2">
              {(analytics?.top_cameras ?? []).slice(0, 6).map((cam, i) => {
                const topCount = analytics?.top_cameras[0]?.count ?? 1;
                return (
                  <div key={cam.camera_id} className="flex items-center gap-2.5">
                    <span className="w-4 text-right font-mono text-[10px] tabular-nums text-[var(--color-ink-faint)]">
                      {i + 1}
                    </span>
                    <span className="w-32 truncate text-[11px] text-[var(--color-ink-muted)]">
                      {cam.camera_id}
                    </span>
                    <div className="flex-1">
                      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-paper-3)]/50">
                        <div
                          className="h-1.5 rounded-full bg-[var(--color-accent)]/60 transition-all duration-500"
                          style={{ width: `${(cam.count / topCount) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-8 text-right font-mono text-[11px] tabular-nums font-medium text-[var(--color-ink)]">
                      {cam.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Status breakdown */}
        <Card className="border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/70">
          <CardContent className="p-4">
            <h2 className="mb-3 text-xs font-semibold text-[var(--color-ink)]">
              Review Status
            </h2>
            <div className="space-y-3">
              {analytics
                ? Object.entries(analytics.violations_by_status).map(
                    ([status, count]) => {
                      const total = totalViolations || 1;
                      const pct = ((count / total) * 100).toFixed(0);
                      const colorMap: Record<string, string> = {
                        pending: "var(--color-warning)",
                        approved: "var(--color-success)",
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
                              {status}
                            </span>
                            <span className="font-mono text-[11px] tabular-nums text-[var(--color-ink)]">
                              {count}
                              <span className="ml-1 text-[var(--color-ink-faint)]">
                                ({pct}%)
                              </span>
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-paper-3)]/50">
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
