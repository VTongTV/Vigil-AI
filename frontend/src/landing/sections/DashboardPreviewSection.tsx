import { useRef } from "react";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "../animations/variants";

const dashboardFeatures = [
  { label: "Command Center", description: "Real-time violation overview with sparkline trends and camera health monitoring" },
  { label: "Batch Detection", description: "Upload up to 10 images with pipeline timing waterfall and annotated results" },
  { label: "Violation Docket", description: "Tabular list with filters, approve/reject actions, and audit trail" },
  { label: "Evidence Viewer", description: "Chain-of-custody metadata, SHA-256 hashes, and FIR PDF generation" },
  { label: "Analytics", description: "Recharts-powered trends, ROI calculator, and camera breakdown" },
  { label: "Tactical Map", description: "Leaflet heatmap with danger scores across 10 Bengaluru junctions" },
];

export default function DashboardPreviewSection() {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section
      ref={sectionRef}
      className="relative py-24 sm:py-32 bg-[#030712] overflow-hidden"
      id="dashboard"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-950/5 to-transparent" />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
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
            variants={staggerItem}
            className="relative rounded-3xl border border-slate-800 bg-slate-900/80 overflow-hidden backdrop-blur-sm mb-12"
          >
            {/* Browser chrome */}
            <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500/60" />
                <div className="h-3 w-3 rounded-full bg-amber-500/60" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/60" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-2 rounded-lg bg-slate-800/50 px-4 py-1.5 text-xs text-slate-500">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                  localhost:5173
                </div>
              </div>
            </div>

            {/* Dashboard content mockup */}
            <div className="p-6">
              {/* Sidebar + main layout */}
              <div className="flex gap-4">
                {/* Sidebar */}
                <div className="hidden lg:flex flex-col gap-2 w-48 shrink-0">
                  <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2">
                    <div className="h-3 w-3 rounded bg-blue-500/50" />
                    <span className="text-xs font-medium text-blue-400">Dashboard</span>
                  </div>
                  {["Upload", "Violations", "Evidence", "Analytics", "Map"].map((item) => (
                    <div key={item} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-slate-800/50">
                      <div className="h-3 w-3 rounded bg-slate-700" />
                      {item}
                    </div>
                  ))}
                </div>

                {/* Main content */}
                <div className="flex-1 space-y-4">
                  {/* Stat cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { label: "Violations", value: "281", color: "blue" },
                      { label: "Fines", value: "₹1.4L", color: "amber" },
                      { label: "Confidence", value: "94.2%", color: "emerald" },
                      { label: "Cameras", value: "8/10", color: "purple" },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-xl border border-slate-800 bg-slate-800/30 p-3">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">{stat.label}</p>
                        <p className={`font-mono text-lg font-bold text-${stat.color}-400`}>{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Chart area */}
                  <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-slate-300">Violations by Type</span>
                      <span className="font-mono text-[10px] text-slate-500">281 total</span>
                    </div>
                    <div className="flex items-end gap-1 h-24">
                      {[65, 45, 35, 30, 25, 20, 15].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t" style={{
                          height: `${h}%`,
                          backgroundColor: ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#ec4899'][i],
                          opacity: 0.6,
                        }} />
                      ))}
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
                        <span className="w-20 text-[10px] text-slate-400 truncate">{item.label}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-slate-800">
                          <div className="h-full rounded-full" style={{ width: `${item.pct}%`, backgroundColor: item.color, opacity: 0.7 }} />
                        </div>
                        <span className="font-mono text-[10px] text-slate-500">{item.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Feature list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboardFeatures.map((feature) => (
              <motion.div
                key={feature.label}
                variants={staggerItem}
                whileHover={{ y: -3 }}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
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
