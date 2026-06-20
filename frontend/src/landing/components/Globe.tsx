import { motion } from "framer-motion";

interface GlobeProps {
  className?: string;
}

export default function Globe({ className = "" }: GlobeProps) {
  const latLines = [-60, -30, 0, 30, 60];
  const lonLines = Array.from({ length: 12 }).map((_, i) => i * 30 - 150);

  return (
    <svg
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="globeGrad" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
        </radialGradient>
        <clipPath id="globeClip">
          <circle cx="200" cy="200" r="160" />
        </clipPath>
        <filter id="globeGlow">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer glow ring */}
      <motion.circle
        cx="200"
        cy="200"
        r="170"
        stroke="#3b82f6"
        strokeWidth="1"
        strokeOpacity="0.3"
        fill="none"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: [1, 1.05, 1], opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Globe body */}
      <circle cx="200" cy="200" r="160" fill="url(#globeGrad)" />

      {/* Latitude lines */}
      <g clipPath="url(#globeClip)">
        {latLines.map((lat, i) => {
          const y = 200 - (lat / 90) * 160;
          const rx = Math.cos((lat * Math.PI) / 180) * 160;
          return (
            <motion.ellipse
              key={`lat-${i}`}
              cx="200"
              cy={y}
              rx={rx}
              ry={rx * 0.15}
              stroke="#3b82f6"
              strokeWidth="0.5"
              strokeOpacity="0.3"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, delay: i * 0.15 }}
            />
          );
        })}

        {/* Longitude lines */}
        {lonLines.map((lon, i) => (
          <motion.ellipse
            key={`lon-${i}`}
            cx="200"
            cy="200"
            rx={Math.abs(Math.cos((lon * Math.PI) / 180)) * 160}
            ry="160"
            stroke="#3b82f6"
            strokeWidth="0.5"
            strokeOpacity="0.2"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, delay: i * 0.1 }}
          />
        ))}
      </g>

      {/* Bengaluru marker */}
      <g filter="url(#globeGlow)">
        <motion.circle
          cx="220"
          cy="220"
          r="5"
          fill="#ef4444"
          initial={{ scale: 0 }}
          animate={{ scale: [1, 1.5, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.circle
          cx="220"
          cy="220"
          r="12"
          stroke="#ef4444"
          strokeWidth="1"
          fill="none"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0.8, 1.5, 0.8], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </g>

      {/* Expansion dots - other cities */}
      {[
        { cx: 180, cy: 190, delay: 0.5 },
        { cx: 250, cy: 200, delay: 1 },
        { cx: 200, cy: 250, delay: 1.5 },
        { cx: 160, cy: 230, delay: 2 },
        { cx: 240, cy: 240, delay: 2.5 },
      ].map((dot, i) => (
        <motion.circle
          key={`city-${i}`}
          cx={dot.cx}
          cy={dot.cy}
          r="3"
          fill="#3b82f6"
          fillOpacity="0.6"
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1, 0] }}
          transition={{
            duration: 3,
            delay: dot.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Rotation indicator */}
      <motion.circle
        cx="200"
        cy="200"
        r="162"
        stroke="#60a5fa"
        strokeWidth="2"
        fill="none"
        strokeDasharray="40 200"
        initial={{ rotate: 0 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "center" }}
      />
    </svg>
  );
}
