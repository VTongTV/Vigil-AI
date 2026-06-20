import { useRef, useEffect, useState, type ElementType } from "react";
import { motion, type Variants } from "framer-motion";
import {
  Monitor,
  Zap,
  ListChecks,
  ShieldCheck,
  BarChart3,
  Map,
} from "lucide-react";
import { staggerContainer, staggerItem } from "../animations/variants";

const dashboardFeatures: { label: string; description: string; icon: ElementType }[] = [
  { label: "Command Center", description: "Real-time violation overview with sparkline trends and camera health monitoring", icon: Monitor },
  { label: "Batch Detection", description: "Upload up to 10 images with pipeline timing waterfall and annotated results", icon: Zap },
  { label: "Violation Docket", description: "Tabular list with filters, approve/reject actions, and audit trail", icon: ListChecks },
  { label: "Evidence Viewer", description: "Chain-of-custody metadata, SHA-256 hashes, and E-Challan generation", icon: ShieldCheck },
  { label: "Analytics", description: "Recharts-powered trends, ROI calculator, and camera breakdown", icon: BarChart3 },
  { label: "Tactical Map", description: "Leaflet heatmap with danger scores across 10 Bengaluru junctions", icon: Map },
];

const cardVariant = (i: number): Variants => ({
  hidden: { opacity: 0, x: 50 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.09,
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
});

const mockupVariant: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
};

// Animated bar component — loops between random heights
function AnimatedBar({ baseHeight, color, delay }: { baseHeight: number; color: string; delay: number }) {
  return (
    <motion.div
      className="flex-1 rounded-t"
      style={{ backgroundColor: color, opacity: 0.65 }}
      animate={{
        height: [
          `${baseHeight}%`,
          `${Math.min(95, baseHeight + Math.random() * 25 + 10)}%`,
          `${Math.max(15, baseHeight - Math.random() * 20)}%`,
          `${baseHeight}%`,
        ],
      }}
      transition={{
        duration: 4 + delay,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    />
  );
}

// Animated count-up number
function CountUp({ target, suffix = "", duration = 1.5 }: { target: number; suffix?: string; duration?: number }) {
  const [value, setValue] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!started) return;
    const steps = 40;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setValue(target);
        clearInterval(timer);
      } else {
        setValue(Math.floor(current));
      }
    }, (duration * 1000) / steps);
    return () => clearInterval(timer);
  }, [started, target, duration]);

  return (
    <motion.p
      className="font-mono text-lg font-bold tabular-nums"
      onViewportEnter={() => setStarted(true)}
    >
      {suffix === "₹" ? `₹${value >= 1000 ? (value / 1000).toFixed(1) + "L" : value}` : `${value}${suffix}`}
    </motion.p>
  );
}

// Pulsing camera dot
function CameraStatus({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="relative flex h-1.5 w-1.5">
        {active && (
          <motion.span
            animate={{ scale: [1, 2, 1], opacity: [0.8, 0, 0.8] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inline-flex h-full w-full rounded-full bg-emerald-400"
          />
        )}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-600"}`} />
      </span>
    </div>
  );
}

// Scrolling live feed ticker
const liveEvents = [
  { plate: "KA 05 AB 1234", type: "No Helmet", junction: "Silk Board", time: "12:04:11", severity: "high" },
  { plate: "KA 01 MF 9821", type: "Triple Riding", junction: "Marathahalli", time: "12:04:09", severity: "high" },
  { plate: "KA 03 HJ 4490", type: "Wrong Side", junction: "Hebbal Fly", time: "12:04:07", severity: "medium" },
  { plate: "KA 19 N 7734", type: "No Seatbelt", junction: "Tin Factory", time: "12:04:05", severity: "low" },
  { plate: "KA 50 C 0012", type: "Red Light", junction: "KR Puram", time: "12:04:03", severity: "high" },
];

export default function DashboardPreviewSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [tickerIndex, setTickerIndex] = useState(0);

  // Rotate live event every 1.8s
  useEffect(() => {
    const t = setInterval(() => setTickerIndex((i) => (i + 1) % liveEvents.length), 1800);
    return () => clearInterval(t);
  }, []);

  const barColors = ["#3b82f6", "#8b5cf6", "#06b6d4", "#f59e0b", "#10b981", "#ef4444", "#ec4899"];
  const barHeights = [65, 45, 35, 30, 25, 20, 15];

  return (
    <section
      ref={sectionRef}
      className="relative py-24 sm:py-32 bg-[#030712] overflow-hidden"
      id="dashboard"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-950/5 to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {/* Section header */}
          <motion.div variants={staggerItem} className="text-center mb-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400 tracking-wider uppercase mb-4">
              Command Center
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
              A Dashboard That{" "}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Commands Respect
              </span>
            </h2>
            <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
              Six interconnected modules. One unified interface. Every pixel designed for enforcement officers.
            </p>
          </motion.div>

          {/* Dashboard mockup */}
          <motion.div
            variants={mockupVariant}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="relative rounded-3xl border border-slate-700/60 bg-slate-900/90 overflow-hidden backdrop-blur-sm mb-12 shadow-[0_0_60px_rgba(59,130,246,0.07)]"
          >
            {/* Animated border glow */}
            <motion.div
              className="absolute inset-0 rounded-3xl pointer-events-none"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              style={{ boxShadow: "inset 0 0 40px rgba(59,130,246,0.05)" }}
            />

            {/* Browser chrome */}
            <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500/60" />
                <div className="h-3 w-3 rounded-full bg-amber-500/60" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/60" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-2 rounded-lg bg-slate-800/50 px-4 py-1.5 text-xs text-slate-500">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                  localhost:5173
                </div>
              </div>
              {/* Live indicator */}
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <motion.span
                    animate={{ scale: [1, 1.8, 1], opacity: [0.8, 0, 0.8] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute inline-flex h-full w-full rounded-full bg-red-400"
                  />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                <span className="text-[10px] text-red-400 font-mono font-semibold">LIVE</span>
              </div>
            </div>

            {/* Dashboard content */}
            <div className="p-4 lg:p-6">
              <div className="flex gap-4">
                {/* Sidebar */}
                <div className="hidden lg:flex flex-col gap-1 w-44 shrink-0">
                  <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2 mb-1">
                    <div className="h-3 w-3 rounded bg-blue-500/50" />
                    <span className="text-xs font-medium text-blue-400">Dashboard</span>
                  </div>
                  {["Upload", "Violations", "Evidence", "Analytics", "Map"].map((item, i) => (
                    <div key={item} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-500">
                      <div className="h-2.5 w-2.5 rounded bg-slate-700/80" />
                      {item}
                      <CameraStatus active={i < 3} />
                    </div>
                  ))}
                </div>

                {/* Main */}
                <div className="flex-1 space-y-3 min-w-0">
                  {/* Stat cards with count-up */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {[
                      { label: "Violations", target: 281, suffix: "", color: "text-blue-400" },
                      { label: "Fines (₹)", target: 140000, suffix: "₹", color: "text-amber-400" },
                      { label: "Confidence", target: 94, suffix: "%", color: "text-emerald-400" },
                      { label: "Cameras", target: 8, suffix: "/10", color: "text-purple-400" },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-xl border border-slate-800 bg-slate-800/40 p-3">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{stat.label}</p>
                        <div className={stat.color}>
                          <CountUp target={stat.target} suffix={stat.suffix} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
                    {/* Animated bar chart */}
                    <div className="lg:col-span-3 rounded-xl border border-slate-800 bg-slate-800/30 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-300">Violations by Type</span>
                        <motion.span
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="font-mono text-[10px] text-slate-500"
                        >
                          live
                        </motion.span>
                      </div>
                      <div className="flex items-end gap-1.5 h-20">
                        {barHeights.map((h, i) => (
                          <AnimatedBar key={i} baseHeight={h} color={barColors[i]} delay={i * 0.3} />
                        ))}
                      </div>
                    </div>

                    {/* Live feed ticker */}
                    <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-800/30 p-4 overflow-hidden">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-300">Live Feed</span>
                        <motion.div
                          animate={{ opacity: [1, 0.2, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="h-1.5 w-1.5 rounded-full bg-red-500"
                        />
                      </div>
                      <div className="relative h-[72px] overflow-hidden">
                        {liveEvents.map((ev, i) => (
                          <motion.div
                            key={ev.time}
                            animate={{
                              opacity: i === tickerIndex ? 1 : 0,
                              y: i === tickerIndex ? 0 : -8,
                            }}
                            transition={{ duration: 0.35, ease: "easeOut" }}
                            className="absolute inset-0 space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[11px] text-white font-semibold">{ev.plate}</span>
                              <span className={`text-[9px] rounded-full px-1.5 py-0.5 font-semibold ${ev.severity === "high" ? "bg-red-500/20 text-red-400" :
                                  ev.severity === "medium" ? "bg-amber-500/20 text-amber-400" :
                                    "bg-slate-700 text-slate-400"
                                }`}>{ev.severity}</span>
                            </div>
                            <p className="text-[10px] text-blue-400 font-medium">{ev.type}</p>
                            <p className="text-[10px] text-slate-500">{ev.junction}</p>
                            <p className="font-mono text-[9px] text-slate-600">{ev.time}</p>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Violation bars */}
                  <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-4 space-y-2">
                    {[
                      { label: "No Helmet", pct: 45, color: "#3b82f6" },
                      { label: "Triple Riding", pct: 28, color: "#8b5cf6" },
                      { label: "Wrong Side", pct: 15, color: "#06b6d4" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2">
                        <span className="w-20 text-[10px] text-slate-400 shrink-0">{item.label}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: item.color, opacity: 0.75 }}
                            initial={{ width: 0 }}
                            whileInView={{ width: `${item.pct}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-slate-500 tabular-nums">{item.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Feature cards — slide in from right */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboardFeatures.map((feature, i) => (
              <motion.div
                key={feature.label}
                custom={i}
                variants={cardVariant(i)}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-30px" }}
                className="group rounded-xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-sm
                  transition-[transform,border-color] duration-200 ease-out
                  hover:translate-x-1 hover:border-blue-500/30"
              >
                <div className="flex items-center gap-2 mb-2">
                  {(() => { const Icon = feature.icon; return <Icon className="h-4 w-4 text-blue-400" />; })()}
                  <h3 className="text-sm font-bold text-white">{feature.label}</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}