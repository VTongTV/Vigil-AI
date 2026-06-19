/**
 * Animated shield icon for evidence integrity badge.
 *
 * A shield outline with a checkmark that draws itself in. The shield has a
 * subtle shimmer when verified.
 */

interface ShieldCheckProps {
  size?: number;
  className?: string;
  verified?: boolean;
}

export function ShieldCheck({ size = 20, className = "", verified = true }: ShieldCheckProps) {
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
      aria-label="Integrity verified"
    >
      <path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        className={verified ? "shield-shell" : ""}
      />
      {verified && (
        <polyline
          points="9 12 12 15 16 10"
          className="shield-check"
          fill="none"
        />
      )}
    </svg>
  );
}
