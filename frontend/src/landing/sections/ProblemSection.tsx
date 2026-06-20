import { useRef } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Clock, Users, Camera } from "lucide-react";
import { staggerContainer, staggerItem } from "../animations/variants";

const stats = [
  {
    value: "500+",
    label: "Junctions Without AI",
    description: "Still relying on manual surveillance",
    icon: Camera,
    color: "from-red-500/20 to-orange-500/20",
    borderColor: "border-red-500/30",
    iconColor: "text-red-400",
  },
  {
    value: "87%",
    label: "Contactless Coverage",
    description: "Only at 75 AI-enabled junctions today",
    icon: AlertTriangle,
    color: "from-amber-500/20 to-yellow-500/20",
    borderColor: "border-amber-500/30",
    iconColor: "text-amber-400",
  },
  {
    value: "3.2×",
    label: "Manual Processing Time",
    description: "Officers spend reviewing violations",
    icon: Clock,
    color: "from-sky-500/20 to-cyan-500/20",
    borderColor: "border-sky-500/30",
    iconColor: "text-sky-400",
  },
  {
    value: "42%",
    label: "Evidence Rejection Rate",
    description: "Due to incomplete documentation",
    icon: Users,
    color: "from-purple-500/20 to-pink-500/20",
    borderColor: "border-purple-500/30",
    iconColor: "text-purple-400",
  },
];

export default function ProblemSection() {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section
      ref={sectionRef}
      className="relative py-24 sm:py-32 bg-[#030712] overflow-hidden"
      id="problem"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-950/5 to-transparent" />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {/* Section header */}
          <motion.div variants={staggerItem} className="text-center mb-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400 tracking-wider uppercase mb-4">
              The Problem
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
              Bengaluru&apos;s Traffic Enforcement{" "}
              <span className="text-red-400">Crisis</span>
            </h2>
            <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
              While 75 junctions have AI, the remaining 500+ intersections operate on manual surveillance alone —
              creating dangerous blind spots in city-wide enforcement.
            </p>
          </motion.div>

          {/* Stats grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                variants={staggerItem}
                whileHover={{ y: -4, scale: 1.02 }}
                className={`relative group rounded-2xl border ${stat.borderColor} bg-gradient-to-br ${stat.color} p-6 backdrop-blur-sm transition-all`}
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900/50 border border-slate-700/50 mb-4">
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
                <p className="font-mono text-3xl font-bold text-white tracking-tight">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-200">
                  {stat.label}
                </p>
                <p className="mt-1 text-xs text-slate-400">{stat.description}</p>
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{
                  boxShadow: `inset 0 0 40px rgba(239, 68, 68, 0.05)`
                }} />
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
