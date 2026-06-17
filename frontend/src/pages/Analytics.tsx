/**
 * Analytics page — violation trend charts, statistics, camera breakdown,
 * and an ROI Calculator showing Conservative vs Aggressive projections.
 *
 * Design: "Enforcement Intelligence Brief"
 * - Cleaner recharts with Midnight palette styling
 * - shadcn Card containers for all chart sections
 * - ROI table with accent color coding
 * - Period selector with shadcn Select
 */

import { useEffect, useState } from "react";
import {
  BarChart3,
  Camera,
  TrendingUp,
  AlertTriangle,
  IndianRupee,
  PieChart as PieIcon,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { getAnalytics } from "@/lib/api";
import type { AnalyticsOverview } from "@/types/violation";
import { VIOLATION_LABELS, VIOLATION_COLORS } from "@/types/violation";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** ROI Calculator table data per plan.md Section 12. */
const ROI_DATA = [
  { metric: "Junctions", conservative: "500", aggressive: "500" },
  { metric: "Violations / day", conservative: "40,000", aggressive: "80,000" },
  { metric: "Annual Recovery", conservative: "₹219 Cr", aggressive: "₹438 Cr" },
  { metric: "Investment", conservative: "₹2.5 Cr", aggressive: "₹2.5 Cr" },
  { metric: "Payback", conservative: "< 1 week", aggressive: "< 1 week" },
  { metric: "ROI", conservative: "87×", aggressive: "175×" },
];

/** Recharts tooltip styled for Midnight theme. */
const CHART_TOOLTIP_STYLE = {
  background: "oklch(18% 0.01 260)",
  border: "1px solid oklch(28% 0.015 260)",
  borderRadius: "6px",
  fontSize: "11px",
  color: "oklch(92% 0.01 260)",
  padding: "8px 12px",
};

const STATUS_COLORS = [
  "oklch(65% 0.18 145)",
  "oklch(75% 0.18 85)",
  "oklch(60% 0.22 25)",
];

export default function Analytics() {
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    getAnalytics(days)
      .then(setAnalytics)
      .catch(() => setAnalytics(null))
      .finally(() => setLoading(false));
  }, [days]);

  if (loading && !analytics) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-8 w-8 rounded-full border-2 border-t-transparent border-[var(--color-accent)] animate-spin" />
          <p className="text-xs tracking-wider text-[var(--color-ink-faint)] uppercase">
            Loading analytics
          </p>
        </div>
      </div>
    );
  }

  const totalViolations = analytics?.total_violations ?? 0;
  const avgConf = (analytics?.avg_confidence ?? 0) * 100;
  const totalFines = analytics?.total_fines ?? 0;

  const typeData = analytics
    ? Object.entries(analytics.violations_by_type).map(([key, value]) => ({
        name: VIOLATION_LABELS[key as keyof typeof VIOLATION_LABELS] ?? key,
        value,
        key,
      }))
    : [];

  const dailyData = analytics
    ? analytics.daily_counts.map((d) => ({
        date: d.date.slice(5),
        count: d.count,
      }))
    : [];

  const statusData = analytics
    ? Object.entries(analytics.violations_by_status).map(([key, value]) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        value,
      }))
    : [];

  return (
    <div className="p-5">
      <header className="mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-accent)]/15">
              <BarChart3 className="h-4 w-4 text-[var(--color-accent)]" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">
                Analytics
              </h1>
              <p className="text-[11px] text-[var(--color-ink-faint)]">
                Violation trends and enforcement statistics
              </p>
            </div>
          </div>
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="h-7 w-32 border-[var(--color-paper-3)] bg-[var(--color-paper-2)]/50 text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* Summary stats */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatBox
          icon={AlertTriangle}
          label="Total Violations"
          value={totalViolations}
          color="var(--color-accent)"
        />
        <StatBox
          icon={TrendingUp}
          label="Avg Confidence"
          value={`${avgConf.toFixed(1)}%`}
          color="var(--color-success)"
        />
        <StatBox
          icon={IndianRupee}
          label="Total Fines"
          value={`₹${totalFines.toLocaleString("en-IN")}`}
          color="var(--color-warning)"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Violation type bar chart */}
        <Card className="border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/70">
          <CardContent className="p-4">
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold text-[var(--color-ink)]">
              <BarChart3 className="h-3.5 w-3.5 text-[var(--color-accent)]" />
              Violations by Type
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(28% 0.015 260 / 0.4)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "oklch(65% 0.02 260)", fontSize: 9 }}
                    angle={-35}
                    textAnchor="end"
                    height={55}
                  />
                  <YAxis tick={{ fill: "oklch(65% 0.02 260)", fontSize: 9 }} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                    {typeData.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={
                          VIOLATION_COLORS[entry.key as keyof typeof VIOLATION_COLORS] ??
                          "oklch(65% 0.18 250)"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status pie chart */}
        <Card className="border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/70">
          <CardContent className="p-4">
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold text-[var(--color-ink)]">
              <PieIcon className="h-3.5 w-3.5 text-[var(--color-accent)]" />
              Review Status
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={STATUS_COLORS[i] ?? STATUS_COLORS[0]} />
                    ))}
                  </Pie>
                  <Legend
                    wrapperStyle={{ fontSize: "10px", color: "oklch(65% 0.02 260)" }}
                  />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Daily trend */}
        <Card className="border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/70 lg:col-span-2">
          <CardContent className="p-4">
            <h2 className="mb-3 text-xs font-semibold text-[var(--color-ink)]">
              Daily Violation Trend
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(28% 0.015 260 / 0.4)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "oklch(65% 0.02 260)", fontSize: 9 }}
                  />
                  <YAxis tick={{ fill: "oklch(65% 0.02 260)", fontSize: 9 }} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar
                    dataKey="count"
                    fill="oklch(65% 0.18 250)"
                    radius={[3, 3, 0, 0]}
                    opacity={0.8}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top cameras */}
      {analytics && analytics.top_cameras.length > 0 && (
        <Card className="mt-4 border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/70">
          <CardContent className="p-4">
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold text-[var(--color-ink)]">
              <Camera className="h-3.5 w-3.5 text-[var(--color-accent)]" />
              Top Cameras by Violation Count
            </h2>
            <div className="space-y-2">
              {analytics.top_cameras.map((cam) => (
                <div key={cam.camera_id} className="flex items-center gap-2.5">
                  <Camera className="h-3 w-3 text-[var(--color-ink-faint)]" />
                  <span className="flex-1 text-[11px] text-[var(--color-ink-muted)]">
                    {cam.camera_id}
                  </span>
                  <div className="w-32">
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-paper-3)]/50">
                      <div
                        className="h-1.5 rounded-full bg-[var(--color-accent)]/60"
                        style={{
                          width: `${(cam.count / Math.max(analytics.top_cameras[0].count, 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="w-8 text-right font-mono text-[11px] tabular-nums text-[var(--color-ink-muted)]">
                    {cam.count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ROI Calculator */}
      <Card className="mt-4 border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/70">
        <CardContent className="p-4">
          <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--color-ink)]">
            <IndianRupee className="h-3.5 w-3.5 text-[var(--color-warning)]" />
            ROI Calculator
          </h2>
          <p className="mb-4 text-[10px] text-[var(--color-ink-faint)]">
            Projected financial impact — Bengaluru-wide deployment across 500 junctions
          </p>
          <Table>
            <TableHeader>
              <TableRow className="border-b-[var(--color-paper-3)]/60 hover:bg-transparent">
                <TableHead className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-ink-faint)]">
                  Metric
                </TableHead>
                <TableHead className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-accent)]">
                  Conservative
                </TableHead>
                <TableHead className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-success)]">
                  Aggressive
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ROI_DATA.map((row) => (
                <TableRow key={row.metric} className="border-b-[var(--color-paper-3)]/30">
                  <TableCell className="py-2 text-[11px] font-medium text-[var(--color-ink)]">
                    {row.metric}
                  </TableCell>
                  <TableCell className="py-2 font-mono text-[11px] tabular-nums text-[var(--color-ink-muted)]">
                    {row.conservative}
                  </TableCell>
                  <TableCell className="py-2 font-mono text-[11px] tabular-nums font-medium text-[var(--color-ink)]">
                    {row.aggressive}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/** Stat card used in the summary row. */
function StatBox({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <Card className="border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/70 transition-all duration-300 hover:border-[var(--color-paper-4)]">
      <CardContent className="p-3.5">
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-md"
            style={{ backgroundColor: `color-mix(in oklch, ${color} 15%, transparent)` }}
          >
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
          <div>
            <p className="text-[9px] font-medium uppercase tracking-wider text-[var(--color-ink-faint)]">
              {label}
            </p>
            <p className="font-mono text-lg font-bold tabular-nums tracking-tight text-[var(--color-ink)]">
              {value}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
