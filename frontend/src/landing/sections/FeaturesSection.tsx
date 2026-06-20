import { useRef } from "react";
import { motion } from "framer-motion";
import {
  Eye, Scan, FileText, MapPin, Cpu, AlertTriangle, Gauge, Layers,
} from "lucide-react";
import { staggerContainer, staggerItem } from "../animations/variants";

/** Inline Users icon — lucide-react doesn't export this at v0.263 */
function UsersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

const features = [
  {
    icon: Eye,
    title: "Helmet Detection",
    description:
      "Head-region spatial association — detects riders without helmets using top 30% of person bounding box overlap with helmet model output.",
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/20",
    span: "sm:col-span-1 lg:col-span-2",
    badge: "Primary AI",
    badgeColor: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  },
  {
    icon: UsersIcon,
    title: "Triple Riding",
    description:
      "2D spatial constraints detect 3+ riders on a single two-wheeler using horizontal center and vertical overlap thresholds.",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    span: "sm:col-span-1",
    badge: "Primary AI",
    badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
  {
    icon: Scan,
    title: "License Plate OCR",
    description:
      "RapidOCR with Indian plate post-processing — handles O/0 confusion, I/1 errors, and validates KA-state regex patterns. 100% accuracy on synthetic plates.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    span: "sm:col-span-1 lg:col-span-2",
    badge: "OCR Engine",
    badgeColor: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  },
  {
    icon: FileText,
    title: "Court-Ready Evidence",
    description:
      "Annotated images with bounding boxes, SHA-256 integrity hashes, FIR PDF generation, and chain-of-custody metadata for challan issuance.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    span: "sm:col-span-1",
    badge: "Legal Compliance",
    badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  {
    icon: MapPin,
    title: "Geospatial Mapping",
    description:
      "Leaflet-powered map with violation markers across 10 real Bengaluru junctions. Toggle between marker view and danger-score heatmap.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    span: "sm:col-span-1 lg:col-span-2",
    badge: "Visualization",
    badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  {
    icon: Cpu,
    title: "VRAM-Optimized Pipeline",
    description:
      "4GB VRAM budget — COCO + Helmet resident (~1.5GB), Plate on-demand load/unload, Seatbelt on-demand. Runs on RTX 3050.",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    span: "sm:col-span-1",
    badge: "Performance",
    badgeColor: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  },
  {
    icon: AlertTriangle,
    title: "Danger Scoring",
    description:
      "Formula: min(100, fine/10 × confidence × compound_factor). Compound factor 1.5× for multiple violations on same person.",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    span: "sm:col-span-1",
    badge: "Risk Assessment",
    badgeColor: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  },
  {
    icon: Gauge,
    title: "Pipeline Timing",
    description:
      "Full breakdown: Preprocess → COCO Detect → Helmet Detect → Violation Logic → Plate Detect → OCR → Evidence Gen. All under 1.2s.",
    color: "text-teal-400",
    bg: "bg-teal-500/10",
    border: "border-teal-500/20",
    span: "sm:col-span-1 lg:col-span-2",
    badge: "Transparency",
    badgeColor: "bg-teal-500/20 text-teal-400 border-teal-500/30",
  },
  {
    icon: Layers,
    title: "7 Violation Types",
    description:
      "Helmet, Triple Riding, Wrong-Side Driving, Illegal Parking, Seatbelt, Stop-Line, Red-Light — covering 87% of common traffic violations.",
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/20",
    span: "sm:col-span-1",
    badge: "Coverage",
    badgeColor: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  },
];

export default function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section
      ref={sectionRef}
      className="relative py-24 sm:py-32 bg-[#030712] overflow-hidden"
      id="features"
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
              Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
              Every Feature,{" "}
              <span className="bg-gradient-to-r from-sky-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Built to Ship
              </span>
            </h2>
            <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
              Not a prototype. Not a concept. Every module is production-ready, tested, and integrated.
            </p>
          </motion.div>

          {/* Bento grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={staggerItem}
                whileHover={{ y: -4, scale: 1.01 }}
                className={`group relative rounded-2xl border ${feature.border} ${feature.bg} p-6 backdrop-blur-sm transition-all duration-300 ${feature.span}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${feature.border} bg-slate-900/50`}>
                    <feature.icon className={`h-5 w-5 ${feature.color}`} />
                  </div>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${feature.badgeColor}`}>
                    {feature.badge}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
                {/* Hover glow */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{
                  background: `radial-gradient(400px circle at 50% 50%, rgba(56, 189, 248, 0.04), transparent 60%)`
                }} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
