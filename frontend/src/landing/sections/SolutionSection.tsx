import { useRef } from "react";
import { motion } from "framer-motion";
import { Shield, Cpu, FileCheck, ArrowRight } from "lucide-react";
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
  },
  {
    icon: Shield,
    title: "Officers Verify",
    description:
      "Flagged violations appear in a command-center dashboard. Officers review, approve, or reject each case — AI assists, doesn't replace.",
    color: "from-purple-500 to-pink-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
  },
  {
    icon: FileCheck,
    title: "Court-Ready Evidence",
    description:
      "Approved violations generate annotated evidence images with SHA-256 hashes, FIR PDFs, and chain-of-custody metadata — ready for challan issuance.",
    color: "from-emerald-500 to-teal-500",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
  },
];

export default function SolutionSection() {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section
      ref={sectionRef}
      className="relative py-24 sm:py-32 bg-[#030712] overflow-hidden"
      id="solution"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-sky-950/5 to-transparent" />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
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

          {/* Steps */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                variants={staggerItem}
                whileHover={{ y: -6, scale: 1.02 }}
                className="relative group"
              >
                {/* Connector arrow (desktop) */}
                {i < steps.length - 1 && (
                  <div className="hidden lg:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10">
                    <ArrowRight className="h-5 w-5 text-slate-600" />
                  </div>
                )}

                <div className={`h-full rounded-2xl border ${step.borderColor} ${step.bgColor} p-8 backdrop-blur-sm transition-all duration-300 group-hover:shadow-lg group-hover:shadow-sky-500/5`}>
                  <div className="flex items-center gap-3 mb-6">
                    <span className="font-mono text-xs text-slate-500 tracking-wider">
                      PHASE {i + 1}
                    </span>
                    <div className="flex-1 h-px bg-slate-800" />
                  </div>

                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${step.color} mb-5`}>
                    <step.icon className="h-6 w-6 text-white" />
                  </div>

                  <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
