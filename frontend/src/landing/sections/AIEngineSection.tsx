import { useRef } from "react";
import { motion } from "framer-motion";
import NeuralNetwork from "../components/NeuralNetwork";
import { staggerContainer, staggerItem } from "../animations/variants";

const modelStats = [
  { label: "COCO Model",    value: "YOLOv8n",      detail: "Always resident", color: "#38bdf8" },
  { label: "Helmet Model",  value: "YOLOv8n",      detail: "Always resident", color: "#06b6d4" },
  { label: "Plate Model",   value: "YOLOv8n",      detail: "On-demand",       color: "#8b5cf6" },
  { label: "Seatbelt",      value: "Classifier",   detail: "On-demand",       color: "#f59e0b" },
  { label: "OCR Engine",    value: "RapidOCR",     detail: "CPU-only",        color: "#10b981" },
];

export default function AIEngineSection() {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section
      ref={sectionRef}
      className="relative py-24 sm:py-32 bg-[#030712] overflow-hidden"
      id="ai-engine"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-950/5 to-transparent" />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {/* Section header */}
          <motion.div variants={staggerItem} className="text-center mb-12">
            <span className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-400 tracking-wider uppercase mb-4">
              AI Engine
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
              Multi-Model{" "}
              <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Detection Pipeline
              </span>
            </h2>
            <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
              Four YOLOv8n models + RapidOCR orchestrating through a 7-stage pipeline — all optimized for 4GB VRAM.
            </p>
          </motion.div>

          {/* Neural network visualization */}
          <motion.div
            variants={staggerItem}
            className="relative rounded-3xl border border-slate-800 bg-slate-900/50 p-6 sm:p-10 backdrop-blur-sm overflow-hidden mb-12"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 via-transparent to-purple-500/5" />
            <NeuralNetwork className="w-full h-auto relative z-10" />
          </motion.div>

          {/* Model cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {modelStats.map((model) => (
              <motion.div
                key={model.label}
                variants={staggerItem}
                whileHover={{ y: -3, scale: 1.02 }}
                className="relative rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-center backdrop-blur-sm"
              >
                <div
                  className="mx-auto mb-3 h-2 w-2 rounded-full"
                  style={{ backgroundColor: model.color }}
                />
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                  {model.label}
                </p>
                <p className="mt-1 font-mono text-sm font-bold text-white">
                  {model.value}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">{model.detail}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
