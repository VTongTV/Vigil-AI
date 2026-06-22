/**
 * Synthetic Edge-Case Generator page — LLM-guided diffusion pipeline demo.
 *
 * Showcases how an LLM generates edge-case prompts that feed into a diffusion
 * model to create synthetic training images for rare traffic scenarios.
 *
 * Design: "AI Training Data Lab" — dark synthetic-data aesthetic.
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Wand2, Sparkles, Image, Type, ChevronRight, Loader2, Zap, Layers, Play } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VIOLATION_LABELS, VIOLATION_COLORS } from "@/types/violation";
import type { ViolationType } from "@/types/violation";

/** Preset data — each entry pairs an LLM-generated edge-case prompt with a demo output image. */
interface GeneratorPreset {
  id: string;
  label: string;
  violationType: ViolationType;
  llmPrompt: string;
  outputImage: string;
}

const GENERATOR_PRESETS: GeneratorPreset[] = [
  {
    id: "afternoon-helmet",
    label: "Afternoon Rush — No Helmet",
    violationType: "no_helmet",
    llmPrompt: "A busy Bengaluru commercial street during afternoon peak traffic. A man riding a dark blue TVS Jupiter scooter without a helmet, viewed from behind through an elevated CCTV camera. He wears a blue long-sleeve shirt, short dark hair visible. Mixed traffic includes green-yellow auto-rickshaws, other motorcyclists (some helmeted for contrast), and pedestrians. Worn patched asphalt road with Kannada and English shop signage. Overhead power lines, warm afternoon light with slight CCTV overexposure.",
    outputImage: "/demo/demo_no_helmet_mgroad-01.jpg",
  },
  {
    id: "overcast-helmet",
    label: "Overcast Highway — Helmetless Backpack",
    violationType: "no_helmet",
    llmPrompt: "An elevated CCTV camera (CAM-04 SOUTH BOUND) overlooking a wide divided arterial road in Bengaluru on an overcast day. A man without helmet rides a dark blue commuter motorcycle in side profile, wearing a blue camouflage t-shirt and black backpack. Wet road surface suggests recent rain. A nearby rider wearing a white helmet provides contrast. Green-yellow auto-rickshaws and cars in background. Central road divider with trees, modern buildings on the right side.",
    outputImage: "/demo/demo_no_helmet_hebbal-01.jpg",
  },
  {
    id: "junction-triple",
    label: "Junction Gridlock — Family Triple Riding",
    violationType: "triple_riding",
    llmPrompt: "Overhead CCTV traffic camera at Marathahalli Bridge, Bengaluru. Three people on a red Honda Activa scooter — a family with no helmets. Male driver, female passenger in pink clothing with scarf, and a third person squeezed between. Metro rail overpass above, shops visible including AXIS BANK ATM and BIRYANI PARADISE. Road signs showing WHITEFIELD 6KM and KORAMANGALA 7KM. BMTC bus and auto-rickshaw in traffic. Professional CCTV overlay with REC indicator and camera ID. Overcast day with wet road patches.",
    outputImage: "/demo/demo_triple_riding_marathahalli-01.jpg",
  },
  {
    id: "child-footboard",
    label: "Child on Footboard — Triple Riding",
    violationType: "triple_riding",
    llmPrompt: "CCTV traffic camera photograph of a family of three on a black Honda Activa scooter in Bengaluru. Male driver wears a blue helmet and striped polo shirt, a young boy in red shirt stands on the scooter footboard between the driver's legs, and a woman in a green-yellow printed sari sits on the rear seat carrying a cloth bag. Only the driver wears a helmet — child and woman are unprotected. Yellow-green auto-rickshaws and other motorcycles in adjacent lanes. Black-yellow painted road divider. Shops with closed shutters in background. Afternoon traffic, left-hand traffic flow.",
    outputImage: "/demo/demo_triple_riding_whitefield-01.jpg",
  },
  {
    id: "one-way-suv",
    label: "One-Way Violation — Wrong Side SUV",
    violationType: "wrong_side_driving",
    llmPrompt: "Elevated CCTV traffic camera photograph of a white Mahindra TUV300 SUV driving on the wrong side of a divided highway in Bengaluru. The vehicle approaches head-on toward the camera in the wrong lane. A prominent 'ONE WAY' traffic sign with upward arrow is visible on the right, making the violation immediately obvious. Concrete jersey barrier divides the road. A BMTC bus and motorcycle travel on the correct side of the divider. Multi-lane divided highway with concrete surface and yellow edge markings. Overcast sky, greenery growing along the barrier. Timestamp and camera ID overlays.",
    outputImage: "/demo/demo_wrong_side_driving_bannerghatta-01.jpg",
  },
  {
    id: "suburban-autorickshaw",
    label: "Suburban Wrong-Way — Auto-Rickshaw",
    violationType: "wrong_side_driving",
    llmPrompt: "CCTV traffic camera photograph of a red and black Piaggio RE auto-rickshaw driving on the wrong side of a two-lane urban road in Yelahanka New Town, Bengaluru. Yellow commercial license plate clearly visible. The auto-rickshaw is the only vehicle going against traffic flow. Multiple motorcycles and scooters approach from the correct direction. A white Maruti Swift and blue Mahindra Bolero are parked on the right side. Three young men stand on the left sidewalk near a red Kannada signboard. Small shops, trees, and tangled overhead electrical wires. No physical road divider — only a painted white center line. Overcast daylight, residential streetscape.",
    outputImage: "/demo/demo_wrong_side_driving_yelahanka-01.jpg",
  },
  {
    id: "no-parking-car",
    label: "No-Parking Zone — Diagonal Parked Car",
    violationType: "illegal_parking",
    llmPrompt: "Photorealistic CCTV traffic camera image of a Bengaluru street. A white Maruti Suzuki Swift with license plate KA 01 AB 1001 is parked illegally on yellow hatched road markings — a clearly demarcated no-parking zone. The car is positioned diagonally across the chevron-patterned yellow lines, partially encroaching on the pedestrian walkway. A blue circular no-parking sign is visible on a pole nearby. Busy Indian urban street with motorcycles, scooters, green-yellow auto-rickshaws, and pedestrians on the sidewalk. Shops with Kannada script signage. Afternoon daylight, slightly elevated CCTV camera perspective.",
    outputImage: "/demo/demo_illegal_parking_kormangala-01.jpg",
  },
  {
    id: "red-light-suv",
    label: "Red Light Jump — Intersection Crossing",
    violationType: "red_light_violation",
    llmPrompt: "Photorealistic CCTV traffic camera image of a Bengaluru intersection. A white Hyundai Creta SUV with license plate KA03 RL 6052 is running a red light, crossing through the intersection zebra-crosswalk area while the traffic signal in the left foreground shows a bright RED light. A KSRTC city bus, blue Maruti Suzuki Swift, yellow-black auto-rickshaw, and a motorcyclist are visible in background. Indian shops with 'AJANTHA MOBILES' and 'UDUPI HOTEL' signage. Pedestrians standing at the crosswalk. Daylight, busy urban intersection. Professional CCTV overlay with BTP camera ID and timestamp.",
    outputImage: "/demo/demo_red_light_violation_silkboard-01.jpg",
  },
];

/** Pipeline stages with icons. */
const PIPELINE_STEPS = [
  { key: "preset", label: "Preset Scenario", icon: Layers },
  { key: "llm", label: "LLM Edge-Case Prompt", icon: Type },
  { key: "diffusion", label: "Diffusion Model", icon: Sparkles },
  { key: "output", label: "Synthetic Training Image", icon: Image },
] as const;
type PipelineStepKey = (typeof PIPELINE_STEPS)[number]["key"];

/** Typing animation hook — reveals text character by character. */
function useTypingAnimation(text: string, speed: number = 18, active: boolean): string {
  const [displayed, setDisplayed] = useState("");
  const indexRef = useRef(0);
  useEffect(() => {
    if (!active) { setDisplayed(text); indexRef.current = text.length; return; }
    setDisplayed(""); indexRef.current = 0;
    const id = setInterval(() => {
      indexRef.current += 1;
      setDisplayed(indexRef.current >= text.length ? text : text.slice(0, indexRef.current));
      if (indexRef.current >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, active]);
  return displayed;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Horizontal pipeline visualization bar showing the 4-step flow. */
function PipelineBar({ activeStep, prefersReduced }: { activeStep: PipelineStepKey; prefersReduced: boolean }) {
  const activeIdx = PIPELINE_STEPS.findIndex((s) => s.key === activeStep);
  return (
    <Card className="border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/70">
      <CardContent className="p-3">
        <div className="flex items-center gap-1">
          {PIPELINE_STEPS.map((step, i) => {
            const Icon = step.icon;
            const isActive = i === activeIdx;
            const isPast = i < activeIdx;
            return (
              <div key={step.key} className="flex items-center gap-1 flex-1">
                <motion.div
                  initial={prefersReduced ? {} : { scale: isActive ? 1 : 0.9 }}
                  animate={{ scale: isActive ? 1 : 0.9 }}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 transition-colors w-full",
                    isActive ? "bg-[var(--color-accent)]/15 ring-1 ring-[var(--color-accent)]/30"
                      : isPast ? "bg-[var(--color-success)]/10 ring-1 ring-[var(--color-success)]/20"
                        : "bg-[var(--color-paper-3)]/30",
                  )}
                >
                  <div className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                    isActive ? "bg-[var(--color-accent)]/20 text-[var(--color-accent)]"
                      : isPast ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
                        : "bg-[var(--color-paper-3)]/40 text-[var(--color-ink-faint)]",
                  )}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className={cn(
                    "text-[11px] font-medium leading-tight",
                    isActive ? "text-[var(--color-ink)]"
                      : isPast ? "text-[var(--color-ink-muted)]"
                        : "text-[var(--color-ink-faint)]",
                  )}>{step.label}</span>
                </motion.div>
                {i < PIPELINE_STEPS.length - 1 && <ChevronRight className="h-3 w-3 shrink-0 text-[var(--color-ink-faint)]" />}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/** Phase 1 panel — LLM prompt with typing animation. */
function LlmPromptPanel({
  preset, typingDone, onTypingDone, prefersReduced: _prefersReduced,
}: {
  preset: GeneratorPreset;
  typingDone: boolean;
  onTypingDone: () => void;
  prefersReduced: boolean;
}) {
  const displayedText = useTypingAnimation(preset.llmPrompt, 14, !typingDone);
  useEffect(() => {
    if (displayedText.length >= preset.llmPrompt.length && !typingDone) onTypingDone();
  }, [displayedText, preset.llmPrompt, typingDone, onTypingDone]);

  return (
    <Card className="border-[var(--color-accent)]/20 bg-[var(--color-paper-1)]/70 flex flex-col">
      <CardContent className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--color-accent)]/15">
            <Type className="h-3.5 w-3.5 text-[var(--color-accent)]" />
          </div>
          <h3 className="text-[13px] font-semibold text-[var(--color-ink)]">Phase 1: LLM Prompt Generation</h3>
        </div>
        <Badge variant="outline" className="w-fit text-[11px] font-medium" style={{
          borderColor: VIOLATION_COLORS[preset.violationType],
          color: VIOLATION_COLORS[preset.violationType],
          backgroundColor: `color-mix(in srgb, ${VIOLATION_COLORS[preset.violationType]} 8%, transparent)`,
        }}>{VIOLATION_LABELS[preset.violationType]}</Badge>
        <div className="relative flex-1 rounded-lg bg-[#0d1117] p-4 ring-1 ring-[var(--color-paper-3)]/40">
          <p className="font-mono text-[12px] leading-relaxed text-[#c9d1d9] whitespace-pre-wrap">
            {displayedText}
            {!typingDone && (
              <motion.span className="inline-block w-[2px] h-[14px] bg-[var(--color-accent)] ml-0.5 align-middle"
                animate={{ opacity: [1, 0] }} transition={{ duration: 0.6, repeat: Infinity }} />
            )}
          </p>
        </div>
        <p className="text-[10px] text-[var(--color-ink-faint)] italic">
          LLM generates a hyper-detailed prompt targeting the specific violation edge-case.
        </p>
      </CardContent>
    </Card>
  );
}

/** Phase 2 panel — synthetic image output with detection overlay badges. */
function ImageOutputPanel({
  preset, isActive, prefersReduced,
}: {
  preset: GeneratorPreset;
  isActive: boolean;
  prefersReduced: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  return (
    <Card className="border-[var(--color-success)]/20 bg-[var(--color-paper-1)]/70 flex flex-col">
      <CardContent className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--color-success)]/15">
            <Image className="h-3.5 w-3.5 text-[var(--color-success)]" />
          </div>
          <h3 className="text-[13px] font-semibold text-[var(--color-ink)]">Phase 2: Synthetic Image Output</h3>
          {isActive && (
            <Badge variant="outline" className="ml-auto text-[10px] border-[var(--color-success)]/30 text-[var(--color-success)]">
              GENERATED
            </Badge>
          )}
        </div>
        <div className="relative flex-1 rounded-lg overflow-hidden bg-[#0d1117] ring-1 ring-[var(--color-paper-3)]/40">
          {isActive ? (
            !imgError ? (
              <motion.div initial={prefersReduced ? {} : { opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="relative">
                <img src={preset.outputImage} alt={`Synthetic ${VIOLATION_LABELS[preset.violationType]} scenario`}
                  className="w-full h-auto max-h-[360px] object-contain" onError={() => setImgError(true)} />
                {/* Detection overlay badge */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-md bg-black/70 backdrop-blur-sm px-2.5 py-1.5 ring-1 ring-white/10">
                  <div className="h-2 w-2 rounded-full bg-[var(--color-danger)] animate-pulse" />
                  <span className="text-[11px] font-semibold text-white">{VIOLATION_LABELS[preset.violationType]} Detected</span>
                </div>
                {/* Verification badge */}
                <div className="absolute bottom-3 right-3 rounded-md bg-black/70 backdrop-blur-sm px-2 py-1 ring-1 ring-white/10">
                  <span className="text-[10px] font-mono tabular-nums text-[var(--color-success)]">synthetic · verified</span>
                </div>
                {/* Corner brackets */}
                <div className="absolute top-2 left-2 h-5 w-5 border-t-2 border-l-2 border-[var(--color-success)]/60 rounded-tl" />
                <div className="absolute top-2 right-2 h-5 w-5 border-t-2 border-r-2 border-[var(--color-success)]/60 rounded-tr" />
                <div className="absolute bottom-2 left-2 h-5 w-5 border-b-2 border-l-2 border-[var(--color-success)]/60 rounded-bl" />
                <div className="absolute bottom-2 right-2 h-5 w-5 border-b-2 border-r-2 border-[var(--color-success)]/60 rounded-br" />
              </motion.div>
            ) : (
              <div className="flex h-[240px] items-center justify-center flex-col gap-2">
                <Sparkles className="h-8 w-8 text-[var(--color-ink-faint)]" />
                <p className="text-[12px] text-[var(--color-ink-faint)]">Demo image not available for this scenario</p>
                <p className="text-[10px] text-[var(--color-ink-faint)] font-mono">{preset.outputImage}</p>
              </div>
            )
          ) : (
            <div className="flex h-[240px] items-center justify-center flex-col gap-3">
              <div className="relative">
                <Layers className="h-8 w-8 text-[var(--color-ink-faint)]" />
                <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-[var(--color-accent)]/60 animate-ping" />
              </div>
              <p className="text-[12px] text-[var(--color-ink-faint)]">Run pipeline to generate synthetic image</p>
              <p className="text-[10px] text-[var(--color-ink-faint)]/60 italic">Diffusion model output will appear here</p>
            </div>
          )}
        </div>
        <p className="text-[10px] text-[var(--color-ink-faint)] italic">
          Diffusion model synthesizes a photorealistic image matching the LLM prompt.
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Generator() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<PipelineStepKey>("preset");
  const [typingDone, setTypingDone] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const prefersReduced = useReducedMotion();
  const demoMode = useAppStore((s) => s.demoMode);
  const selectedPreset = GENERATOR_PRESETS.find((p) => p.id === selectedId) ?? null;
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  /** Clean up any running simulation timers. */
  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  /** Clean up timers on unmount. */
  useEffect(() => () => clearTimers(), []);

  /** Run the full pipeline animation for the selected preset. */
  const runPipeline = () => {
    if (!selectedPreset || isSimulating) return;
    clearTimers();
    setTypingDone(false);
    setIsSimulating(true);
    setActiveStep("preset");
    const ms = prefersReduced ? 400 : 800;
    timersRef.current = [
      setTimeout(() => setActiveStep("llm"), ms),
      setTimeout(() => setTypingDone(false), ms),
      setTimeout(() => setActiveStep("diffusion"), ms * 2.5 + 1800),
      setTimeout(() => { setActiveStep("output"); setIsSimulating(false); }, ms * 3.5 + 1800),
    ];
  };

  /** Handle preset change from Select dropdown. */
  const handlePresetChange = (value: string) => {
    clearTimers();
    setSelectedId(value);
    setTypingDone(false);
    setActiveStep("preset");
    setIsSimulating(false);
  };

  return (
    <motion.div className="p-5 lg:p-6"
      initial={prefersReduced ? {} : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>

      {/* Header */}
      <header className="mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-accent)]/10 ring-1 ring-[var(--color-accent)]/20">
            <Wand2 className="h-4 w-4 text-[var(--color-accent)]" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">Synthetic Edge-Case Generator</h1>
            <p className="text-[11px] text-[var(--color-ink-faint)]">
              Generate rare traffic scenarios using LLM-guided prompts and diffusion model synthesis. This pipeline creates training data for edge-case violation detection.
            </p>
          </div>
        </div>
      </header>

      {/* Preset Selector + Run Button */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 max-w-lg">
          <Select value={selectedId ?? ""} onValueChange={(v) => { if (v) handlePresetChange(v); }}>
            <SelectTrigger className="h-9 text-[13px] bg-[var(--color-paper-1)]/70 ring-1 ring-[var(--color-paper-3)]/60 w-full">
              <SelectValue placeholder="Select an edge-case scenario..." />
            </SelectTrigger>
            <SelectContent className="min-w-[360px]">
              {GENERATOR_PRESETS.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-[13px] py-2.5">
                  <span className="flex items-center gap-2.5">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: VIOLATION_COLORS[p.violationType] }} />
                    <span className="flex flex-col">
                      <span className="font-medium">{p.label}</span>
                      <span className="text-[10px] text-[var(--color-ink-faint)]">{VIOLATION_LABELS[p.violationType]}</span>
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={runPipeline} disabled={!selectedPreset || isSimulating}
          className={cn("h-9 text-[13px] font-semibold",
            selectedPreset && !isSimulating ? "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent)]/90"
              : "bg-[var(--color-paper-3)] text-[var(--color-ink-faint)]")}>
          {isSimulating ? (
            <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Generating...</span>
          ) : (
            <span className="flex items-center gap-2"><Play className="h-4 w-4" /> Run Pipeline</span>
          )}
        </Button>
        {demoMode && (
          <Badge variant="outline" className="text-[10px] border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]">DEMO</Badge>
        )}
      </div>

      <AnimatePresence mode="wait">
        {selectedPreset ? (
          <motion.div key={selectedPreset.id}
            initial={prefersReduced ? {} : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            exit={prefersReduced ? {} : { opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="space-y-4">
            <PipelineBar activeStep={activeStep} prefersReduced={!!prefersReduced} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
              <LlmPromptPanel preset={selectedPreset} typingDone={typingDone}
                onTypingDone={() => setTypingDone(true)} prefersReduced={!!prefersReduced} />
              <ImageOutputPanel preset={selectedPreset} isActive={activeStep === "output"}
                prefersReduced={!!prefersReduced} />
            </div>

            {/* Info Card — How This Works in Production */}
            <Card className="border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                  <h3 className="text-[13px] font-semibold text-[var(--color-ink)]">How This Works in Production</h3>
                </div>
                <div className="space-y-2 text-[11px] text-[var(--color-ink-muted)]">
                  {[
                    { color: "var(--color-accent)", title: "Fine-tune on Rare Scenarios:", text: "Generate edge-case images for night, rain, fog, unusual camera angles, and occluded views that real cameras rarely capture." },
                    { color: "var(--color-success)", title: "Augment Training Data:", text: "Expand the training dataset with synthetic variations — different vehicle types, weather conditions, and traffic densities." },
                    { color: "var(--color-warning)", title: "Reduce False Negatives:", text: "Improve model robustness on under-represented edge cases, ensuring violations aren't missed in unusual conditions." },
                    { color: "var(--color-danger)", title: "Verification Pipeline:", text: "Each synthetic image passes a deepfake detector and quality filter to ensure realism before being added to training data." },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-2">
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                      <p><strong className="text-[var(--color-ink)]">{item.title}</strong> {item.text}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-[var(--color-ink-faint)] italic">
                  Production pipeline uses Stable Diffusion XL or DALL-E 3 for image synthesis, with classifier-based quality scoring before training data inclusion.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          /* Empty state */
          <motion.div key="empty" initial={prefersReduced ? {} : { opacity: 0 }} animate={{ opacity: 1 }}
            exit={prefersReduced ? {} : { opacity: 0 }}>
            <Card className="flex h-[360px] items-center justify-center border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/30">
              <div className="text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-paper-3)]/30">
                  <Wand2 className="h-5 w-5 text-[var(--color-ink-faint)]" />
                </div>
                <div>
                  <p className="text-sm text-[var(--color-ink-muted)]">Select a scenario to begin</p>
                  <p className="mt-1 text-[11px] text-[var(--color-ink-faint)]">Choose an edge-case preset above to explore the synthetic generation pipeline</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
