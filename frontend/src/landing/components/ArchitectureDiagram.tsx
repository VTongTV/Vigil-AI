import { motion } from "framer-motion";

interface ArchitectureDiagramProps {
  className?: string;
}

const layers = [
  {
    y: 0,
    label: "Frontend",
    sublabel: "React + TailwindCSS + Framer Motion",
    color: "#3b82f6",
    icon: "M4 6h16M4 12h16M4 18h16",
  },
  {
    y: 90,
    label: "API Layer",
    sublabel: "FastAPI + Pydantic Schemas",
    color: "#8b5cf6",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
  },
  {
    y: 180,
    label: "AI Engine",
    sublabel: "YOLOv8n + RapidOCR + Violation Logic",
    color: "#06b6d4",
    icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  },
  {
    y: 270,
    label: "Database",
    sublabel: "SQLite + SQLAlchemy ORM",
    color: "#10b981",
    icon: "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4",
  },
  {
    y: 360,
    label: "Insights",
    sublabel: "Analytics + Evidence + FIR PDF",
    color: "#f59e0b",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  },
];

export default function ArchitectureDiagram({
  className = "",
}: ArchitectureDiagramProps) {
  return (
    <svg
      viewBox="0 0 600 440"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <filter id="archGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Vertical connecting lines */}
      {layers.slice(0, -1).map((layer, i) => {
        const nextLayer = layers[i + 1];
        return (
          <g key={`line-${i}`}>
            {/* Left line */}
            <motion.line
              x1="150"
              y1={layer.y + 50}
              x2="150"
              y2={nextLayer.y + 15}
              stroke={layer.color}
              strokeWidth="2"
              strokeOpacity="0.4"
              strokeDasharray="6 4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: i * 0.3 + 0.5 }}
            />
            {/* Right line */}
            <motion.line
              x1="450"
              y1={layer.y + 50}
              x2="450"
              y2={nextLayer.y + 15}
              stroke={nextLayer.color}
              strokeWidth="2"
              strokeOpacity="0.4"
              strokeDasharray="6 4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: i * 0.3 + 0.7 }}
            />

            {/* Data flow arrow (center) */}
            <motion.circle
              cx="300"
              cy={(layer.y + 50 + nextLayer.y + 15) / 2}
              r="4"
              fill={layer.color}
              filter="url(#archGlow)"
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, 0.8, 0],
                y: [0, nextLayer.y + 15 - (layer.y + 50), 0],
              }}
              transition={{
                duration: 1.5,
                delay: i * 0.4 + 1,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* Arrow head */}
            <motion.polygon
              points={`295,${nextLayer.y + 10} 300,${nextLayer.y + 20} 305,${nextLayer.y + 10}`}
              fill={layer.color}
              fillOpacity="0.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{
                duration: 1.5,
                delay: i * 0.4 + 1.2,
                repeat: Infinity,
              }}
            />
          </g>
        );
      })}

      {/* Layer boxes */}
      {layers.map((layer, i) => (
        <motion.g
          key={`layer-${i}`}
          initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: i * 0.2 }}
        >
          {/* Background box */}
          <rect
            x="100"
            y={layer.y}
            width="400"
            height="60"
            rx="12"
            fill={layer.color}
            fillOpacity="0.08"
            stroke={layer.color}
            strokeWidth="1.5"
            strokeOpacity="0.3"
          />

          {/* Icon circle */}
          <circle
            cx="145"
            cy={layer.y + 30}
            r="18"
            fill={layer.color}
            fillOpacity="0.15"
            stroke={layer.color}
            strokeWidth="1"
          />

          {/* Icon */}
          <path
            d={layer.icon}
            stroke={layer.color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            transform={`translate(132, ${layer.y + 17}) scale(0.8)`}
          />

          {/* Label */}
          <text
            x="180"
            y={layer.y + 27}
            fill="#e2e8f0"
            fontSize="15"
            fontWeight="700"
            fontFamily="system-ui, sans-serif"
          >
            {layer.label}
          </text>

          {/* Sublabel */}
          <text
            x="180"
            y={layer.y + 44}
            fill="#94a3b8"
            fontSize="11"
            fontFamily="monospace"
          >
            {layer.sublabel}
          </text>
        </motion.g>
      ))}
    </svg>
  );
}
