import { useRef } from "react";
import { motion, type Variants } from "framer-motion";
import { Shield, Cpu, FileCheck } from "lucide-react";
import { staggerContainer, staggerItem } from "../animations/variants";

const steps = [
  {
    icon: Cpu,
    title: "AI Detects",
    description:
      "YOLOv8n models scan existing CCTV feeds to detect violations in real-time — helmet, triple riding, wrong-side, parking, seatbelt, stop-line, red-light.",
    color: "from-sky-500 to-cyan-500",
    bgColor: "bg-sky-500/10",
    borderColor: "border-sky-500/30",
    iconGlow: "rgba(56,189,248,0.3)",
    textColor: "text-sky-400",
    phase: "PHASE 01",
  },
  {
    icon: Shield,
    title: "Officers Verify",
    description:
      "Flagged violations appear in a command-center dashboard. Officers review, approve, or reject each case — AI assists, doesn't replace.",
    color: "from-purple-500 to-pink-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    iconGlow: "rgba(168,85,247,0.3)",
    textColor: "text-purple-400",
    phase: "PHASE 02",
  },
  {
    icon: FileCheck,
    title: "Court-Ready Evidence",
    description:
      "Approved violations generate annotated evidence images with SHA-256 hashes, FIR PDFs, and chain-of-custody metadata — ready for challan issuance.",
    color: "from-emerald-500 to-teal-500",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    iconGlow: "rgba(52,211,153,0.3)",
    textColor: "text-emerald-400",
    phase: "PHASE 03",
  },
];

const cardVariant = (i: number): Variants => ({
  hidden: {
    opacity: 0,
    x: -30,
    scale: 0.96,
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      delay: i * 0.18,        // ← each card waits for the previous
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
});

const arrowVariant = (i: number): Variants => ({
  hidden: { opacity: 0, scaleX: 0 },
  visible: {
    opacity: 1,
    scaleX: 1,
    transition: {
      delay: i * 0.18 + 0.45, // fires after the card before it finishes
      duration: 0.4,
      ease: "easeOut",
    },
  },
});

// Animated phase line — draws from left to right
const phaseLineVariant = (i: number): Variants => ({
  hidden: { scaleX: 0 },
  visible: {
    scaleX: 1,
    transition: {
      delay: i * 0.18 + 0.2,
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
});

export default function SolutionSection() {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section
      ref={sectionRef}
      className="relative py-24 sm:py-32 bg-[#030712] overflow-hidden"
      id="solution"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-sky-950/5 to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {/* Section header */}
          <motion.div variants={staggerItem} className="text-center mb-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-400 tracking-wider uppercase mb-4">
              The Solution
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
              One System.{" "}
              <span className="bg-gradient-to-r from-sky-400 to-cyan-400 bg-clip-text text-transparent">
                Complete Enforcement.
              </span>
            </h2>
            <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
              Retrofits onto any existing CCTV camera. No hardware upgrade needed.
              Deploy across 500+ junctions in weeks, not years.
            </p>
          </motion.div>

          {/* Steps grid — all share the same whileInView trigger so delays are relative */}
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-3 gap-0 lg:gap-0 items-stretch"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            {steps.map((step, i) => (
              <div key={step.title} className="flex items-stretch">
                {/* Card */}
                <motion.div
                  variants={cardVariant(i)}
                  className="relative group flex-1"
                >
                  <div className={`h-full rounded-2xl border ${step.borderColor} ${step.bgColor} p-8 backdrop-blur-sm
                    transition-[transform,box-shadow] duration-300 ease-out
                    hover:-translate-y-1 hover:scale-[1.02]`}
                  >
                    {/* Phase label + animated line */}
                    <div className="flex items-center gap-3 mb-6">
                      <span className={`font-mono text-xs font-bold tracking-widest ${step.textColor}`}>
                        {step.phase}
                      </span>
                      <div className="flex-1 h-px bg-slate-800 overflow-hidden">
                        <motion.div
                          variants={phaseLineVariant(i)}
                          className={`h-full bg-gradient-to-r ${step.color} origin-left`}
                        />
                      </div>
                    </div>

                    {/* Icon with glow */}
                    <div className="relative mb-5 inline-flex">
                      <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${step.color}`}>
                        <step.icon className="h-6 w-6 text-white" />
                      </div>
                      {/* Glow bloom */}
                      <div
                        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-md"
                        style={{ background: step.iconGlow }}
                      />
                    </div>

                    <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{step.description}</p>

                    {/* Step number watermark */}
                    <span className="absolute bottom-5 right-6 font-mono text-5xl font-black text-slate-800/60 select-none leading-none">
                      {i + 1}
                    </span>
                  </div>
                </motion.div>

                {/* Connector arrow between cards */}
                {i < steps.length - 1 && (
                  <div className="hidden lg:flex items-center justify-center w-10 shrink-0 relative z-10">
                    <motion.div
                      variants={arrowVariant(i)}
                      className="flex flex-col items-center gap-1 origin-left"
                    >
                      {/* Dashed line */}
                      <div className="flex flex-col gap-[3px]">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <motion.div
                            key={j}
                            className="w-[2px] h-[5px] rounded-full bg-slate-600"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              delay: j * 0.15,
                            }}
                          />
                        ))}
                      </div>
                      {/* Arrowhead */}
                      <svg width="10" height="7" viewBox="0 0 10 7" fill="none">
                        <path d="M0 3.5H8M8 3.5L5 1M8 3.5L5 6" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </motion.div>
                  </div>
                )}
              </div>
            ))}
          </motion.div>

          {/* Bottom tagline */}
          <motion.div variants={staggerItem} className="mt-12 text-center">
            <p className="text-slate-600 text-xs font-mono tracking-widest uppercase">
              detect → verify → prosecute
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}