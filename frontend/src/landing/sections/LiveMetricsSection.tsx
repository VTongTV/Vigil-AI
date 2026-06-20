import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import { staggerContainer, staggerItem } from "../animations/variants";

function AnimatedCounter({ target, suffix = "", prefix = "", duration = 2000 }: {
  target: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  useEffect(() => {
    if (!isInView) return;
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(target * eased));
      if (progress >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, target, duration]);

  return (
    <span ref={ref} className="font-mono tabular-nums">
      {prefix}{count.toLocaleString("en-IN")}{suffix}
    </span>
  );
}

const metrics = [
  {
    value: 281,
    suffix: "",
    label: "Violations Detected",
    sublabel: "across 10 Bengaluru junctions",
    color: "text-blue-400",
  },
  {
    value: 94,
    suffix: ".2%",
    label: "Detection Confidence",
    sublabel: "average across all types",
    color: "text-emerald-400",
  },
  {
    value: 438,
    prefix: "₹",
    suffix: " Cr",
    label: "Projected Annual Revenue",
    sublabel: "aggressive 500-junction rollout",
    color: "text-amber-400",
  },
  {
    value: 87,
    suffix: "%",
    label: "City Coverage",
    sublabel: "contactless enforcement",
    color: "text-purple-400",
  },
  {
    value: 1,
    suffix: ".2s",
    label: "End-to-End Latency",
    sublabel: "per image processing",
    color: "text-cyan-400",
  },
  {
    value: 87,
    suffix: "×",
    label: "ROI on Investment",
    sublabel: "conservative projection",
    color: "text-rose-400",
  },
];

export default function LiveMetricsSection() {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section
      ref={sectionRef}
      className="relative py-24 sm:py-32 bg-[#030712] overflow-hidden"
      id="metrics"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-950/5 to-transparent" />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {/* Section header */}
          <motion.div variants={staggerItem} className="text-center mb-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 tracking-wider uppercase mb-4">
              Live Metrics
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
              Numbers That{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Speak for Themselves
              </span>
            </h2>
          </motion.div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map((metric, i) => (
              <motion.div
                key={metric.label}
                variants={staggerItem}
                whileHover={{ y: -4, scale: 1.02 }}
                className="relative rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm text-center group"
              >
                <p className={`text-4xl sm:text-5xl font-bold ${metric.color} mb-2`}>
                  <AnimatedCounter
                    target={metric.value}
                    suffix={metric.suffix}
                    prefix={metric.prefix}
                    duration={2000 + i * 200}
                  />
                </p>
                <p className="text-sm font-semibold text-white mb-1">
                  {metric.label}
                </p>
                <p className="text-xs text-slate-500">
                  {metric.sublabel}
                </p>

                {/* Hover glow */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{
                  boxShadow: `inset 0 1px 0 0 rgba(255,255,255,0.05)`
                }} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
