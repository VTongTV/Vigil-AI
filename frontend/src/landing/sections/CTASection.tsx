import { useRef } from "react";
import { motion } from "framer-motion";
import { Eye, ArrowRight } from "lucide-react";
import { staggerContainer, staggerItem } from "../animations/variants";

export default function CTASection() {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section
      ref={sectionRef}
      className="relative py-24 sm:py-40 bg-[#030712] overflow-hidden"
      id="cta"
    >
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-950/10 to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {/* Headline */}
          <motion.h2
            variants={staggerItem}
            className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white tracking-tight leading-[1.1]"
          >
            Ready to Make{" "}
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Cities Safer
            </span>
            ?
          </motion.h2>

          <motion.p
            variants={staggerItem}
            className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed"
          >
            VigilAI is not just a hackathon project. It&apos;s a production-ready system
            that can transform traffic enforcement across India.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={staggerItem}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <a
              href="/dashboard"
              className="group relative inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Eye className="h-5 w-5" />
              Launch Dashboard
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              <span className="absolute inset-0 rounded-xl bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
            </a>
            <a
              href="#hero"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-8 py-4 text-base font-semibold text-slate-200 transition-all hover:border-slate-600 hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] backdrop-blur-sm"
            >
              Back to Top
            </a>
          </motion.div>

          {/* Bottom tag */}
          <motion.div
            variants={staggerItem}
            className="mt-16"
          >
            <p className="text-xs text-slate-600">
              Built for Flipkart GridLock 2.0 — Round 2 — Track 3
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Bengaluru Traffic Police × AI Enforcement
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
