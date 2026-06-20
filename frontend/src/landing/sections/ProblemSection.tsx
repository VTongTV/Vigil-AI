import { useRef } from "react";
import { motion, type Variants } from "framer-motion";
import { AlertTriangle, Clock, Camera } from "lucide-react";
import { staggerContainer, staggerItem } from "../animations/variants";

// Inline Users icon
function UsersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

const stats = [
  {
    value: "500+",
    label: "Junctions Without AI",
    description: "Still relying on manual surveillance",
    icon: Camera,
    accent: "red",
    borderColor: "border-red-500/25",
    bg: "bg-red-500/8",
    iconColor: "text-red-400",
    barColor: "from-red-500 to-orange-500",
    glow: "rgba(239,68,68,0.12)",
    // how "filled" the bar looks — visual severity indicator
    fill: 92,
  },
  {
    value: "87%",
    label: "Contactless Coverage",
    description: "Only at 75 AI-enabled junctions today",
    icon: AlertTriangle,
    accent: "amber",
    borderColor: "border-amber-500/25",
    bg: "bg-amber-500/8",
    iconColor: "text-amber-400",
    barColor: "from-amber-500 to-yellow-400",
    glow: "rgba(245,158,11,0.12)",
    fill: 87,
  },
  {
    value: "3.2×",
    label: "Manual Processing Time",
    description: "Officers spend reviewing violations",
    icon: Clock,
    accent: "sky",
    borderColor: "border-sky-500/25",
    bg: "bg-sky-500/8",
    iconColor: "text-sky-400",
    barColor: "from-sky-500 to-cyan-400",
    glow: "rgba(56,189,248,0.12)",
    fill: 68,
  },
  {
    value: "42%",
    label: "Evidence Rejection Rate",
    description: "Due to incomplete documentation",
    icon: UsersIcon,
    accent: "purple",
    borderColor: "border-purple-500/25",
    bg: "bg-purple-500/8",
    iconColor: "text-purple-400",
    barColor: "from-purple-500 to-pink-400",
    glow: "rgba(168,85,247,0.12)",
    fill: 42,
  },
];

// Cards drop in from top with stagger
const cardVariant = (i: number): Variants => ({
  hidden: { opacity: 0, y: -32, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.1,
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
});

// Progress bar fill animation
const barVariant = (fill: number): Variants => ({
  hidden: { scaleX: 0 },
  visible: {
    scaleX: fill / 100,
    transition: {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
      delay: 0.3,
    },
  },
});

// Pulsing alert dot
const pulseVariant: Variants = {
  animate: {
    scale: [1, 1.6, 1],
    opacity: [0.7, 0, 0.7],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
  },
};

export default function ProblemSection() {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section
      ref={sectionRef}
      className="relative py-24 sm:py-32 bg-[#030712] overflow-hidden"
      id="problem"
    >
      {/* Subtle red vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-950/8 to-transparent pointer-events-none" />

      {/* Faint radial glow behind the grid */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(239,68,68,0.04) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {/* Section header */}
          <motion.div variants={staggerItem} className="text-center mb-16">
            {/* Signature: pulsing alert dot next to badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 mb-4">
              <span className="relative flex h-2 w-2">
                <motion.span
                  variants={pulseVariant}
                  animate="animate"
                  className="absolute inline-flex h-full w-full rounded-full bg-red-400"
                />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              <span className="text-xs font-semibold text-red-400 tracking-wider uppercase">
                The Problem
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
              Bengaluru&apos;s Traffic Enforcement{" "}
              <span className="text-red-400">Crisis</span>
            </h2>
            <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
              While 75 junctions have AI, the remaining 500+ intersections operate on manual
              surveillance alone — creating dangerous blind spots in city-wide enforcement.
            </p>
          </motion.div>

          {/* Stats grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                custom={i}
                variants={cardVariant(i)}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                className={`
                  relative group rounded-2xl border ${stat.borderColor} ${stat.bg} p-6
                  backdrop-blur-sm overflow-hidden
                  transition-[transform,box-shadow] duration-300 ease-out
                  hover:-translate-y-1 hover:scale-[1.02]
                `}
              >
                {/* Top-right corner glow on hover */}
                <div
                  className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: `radial-gradient(circle, ${stat.glow}, transparent 70%)` }}
                />

                {/* Icon */}
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900/60 border border-slate-700/50 mb-5">
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>

                {/* Value */}
                <p className="font-mono text-3xl font-bold text-white tracking-tight tabular-nums">
                  {stat.value}
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-200 leading-snug">
                  {stat.label}
                </p>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  {stat.description}
                </p>

                {/* Animated severity bar — signature element */}
                <div className="mt-5 h-[3px] w-full rounded-full bg-slate-800 overflow-hidden">
                  <motion.div
                    variants={barVariant(stat.fill)}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className={`h-full rounded-full bg-gradient-to-r ${stat.barColor} origin-left`}
                  />
                </div>
                <p className="mt-1 text-[10px] text-slate-600 font-mono tabular-nums text-right">
                  {stat.fill}%
                </p>
              </motion.div>
            ))}
          </div>

          {/* Bottom message */}
          <motion.div variants={staggerItem} className="mt-12 text-center">
            <p className="text-slate-500 text-sm">
              The gap between AI-enabled and manual junctions costs{" "}
              <span className="text-red-400 font-semibold">crores in lost revenue</span>{" "}
              and creates inconsistent enforcement across the city.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}