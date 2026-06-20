import { motion } from "framer-motion";

interface NeuralNetworkProps {
  className?: string;
}

export default function NeuralNetwork({ className = "" }: NeuralNetworkProps) {
  const layers = [
    { nodes: 4, label: "Input", x: 100, color: "#3b82f6" },
    { nodes: 6, label: "COCO", x: 300, color: "#06b6d4" },
    { nodes: 5, label: "Helmet", x: 500, color: "#8b5cf6" },
    { nodes: 4, label: "Violation", x: 700, color: "#f59e0b" },
    { nodes: 3, label: "OCR", x: 900, color: "#10b981" },
    { nodes: 2, label: "Output", x: 1100, color: "#ef4444" },
  ];

  const getNodeY = (layerIndex: number, nodeIndex: number) => {
    const layer = layers[layerIndex];
    const spacing = 360 / (layer.nodes + 1);
    return 80 + spacing * (nodeIndex + 1);
  };

  return (
    <svg
      viewBox="0 0 1200 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <filter id="nodeGlow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <linearGradient id="connGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.6" />
        </linearGradient>
      </defs>

      {/* Connections between layers */}
      {layers.slice(0, -1).map((layer, layerIdx) =>
        Array.from({ length: layer.nodes }).map((_, fromIdx) =>
          Array.from({ length: layers[layerIdx + 1].nodes }).map((_, toIdx) => {
            const x1 = layer.x;
            const y1 = getNodeY(layerIdx, fromIdx);
            const x2 = layers[layerIdx + 1].x;
            const y2 = getNodeY(layerIdx + 1, toIdx);
            const midX = (x1 + x2) / 2;

            return (
              <motion.path
                key={`conn-${layerIdx}-${fromIdx}-${toIdx}`}
                d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                stroke="url(#connGrad)"
                strokeWidth="1"
                strokeOpacity="0.25"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{
                  duration: 1.2,
                  delay: layerIdx * 0.3 + (fromIdx + toIdx) * 0.02,
                  ease: "easeOut",
                }}
              />
            );
          })
        )
      )}

      {/* Data flow particles */}
      {layers.slice(0, -1).map((layer, layerIdx) =>
        Array.from({ length: 3 }).map((_, pIdx) => {
          const fromNode = Math.floor(Math.random() * layer.nodes);
          const toNode = Math.floor(Math.random() * layers[layerIdx + 1].nodes);
          const x1 = layer.x;
          const y1 = getNodeY(layerIdx, fromNode);
          const x2 = layers[layerIdx + 1].x;
          const y2 = getNodeY(layerIdx + 1, toNode);

          return (
            <motion.circle
              key={`particle-${layerIdx}-${pIdx}`}
              r="3"
              fill={layer.color}
              filter="url(#nodeGlow)"
              initial={{ opacity: 0 }}
              animate={{
                cx: [x1, (x1 + x2) / 2, x2],
                cy: [y1, (y1 + y2) / 2, y2],
                opacity: [0, 0.8, 0],
              }}
              transition={{
                duration: 2,
                delay: layerIdx * 0.5 + pIdx * 0.7,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          );
        })
      )}

      {/* Nodes */}
      {layers.map((layer, layerIdx) =>
        Array.from({ length: layer.nodes }).map((_, nodeIdx) => {
          const y = getNodeY(layerIdx, nodeIdx);
          return (
            <g key={`node-${layerIdx}-${nodeIdx}`}>
              <motion.circle
                cx={layer.x}
                cy={y}
                r="18"
                fill={layer.color}
                fillOpacity="0.15"
                stroke={layer.color}
                strokeWidth="2"
                filter="url(#nodeGlow)"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                  delay: layerIdx * 0.15 + nodeIdx * 0.08,
                }}
              />
              <motion.circle
                cx={layer.x}
                cy={y}
                r="6"
                fill={layer.color}
                initial={{ scale: 0 }}
                animate={{ scale: [1, 1.3, 1] }}
                transition={{
                  duration: 2,
                  delay: layerIdx * 0.3 + nodeIdx * 0.1,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </g>
          );
        })
      )}

      {/* Layer labels */}
      {layers.map((layer, layerIdx) => (
        <motion.text
          key={`label-${layerIdx}`}
          x={layer.x}
          y={460}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize="13"
          fontWeight="600"
          fontFamily="monospace"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: layerIdx * 0.2 + 1 }}
        >
          {layer.label}
        </motion.text>
      ))}
    </svg>
  );
}
