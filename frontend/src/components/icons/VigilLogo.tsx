/**
 * VigilAI logo mark — redesigned for Signal Console branding.
 *
 * Electric-blue shield with radar rings and a sweep arc.
 * The shield embodies law-enforcement authority; the radar rings
 * convey real-time surveillance. Together they form the VigilAI
 * identity mark.
 */

interface VigilLogoProps {
  size?: number;
  className?: string;
}

export function VigilLogo({ size = 32, className = "" }: VigilLogoProps) {
  const s = size;
  const cx = s / 2;
  // Proportional geometry
  const shieldW = s * 0.72;
  const shieldH = s * 0.80;
  const shieldX = cx - shieldW / 2;
  const shieldTop = s * 0.10;

  // Shield path: top-left → top-right → bottom-right → pointed bottom → bottom-left → close
  const shieldPath = [
    `M ${cx} ${shieldTop}`,
    `L ${shieldX + shieldW} ${shieldTop + shieldH * 0.22}`,
    `L ${shieldX + shieldW} ${shieldTop + shieldH * 0.60}`,
    `C ${shieldX + shieldW} ${shieldTop + shieldH * 0.82} ${cx + shieldW * 0.2} ${shieldTop + shieldH * 0.93} ${cx} ${shieldTop + shieldH}`,
    `C ${cx - shieldW * 0.2} ${shieldTop + shieldH * 0.93} ${shieldX} ${shieldTop + shieldH * 0.82} ${shieldX} ${shieldTop + shieldH * 0.60}`,
    `L ${shieldX} ${shieldTop + shieldH * 0.22}`,
    `Z`,
  ].join(" ");

  // Radar rings centred on the shield mid-point
  const radarCy = shieldTop + shieldH * 0.52;
  const r1 = s * 0.095;
  const r2 = s * 0.175;
  const r3 = s * 0.255;

  // Sweep line angle (45° from center)
  const sweepEndX = cx + r2 * 0.78;
  const sweepEndY = radarCy - r2 * 0.78;

  const gradId = `vigilGrad_${Math.random().toString(36).slice(2, 6)}`;
  const glowId = `vigilGlow_${Math.random().toString(36).slice(2, 6)}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${s} ${s}`}
      className={className}
      aria-label="VigilAI logo"
      fill="none"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2={s} y2={s} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.65" />
        </linearGradient>
        <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={s * 0.045} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Shield outline */}
      <path
        d={shieldPath}
        stroke={`url(#${gradId})`}
        strokeWidth={s * 0.045}
        strokeLinejoin="round"
        opacity={0.9}
        className="vigil-logo-shield"
      />

      {/* Shield inner fill (very subtle) */}
      <path
        d={shieldPath}
        fill="currentColor"
        fillOpacity={0.06}
      />

      {/* Radar ring 3 — faintest */}
      <circle
        cx={cx}
        cy={radarCy}
        r={r3}
        stroke="currentColor"
        strokeWidth={s * 0.020}
        opacity={0.2}
        className="vigil-logo-ring"
      />

      {/* Radar ring 2 */}
      <circle
        cx={cx}
        cy={radarCy}
        r={r2}
        stroke="currentColor"
        strokeWidth={s * 0.030}
        opacity={0.45}
        className="vigil-logo-ring"
      />

      {/* Radar ring 1 — brightest */}
      <circle
        cx={cx}
        cy={radarCy}
        r={r1}
        stroke="currentColor"
        strokeWidth={s * 0.040}
        opacity={0.8}
        className="vigil-logo-ring"
      />

      {/* Sweep line */}
      <line
        x1={cx}
        y1={radarCy}
        x2={sweepEndX}
        y2={sweepEndY}
        stroke="currentColor"
        strokeWidth={s * 0.035}
        strokeLinecap="round"
        opacity={0.7}
      />

      {/* Center dot */}
      <circle
        cx={cx}
        cy={radarCy}
        r={s * 0.065}
        fill="currentColor"
        filter={`url(#${glowId})`}
      />
    </svg>
  );
}
