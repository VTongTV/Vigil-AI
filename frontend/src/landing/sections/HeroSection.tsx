import { useRef, useEffect, useState } from "react";
import { motion, type Variants, AnimatePresence } from "framer-motion";
import { ShieldCheck, Zap, MapPin, ArrowRight } from "lucide-react";

// ─── Violation type cycler — fixed height prevents layout shift ───────────────
const VIOLATION_TYPES = [
  "No Helmet",
  "Triple Riding",
  "Red Light Jump",
  "Illegal Parking",
  "No Seatbelt",
  "Wrong-Side Driving",
  "Stop-Line Cross",
];

function ViolationTypewriter() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % VIOLATION_TYPES.length), 2400);
    return () => clearInterval(t);
  }, []);
  return (
    // Fixed height = tallest possible string; overflow:hidden clips reflow
    <span
      className="inline-block overflow-hidden align-bottom"
      style={{ height: "1.1em", minWidth: "260px" }}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: "0%" }}
          exit={{ opacity: 0, y: "-100%" }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
          className="inline-block whitespace-nowrap bg-gradient-to-r from-sky-400 via-cyan-300 to-indigo-400 bg-clip-text text-transparent"
        >
          {VIOLATION_TYPES[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

// ─── Live counter ─────────────────────────────────────────────────────────────
function LiveCounter() {
  const [count, setCount] = useState(14823);
  useEffect(() => {
    const t = setInterval(() => setCount((c) => c + Math.floor(Math.random() * 3 + 1)), 3000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="font-mono tabular-nums text-sky-400 font-bold">
      {count.toLocaleString("en-IN")}
    </span>
  );
}

// ─── Realistic CCTV Mockup ────────────────────────────────────────────────────
const DETECTIONS = [
  { plate: "KA 05 AB 1234", type: "NO HELMET", confidence: 94, x: 22, y: 30, w: 20, h: 30, severity: "high" },
  { plate: "KA 19 N 7734", type: "TRIPLE RIDING", confidence: 88, x: 55, y: 25, w: 18, h: 34, severity: "high" },
  { plate: "KA 03 HJ 4490", type: "NO SEATBELT", confidence: 76, x: 10, y: 50, w: 16, h: 26, severity: "medium" },
];

// Noise grain canvas overlay
function GrainOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf: number;
    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      const img = ctx.createImageData(w, h);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() > 0.5 ? Math.floor(Math.random() * 40) : 0;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = v > 0 ? 60 : 0;
      }
      ctx.putImageData(img, 0, 0);
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <canvas
      ref={canvasRef}
      width={480}
      height={360}
      className="absolute inset-0 w-full h-full pointer-events-none z-20 opacity-40"
    />
  );
}

function CCTVMockup() {
  const [activeBox, setActiveBox] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [flagged, setFlagged] = useState(false);
  const [scanY, setScanY] = useState(0);
  const [time, setTime] = useState("");

  // Cycle detections
  useEffect(() => {
    const t = setInterval(() => {
      setConfidence(0);
      setFlagged(false);
      setActiveBox((i) => (i + 1) % DETECTIONS.length);
    }, 3400);
    return () => clearInterval(t);
  }, []);

  // Confidence count-up
  useEffect(() => {
    setConfidence(0);
    setFlagged(false);
    let val = 0;
    const target = DETECTIONS[activeBox].confidence;
    const t = setInterval(() => {
      val += 4;
      if (val >= target) { setConfidence(target); setFlagged(true); clearInterval(t); }
      else setConfidence(val);
    }, 25);
    return () => clearInterval(t);
  }, [activeBox]);

  // Scanline
  useEffect(() => {
    let y = 0;
    const t = setInterval(() => { y = (y + 0.8) % 100; setScanY(y); }, 16);
    return () => clearInterval(t);
  }, []);

  // Real-time timestamp burn-in
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleString("en-GB", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    }).replace(",", ""));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const det = DETECTIONS[activeBox];

  // Vehicles — overhead perspective rectangles in greenish-grey CCTV tones
  const vehicles = [
    { x: 20, y: 28, w: 9, h: 15, shade: "#3a4a3a" },
    { x: 52, y: 22, w: 11, h: 17, shade: "#2e3e2e" },
    { x: 8, y: 47, w: 14, h: 9, shade: "#354535" },
    { x: 70, y: 58, w: 10, h: 14, shade: "#303e30" },
    { x: 37, y: 63, w: 12, h: 9, shade: "#2a3a2a" },
    { x: 60, y: 68, w: 8, h: 12, shade: "#3d4d3d" },
    { x: 28, y: 72, w: 6, h: 10, shade: "#283828" },
  ];

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg select-none"
      style={{
        aspectRatio: "4/3",
        background: "#0a120a",
        // Phosphor green tint overall
        filter: "saturate(0.6) sepia(0.15)",
        boxShadow: "0 0 0 1px rgba(120,180,120,0.15), 0 0 30px rgba(56,189,100,0.06)",
      }}
    >
      {/* Road surface — dark greenish asphalt */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, #0d1a0d 0%, #111a11 50%, #0a120a 100%)" }} />

      {/* Road markings — horizontal and vertical roads */}
      <div className="absolute" style={{ top: "42%", left: 0, right: 0, height: "16%", background: "rgba(30,50,30,0.7)" }} />
      <div className="absolute" style={{ left: "42%", top: 0, bottom: 0, width: "16%", background: "rgba(30,50,30,0.7)" }} />

      {/* Lane dashes */}
      {[15, 30, 62, 78].map((x) => (
        <div key={x} className="absolute" style={{
          left: `${x}%`, top: "49%", width: "5%", height: "2%",
          background: "rgba(100,140,100,0.25)", borderRadius: 1,
        }} />
      ))}
      {[15, 30, 62, 78].map((y) => (
        <div key={y} className="absolute" style={{
          top: `${y}%`, left: "49%", width: "2%", height: "4%",
          background: "rgba(100,140,100,0.25)", borderRadius: 1,
        }} />
      ))}

      {/* Vehicles */}
      {vehicles.map((v, i) => (
        <div key={i} className="absolute rounded-[2px]" style={{
          left: `${v.x}%`, top: `${v.y}%`,
          width: `${v.w}%`, height: `${v.h}%`,
          background: v.shade,
          border: "1px solid rgba(100,140,100,0.12)",
          boxShadow: "0 2px 4px rgba(0,0,0,0.6)",
        }}>
          {/* Windshield glint */}
          <div className="absolute top-[15%] left-[15%] right-[15%] h-[20%] rounded-[1px]"
            style={{ background: "rgba(120,160,120,0.15)" }} />
        </div>
      ))}

      {/* Bounding boxes */}
      {DETECTIONS.map((d, i) => {
        const isActive = i === activeBox;
        const color = d.severity === "high" ? "#00ff41" : "#ffcc00";
        return (
          <div key={i} className="absolute pointer-events-none transition-opacity duration-500"
            style={{ left: `${d.x}%`, top: `${d.y}%`, width: `${d.w}%`, height: `${d.h}%`, opacity: isActive ? 1 : 0.2 }}>
            {/* Main box */}
            <div className="absolute inset-0" style={{
              border: `1.5px solid ${color}`,
              boxShadow: isActive ? `0 0 6px ${color}55, inset 0 0 6px ${color}11` : "none",
            }} />
            {/* Corner ticks */}
            {[
              "top-0 left-0 border-t-2 border-l-2",
              "top-0 right-0 border-t-2 border-r-2",
              "bottom-0 left-0 border-b-2 border-l-2",
              "bottom-0 right-0 border-b-2 border-r-2",
            ].map((cls, j) => (
              <div key={j} className={`absolute h-2 w-2 ${cls}`} style={{ borderColor: color }} />
            ))}
            {/* Plate tag */}
            <div className="absolute -top-[18px] left-0 font-mono text-[8px] font-bold px-1 py-[1px] whitespace-nowrap"
              style={{ background: isActive ? color : "rgba(80,80,80,0.8)", color: isActive ? "#000" : "#aaa" }}>
              {d.plate}
            </div>
          </div>
        );
      })}

      {/* Scanline sweep — single bright line */}
      <div className="absolute left-0 right-0 h-[2px] pointer-events-none z-10"
        style={{
          top: `${scanY}%`,
          background: "linear-gradient(90deg, transparent 0%, rgba(100,200,100,0.25) 30%, rgba(100,200,100,0.5) 50%, rgba(100,200,100,0.25) 70%, transparent 100%)",
          boxShadow: "0 0 6px rgba(100,200,100,0.2)",
        }}
      />

      {/* CRT horizontal scanline texture */}
      <div className="absolute inset-0 pointer-events-none z-10 opacity-[0.06]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,1) 3px, rgba(0,0,0,1) 4px)" }}
      />

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none z-10"
        style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,10,0,0.75) 100%)" }}
      />

      {/* Grain */}
      <GrainOverlay />

      {/* ── HUD: top-left — cam info ── */}
      <div className="absolute top-0 left-0 right-0 z-30 px-2 pt-2 flex items-start justify-between pointer-events-none">
        <div>
          <p className="font-mono text-[9px] leading-tight" style={{ color: "#a0e0a0", textShadow: "0 0 4px #00ff4155" }}>
            CAM-04 · SILK BOARD JN
          </p>
          <p className="font-mono text-[8px]" style={{ color: "#60a060" }}>
            BBMP/TRAFFIC · CH:04
          </p>
        </div>
        {/* REC dot */}
        <div className="flex items-center gap-1.5">
          <motion.div
            animate={{ opacity: [1, 0.1, 1] }}
            transition={{ duration: 1.1, repeat: Infinity }}
            className="h-2 w-2 rounded-full"
            style={{ background: "#ff3333", boxShadow: "0 0 5px #ff333388" }}
          />
          <span className="font-mono text-[9px] font-bold" style={{ color: "#ff6666" }}>REC</span>
        </div>
      </div>

      {/* ── HUD: bottom — timestamp + detection ── */}
      <div className="absolute bottom-0 left-0 right-0 z-30 px-2 pb-2 pointer-events-none">
        {/* Timestamp burn-in */}
        <p className="font-mono text-[9px] mb-2" style={{ color: "#80c880", textShadow: "0 0 3px #00ff4133" }}>
          {time}
        </p>

        {/* Detection readout */}
        <div className="flex items-end justify-between gap-2">
          <div>
            <AnimatePresence mode="wait">
              {flagged && (
                <motion.div
                  key="flag"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="font-mono text-[9px] font-bold mb-1 px-1 py-0.5 inline-block"
                  style={{
                    color: "#000",
                    background: "#00ff41",
                    boxShadow: "0 0 8px #00ff4188",
                    letterSpacing: "0.1em",
                  }}
                >
                  ▶ VIOLATION DETECTED
                </motion.div>
              )}
            </AnimatePresence>
            <p className="font-mono text-[10px] font-bold" style={{ color: "#00ff41", textShadow: "0 0 4px #00ff4166" }}>
              {det.type}
            </p>
            <p className="font-mono text-[8px]" style={{ color: "#50a050" }}>{det.plate}</p>
          </div>

          {/* Confidence */}
          <div className="text-right min-w-[72px]">
            <p className="font-mono text-[8px] mb-1" style={{ color: "#60a060" }}>CONF</p>
            <div className="h-[3px] w-full rounded-none mb-1 overflow-hidden" style={{ background: "#1a2e1a" }}>
              <div className="h-full transition-all duration-75"
                style={{ width: `${confidence}%`, background: confidence > 80 ? "#00ff41" : "#ffcc00", boxShadow: `0 0 4px ${confidence > 80 ? "#00ff4188" : "#ffcc0088"}` }} />
            </div>
            <p className="font-mono text-[11px] font-bold tabular-nums" style={{ color: "#00ff41", textShadow: "0 0 4px #00ff4166" }}>
              {confidence}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Fade-up variants ─────────────────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: {
      delay: i * 0.11,
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  }),
};

const cameraFadeIn: Variants = {
  hidden: { opacity: 0, x: 36, scale: 0.97 },
  visible: {
    opacity: 1, x: 0, scale: 1,
    transition: { delay: 0.25, duration: 0.8, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

// ─── Hero ─────────────────────────────────────────────────────────────────────
export default function HeroSection() {
  return (
    <section
      className="relative overflow-hidden bg-[#030712]"
      id="hero"
      // pt-16 accounts for fixed nav height (adjust if your nav is taller/shorter)
      style={{ minHeight: "100svh", paddingTop: "4rem" }}
    >
      {/* Background glows — restrained, single axis */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-500/25 to-transparent" />
        <div className="absolute top-1/3 -left-20 w-[480px] h-[480px] rounded-full bg-sky-600/5 blur-[130px]" />
        <div className="absolute bottom-1/4 right-0 w-56 h-56 rounded-full bg-indigo-600/7 blur-[80px]" />
      </div>

      {/* Grid */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(56,189,248,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.6) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 flex items-center"
        style={{ minHeight: "calc(100svh - 4rem)" }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center w-full py-16 lg:py-0">

          {/* ── Left ── */}
          <div>
            <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible" className="mb-7">
              <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/8 px-3 py-1 text-xs font-semibold text-sky-400 tracking-widest uppercase backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" />
                </span>
                Flipkart GridLock 2.0 · Track 3
              </span>
            </motion.div>

            <motion.h1
              custom={1} variants={fadeUp} initial="hidden" animate="visible"
              className="text-4xl sm:text-5xl lg:text-[3.4rem] font-extrabold tracking-tight text-white leading-[1.07]"
            >
              AI that flags
              <br />
              <ViolationTypewriter />
              <br />
              <span className="text-slate-400 font-semibold text-2xl sm:text-3xl lg:text-[2rem] leading-snug">
                before it becomes a statistic.
              </span>
            </motion.h1>

            <motion.p
              custom={2} variants={fadeUp} initial="hidden" animate="visible"
              className="mt-6 text-base sm:text-lg text-slate-400 leading-relaxed max-w-lg"
            >
              VigilAI retrofits onto any existing CCTV — no hardware, no downtime.
              Detects violations, reads plates, and generates{" "}
              <span className="text-slate-200 font-medium">court-admissible evidence</span>{" "}
              in under 1.2 seconds.
            </motion.p>

            {/* Live counter */}
            <motion.div
              custom={3} variants={fadeUp} initial="hidden" animate="visible"
              className="mt-6 inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-2"
            >
              <motion.div
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="h-1.5 w-1.5 rounded-full bg-emerald-500"
              />
              <span className="text-sm text-slate-400">
                <LiveCounter /> violations processed today
              </span>
            </motion.div>

            {/* Stats */}
            <motion.div
              custom={4} variants={fadeUp} initial="hidden" animate="visible"
              className="mt-8 flex flex-wrap gap-5"
            >
              {[
                { icon: ShieldCheck, label: "7 violation types", color: "text-sky-400" },
                { icon: Zap, label: "~1.2s latency", color: "text-cyan-400" },
                { icon: MapPin, label: "10 junctions live", color: "text-indigo-400" },
              ].map(({ icon: Icon, label, color }) => (
                <div key={label} className="flex items-center gap-2 text-sm text-slate-300">
                  <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                  <span className="font-medium">{label}</span>
                </div>
              ))}
            </motion.div>

            {/* CTAs */}
            <motion.div
              custom={5} variants={fadeUp} initial="hidden" animate="visible"
              className="mt-10 flex flex-wrap gap-3"
            >
              <a href="/dashboard"
                className="group relative inline-flex items-center gap-2 rounded-xl bg-sky-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-600/25
                  transition-[transform,box-shadow] duration-200 hover:bg-sky-500 hover:shadow-sky-500/35 hover:scale-[1.02] active:scale-[0.98]">
                <ShieldCheck className="h-4 w-4" />
                Open Dashboard
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </a>
              <a href="#features"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/40 px-7 py-3 text-sm font-semibold text-slate-300
                  transition-[transform,border-color,background] duration-200 hover:border-slate-600 hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] backdrop-blur-sm">
                Explore Features
              </a>
            </motion.div>
          </div>

          {/* ── Right: CCTV ── */}
          <motion.div
            variants={cameraFadeIn} initial="hidden" animate="visible"
            className="relative"
          >
            {/* Outer glow */}
            <div className="absolute -inset-3 rounded-xl pointer-events-none"
              style={{ background: "radial-gradient(ellipse at center, rgba(0,255,65,0.04), transparent 70%)" }}
            />

            {/* Camera selector row */}
            <div className="flex items-center justify-between mb-2 px-0.5">
              <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">Live Detection Feed</span>
              <div className="flex items-center gap-3">
                {[{ id: "CAM-02", active: false }, { id: "CAM-04", active: true }, { id: "CAM-07", active: false }].map((cam) => (
                  <div key={cam.id} className="flex items-center gap-1">
                    <div className={`h-1.5 w-1.5 rounded-full ${cam.active ? "bg-emerald-500" : "bg-slate-700"}`} />
                    <span className={`font-mono text-[9px] ${cam.active ? "text-slate-400" : "text-slate-600"}`}>{cam.id}</span>
                  </div>
                ))}
              </div>
            </div>

            <CCTVMockup />

            {/* Pipeline strip */}
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {[
                { label: "Detect", ms: "0.31s" },
                { label: "Plate", ms: "0.44s" },
                { label: "OCR", ms: "0.27s" },
                { label: "Evidence", ms: "0.18s" },
              ].map((step) => (
                <div key={step.label} className="rounded-lg border border-slate-800 bg-slate-900/50 px-2 py-1.5 text-center">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/70" />
                    <span className="text-[8px] text-slate-500 font-medium">{step.label}</span>
                  </div>
                  <span className="font-mono text-[9px] text-slate-600">{step.ms}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.6 }}
      >
        <span className="font-mono text-[10px] text-slate-600 uppercase tracking-widest">Scroll</span>
        <div className="relative h-8 w-5 rounded-full border border-slate-700 flex items-start justify-center pt-1.5">
          <motion.div
            className="h-1.5 w-1.5 rounded-full bg-sky-500"
            animate={{ y: [0, 10, 0], opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    </section>
  );
}