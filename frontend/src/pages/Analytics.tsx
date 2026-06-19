/**
 * Analytics page — violation trend charts, statistics, camera breakdown,
 * and an ROI Calculator showing Conservative vs Aggressive projections.
 *
 * Design: "Enforcement Intelligence Brief"
 * - Recharts with theme-aware tooltip styling (fixed for light mode)
 * - shadcn Card containers for all chart sections
 * - ROI table with accent color coding
 * - Period selector with shadcn Select
 * - Framer Motion staggered card entrances
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
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { getAnalytics } from "@/lib/api";
import type { AnalyticsOverview } from "@/types/violation";
import { VIOLATION_LABELS, VIOLATION_COLORS } from "@/types/violation";
import { useAppStore } from "@/lib/store";
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

const STATUS_COLORS = [
  "oklch(65% 0.18 145)",
  "oklch(75% 0.18 85)",
  "oklch(60% 0.22 25)",
];

/** Stagger variants for card grid. */
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 280, damping: 26 },
  },
};

export default function Analytics() {
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const demoMode = useAppStore((s) => s.demoMode);
  /** Get current theme to apply theme-aware chart colors. */
  const theme = useAppStore((s) => s.theme);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    setLoading(true);
    getAnalytics(days)
      .then(setAnalytics)
      .catch(() => setAnalytics(null))
      .finally(() => setLoading(false));
  }, [days, demoMode]);

  /**
   * Theme-aware recharts tooltip — critical fix for light mode.
   * Previously hardcoded to dark oklch values which appeared broken
   * against the white/warm paper background in light mode.
   */
  const chartTooltipStyle = {
    background: theme === "dark" ? "oklch(18% 0.01 260)" : "#ffffff",
    border: `1px solid ${theme === "dark" ? "oklch(28% 0.015 260)" : "oklch(82% 0.020 250)"}`,
    borderRadius: "6px",
    fontSize: "12px",
    color: theme === "dark" ? "oklch(92% 0.01 260)" : "oklch(15% 0.025 250)",
    padding: "8px 12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
  };

  /** Theme-aware recharts tooltip item style (the value lines). */
  const chartTooltipItemStyle = {
    color: theme === "dark" ? "oklch(85% 0.02 250)" : "oklch(20% 0.025 250)",
  };

  /** Theme-aware recharts tooltip label style (the category header). */
  const chartTooltipLabelStyle = {
    color: theme === "dark" ? "oklch(92% 0.01 260)" : "oklch(15% 0.025 250)",
    fontWeight: 600,
    marginBottom: "4px",
  };

  /** Theme-aware axis tick color. */
  const axisTickColor = theme === "dark"
    ? "oklch(65% 0.02 260)"
    : "oklch(41% 0.025 250)";

  /** Theme-aware grid line color. */
  const gridColor = theme === "dark"
    ? "oklch(28% 0.015 260 / 0.4)"
    : "oklch(82% 0.020 250 / 0.6)";

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

  const motionVariants = prefersReduced
    ? { hidden: {}, visible: {} }
    : cardVariants;
  const motionContainer = prefersReduced
    ? { hidden: {}, visible: {} }
    : containerVariants;

  return (
    <motion.div
      className="p-5"
      initial={prefersReduced ? {} : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="mb-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-accent-soft)] ring-1 ring-[var(--color-accent)]/15">
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
          <div className="relative z-50 flex-shrink-0">
            <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
              <SelectTrigger className="h-7 w-36 border-[var(--rule-color)] bg-[var(--color-paper-2)] text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="bottom" align="end">
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      {/* Summary stats — staggered */}
      <motion.div
        className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3"
        variants={motionContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={motionVariants}>
          <StatBox
            icon={AlertTriangle}
            label="Total Violations"
            value={totalViolations}
            color="var(--color-accent)"
          />
        </motion.div>
        <motion.div variants={motionVariants}>
          <StatBox
            icon={TrendingUp}
            label="Avg Confidence"
            value={`${avgConf.toFixed(1)}%`}
            color="var(--color-success)"
          />
        </motion.div>
        <motion.div variants={motionVariants}>
          <StatBox
            icon={IndianRupee}
            label="Total Fines"
            value={`₹${totalFines.toLocaleString("en-IN")}`}
            color="var(--color-warning)"
          />
        </motion.div>
      </motion.div>

      {/* Charts */}
      <AnimatePresence mode="wait">
        <motion.div
          key={days}
          className="grid grid-cols-1 gap-4 lg:grid-cols-2"
          initial={prefersReduced ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
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
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: axisTickColor, fontSize: 11 }}
                      angle={-35}
                      textAnchor="end"
                      height={55}
                    />
                    <YAxis tick={{ fill: axisTickColor, fontSize: 11 }} />
                    <Tooltip contentStyle={chartTooltipStyle} itemStyle={chartTooltipItemStyle} labelStyle={chartTooltipLabelStyle} />
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
                      wrapperStyle={{ fontSize: "11px", color: axisTickColor }}
                    />
                    <Tooltip contentStyle={chartTooltipStyle} itemStyle={chartTooltipItemStyle} labelStyle={chartTooltipLabelStyle} />
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
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: axisTickColor, fontSize: 11 }}
                    />
                    <YAxis tick={{ fill: axisTickColor, fontSize: 11 }} />
                    <Tooltip contentStyle={chartTooltipStyle} itemStyle={chartTooltipItemStyle} labelStyle={chartTooltipLabelStyle} />
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
        </motion.div>
      </AnimatePresence>

      {/* Top cameras */}
      {analytics && analytics.top_cameras.length > 0 && (
        <motion.div
          initial={prefersReduced ? {} : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <Card className="mt-4 border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/70">
            <CardContent className="p-4">
              <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold text-[var(--color-ink)]">
                <Camera className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                Top Cameras by Violation Count
              </h2>
              <div className="space-y-2">
                {analytics.top_cameras.map((cam, i) => (
                  <div key={cam.camera_id} className="flex items-center gap-2.5">
                    <Camera className="h-3 w-3 text-[var(--color-ink-faint)]" />
                    <span className="flex-1 text-[11px] text-[var(--color-ink-muted)]">
                      {cam.camera_id}
                    </span>
                    <div className="w-32">
                      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-paper-3)]/50">
                        <motion.div
                          className="h-1.5 rounded-full bg-[var(--color-accent)]/60"
                          initial={prefersReduced ? { width: `${(cam.count / Math.max(analytics.top_cameras[0].count, 1)) * 100}%` } : { width: 0 }}
                          animate={{
                            width: `${(cam.count / Math.max(analytics.top_cameras[0].count, 1)) * 100}%`,
                          }}
                          transition={{ duration: 0.6, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
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
        </motion.div>
      )}

      {/* ROI Calculator */}
      <motion.div
        initial={prefersReduced ? {} : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card className="mt-4 border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/70">
          <CardContent className="p-4">
            <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--color-ink)]">
              <IndianRupee className="h-3.5 w-3.5 text-[var(--color-warning)]" />
              ROI Calculator
            </h2>
            <p className="mb-4 text-[11px] text-[var(--color-ink-faint)]">
              Projected financial impact — Bengaluru-wide deployment across 500 junctions
            </p>
            <Table>
              <TableHeader>
                <TableRow className="border-b-[var(--color-paper-3)]/60 hover:bg-transparent">
                  <TableHead className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-ink-faint)]">
                    Metric
                  </TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-accent)]">
                    Conservative
                  </TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-success)]">
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
      </motion.div>
    </motion.div>
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
    <Card className="border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/70 transition-colors duration-200 hover:border-[var(--color-paper-4)]">
      <CardContent className="p-3.5">
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-md"
            style={{ backgroundColor: `color-mix(in oklch, ${color} 15%, transparent)` }}
          >
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-ink-faint)]">
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
