/**
 * Layout — Interceptor Grid app shell.
 *
 * Design direction: Industrial utilitarian + retro-futuristic command center.
 * - Amber CRT phosphor accent line at top
 * - Signal-state beacon with pulsing glow (red/green/amber)
 * - Phosphor green IST clock (terminal aesthetic)
 * - Scan-line texture overlay on main content
 * - Deep steel sidebar with amber highlights
 */

import { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Upload,
  AlertTriangle,
  FileImage,
  BarChart3,
  Shield,
  MapPin,
  Radio,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ASTraMAlertFeed from "@/components/ASTraMAlertFeed";

const NAV_ITEMS = [
  { to: "/", label: "Command Center", icon: LayoutDashboard, short: "CMD" },
  { to: "/upload", label: "Detect", icon: Upload, short: "DET" },
  { to: "/violations", label: "Violations", icon: AlertTriangle, short: "VIO" },
  { to: "/evidence", label: "Evidence", icon: FileImage, short: "EVI" },
  { to: "/analytics", label: "Analytics", icon: BarChart3, short: "ANA" },
  { to: "/map", label: "Map", icon: MapPin, short: "MAP" },
] as const;

/** Format a Date as HH:MM:SS IST. */
function formatIST(date: Date): string {
  return date.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }) + " IST";
}

/** Format date as DD MMM YYYY. */
function formatDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Signal state color mapping for beacon. */
function signalColor(state: string): string {
  switch (state) {
    case "red": return "var(--color-danger)";
    case "green": return "var(--color-phosphor)";
    default: return "var(--color-accent)";
  }
}

export default function Layout() {
  const signalState = useAppStore((s) => s.signalState);
  const setSignalState = useAppStore((s) => s.setSignalState);
  const demoMode = useAppStore((s) => s.demoMode);
  const setDemoMode = useAppStore((s) => s.setDemoMode);
  const [collapsed, setCollapsed] = useState(false);
  const [clock, setClock] = useState(() => formatIST(new Date()));
  const [date, setDate] = useState(() => formatDate(new Date()));
  const location = useLocation();

  useEffect(() => {
    const id = setInterval(() => {
      setClock(formatIST(new Date()));
      setDate(formatDate(new Date()));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-paper)]">
      {/* Sidebar — deep steel */}
      <aside
        className={cn(
          "relative flex flex-col border-r border-[var(--color-paper-3)]/50 bg-[var(--color-paper-1)]/90 backdrop-blur-xl transition-all duration-300",
          collapsed ? "w-16" : "w-56",
        )}
      >
        {/* Amber CRT accent line at top */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-accent)]/70 to-transparent" />

        {/* Logo — VigilAI with signal beacon */}
        <div className={cn(
          "flex items-center gap-2.5 border-b border-[var(--color-paper-3)]/30 px-3 py-3.5",
          collapsed && "justify-center px-0",
        )}>
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--color-accent)]/12 border border-[var(--color-accent)]/20">
            <Shield className="h-4 w-4 text-[var(--color-accent)]" />
            {/* Signal beacon dot */}
            <div
              className={cn(
                "absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full beacon",
                signalState === "red" && "bg-[var(--color-danger)]",
                signalState === "green" && "bg-[var(--color-phosphor)]",
                signalState === "unknown" && "bg-[var(--color-accent)]",
              )}
              style={{ color: signalColor(signalState) }}
            />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-semibold leading-tight text-[var(--color-ink)]">
                VigilAI
              </h1>
              <p className="text-[9px] tracking-[0.2em] text-[var(--color-accent)]/80 uppercase font-medium">
                Interceptor Grid
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 px-2 py-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon, short }) => {
            const isActive = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

            const link = (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={() =>
                  cn(
                    "group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition-all duration-200",
                    isActive
                      ? "bg-[var(--color-accent)]/10 text-[var(--color-accent-bright)] shadow-[inset_0_0_0_1px_oklch(75%_0.18_85/0.2)]"
                      : "text-[var(--color-ink-muted)] hover:bg-[var(--color-paper-2)]/60 hover:text-[var(--color-ink)]",
                    collapsed && "justify-center px-0",
                  )
                }
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-[var(--color-accent)]")} />
                {!collapsed && (
                  <span className="truncate">{label}</span>
                )}
                {!collapsed && isActive && (
                  <span className="ml-auto rounded bg-[var(--color-accent)]/12 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-[var(--color-accent)] border border-[var(--color-accent)]/20">
                    {short}
                  </span>
                )}
              </NavLink>
            );

            if (collapsed) {
              return (
                <Tooltip key={to}>
                  <TooltipTrigger>
                    {link}
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    {label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return link;
          })}
        </nav>

        {/* Signal toggle — beacon-style */}
        {!collapsed && (
          <div className="border-t border-[var(--color-paper-3)]/30 px-3 py-2.5">
            <p className="mb-1.5 flex items-center gap-1.5 text-[9px] font-medium tracking-[0.15em] text-[var(--color-ink-faint)] uppercase">
              <Radio className="h-3 w-3" />
              Signal State
            </p>
            <div className="flex gap-1">
              {(["unknown", "red", "green"] as const).map((state) => (
                <button
                  key={state}
                  onClick={() => setSignalState(state)}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1 text-[10px] font-semibold capitalize transition-all duration-200",
                    signalState === state
                      ? state === "red"
                        ? "bg-[var(--color-danger)]/15 text-[var(--color-danger)] border border-[var(--color-danger)]/30"
                        : state === "green"
                          ? "bg-[var(--color-phosphor)]/15 text-[var(--color-phosphor)] border border-[var(--color-phosphor)]/30"
                          : "bg-[var(--color-accent)]/12 text-[var(--color-accent)] border border-[var(--color-accent)]/25"
                      : "bg-[var(--color-paper-2)]/30 text-[var(--color-ink-faint)] hover:bg-[var(--color-paper-3)]/40 border border-transparent",
                  )}
                >
                  {state}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Demo mode toggle */}
        <div className={cn(
          "border-t border-[var(--color-paper-3)]/30 px-3 py-2",
          collapsed && "px-2",
        )}>
          <button
            onClick={() => setDemoMode(!demoMode)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-medium transition-all duration-200",
              demoMode
                ? "bg-[var(--color-warning)]/10 text-[var(--color-warning)] border border-[var(--color-warning)]/20"
                : "bg-[var(--color-paper-2)]/30 text-[var(--color-ink-faint)] hover:bg-[var(--color-paper-3)]/40 border border-transparent",
              collapsed && "justify-center px-0",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full transition-colors",
                demoMode ? "bg-[var(--color-warning)] pulse-dot" : "bg-[var(--color-paper-4)]",
              )}
            />
            {!collapsed && <span>Demo {demoMode ? "ON" : "OFF"}</span>}
          </button>
        </div>

        {/* Footer — phosphor green IST clock (CRT terminal aesthetic) */}
        <div className={cn(
          "border-t border-[var(--color-paper-3)]/30 px-3 py-2.5",
          collapsed && "px-2",
        )}>
          {!collapsed ? (
            <>
              <p className="font-mono text-[11px] tabular-nums tracking-tight text-[var(--color-phosphor)]">
                {clock}
              </p>
              <p className="mt-0.5 text-[9px] text-[var(--color-ink-faint)]">
                {date} · BTP
              </p>
            </>
          ) : (
            <Tooltip>
              <TooltipTrigger>
                <p className="text-center font-mono text-[9px] tabular-nums text-[var(--color-phosphor)]">
                  {clock.slice(0, 5)}
                </p>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {clock} · {date}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-paper-3)] bg-[var(--color-paper-2)] text-[var(--color-ink-faint)] transition-colors hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)]"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>

      {/* Main content — with CRT scan-line overlay */}
      <main className="scan-overlay relative flex-1 overflow-y-auto">
        {/* DEMO badge — amber-tinted */}
        {demoMode && (
          <div className="pointer-events-none absolute right-4 top-4 z-50">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-warning)]/12 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-warning)] shadow-[0_0_12px_oklch(75%_0.18_85/0.08)] backdrop-blur-sm ring-1 ring-[var(--color-warning)]/20">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-warning)] pulse-dot" />
              Demo
            </span>
          </div>
        )}
        <Outlet />
      </main>

      {/* ASTraM floating alert feed (F6) */}
      <ASTraMAlertFeed />
    </div>
  );
}
