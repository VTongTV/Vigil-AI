import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { staggerContainer, staggerItem } from "../animations/variants";

const phases = [
  {
    phase: "Phase 1",
    title: "Challenge",
    subtitle: "The Problem Space",
    items: [
      "500+ junctions without AI enforcement",
      "Manual surveillance is slow and inconsistent",
      "Evidence rejection rate at 42%",
      "No hardware budget for CCTV upgrades",
    ],
    color: "#ef4444",
    gradient: "from-red-500/20 to-orange-500/20",
  },
  {
    phase: "Phase 2",
    title: "Intelligence",
    subtitle: "The AI Solution",
    items: [
      "4 YOLOv8n models with VRAM-aware lifecycle",
      "Head-region spatial association for helmet detection",
      "Indian plate OCR with error correction",
      "Court-admissible evidence generation",
    ],
    color: "#38bdf8",
    gradient: "from-sky-500/20 to-cyan-500/20",
  },
  {
    phase: "Phase 3",
    title: "Impact",
    subtitle: "The Result",
    items: [
      "87% contactless enforcement coverage",
      "~1.2s end-to-end detection latency",
      "₹438 Cr projected annual revenue",
      "< 1 week payback on ₹2.5 Cr investment",
    ],
    color: "#10b981",
    gradient: "from-emerald-500/20 to-teal-500/20",
  },
];

export default function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const progressWidth = useTransform(scrollYProgress, [0.1, 0.9], ["0%", "100%"]);

  return (
    <section
      ref={sectionRef}
      className="relative py-24 sm:py-32 bg-[#030712] overflow-hidden"
      id="how-it-works"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/50 to-transparent" />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
          {/* Section header */}
          <motion.div variants={staggerItem} className="text-center mb-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1 text-xs font-semibold text-slate-300 tracking-wider uppercase mb-4">
              How It Works
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
              From{" "}
              <span className="text-red-400">Challenge</span> to{" "}
              <span className="text-sky-400">Intelligence</span> to{" "}
              <span className="text-emerald-400">Impact</span>
            </h2>
          </motion.div>

          {/* Progress bar — scroll-driven */}
          <motion.div variants={staggerItem} className="relative mb-16 mx-auto max-w-4xl">
            <div className="h-1 rounded-full bg-slate-800">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-red-500 via-sky-500 to-emerald-500"
                style={{ width: progressWidth }}
              />
            </div>
            {/* Phase markers */}
            <div className="flex justify-between mt-3">
              {phases.map((p, i) => (
                <motion.div
                  key={p.phase}
                  className="text-center"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + i * 0.2 }}
                >
                  <div
                    className="mx-auto h-3 w-3 rounded-full border-2 mb-1"
                    style={{ borderColor: p.color, backgroundColor: `${p.color}33` }}
                  />
                  <span className="font-mono text-xs text-slate-500">{p.phase}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Phase cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {phases.map((phase, i) => (
              <motion.div
                key={phase.phase}
                variants={staggerItem}
                whileHover={{ y: -6 }}
                className={`relative rounded-2xl border border-slate-800 bg-gradient-to-br ${phase.gradient} p-8 backdrop-blur-sm`}
              >
                {/* Phase label */}
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold"
                    style={{ backgroundColor: `${phase.color}22`, color: phase.color }}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <span className="font-mono text-[11px] text-slate-500 uppercase tracking-wider">
                      {phase.phase}
                    </span>
                    <h3 className="text-xl font-bold text-white">{phase.title}</h3>
                  </div>
                </div>

                <p className="text-sm text-slate-400 mb-6">{phase.subtitle}</p>

                <ul className="space-y-3">
                  {phase.items.map((item, j) => (
                    <motion.li
                      key={j}
                      className="flex items-start gap-3 text-sm text-slate-300"
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + i * 0.15 + j * 0.08 }}
                    >
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: phase.color }}
                      />
                      {item}
                    </motion.li>
                  ))}
                </ul>

                {/* Decorative line */}
                <div
                  className="absolute bottom-0 left-8 right-8 h-px"
                  style={{ background: `linear-gradient(to right, transparent, ${phase.color}33, transparent)` }}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
