/**
 * Deepfake Detection page — AI image forensics lab.
 *
 * Upload an image to analyze for AI-generation artifacts using
 * heuristic artifact detection (texture, symmetry, edges, noise).
 *
 * Design: "AI Image Forensics Lab" — dark forensic aesthetic.
 * Hierarchy:
 *   L1 Hero → font-mono text-[18px]+ font-bold (confidence %, verdict)
 *   L2 Title → text-[13px] font-semibold text-ink (card/section titles)
 *   L3 Body → text-[14px] font-semibold / text-[12px] font-medium
 *   L4 Label → text-[11px] uppercase tracking-wider text-faint
 *   L5 Aux → text-[10px] tabular-nums text-faint
 */

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ScanFace, ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle2, Eye, Fingerprint, Upload } from "lucide-react";
import { analyzeDeepfake } from "@/lib/api";
import type { DeepfakeResponse } from "@/types/violation";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/** Artifact metadata: label + description. */
const ARTIFACTS: Record<string, { label: string; desc: string }> = {
  low_texture_variance: { label: "Low Texture Variance", desc: "AI images often lack fine high-frequency texture detail found in real camera captures." },
  oversaturated_color_distribution: { label: "Oversaturated Colors", desc: "Diffusion models tend to produce unnaturally vivid color palettes." },
  suspiciously_smooth_boundaries: { label: "Smooth Boundaries", desc: "AI object boundaries frequently exhibit bleeding or soft edges." },
  uncanny_face_symmetry: { label: "Uncanny Face Symmetry", desc: "AI faces are often mirror-symmetric beyond natural human proportions." },
  uniform_noise_pattern: { label: "Uniform Noise Pattern", desc: "Real cameras have sensor-specific noise; AI images often have uniform noise." },
  idealized_license_plate: { label: "Idealized License Plate", desc: "Plate text in AI images is perfectly rendered or nonsensically garbled." },
  diffusion_texture_artifacts: { label: "Diffusion Texture Artifacts", desc: "Subtle repeating patterns from the denoising process in diffusion models." },
  anatomical_hand_oddities: { label: "Hand Anatomical Oddities", desc: "Hands and fingers are a well-known weak point for generative AI." },
};

/** Scan line animation style. */
const SCAN_LINE = { background: "linear-gradient(90deg, transparent, var(--color-danger), transparent)", boxShadow: "0 0 12px var(--color-danger)" };

export default function Deepfake() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<DeepfakeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const prefersReduced = useReducedMotion();
  const demoMode = useAppStore((s) => s.demoMode);

  /** Clean up object URL on unmount. */
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) { setError("Please upload a JPEG or PNG image."); return; }
    setError(null);
    setResult(null);
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }, []);

  const handleClear = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setImageFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
  }, [previewUrl]);

  const handleAnalyze = useCallback(async () => {
    if (!imageFile) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try { setResult(await analyzeDeepfake(imageFile)); }
    catch (err) { setError(err instanceof Error ? err.message : "Analysis failed"); }
    finally { setLoading(false); }
  }, [imageFile]);

  const isAi = result?.is_likely_ai;
  const verdictColor = isAi ? "var(--color-danger)" : "var(--color-success)";

  return (
    <motion.div className="p-5 lg:p-6" initial={prefersReduced ? {} : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
      {/* Header */}
      <header className="mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-danger)]/10 ring-1 ring-[var(--color-danger)]/20">
            <ScanFace className="h-4 w-4 text-[var(--color-danger)]" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">Deepfake Detection</h1>
            <p className="text-[11px] text-[var(--color-ink-faint)]">AI Image Forensics Lab — analyze images for generative AI artifacts</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Upload + Preview */}
        <div className="flex flex-col gap-4">
          {/* Upload Zone */}
          <motion.div
            animate={prefersReduced ? {} : dragOver ? { scale: 1.02 } : { scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => fileRef.current?.click()}
            className={cn(
              "group relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
              previewUrl ? "h-[200px]" : "h-[280px]",
              dragOver ? "border-[var(--color-danger)] bg-[var(--color-danger)]/5"
                : previewUrl ? "border-[var(--color-danger)]/30 bg-[var(--color-paper-1)]/50"
                  : "border-[var(--color-paper-3)] bg-[var(--color-paper-1)]/30 hover:border-[var(--color-danger)]/30 hover:bg-[var(--color-paper-1)]/50",
            )}
          >
            {dragOver && <div className="absolute inset-0 rounded-lg pointer-events-none" style={{ boxShadow: "0 0 20px var(--color-danger), inset 0 0 20px var(--color-danger)", opacity: 0.15 }} />}
            {previewUrl ? (
              <p className="text-[11px] text-[var(--color-ink-faint)]">{imageFile?.name} — click to replace</p>
            ) : (
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-paper-3)]/40">
                  <Upload className="h-5 w-5 text-[var(--color-ink-faint)]" />
                </div>
                <p className="text-sm text-[var(--color-ink-muted)]">Drop an image or click to browse</p>
                <p className="mt-1 text-[11px] text-[var(--color-ink-faint)]">JPEG / PNG / WebP, max 10MB</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
          </motion.div>

          {/* Controls */}
          <div className="flex gap-2">
            <Button onClick={handleAnalyze} disabled={!imageFile || loading}
              className={cn("flex-1 h-9 text-[13px] font-semibold",
                imageFile && !loading ? "bg-[var(--color-danger)] text-white hover:bg-[var(--color-danger)]/90" : "bg-[var(--color-paper-3)] text-[var(--color-ink-faint)]")}>
              {loading ? (
                <span className="flex items-center gap-2"><ScanFace className="h-4 w-4 animate-pulse" /> Analyzing artifacts...</span>
              ) : (
                <span className="flex items-center gap-2"><Fingerprint className="h-4 w-4" /> Run Forensic Scan</span>
              )}
            </Button>
            {imageFile && (
              <Button variant="ghost" onClick={handleClear} disabled={loading}
                className="h-9 text-[13px] text-[var(--color-ink-faint)] hover:text-[var(--color-danger)]">Clear</Button>
            )}
          </div>

          {/* Image Preview with scan overlay */}
          <AnimatePresence mode="wait">
            {previewUrl && (
              <motion.div key="preview" initial={prefersReduced ? {} : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <Card className="border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/70 overflow-hidden">
                  <CardContent className="p-2 relative">
                    <img src={previewUrl} alt="Image under analysis" className="max-h-[400px] w-full rounded object-contain" />
                    {loading && (
                      <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <motion.div className="absolute left-0 right-0 h-0.5" style={SCAN_LINE}
                          initial={{ top: "0%" }} animate={{ top: "100%" }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} />
                        <div className="absolute top-2 left-2 h-6 w-6 border-t-2 border-l-2 border-[var(--color-danger)]/60 rounded-tl" />
                        <div className="absolute top-2 right-2 h-6 w-6 border-t-2 border-r-2 border-[var(--color-danger)]/60 rounded-tr" />
                        <div className="absolute bottom-2 left-2 h-6 w-6 border-b-2 border-l-2 border-[var(--color-danger)]/60 rounded-bl" />
                        <div className="absolute bottom-2 right-2 h-6 w-6 border-b-2 border-r-2 border-[var(--color-danger)]/60 rounded-br" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div initial={prefersReduced ? {} : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="flex items-center gap-2 rounded-lg bg-[var(--color-danger)]/10 px-3 py-2 ring-1 ring-[var(--color-danger)]/20">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[var(--color-danger)]" />
                  <span className="text-[12px] text-[var(--color-danger)]">{error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Results */}
        <div className="flex flex-col gap-4">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" initial={prefersReduced ? {} : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Card className="flex h-[400px] items-center justify-center border-[var(--color-danger)]/20 bg-[var(--color-danger)]/5">
                  <div className="text-center space-y-3">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-danger)]/10 ring-2 ring-[var(--color-danger)]/20">
                      <ScanFace className="h-7 w-7 text-[var(--color-danger)]" />
                    </motion.div>
                    <p className="text-sm font-medium text-[var(--color-ink)]">Analyzing image artifacts...</p>
                    <p className="text-[11px] text-[var(--color-ink-faint)]">Checking texture, symmetry, edges, and noise patterns</p>
                    <div className="mx-auto w-48 h-1 overflow-hidden rounded-full bg-[var(--color-paper-3)]/50">
                      <motion.div className="h-full bg-[var(--color-danger)]" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 2, ease: "easeInOut" }} />
                    </div>
                  </div>
                </Card>
              </motion.div>
            ) : result ? (
              <motion.div key="results" initial={prefersReduced ? {} : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="space-y-4">
                {/* Verdict Card */}
                <Card className={cn("overflow-hidden ring-1",
                  isAi ? "border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 ring-[var(--color-danger)]/20"
                    : "border-[var(--color-success)]/30 bg-[var(--color-success)]/5 ring-[var(--color-success)]/20")}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg",
                        isAi ? "bg-[var(--color-danger)]/15" : "bg-[var(--color-success)]/15")}>
                        {isAi ? <ShieldAlert className="h-5 w-5 text-[var(--color-danger)]" /> : <ShieldCheck className="h-5 w-5 text-[var(--color-success)]" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">Forensic Verdict</p>
                        <p className="font-mono text-[18px] font-bold" style={{ color: verdictColor }}>
                          {isAi ? "LIKELY AI-GENERATED" : "LIKELY AUTHENTIC"}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn("text-[13px] font-mono font-bold px-3 py-1",
                        isAi ? "border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 text-[var(--color-danger)]"
                          : "border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]")}>
                        {(result.confidence * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    {/* Confidence Bar */}
                    <div className="mt-3 space-y-1">
                      <div className="h-2 overflow-hidden rounded-full bg-[var(--color-paper-3)]/50">
                        <motion.div className="h-full rounded-full" style={{ backgroundColor: verdictColor }}
                          initial={prefersReduced ? { width: `${result.confidence * 100}%` } : { width: 0 }}
                          animate={{ width: `${result.confidence * 100}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-[var(--color-ink-faint)]">
                        <span>Authentic</span>
                        <span className="font-mono tabular-nums">{(result.confidence * 100).toFixed(1)}% confidence</span>
                        <span>AI-Generated</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Artifacts Detected */}
                {result.artifacts_detected.length > 0 && (
                  <Card className="border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/70">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Eye className="h-3.5 w-3.5 text-[var(--color-danger)]" />
                        <h3 className="text-[13px] font-semibold text-[var(--color-ink)]">Artifacts Detected</h3>
                        <Badge variant="outline" className="ml-auto text-[11px] border-[var(--color-danger)]/30 text-[var(--color-danger)]">
                          {result.artifacts_detected.length} found
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {result.artifacts_detected.map((key) => {
                          const meta = ARTIFACTS[key];
                          return (
                            <div key={key} className="rounded-md bg-[var(--color-danger)]/5 px-3 py-2 ring-1 ring-[var(--color-danger)]/10">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-3 w-3 shrink-0 text-[var(--color-danger)]" />
                                <span className="text-[12px] font-medium text-[var(--color-ink)]">
                                  {meta?.label ?? key.replace(/_/g, " ")}
                                </span>
                              </div>
                              {meta?.desc && <p className="mt-1 ml-5 text-[11px] text-[var(--color-ink-faint)]">{meta.desc}</p>}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Explanation */}
                {result.explanation && (
                  <Card className="border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/70">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Fingerprint className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                        <h3 className="text-[13px] font-semibold text-[var(--color-ink)]">Analysis Report</h3>
                      </div>
                      <p className="text-[12px] leading-relaxed text-[var(--color-ink-muted)]">{result.explanation}</p>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            ) : (
              <motion.div key="empty" initial={prefersReduced ? {} : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Card className="flex h-[400px] items-center justify-center border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/30">
                  <div className="text-center space-y-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-paper-3)]/30">
                      <ScanFace className="h-5 w-5 text-[var(--color-ink-faint)]" />
                    </div>
                    <div>
                      <p className="text-sm text-[var(--color-ink-muted)]">Upload an image for forensic analysis</p>
                      <p className="mt-1 text-[11px] text-[var(--color-ink-faint)]">AI-generated images often contain subtle artifacts</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* How It Works */}
          <Card className="border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                <h3 className="text-[13px] font-semibold text-[var(--color-ink)]">How It Works</h3>
                {demoMode && <Badge variant="outline" className="ml-auto text-[10px] border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]">DEMO</Badge>}
              </div>
              <div className="space-y-2 text-[11px] text-[var(--color-ink-muted)]">
                {[
                  { color: "var(--color-danger)", title: "Texture Analysis:", text: "Measures high-frequency content variance. AI images tend to be unnaturally smooth." },
                  { color: "var(--color-accent)", title: "Symmetry Detection:", text: "Checks face-region mirror symmetry. Diffusion models produce overly symmetric faces." },
                  { color: "var(--color-warning)", title: "Edge Coherence:", text: "Evaluates boundary sharpness. AI objects often have bleeding or soft edges." },
                  { color: "var(--color-success)", title: "Color & Noise:", text: "Detects oversaturation and uniform noise patterns characteristic of generative models." },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-2">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                    <p><strong className="text-[var(--color-ink)]">{item.title}</strong> {item.text}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[var(--color-ink-faint)] italic">
                This is a heuristic analysis tool for demo purposes. Production-grade deepfake detection requires dedicated neural forensic models.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
