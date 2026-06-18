/**
 * Animated alert bell icon for ASTraM alerts.
 *
 * The bell body swings gently and the clapper taps, while a small beacon
 * dot above pulses when critical.
 */

interface AlertBellProps {
  size?: number;
  className?: string;
  critical?: boolean;
}

export function AlertBell({ size = 20, className = "", critical = false }: AlertBellProps) {
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
      aria-label="Alert bell"
    >
      <g className="alert-bell-body">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </g>
      {critical && (
        <circle
          cx={18}
          cy={5}
          r={3}
          className="alert-bell-dot fill-current"
          stroke="none"
        />
      )}
    </svg>
  );
}
