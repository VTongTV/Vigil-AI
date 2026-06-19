/**
 * Animated trend arrow for trend forecasting cards.
 *
 * The arrow bobs subtly in its trend direction (up/down/stable).
 */

interface TrendArrowProps {
  size?: number;
  className?: string;
  direction?: "up" | "down" | "stable";
}

export function TrendArrow({ size = 16, className = "", direction = "stable" }: TrendArrowProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label={`Trend ${direction}`}
    >
      {direction === "up" && (
        <g className="trend-arrow-up">
          <polyline points="23 6 13.5 15.5 8 10 1 17" />
          <polyline points="17 6 23 6 23 12" />
        </g>
      )}
      {direction === "down" && (
        <g className="trend-arrow-down">
          <polyline points="23 18 13.5 8.5 8 14 1 7" />
          <polyline points="17 18 23 18 23 12" />
        </g>
      )}
      {direction === "stable" && (
        <g className="trend-arrow-stable">
          <polyline points="1 12 7 12 13 12 23 12" />
        </g>
      )}
    </svg>
  );
}
