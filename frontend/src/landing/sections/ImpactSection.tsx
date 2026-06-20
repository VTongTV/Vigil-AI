import { useRef } from "react";
import { motion } from "framer-motion";
import Globe from "../components/Globe";
import { staggerContainer, staggerItem } from "../animations/variants";

const impacts = [
  {
    title: "Retrofit Any CCTV",
    description: "No hardware upgrade needed. VigilAI connects to existing CCTV feeds and adds AI enforcement capability instantly.",
    metric: "500+",
    metricLabel: "junctions ready",
  },
  {
    title: "City-Wide Deployment",
    description: "From 10 demo junctions to 500+ across Bengaluru. The system scales horizontally with each new camera feed.",
    metric: "10→500+",
    metricLabel: "junctions scaling",
  },
  {
    title: "Revenue Recovery",
    description: "₹438 Cr projected annual revenue from automated enforcement. Investment payback in under 1 week.",
    metric: "₹438 Cr",
    metricLabel: "annual projection",
  },
  {
    title: "Future Roadmap",
    description: "Video stream processing, real-time signal integration, inter-state plate recognition, and predictive congestion alerts.",
    metric: "v2.0",
    metricLabel: "next milestone",
  },
];

export default function ImpactSection() {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section
      ref={sectionRef}
      className="relative py-24 sm:py-32 bg-[#030712] overflow-hidden"
      id="impact"
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
              Impact
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
              From Bengaluru to{" "}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Every City
              </span>
            </h2>
            <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
              Built for Bengaluru. Designed for India. Ready for the world.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Globe */}
            <motion.div
              variants={staggerItem}
              className="flex justify-center"
            >
              <Globe className="w-72 h-72 sm:w-96 sm:h-96" />
            </motion.div>

            {/* Impact cards */}
            <div className="space-y-4">
              {impacts.map((impact) => (
                <motion.div
                  key={impact.title}
                  variants={staggerItem}
                  whileHover={{ x: 4 }}
                  className="group rounded-xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-sm transition-all duration-300 hover:border-blue-500/30"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-white mb-1">
                        {impact.title}
                      </h3>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        {impact.description}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-lg font-bold text-blue-400">
                        {impact.metric}
                      </p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                        {impact.metricLabel}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
