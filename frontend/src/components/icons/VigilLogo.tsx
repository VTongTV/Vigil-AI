/**
 * VigilAI logo mark — animated signal/console motif.
 *
 * A central beacon dot with three outward arc rings that pulse like a radar
 * sweep. The differentiation anchor of the Signal Console aesthetic.
 */

interface VigilLogoProps {
  size?: number;
  className?: string;
}

export function VigilLogo({ size = 32, className = "" }: VigilLogoProps) {
  const center = size / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-label="VigilAI logo"
      fill="none"
    >
      <circle
        cx={center}
        cy={center}
        r={size * 0.12}
        className="fill-current"
      />
      <circle
        cx={center}
        cy={center}
        r={size * 0.24}
        className="vigil-logo-ring"
        stroke="currentColor"
        strokeWidth={size * 0.04}
        opacity={0.5}
      />
      <circle
        cx={center}
        cy={center}
        r={size * 0.38}
        className="vigil-logo-ring"
        stroke="currentColor"
        strokeWidth={size * 0.03}
        opacity={0.3}
      />
      <circle
        cx={center}
        cy={center}
        r={size * 0.5}
        className="vigil-logo-ring"
        stroke="currentColor"
        strokeWidth={size * 0.02}
        opacity={0.15}
      />
    </svg>
  );
}
