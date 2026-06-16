import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Camera,
  Clock,
  IndianRupee,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { getAnalytics } from "@/lib/api";
import type { AnalyticsOverview } from "@/types/violation";
import { VIOLATION_LABELS, VIOLATION_COLORS } from "@/types/violation";


type StatCard = {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
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
        <p className="text-[var(--color-ink-muted)]">
          Loading dashboard...
        </p>
      </div>
    );
  }

  const stats: StatCard[] = [
    {
      label: "Total Violations",
      value: analytics?.total_violations ?? 0,
      icon: AlertTriangle,
      color: "var(--color-accent)",
    },
    {
      label: "Fines Imposed",
      value: `₹${(analytics?.total_fines ?? 0).toLocaleString("en-IN")}`,
      icon: IndianRupee,
      color: "var(--color-warning)",
    },
    {
      label: "Avg Confidence",
      value: `${((analytics?.avg_confidence ?? 0) * 100).toFixed(1)}%`,
      icon: TrendingUp,
      color: "var(--color-success)",
    },
    {
      label: "Active Cameras",
      value: analytics?.top_cameras.length ?? 0,
      icon: Camera,
      color: "var(--color-accent-bright)",
    },
  ];

  return (
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-[var(--color-ink)]">
          Command Center
        </h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Real-time traffic violation detection — Bengaluru
        </p>
      </header>

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-lg border border-[var(--color-paper-3)] bg-[var(--color-paper-1)] p-4"
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-md"
                style={{ backgroundColor: `${color}20` }}
              >
                <Icon className="h-5 w-5" style={{ color }} />
              </div>
              <div>
                <p className="text-xs text-[var(--color-ink-faint)]">{label}</p>
                <p className="text-xl font-semibold text-[var(--color-ink)]">
                  {value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Violations by type */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-[var(--color-paper-3)] bg-[var(--color-paper-1)] p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
            <ShieldAlert className="h-4 w-4 text-[var(--color-accent)]" />
            Violations by Type
          </h2>
          <div className="space-y-3">
            {analytics ? (
              Object.entries(analytics.violations_by_type).map(
                ([type, count]) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className="w-24 text-xs text-[var(--color-ink-muted)]">
                      {VIOLATION_LABELS[type as keyof typeof VIOLATION_LABELS] ?? type}
                    </span>
                    <div className="flex-1">
                      <div className="h-2 rounded-full bg-[var(--color-paper-3)]">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min(
                              (count / Math.max(analytics.total_violations, 1)) * 100,
                              100
                            )}%`,
                            backgroundColor:
                              VIOLATION_COLORS[type as keyof typeof VIOLATION_COLORS] ??
                              "var(--color-accent)",
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-medium tabular-nums text-[var(--color-ink)]">
                      {count}
                    </span>
                  </div>
                )
              )
            ) : (
              <p className="text-sm text-[var(--color-ink-faint)]">No data</p>
            )}
          </div>
        </section>

        {/* Recent daily counts */}
        <section className="rounded-lg border border-[var(--color-paper-3)] bg-[var(--color-paper-1)] p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
            <Clock className="h-4 w-4 text-[var(--color-accent)]" />
            Daily Violations (Last 30 Days)
          </h2>
          <div className="space-y-2">
            {analytics?.daily_counts.length ? (
              [...analytics.daily_counts]
                .reverse()
                .slice(0, 14)
                .map(({ date, count }) => (
                  <div key={date} className="flex items-center gap-3">
                    <span className="w-20 text-xs tabular-nums text-[var(--color-ink-muted)]">
                      {date.slice(5)}
                    </span>
                    <div className="flex-1">
                      <div className="h-2 rounded-full bg-[var(--color-paper-3)]">
                        <div
                          className="h-2 rounded-full bg-[var(--color-accent)]"
                          style={{
                            width: `${Math.min(
                              (count /
                                Math.max(
                                  ...analytics.daily_counts.map((d) => d.count),
                                  1
                                )) *
                                100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-medium tabular-nums text-[var(--color-ink)]">
                      {count}
                    </span>
                  </div>
                ))
            ) : (
              <p className="text-sm text-[var(--color-ink-faint)]">No data</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
