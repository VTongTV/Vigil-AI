/**
 * Layout — Signal Console app shell.
 *
 * Design direction: Refined gov-tech startup.
 * - Deep ink surfaces with a single electric-blue signal line
 * - Generous whitespace and strong typographic hierarchy
 * - Light mode engineered independently, not as a dark inversion
 * - Animated VigilAI logo mark and theme toggle in the sidebar
 */

import { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Upload,
  AlertTriangle,
  FileImage,
  BarChart3,
  MapPin,
  Radio,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ASTraMAlertFeed from "@/components/ASTraMAlertFeed";
import { VigilLogo } from "@/components/icons";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, short: "DASH" },
  { to: "/upload", label: "Detect", icon: Upload, short: "DET" },
  { to: "/violations", label: "Violations", icon: AlertTriangle, short: "VIO" },
  { to: "/evidence", label: "Evidence", icon: FileImage, short: "EVI" },
  { to: "/analytics", label: "Analytics", icon: BarChart3, short: "ANA" },
  { to: "/map", label: "Map", icon: MapPin, short: "MAP" },
] as const;

/** Format a Date as HH:MM:SS IST. */
function formatIST(date: Date): string {
  return (
    date.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }) + " IST"
  );
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
    case "red":
      return "var(--color-danger)";
    case "green":
      return "var(--color-success)";
    default:
      return "var(--color-accent)";
  }
}

export default function Layout() {
  const signalState = useAppStore((s) => s.signalState);
  const setSignalState = useAppStore((s) => s.setSignalState);
  const demoMode = useAppStore((s) => s.demoMode);
  const setDemoMode = useAppStore((s) => s.setDemoMode);
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
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
      {/* Sidebar */}
      <aside
        className={cn(
          "relative flex flex-col border-r border-[var(--rule-color)] bg-[var(--color-paper-1)] transition-all duration-300 ease-out",
          collapsed ? "w-16" : "w-60",
        )}
      >
        {/* Signal line at top */}
        <div className="signal-line" />

        {/* Logo */}
        <div
          className={cn(
            "flex items-center gap-3 border-b border-[var(--rule-color)] px-4 py-4",
            collapsed && "justify-center px-0",
          )}
        >
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/20">
            <VigilLogo size={22} />
            <div
              className={cn(
                "absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full beacon",
                signalState === "red" && "bg-[var(--color-danger)]",
                signalState === "green" && "bg-[var(--color-success)]",
                signalState === "unknown" && "bg-[var(--color-accent)]",
              )}
              style={{ color: signalColor(signalState) }}
            />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="font-display text-[15px] font-semibold leading-tight text-[var(--color-ink)]">
                VigilAI
              </h1>
              <p className="text-[11px] font-medium uppercase tracking-widest text-[var(--color-ink-faint)]">
                Bengaluru Traffic Police
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 px-2.5 py-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon, short }) => {
            const isActive =
              to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

            const link = (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={() =>
                  cn(
                    "group flex items-center gap-3 rounded-md px-2.5 py-2.5 text-[14px] font-medium transition-all duration-200",
                    isActive
                      ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/25"
                      : "text-[var(--color-ink-muted)] hover:bg-[var(--color-paper-2)] hover:text-[var(--color-ink)]",
                    collapsed && "justify-center px-0",
                  )
                }
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isActive && "text-[var(--color-accent)]",
                  )}
                />
                {!collapsed && <span className="truncate">{label}</span>}
                {!collapsed && isActive && (
                  <span className="ml-auto rounded bg-[var(--color-accent-soft)] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/20">
                    {short}
                  </span>
                )}
              </NavLink>
            );

            if (collapsed) {
              return (
                <Tooltip key={to}>
                  <TooltipTrigger>{link}</TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    {label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return link;
          })}
        </nav>

        {/* Signal state toggle */}
        {!collapsed && (
          <div className="border-t border-[var(--rule-color)] px-3 py-3">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-[var(--color-ink-faint)]">
              <Radio className="h-3 w-3" />
              Signal State
            </p>
            <div className="flex gap-1">
              {(["unknown", "red", "green"] as const).map((state) => (
                <button
                  key={state}
                  onClick={() => setSignalState(state)}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1.5 text-[11px] font-semibold capitalize transition-all duration-200",
                    signalState === state
                      ? state === "red"
                        ? "bg-[var(--color-danger-soft)] text-[var(--color-danger)] ring-1 ring-[var(--color-danger)]/30"
                        : state === "green"
                          ? "bg-[var(--color-success-soft)] text-[var(--color-success)] ring-1 ring-[var(--color-success)]/30"
                          : "bg-[var(--color-accent-soft)] text-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/25"
                      : "bg-[var(--color-paper-2)] text-[var(--color-ink-faint)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)]",
                  )}
                >
                  {state}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Theme toggle + Demo toggle */}
        <div
          className={cn(
            "grid gap-2 border-t border-[var(--rule-color)] px-3 py-3",
            collapsed && "px-2",
            collapsed ? "grid-cols-1" : "grid-cols-2",
          )}
        >
          <button
            onClick={toggleTheme}
            className={cn(
              "flex items-center justify-center gap-2 rounded-md px-2 py-1.5 text-[12px] font-medium transition-all duration-200",
              "bg-[var(--color-paper-2)] text-[var(--color-ink-muted)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)]",
              collapsed && "px-0",
            )}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? (
              <Sun className="h-3.5 w-3.5" />
            ) : (
              <Moon className="h-3.5 w-3.5" />
            )}
            {!collapsed && <span>{theme === "dark" ? "Light" : "Dark"}</span>}
          </button>

          <button
            onClick={() => setDemoMode(!demoMode)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-md px-2 py-1.5 text-[12px] font-medium transition-all duration-200",
              demoMode
                ? "bg-[var(--color-warning-soft)] text-[var(--color-warning)] ring-1 ring-[var(--color-warning)]/20"
                : "bg-[var(--color-paper-2)] text-[var(--color-ink-muted)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)]",
              collapsed && "px-0",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full transition-colors",
                demoMode
                  ? "bg-[var(--color-warning)] pulse-dot"
                  : "bg-[var(--color-paper-4)]",
              )}
            />
            {!collapsed && <span>Preview {demoMode ? "ON" : "OFF"}</span>}
          </button>
        </div>

        {/* Footer clock */}
        <div
          className={cn(
            "border-t border-[var(--rule-color)] px-3 py-3",
            collapsed && "px-2",
          )}
        >
          {!collapsed ? (
            <>
              <p className="font-mono text-[12px] tabular-nums tracking-tight text-[var(--color-phosphor)]">
                {clock}
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--color-ink-faint)]">
                {date} · BTP Command Center
              </p>
            </>
          ) : (
            <Tooltip>
              <TooltipTrigger>
                <p className="text-center font-mono text-[10px] tabular-nums text-[var(--color-phosphor)]">
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
          className="absolute -right-3 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--rule-color)] bg-[var(--color-paper-2)] text-[var(--color-ink-faint)] shadow-sm transition-colors hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)]"
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>
      </aside>

      {/* Main content */}
      <main className="relative flex-1 overflow-y-auto bg-[var(--color-paper)]">
        {/* DEMO badge */}
        {demoMode && (
          <div className="pointer-events-none absolute right-4 top-4 z-50">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-warning-soft)] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--color-warning)] shadow-sm ring-1 ring-[var(--color-warning)]/20">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-warning)] pulse-dot" />
              Preview
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
