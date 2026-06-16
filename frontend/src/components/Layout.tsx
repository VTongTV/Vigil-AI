/**
 * Layout — main app shell with sidebar navigation, signal input, IST clock,
 * demo mode toggle, and a pulsing DEMO badge when demo mode is active.
 */

import { useState, useEffect } from "react";
import { Outlet, NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Upload,
  AlertTriangle,
  FileImage,
  BarChart3,
  Shield,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/upload", label: "Detect", icon: Upload },
  { to: "/violations", label: "Violations", icon: AlertTriangle },
  { to: "/evidence", label: "Evidence", icon: FileImage },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/map", label: "Map", icon: MapPin },
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

export default function Layout() {
  const signalState = useAppStore((s) => s.signalState);
  const setSignalState = useAppStore((s) => s.setSignalState);
  const demoMode = useAppStore((s) => s.demoMode);
  const setDemoMode = useAppStore((s) => s.setDemoMode);

  const [clock, setClock] = useState(() => formatIST(new Date()));

  /** Tick every second, clean up on unmount. */
  useEffect(() => {
    const id = setInterval(() => setClock(formatIST(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-paper)]">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col border-r border-[var(--color-paper-3)] bg-[var(--color-paper-1)]">
        {/* Logo */}
        <div className="flex items-center gap-2 border-b border-[var(--color-paper-3)] px-4 py-4">
          <Shield className="h-6 w-6 text-[var(--color-accent)]" />
          <div>
            <h1 className="text-base font-semibold leading-tight text-[var(--color-ink)]">
              VigilAI
            </h1>
            <p className="text-[10px] tracking-widest text-[var(--color-ink-faint)] uppercase">
              Traffic Intelligence
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[var(--color-accent-dim)] text-[var(--color-accent-bright)]"
                    : "text-[var(--color-ink-muted)] hover:bg-[var(--color-paper-2)] hover:text-[var(--color-ink)]"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Signal toggle */}
        <div className="border-t border-[var(--color-paper-3)] p-3">
          <p className="mb-2 text-[10px] font-medium tracking-widest text-[var(--color-ink-faint)] uppercase">
            Signal Input
          </p>
          <div className="flex gap-1">
            {(["unknown", "red", "green"] as const).map((state) => (
              <button
                key={state}
                onClick={() => setSignalState(state)}
                className={cn(
                  "flex-1 rounded px-2 py-1.5 text-[11px] font-medium capitalize transition-colors",
                  signalState === state
                    ? state === "red"
                      ? "bg-[var(--color-danger)] text-white"
                      : state === "green"
                        ? "bg-[var(--color-success)] text-white"
                        : "bg-[var(--color-paper-3)] text-[var(--color-ink-muted)]"
                    : "bg-[var(--color-paper-2)] text-[var(--color-ink-faint)] hover:bg-[var(--color-paper-3)]"
                )}
              >
                {state}
              </button>
            ))}
          </div>
        </div>

        {/* Demo mode toggle */}
        <div className="border-t border-[var(--color-paper-3)] p-3">
          <button
            onClick={() => setDemoMode(!demoMode)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors",
              demoMode
                ? "bg-[var(--color-warning)]/15 text-[var(--color-warning)]"
                : "bg-[var(--color-paper-2)] text-[var(--color-ink-faint)] hover:bg-[var(--color-paper-3)]"
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                demoMode ? "bg-[var(--color-warning)]" : "bg-[var(--color-paper-4)]"
              )}
            />
            Demo Mode {demoMode ? "ON" : "OFF"}
          </button>
        </div>

        {/* Footer — IST clock + attribution */}
        <div className="border-t border-[var(--color-paper-3)] px-4 py-3">
          <p className="font-mono text-xs tabular-nums text-[var(--color-accent)]">
            {clock}
          </p>
          <p className="mt-1 text-[10px] text-[var(--color-ink-faint)]">
            Bengaluru Traffic Police
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="relative flex-1 overflow-y-auto">
        {/* Pulsing DEMO badge */}
        {demoMode && (
          <div className="pointer-events-none absolute right-4 top-4 z-50">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-warning)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--color-paper)] shadow-lg">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-paper)]" />
              Demo
            </span>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
