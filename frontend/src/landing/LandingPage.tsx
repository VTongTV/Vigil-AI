import LandingNav from "./components/LandingNav";
import HeroSection from "./sections/HeroSection";
import ProblemSection from "./sections/ProblemSection";
import SolutionSection from "./sections/SolutionSection";
import FeaturesSection from "./sections/FeaturesSection";
import AIEngineSection from "./sections/AIEngineSection";
import HowItWorksSection from "./sections/HowItWorksSection";
import DashboardPreviewSection from "./sections/DashboardPreviewSection";
import LiveMetricsSection from "./sections/LiveMetricsSection";
import ArchitectureSection from "./sections/ArchitectureSection";
import ImpactSection from "./sections/ImpactSection";
import CTASection from "./sections/CTASection";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#030712] text-white overflow-x-hidden">
      <LandingNav />
      <main>
        <HeroSection />
        <ProblemSection />
        <SolutionSection />
        <FeaturesSection />
        <AIEngineSection />
        <HowItWorksSection />
        <DashboardPreviewSection />
        <LiveMetricsSection />
        <ArchitectureSection />
        <ImpactSection />
        <CTASection />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 bg-[#030712] py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-blue-600 flex items-center justify-center">
              <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-400">
              Vigil<span className="text-blue-400">AI</span>
            </span>
          </div>
          <p className="text-xs text-slate-600">
            Flipkart GridLock 2.0 — Round 2 — Track 3 — Bengaluru Traffic Police
          </p>
          <p className="text-xs text-slate-600">
            AI assists, doesn&apos;t replace officers.
          </p>
        </div>
      </footer>
    </div>
  );
}
