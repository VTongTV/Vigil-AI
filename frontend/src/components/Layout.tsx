import { Outlet, NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Upload,
  AlertTriangle,
  FileImage,
  BarChart3,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/upload", label: "Detect", icon: Upload },
  { to: "/violations", label: "Violations", icon: AlertTriangle },
  { to: "/evidence", label: "Evidence", icon: FileImage },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
] as const;

export default function Layout() {
  const signalState = useAppStore((s) => s.signalState);
  const setSignalState = useAppStore((s) => s.setSignalState);

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

        {/* Footer */}
        <div className="border-t border-[var(--color-paper-3)] px-4 py-3">
          <p className="text-[10px] text-[var(--color-ink-faint)]">
            Bengaluru Traffic Police
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
