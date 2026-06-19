/**
 * Animated camera icon for camera health monitoring.
 *
 * A CCTV-style camera with a pulsing recording/status indicator dot.
 */

interface CameraPulseProps {
  size?: number;
  className?: string;
  status?: "active" | "idle" | "offline";
}

export function CameraPulse({ size = 20, className = "", status = "active" }: CameraPulseProps) {
  const dotClass =
    status === "active"
      ? "text-[var(--color-success)]"
      : status === "idle"
      ? "text-[var(--color-warning)]"
      : "text-[var(--color-danger)]";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label={`Camera ${status}`}
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h3l2.5 3h5l2.5-3h3a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx={12} cy={12} r={3} className="camera-lens" />
      <circle cx={21} cy={6} r={2} className={`camera-status-dot ${dotClass} fill-current`} />
    </svg>
  );
}
