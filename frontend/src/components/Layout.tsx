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
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Upload,
  AlertTriangle,
  FileImage,
  BarChart3,
  MapPin,
  Radio,
  Video,
  Users,
  Activity,
  ScanFace,
  Wand2,
  Globe,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
} from "lucide-react";
import {
  motion,
  AnimatePresence,
  LayoutGroup,
  useReducedMotion,
} from "framer-motion";
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
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, short: "DASH" },
  { to: "/dashboard/upload", label: "Detect", icon: Upload, short: "DET" },
  { to: "/dashboard/violations", label: "Violations", icon: AlertTriangle, short: "VIO" },
  { to: "/dashboard/evidence", label: "Evidence", icon: FileImage, short: "EVI" },
  { to: "/dashboard/analytics", label: "Analytics", icon: BarChart3, short: "ANA" },
  { to: "/dashboard/map", label: "Map", icon: MapPin, short: "MAP" },
  { to: "/dashboard/video", label: "Video", icon: Video, short: "VID" },
  { to: "/dashboard/citizen", label: "Citizen", icon: Users, short: "CIT" },
  { to: "/dashboard/tracking", label: "Tracking", icon: Activity, short: "TRK" },
  { to: "/dashboard/deepfake", label: "Deepfake", icon: ScanFace, short: "DFK" },
  { to: "/dashboard/generator", label: "Generator", icon: Wand2, short: "GEN" },
  { to: "/dashboard/scraper", label: "Scraper", icon: Globe, short: "SCR" },
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
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    const id = setInterval(() => {
      setClock(formatIST(new Date()));
      setDate(formatDate(new Date()));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  /** Spring config — overdamped so sidebar never overshoots. */
  const sidebarSpring = prefersReduced
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 280, damping: 40 };

  /** Fast fade for label content appearing/disappearing. */
  const labelFade = prefersReduced
    ? { duration: 0 as const }
    : { duration: 0.15, ease: "easeOut" as const };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-paper)]">
      {/* Sidebar — motion.aside with layout prop for smooth width animation */}
      <LayoutGroup>
        <motion.aside
          layout
          animate={{ width: collapsed ? 64 : 240 }}
          transition={sidebarSpring}
          className="relative flex flex-col border-r border-[var(--rule-color)] bg-[var(--color-paper-1)] z-[2000]"
          style={{ minWidth: collapsed ? 64 : 240, overflow: "visible" }}
        >
          {/* Signal line at top */}
          <div className="signal-line" />

          {/* Logo */}
          <button
            onClick={() => navigate("/")}
            className={cn(
              "flex items-center gap-3 border-b border-[var(--rule-color)] px-4 py-4 w-full text-left hover:bg-[var(--color-paper-2)] transition-colors",
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
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.div
                  key="logo-text"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={labelFade}
                  className="min-w-0"
                >
                  <h1 className="font-display text-[15px] font-semibold leading-tight text-[var(--color-ink)]">
                    VigilAI
                  </h1>
                  <p className="text-[11px] font-medium uppercase tracking-widest text-[var(--color-ink-faint)]">
                    Bengaluru Traffic Police
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </button>
          <nav className={cn("flex-1 py-3", collapsed ? "flex flex-col items-center gap-0.5 px-0" : "space-y-0.5 px-2.5")}>
            {NAV_ITEMS.map(({ to, label, icon: Icon, short }) => {
              const isActive = to === "/dashboard"
                ? location.pathname === "/dashboard"
                : location.pathname.startsWith(to);

              const link = (
                <NavLink
                  key={to}
                  to={to}
                  className={() =>
                    cn(
                      "group relative flex items-center gap-3 rounded-md py-2.5 text-[14px] font-medium",
                      collapsed ? "w-10 justify-center px-0" : "px-2.5",
                      isActive
                        ? "text-[var(--color-accent)]"
                        : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]",
                    )
                  }
                >
                  {/* Animated background pill — slides between items via layoutId */}
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-pill"
                      className="absolute inset-0 rounded-md bg-[var(--color-accent-soft)] ring-1 ring-[var(--color-accent)]/25"
                      transition={
                        prefersReduced
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 400, damping: 32 }
                      }
                    />
                  )}
                  {/* Hover background (non-active items) */}
                  {!isActive && (
                    <span className="absolute inset-0 rounded-md transition-colors group-hover:bg-[var(--color-paper-2)]" />
                  )}
                  <Icon
                    className={cn(
                      "relative z-10 h-4 w-4 shrink-0",
                      isActive && "text-[var(--color-accent)]",
                    )}
                  />
                  <AnimatePresence mode="wait">
                    {!collapsed && (
                      <motion.span
                        key={`label-${to}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={labelFade}
                        className="relative z-10 truncate"
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <AnimatePresence mode="wait">
                    {!collapsed && isActive && (
                      <motion.span
                        key={`badge-${to}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={labelFade}
                        className="relative z-10 ml-auto rounded bg-[var(--color-accent-soft)] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/20"
                      >
                        {short}
                      </motion.span>
                    )}
                  </AnimatePresence>
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
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                key="signal-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={labelFade}
                className="border-t border-[var(--rule-color)] px-3 py-3"
              >
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-[var(--color-ink-faint)]">
                  <Radio className="h-3 w-3" />
                  Signal State
                </p>
                <div className="flex gap-1">
                  {(["unknown", "red", "green"] as const).map((state) => (
                    <motion.button
                      key={state}
                      whileTap={prefersReduced ? {} : { scale: 0.94 }}
                      onClick={() => setSignalState(state)}
                      className={cn(
                        "flex-1 rounded-md px-2 py-1.5 text-[11px] font-semibold capitalize transition-colors duration-150",
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
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Theme toggle + Demo toggle */}
          <div
            className={cn(
              "grid gap-2 border-t border-[var(--rule-color)] py-3",
              collapsed ? "grid-cols-1 px-2" : "grid-cols-2 px-3",
            )}
          >
            <motion.button
              whileTap={prefersReduced ? {} : { scale: 0.94 }}
              onClick={toggleTheme}
              className={cn(
                "flex items-center justify-center gap-2 rounded-md px-2 py-1.5 text-[12px] font-medium transition-colors duration-150",
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
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    key="theme-label"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={labelFade}
                  >
                    {theme === "dark" ? "Light" : "Dark"}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            <motion.button
              whileTap={prefersReduced ? {} : { scale: 0.94 }}
              onClick={() => setDemoMode(!demoMode)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-md px-2 py-1.5 text-[12px] font-medium transition-colors duration-150",
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
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    key="demo-label"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={labelFade}
                  >
                    Preview {demoMode ? "ON" : "OFF"}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>

          {/* Footer clock */}
          <div
            className={cn(
              "border-t border-[var(--rule-color)] px-3 py-3",
              collapsed && "px-2",
            )}
          >
            <AnimatePresence mode="wait">
              {!collapsed ? (
                <motion.div
                  key="clock-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={labelFade}
                >
                  <p className="font-mono text-[12px] tabular-nums tracking-tight text-[var(--color-phosphor)]">
                    {clock}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--color-ink-faint)]">
                    {date} · BTP Command Center
                  </p>
                </motion.div>
              ) : (
                <Tooltip>
                  <TooltipTrigger>
                    <motion.p
                      key="clock-mini"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={labelFade}
                      className="text-center font-mono text-[11px] tabular-nums text-[var(--color-phosphor)]"
                    >
                      {clock.slice(0, 5)}
                    </motion.p>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    {clock} · {date}
                  </TooltipContent>
                </Tooltip>
              )}
            </AnimatePresence>
          </div>

          {/* Collapse toggle */}
          <motion.button
            whileTap={prefersReduced ? {} : { scale: 0.9 }}
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-1/2 z-[200] flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--rule-color)] bg-[var(--color-paper-2)] text-[var(--color-ink-faint)] shadow-sm transition-colors hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)]"
            style={{ zIndex: 200 }}
          >
            {collapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </motion.button>
        </motion.aside>
      </LayoutGroup>

      {/* Main content */}
      <main className="relative flex-1 overflow-y-auto bg-[var(--color-paper)]">
        {/* DEMO badge */}
        <AnimatePresence>
          {demoMode && (
            <motion.div
              key="demo-badge"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-none absolute right-4 top-8 z-50"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-warning-soft)] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--color-warning)] shadow-sm ring-1 ring-[var(--color-warning)]/20">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-warning)] pulse-dot" />
                Preview
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        <Outlet />
      </main>

      {/* ASTraM floating alert feed (F6) */}
      <ASTraMAlertFeed />
    </div>
  );
}
