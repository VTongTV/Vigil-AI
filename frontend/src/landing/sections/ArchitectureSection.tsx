import { useRef } from "react";
import { motion } from "framer-motion";
import ArchitectureDiagram from "../components/ArchitectureDiagram";
import { staggerContainer, staggerItem } from "../animations/variants";

export default function ArchitectureSection() {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section
      ref={sectionRef}
      className="relative py-24 sm:py-32 bg-[#030712] overflow-hidden"
      id="architecture"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/50 to-transparent" />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {/* Section header */}
          <motion.div variants={staggerItem} className="text-center mb-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1 text-xs font-semibold text-slate-300 tracking-wider uppercase mb-4">
              Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
              Engineered for{" "}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Scale
              </span>
            </h2>
            <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
              Five-layer architecture. Every component designed for modularity, testability, and production deployment.
            </p>
          </motion.div>

          {/* Architecture diagram */}
          <motion.div
            variants={staggerItem}
            className="relative rounded-3xl border border-slate-800 bg-slate-900/50 p-6 sm:p-10 backdrop-blur-sm overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5" />
            <ArchitectureDiagram className="w-full h-auto relative z-10 max-w-2xl mx-auto" />
          </motion.div>

          {/* Tech stack badges */}
          <motion.div
            variants={staggerItem}
            className="mt-8 flex flex-wrap justify-center gap-2"
          >
            {[
              "React 18", "Vite 8", "Tailwind CSS v4", "Framer Motion",
              "FastAPI", "SQLAlchemy", "SQLite", "YOLOv8n", "RapidOCR",
              "Recharts", "Leaflet", "Zustand", "Pydantic", "ONNX Runtime"
            ].map((tech) => (
              <span
                key={tech}
                className="inline-flex items-center rounded-full border border-slate-800 bg-slate-900/50 px-3 py-1 text-xs font-medium text-slate-400"
              >
                {tech}
              </span>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
