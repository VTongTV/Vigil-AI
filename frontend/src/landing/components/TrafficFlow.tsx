import { motion } from "framer-motion";

interface TrafficFlowProps {
  className?: string;
}

export default function TrafficFlow({ className = "" }: TrafficFlowProps) {
  const paths = [
    "M 0,200 Q 200,180 400,220 T 800,200 T 1200,180 T 1600,200",
    "M 0,300 Q 300,280 500,320 T 900,300 T 1300,280 T 1600,300",
    "M 0,400 Q 250,380 450,420 T 850,400 T 1250,380 T 1600,400",
  ];

  const cars = [
    { pathIndex: 0, delay: 0, color: "#3b82f6" },
    { pathIndex: 0, delay: 2, color: "#06b6d4" },
    { pathIndex: 1, delay: 1, color: "#8b5cf6" },
    { pathIndex: 1, delay: 3, color: "#ec4899" },
    { pathIndex: 2, delay: 0.5, color: "#10b981" },
    { pathIndex: 2, delay: 2.5, color: "#f59e0b" },
  ];

  return (
    <svg
      viewBox="0 0 1600 600"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="roadGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1e293b" stopOpacity="0" />
          <stop offset="20%" stopColor="#1e293b" stopOpacity="0.3" />
          <stop offset="80%" stopColor="#1e293b" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#1e293b" stopOpacity="0" />
        </linearGradient>

        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {paths.map((d, i) => (
          <path key={`path-${i}`} id={`trafficPath${i}`} d={d} />
        ))}
      </defs>

      {/* Road lanes */}
      {paths.map((d, i) => (
        <motion.path
          key={`road-${i}`}
          d={d}
          stroke="url(#roadGrad)"
          strokeWidth="40"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, delay: i * 0.3, ease: "easeInOut" }}
        />
      ))}

      {/* Lane markings */}
      {paths.map((d, i) => (
        <motion.path
          key={`marking-${i}`}
          d={d}
          stroke="#334155"
          strokeWidth="1"
          strokeDasharray="16 12"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.5, delay: i * 0.3 + 0.5, ease: "easeInOut" }}
        />
      ))}

      {/* Moving cars */}
      {cars.map((car, i) => (
        <motion.circle
          key={`car-${i}`}
          r="6"
          fill={car.color}
          filter="url(#glow)"
          initial={{ offsetDistance: "0%" }}
          animate={{ offsetDistance: "100%" }}
          transition={{
            duration: 6 + i * 0.5,
            delay: car.delay,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            offsetPath: `path("${paths[car.pathIndex]}")`,
          }}
        />
      ))}

      {/* Ambient particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.circle
          key={`particle-${i}`}
          cx={Math.random() * 1600}
          cy={150 + Math.random() * 300}
          r={1 + Math.random() * 2}
          fill="#3b82f6"
          opacity={0.15 + Math.random() * 0.25}
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0.1, 0.4, 0.1],
            y: [0, -10, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 3,
            delay: Math.random() * 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </svg>
  );
}
