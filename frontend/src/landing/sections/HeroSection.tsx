import { useRef } from "react";
import { motion } from "framer-motion";
import { ArrowDown, Zap, MapPin, ShieldCheck } from "lucide-react";
import TrafficFlow from "../components/TrafficFlow";
import { staggerContainer, staggerItem } from "../animations/variants";

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#030712]"
      id="hero"
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-950/50 via-[#030712] to-indigo-950/40" />
        <div className="absolute top-1/4 left-1/4 w-[480px] h-[480px] bg-sky-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      {/* Traffic flow animation */}
      <div className="absolute inset-0 opacity-25">
        <TrafficFlow className="w-full h-full" />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(56,189,248,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Radial vignette */}
      <div className="absolute inset-0 bg-radial-at-center from-transparent via-transparent to-[#030712]/60 pointer-events-none" />

      {/* Main content */}
      <motion.div
        className="relative z-10 text-center px-6 max-w-5xl mx-auto"
      >
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {/* Badge */}
          <motion.div variants={staggerItem} className="mb-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-500/10 px-4 py-1.5 text-xs font-semibold text-sky-400 tracking-widest uppercase backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" />
              </span>
              Flipkart GridLock 2.0 · Track 3
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={staggerItem}
            className="text-5xl sm:text-7xl lg:text-[5.5rem] font-extrabold tracking-tight text-white leading-[1.04]"
          >
            Smarter Traffic.{" "}
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-indigo-400 bg-clip-text text-transparent">
              Safer Cities.
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={staggerItem}
            className="mt-7 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed"
          >
            VigilAI retrofits onto any existing CCTV to detect{" "}
            <span className="text-sky-400 font-semibold">7 traffic violations</span>,
            extract license plates, and generate{" "}
            <span className="text-cyan-400 font-semibold">court-admissible evidence</span>{" "}
            — no hardware upgrade needed.
          </motion.p>

          {/* Key stats */}
          <motion.div
            variants={staggerItem}
            className="mt-10 flex flex-wrap items-center justify-center gap-6 sm:gap-12"
          >
            {[
              { icon: ShieldCheck, label: "7 Violation Types", color: "text-sky-400" },
              { icon: Zap, label: "~1.2s Latency", color: "text-cyan-400" },
              { icon: MapPin, label: "10 Bengaluru Junctions", color: "text-indigo-400" },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-slate-300">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="font-medium">{label}</span>
              </div>
            ))}
          </motion.div>

          {/* CTAs */}
          <motion.div
            variants={staggerItem}
            className="mt-12 flex flex-wrap items-center justify-center gap-4"
          >
            <a
              href="/dashboard"
              className="group relative inline-flex items-center gap-2 rounded-xl bg-sky-600 px-8 py-3.5 text-sm font-semibold text-white shadow-xl shadow-sky-600/30 transition-all hover:bg-sky-500 hover:shadow-sky-500/40 hover:scale-[1.03] active:scale-[0.97]"
            >
              <ShieldCheck className="h-4 w-4" />
              View Dashboard
              <span className="absolute inset-0 rounded-xl bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
            </a>
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-8 py-3.5 text-sm font-semibold text-slate-200 transition-all hover:border-slate-600 hover:bg-slate-800 hover:scale-[1.03] active:scale-[0.97] backdrop-blur-sm"
            >
              Explore Features
            </a>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2 }}
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <ArrowDown className="h-5 w-5 text-slate-500" />
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
