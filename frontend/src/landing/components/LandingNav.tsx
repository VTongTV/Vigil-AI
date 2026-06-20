import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ExternalLink } from "lucide-react";

const navLinks = [
  { label: "Problem", href: "#problem" },
  { label: "Solution", href: "#solution" },
  { label: "Features", href: "#features" },
  { label: "AI Engine", href: "#ai-engine" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Dashboard", href: "#dashboard" },
  { label: "Metrics", href: "#metrics" },
  { label: "Architecture", href: "#architecture" },
  { label: "Impact", href: "#impact" },
  { label: "Judges", href: "#judges" },
];

/** VigilAI brand mark — extracted from public/favicon.svg */
function VigilBrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="nav-bg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0d1117" />
          <stop offset="100%" stopColor="#0d1f2d" />
        </linearGradient>
        <linearGradient id="nav-accent" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="nav-glow" x1="24" y1="8" x2="24" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.6" />
        </linearGradient>
        <filter id="nav-glow-filter" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Background rounded square */}
      <rect width="48" height="48" rx="10" fill="url(#nav-bg)" />
      <rect width="48" height="48" rx="10" fill="none" stroke="#38bdf8" strokeWidth="0.75" strokeOpacity="0.3" />
      {/* Shield */}
      <path
        d="M24 7 L38 13 L38 25 C38 33 31 39.5 24 42 C17 39.5 10 33 10 25 L10 13 Z"
        fill="none"
        stroke="url(#nav-accent)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        filter="url(#nav-glow-filter)"
      />
      <path
        d="M24 9.5 L36 14.5 L36 25 C36 31.8 30 37.5 24 39.8 C18 37.5 12 31.8 12 25 L12 14.5 Z"
        fill="#38bdf8"
        fillOpacity="0.06"
      />
      {/* Radar rings */}
      <circle cx="24" cy="24" r="5" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.9" fill="none" />
      <circle cx="24" cy="24" r="9" stroke="#38bdf8" strokeWidth="0.6" strokeOpacity="0.5" fill="none" />
      <circle cx="24" cy="24" r="13" stroke="#38bdf8" strokeWidth="0.4" strokeOpacity="0.25" fill="none" />
      {/* Center dot */}
      <circle cx="24" cy="24" r="2.5" fill="url(#nav-glow)" filter="url(#nav-glow-filter)" />
      {/* Radar sweep line */}
      <line x1="24" y1="24" x2="33" y2="17" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.7" strokeLinecap="round" />
      {/* Crosshair ticks */}
      <line x1="24" y1="14" x2="24" y2="16" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.5" strokeLinecap="round" />
      <line x1="34" y1="24" x2="32" y2="24" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.5" strokeLinecap="round" />
      <line x1="24" y1="34" x2="24" y2="32" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.5" strokeLinecap="round" />
      <line x1="14" y1="24" x2="16" y2="24" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.5" strokeLinecap="round" />
    </svg>
  );
}

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#030712]/85 backdrop-blur-xl border-b border-sky-900/30 shadow-lg shadow-black/20"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo — actual VigilAI brand mark */}
          <a href="#hero" className="flex items-center gap-2.5 group" aria-label="VigilAI — back to top">
            <motion.div
              whileHover={{ scale: 1.08, rotate: 3 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <VigilBrandMark size={32} />
            </motion.div>
            <span className="text-base font-bold text-white tracking-tight leading-none">
              Vigil<span className="text-sky-400">AI</span>
            </span>
          </a>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-0.5">
            {navLinks.slice(0, 6).map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <a
              href="/dashboard"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-sky-500 hover:scale-[1.03] active:scale-[0.97] shadow-md shadow-sky-900/30"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Dashboard
            </a>

            {/* Mobile toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-x-0 top-16 z-40 bg-[#030712]/96 backdrop-blur-xl border-b border-slate-800/60 lg:hidden"
          >
            <div className="max-w-6xl mx-auto px-6 py-4 space-y-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <a
                href="/dashboard"
                className="block mt-3 text-center rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                Launch Dashboard
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
