/**
 * Animated danger gauge icon.
 *
 * Arc gauge with a needle that animates to the target value. Used for
 * danger_score visualization.
 */

interface DangerGaugeProps {
  size?: number;
  className?: string;
  value?: number; // 0–100
}

export function DangerGauge({ size = 24, className = "", value = 0 }: DangerGaugeProps) {
  const clamped = Math.max(0, Math.min(100, value));
  // Map 0–100 to -135deg to +135deg (left to right of the arc)
  const angle = -135 + (clamped / 100) * 270;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      aria-label={`Danger score ${value}`}
    >
      <path
        d="M4.5 18.5A9.5 9.5 0 1 1 19.5 18.5"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.2}
      />
      <path
        d="M4.5 18.5A9.5 9.5 0 1 1 19.5 18.5"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={60}
        strokeDashoffset={60 - (clamped / 100) * 60}
        className="danger-gauge-arc"
      />
      <line
        x1={12}
        y1={12}
        x2={12}
        y2={6}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        className="danger-gauge-needle"
        style={{ transformOrigin: "12px 12px", transform: `rotate(${angle}deg)` }}
      />
      <circle cx={12} cy={12} r={1.5} className="fill-current" />
    </svg>
  );
}
