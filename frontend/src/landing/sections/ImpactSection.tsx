import { useRef } from "react";
import { motion, type Variants } from "framer-motion";
import Globe from "../components/Globe";
import { staggerContainer, staggerItem } from "../animations/variants";

const slideInFromRight: Variants = {
  hidden: { opacity: 0, x: 60 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.12,
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
    },
  }),
};

const impacts = [
  {
    title: "Retrofit Any CCTV",
    description:
      "No hardware upgrade needed. VigilAI connects to existing CCTV feeds and adds AI enforcement capability instantly.",
    metric: "500+",
    metricLabel: "junctions ready",
    accent: "from-sky-500/20 to-sky-500/5",
    metricColor: "text-sky-400",
    borderHover: "hover:border-sky-500/30",
    glowColor: "rgba(56,189,248,0.06)",
  },
  {
    title: "City-Wide Deployment",
    description:
      "From 10 demo junctions to 500+ across Bengaluru. The system scales horizontally with each new camera feed.",
    metric: "10→500+",
    metricLabel: "junctions scaling",
    accent: "from-purple-500/20 to-purple-500/5",
    metricColor: "text-purple-400",
    borderHover: "hover:border-purple-500/30",
    glowColor: "rgba(168,85,247,0.06)",
  },
  {
    title: "Revenue Recovery",
    description:
      "₹438 Cr projected annual revenue from automated enforcement. Investment payback in under 1 week.",
    metric: "₹438 Cr",
    metricLabel: "annual projection",
    accent: "from-emerald-500/20 to-emerald-500/5",
    metricColor: "text-emerald-400",
    borderHover: "hover:border-emerald-500/30",
    glowColor: "rgba(52,211,153,0.06)",
  },
  {
    title: "Future Roadmap",
    description:
      "Video stream processing, real-time signal integration, inter-state plate recognition, and predictive congestion alerts.",
    metric: "v2.0",
    metricLabel: "next milestone",
    accent: "from-amber-500/20 to-amber-500/5",
    metricColor: "text-amber-400",
    borderHover: "hover:border-amber-500/30",
    glowColor: "rgba(251,191,36,0.06)",
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
          viewport={{ once: true, margin: "-50px" }}
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
            {/* Globe — fades in from left */}
            <motion.div
              variants={{
                hidden: { opacity: 0, x: -40 },
                visible: {
                  opacity: 1,
                  x: 0,
                  transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
                },
              }}
              className="flex justify-center"
            >
              <Globe className="w-72 h-72 sm:w-96 sm:h-96" />
            </motion.div>

            {/* Impact cards — slide in from right, staggered */}
            <div className="space-y-3">
              {impacts.map((impact, i) => (
                <motion.div
                  key={impact.title}
                  custom={i}
                  variants={slideInFromRight}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-30px" }}
                  className={`group relative rounded-xl border border-slate-800/80 bg-gradient-to-r ${impact.accent} p-5 backdrop-blur-sm overflow-hidden
                    transition-[transform,border-color] duration-200 ease-out
                    hover:translate-x-1 ${impact.borderHover}`}
                >
                  {/* Subtle left accent bar */}
                  <div className={`absolute left-0 top-4 bottom-4 w-[2px] rounded-full bg-gradient-to-b ${impact.accent} opacity-60 group-hover:opacity-100 transition-opacity duration-300`} />

                  {/* Inner glow on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-xl"
                    style={{ background: `radial-gradient(300px circle at 0% 50%, ${impact.glowColor}, transparent 70%)` }}
                  />

                  <div className="flex items-start justify-between gap-4 pl-3">
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-white mb-1 tracking-tight">
                        {impact.title}
                      </h3>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        {impact.description}
                      </p>
                    </div>

                    {/* Metric */}
                    <div className="text-right shrink-0">
                      <p className={`font-mono text-xl font-bold ${impact.metricColor} tabular-nums`}>
                        {impact.metric}
                      </p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">
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