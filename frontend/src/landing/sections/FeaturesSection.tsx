import { useRef } from "react";
import { motion, type Variants } from "framer-motion";
import {
  Eye, Scan, FileText, MapPin, Cpu, AlertTriangle, Gauge, Layers,
} from "lucide-react";
import { staggerContainer, staggerItem } from "../animations/variants";

function UsersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

// Each card slides in from a different direction for a "materialising grid" effect
const directions = [
  { x: -40, y: 0 },  // left
  { x: 0, y: -40 }, // top
  { x: 40, y: 0 },   // right
  { x: 0, y: 40 },  // bottom
  { x: -40, y: 0 },
  { x: 0, y: 40 },
  { x: 40, y: 0 },
  { x: 0, y: -40 },
  { x: -40, y: 0 },
];

const cardVariant = (i: number): Variants => ({
  hidden: {
    opacity: 0,
    x: directions[i % directions.length].x,
    y: directions[i % directions.length].y,
  },
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
});

// Scanning line that sweeps across on grid entry
const scanLine: Variants = {
  hidden: { scaleX: 0, opacity: 1 },
  visible: {
    scaleX: 1,
    opacity: 0,
    transition: {
      scaleX: { duration: 1.2, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
      opacity: { duration: 0.4, delay: 1.0 },
    },
  },
};

const features = [
  {
    icon: Eye,
    title: "Helmet Detection",
    description: "Head-region spatial association — detects riders without helmets using top 30% of person bounding box overlap with helmet model output.",
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/20",
    glow: "rgba(56,189,248,0.08)",
    span: "sm:col-span-1 lg:col-span-2",
    badge: "Primary AI",
    badgeColor: "bg-sky-500/20 text-sky-400 border-sky-500/30",
    accentBar: "from-sky-500 to-sky-400",
  },
  {
    icon: UsersIcon,
    title: "Triple Riding",
    description: "2D spatial constraints detect 3+ riders on a single two-wheeler using horizontal center and vertical overlap thresholds.",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    glow: "rgba(168,85,247,0.08)",
    span: "sm:col-span-1",
    badge: "Primary AI",
    badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    accentBar: "from-purple-500 to-purple-400",
  },
  {
    icon: Scan,
    title: "License Plate OCR",
    description: "RapidOCR with Indian plate post-processing — handles O/0 confusion, I/1 errors, and validates KA-state regex patterns. 100% accuracy on synthetic plates.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    glow: "rgba(34,211,238,0.08)",
    span: "sm:col-span-1 lg:col-span-2",
    badge: "OCR Engine",
    badgeColor: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    accentBar: "from-cyan-500 to-cyan-400",
  },
  {
    icon: FileText,
    title: "Court-Ready Evidence",
    description: "Annotated images with bounding boxes, SHA-256 integrity hashes, FIR PDF generation, and chain-of-custody metadata for challan issuance.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    glow: "rgba(52,211,153,0.08)",
    span: "sm:col-span-1",
    badge: "Legal",
    badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    accentBar: "from-emerald-500 to-emerald-400",
  },
  {
    icon: MapPin,
    title: "Geospatial Mapping",
    description: "Leaflet-powered map with violation markers across 10 real Bengaluru junctions. Toggle between marker view and danger-score heatmap.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    glow: "rgba(251,191,36,0.08)",
    span: "sm:col-span-1 lg:col-span-2",
    badge: "Visualization",
    badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    accentBar: "from-amber-500 to-amber-400",
  },
  {
    icon: Cpu,
    title: "VRAM-Optimized Pipeline",
    description: "4GB VRAM budget — COCO + Helmet resident (~1.5GB), Plate on-demand load/unload, Seatbelt on-demand. Runs on RTX 3050.",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    glow: "rgba(251,113,133,0.08)",
    span: "sm:col-span-1",
    badge: "Performance",
    badgeColor: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    accentBar: "from-rose-500 to-rose-400",
  },
  {
    icon: AlertTriangle,
    title: "Danger Scoring",
    description: "Formula: min(100, fine/10 × confidence × compound_factor). Compound factor 1.5× for multiple violations on same person.",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    glow: "rgba(251,146,60,0.08)",
    span: "sm:col-span-1",
    badge: "Risk",
    badgeColor: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    accentBar: "from-orange-500 to-orange-400",
  },
  {
    icon: Gauge,
    title: "Pipeline Timing",
    description: "Full breakdown: Preprocess → COCO Detect → Helmet Detect → Violation Logic → Plate Detect → OCR → Evidence Gen. All under 1.2s.",
    color: "text-teal-400",
    bg: "bg-teal-500/10",
    border: "border-teal-500/20",
    glow: "rgba(45,212,191,0.08)",
    span: "sm:col-span-1 lg:col-span-2",
    badge: "Transparency",
    badgeColor: "bg-teal-500/20 text-teal-400 border-teal-500/30",
    accentBar: "from-teal-500 to-teal-400",
  },
  {
    icon: Layers,
    title: "7 Violation Types",
    description: "Helmet, Triple Riding, Wrong-Side Driving, Illegal Parking, Seatbelt, Stop-Line, Red-Light — covering 87% of common traffic violations.",
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/20",
    glow: "rgba(129,140,248,0.08)",
    span: "sm:col-span-2 lg:col-span-2",
    badge: "Coverage",
    badgeColor: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    accentBar: "from-indigo-500 to-indigo-400",
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
      {/* Ambient background grid */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(148,163,184,1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(148,163,184,1) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#030712] via-transparent to-[#030712]" />

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

          {/* Bento grid with scanning line overlay */}
          <div className="relative">

            {/* Signature element: horizontal scan line that sweeps the grid on entry */}
            <motion.div
              variants={scanLine}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px origin-left pointer-events-none z-20"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(56,189,248,0.8) 30%, rgba(168,85,247,0.8) 70%, transparent)",
                boxShadow: "0 0 12px 2px rgba(56,189,248,0.4)",
              }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  custom={i}
                  variants={cardVariant(i)}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-40px" }}
                  className={`
                    group relative rounded-2xl border ${feature.border} ${feature.bg} p-6
                    backdrop-blur-sm overflow-hidden ${feature.span} min-h-[200px]
                    transition-[transform,box-shadow] duration-300 ease-out
                    hover:-translate-y-1 hover:scale-[1.01]
                  `}
                >
                  {/* Top accent line — grows in width on hover */}
                  <div className={`absolute top-0 left-6 right-6 h-[1.5px] rounded-full bg-gradient-to-r ${feature.accentBar} opacity-0 group-hover:opacity-100 scale-x-0 group-hover:scale-x-100 origin-left transition-all duration-500`} />

                  {/* Corner chip — decorative index number */}
                  <span className="absolute bottom-4 right-5 font-mono text-[11px] font-bold text-slate-700 select-none tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <div className="flex items-start justify-between mb-4">
                    {/* Icon with subtle ring on hover */}
                    <div className={`
                      inline-flex h-10 w-10 items-center justify-center rounded-xl
                      border ${feature.border} bg-slate-900/50
                      transition-[box-shadow] duration-300
                      group-hover:shadow-[0_0_14px_2px_${feature.glow}]
                    `}>
                      <feature.icon className={`h-5 w-5 ${feature.color}`} />
                    </div>

                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${feature.badgeColor}`}>
                      {feature.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-2 tracking-tight leading-snug">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed pr-4">
                    {feature.description}
                  </p>

                  {/* Radial glow from cursor — approximated via center glow on hover */}
                  <div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ background: `radial-gradient(300px circle at 30% 40%, ${feature.glow}, transparent 70%)` }}
                  />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Bottom count line */}
          <motion.div variants={staggerItem} className="mt-10 flex items-center justify-center gap-3">
            <div className="h-px flex-1 max-w-[120px] bg-gradient-to-r from-transparent to-slate-700" />
            <p className="text-xs text-slate-600 font-mono tracking-widest uppercase">
              9 modules · 7 violation types · 1 pipeline
            </p>
            <div className="h-px flex-1 max-w-[120px] bg-gradient-to-l from-transparent to-slate-700" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}