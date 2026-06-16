import { useEffect, useState } from "react";
import {
  BarChart3,
  Camera,
  TrendingUp,
  AlertTriangle,
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

const PIE_COLORS = [
  "oklch(65% 0.18 250)",
  "oklch(65% 0.2 25)",
  "oklch(70% 0.18 55)",
  "oklch(65% 0.18 280)",
  "oklch(70% 0.15 90)",
  "oklch(65% 0.18 320)",
  "oklch(65% 0.15 210)",
  "oklch(55% 0.22 20)",
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
        <p className="text-[var(--color-ink-muted)]">Loading analytics...</p>
      </div>
    );
  }

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
    <div className="p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-ink)]">
            Analytics
          </h1>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            Violation trends and enforcement statistics
          </p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-md border border-[var(--color-paper-3)] bg-[var(--color-paper-2)] px-3 py-1.5 text-xs text-[var(--color-ink)]"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </header>

      {/* Summary stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatBox
          icon={AlertTriangle}
          label="Total Violations"
          value={analytics?.total_violations ?? 0}
        />
        <StatBox
          icon={TrendingUp}
          label="Avg Confidence"
          value={`${((analytics?.avg_confidence ?? 0) * 100).toFixed(1)}%`}
        />
        <StatBox
          icon={Camera}
          label="Total Fines"
          value={`₹${(analytics?.total_fines ?? 0).toLocaleString("en-IN")}`}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Violation type bar chart */}
        <section className="rounded-lg border border-[var(--color-paper-3)] bg-[var(--color-paper-1)] p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
            <BarChart3 className="h-4 w-4 text-[var(--color-accent)]" />
            Violations by Type
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-paper-3)"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--color-ink-muted)", fontSize: 10 }}
                  angle={-35}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tick={{ fill: "var(--color-ink-muted)", fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-paper-2)",
                    border: "1px solid var(--color-paper-3)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {typeData.map((entry, i) => (
                    <Cell
                      key={entry.key}
                      fill={
                        VIOLATION_COLORS[entry.key as keyof typeof VIOLATION_COLORS] ??
                        PIE_COLORS[i % PIE_COLORS.length]
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Status pie chart */}
        <section className="rounded-lg border border-[var(--color-paper-3)] bg-[var(--color-paper-1)] p-5">
          <h2 className="mb-4 text-sm font-semibold text-[var(--color-ink)]">
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
                    <Cell
                      key={i}
                      fill={
                        ["var(--color-success)", "var(--color-warning)", "var(--color-danger)"][i] ??
                        PIE_COLORS[i]
                      }
                    />
                  ))}
                </Pie>
                <Legend
                  wrapperStyle={{ fontSize: "11px", color: "var(--color-ink-muted)" }}
                />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Daily trend bar chart */}
        <section className="rounded-lg border border-[var(--color-paper-3)] bg-[var(--color-paper-1)] p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-[var(--color-ink)]">
            Daily Violation Trend
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-paper-3)"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "var(--color-ink-muted)", fontSize: 10 }}
                />
                <YAxis
                  tick={{ fill: "var(--color-ink-muted)", fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-paper-2)",
                    border: "1px solid var(--color-paper-3)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="var(--color-accent)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Top cameras */}
      {analytics && analytics.top_cameras.length > 0 && (
        <section className="mt-6 rounded-lg border border-[var(--color-paper-3)] bg-[var(--color-paper-1)] p-5">
          <h2 className="mb-4 text-sm font-semibold text-[var(--color-ink)]">
            Top Cameras by Violation Count
          </h2>
          <div className="space-y-2">
            {analytics.top_cameras.map((cam) => (
              <div key={cam.camera_id} className="flex items-center gap-3">
                <Camera className="h-4 w-4 text-[var(--color-ink-faint)]" />
                <span className="flex-1 text-sm text-[var(--color-ink)]">
                  {cam.camera_id}
                </span>
                <div className="w-32">
                  <div className="h-2 rounded-full bg-[var(--color-paper-3)]">
                    <div
                      className="h-2 rounded-full bg-[var(--color-accent)]"
                      style={{
                        width: `${(cam.count / Math.max(analytics.top_cameras[0].count, 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <span className="text-xs font-medium tabular-nums text-[var(--color-ink-muted)]">
                  {cam.count}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-paper-3)] bg-[var(--color-paper-1)] p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--color-accent)]/10">
          <Icon className="h-4 w-4 text-[var(--color-accent)]" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
            {label}
          </p>
          <p className="text-lg font-semibold text-[var(--color-ink)]">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}
