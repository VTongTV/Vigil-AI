/**
 * Citizen Reporting page — friendly, simplified violation detection for public use.
 *
 * Design: "Community-Friendly Reporting"
 * - Warm, welcoming UI with soft rounded corners and gentle shadows
 * - Privacy-first messaging: no plate text, fines, or evidence details
 * - Single-image upload with drag-and-drop
 * - Animated results with violation type badges and detection summary
 * - Demo mode support with mock data
 *
 * Hierarchy (mirrors Dashboard reference):
 *   L1 Hero     → font-mono text-[18px]+ font-bold  (violation count)
 *   L2 Title    → text-[13px] font-semibold text-ink (section titles)
 *   L3 Body     → text-[14px] font-semibold / text-[12px] font-medium (labels)
 *   L4 Label    → text-[11px] uppercase tracking-wider text-faint (category stamps)
 *   L5 Aux      → text-[10px] tabular-nums text-faint (processing time)
 */

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Users,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Heart,
  FileText,
  Loader2,
  X,
} from "lucide-react";
import { citizenDetect } from "@/lib/api";
import type { CitizenDetectResponse } from "@/types/violation";
import { VIOLATION_LABELS, VIOLATION_COLORS } from "@/types/violation";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/** Friendly labels for violation types shown to citizens. */
const CITIZEN_VIOLATION_LABELS: Record<string, string> = {
  no_helmet: "Helmet Non-Compliance",
  triple_riding: "Triple Riding",
  wrong_side_driving: "Wrong-Side Driving",
  illegal_parking: "Illegal Parking",
  no_seatbelt: "Seatbelt Non-Compliance",
  stop_line_violation: "Stop-Line Violation",
  red_light_violation: "Red-Light Violation",
  license_plate_mismatch: "Plate Mismatch",
};

export default function Citizen() {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<CitizenDetectResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const prefersReduced = useReducedMotion();
  const demoMode = useAppStore((s) => s.demoMode);

  /** Clean up object URL on unmount. */
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  /** Handle file selection from input or drop. */
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  }, []);

  /** Handle file input change. */
  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
      }
      e.target.value = "";
    },
    [handleFile],
  );

  /** Handle drag and drop. */
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile],
  );

  /** Clear the current selection and results. */
  const clearSelection = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setSelectedFile(null);
    setResult(null);
    setError(null);
  }, [preview]);

  /** Run citizen detection. */
  const runDetection = useCallback(async () => {
    if (!selectedFile) return;
    setProcessing(true);
    setError(null);
    setResult(null);

    try {
      const res = await citizenDetect(selectedFile);
      setResult(res);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Analysis failed. Please try again.",
      );
    } finally {
      setProcessing(false);
    }
  }, [selectedFile]);

  return (
    <motion.div
      className="p-5 lg:p-6"
      initial={prefersReduced ? {} : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* ── Header ── */}
      <header className="mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-success)]/10 ring-1 ring-[var(--color-success)]/20">
            <Shield className="h-4.5 w-4.5 text-[var(--color-success)]" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">
              Report a Violation
            </h1>
            <p className="text-[12px] text-[var(--color-ink-faint)]">
              Help keep Bengaluru's roads safe — upload a photo and our AI will analyse it
            </p>
          </div>
        </div>
      </header>

      {/* ── Privacy Notice ── */}
      <motion.div
        initial={prefersReduced ? {} : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <Card className="mb-5 border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5">
          <CardContent className="flex items-start gap-3 p-3.5">
            <Heart className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" />
            <div>
              <p className="text-[12px] font-semibold text-[var(--color-ink)]">
                Your privacy matters
              </p>
              <p className="text-[11px] text-[var(--color-ink-faint)]">
                Plate numbers, fine amounts, and other sensitive details are not shown in citizen
                reports. Your identity is never collected.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ── Left: Upload + Controls ── */}
        <div className="flex flex-col gap-4">
          {/* Upload Zone */}
          <motion.div
            animate={prefersReduced ? {} : dragOver ? { scale: 1.01 } : { scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={cn(
              "group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-all duration-200",
              "min-h-[240px]",
              dragOver
                ? "border-[var(--color-success)] bg-[var(--color-success)]/5"
                : preview
                  ? "border-[var(--color-success)]/40 bg-[var(--color-paper-1)]/50"
                  : "border-[var(--color-paper-3)] bg-[var(--color-paper-1)]/30 hover:border-[var(--color-success)]/30 hover:bg-[var(--color-paper-1)]/50",
            )}
          >
            {dragOver && (
              <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{
                boxShadow: "0 0 20px rgba(16, 185, 129, 0.15)",
              }} />
            )}

            {preview ? (
              <div className="flex flex-col items-center gap-3">
                <img
                  src={preview}
                  alt="Selected"
                  className="max-h-[180px] rounded-xl object-contain ring-1 ring-[var(--color-paper-3)]/50"
                />
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[var(--color-ink-faint)] truncate max-w-[160px]">
                    {selectedFile?.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearSelection();
                    }}
                    className="text-[var(--color-ink-faint)] hover:text-[var(--color-danger)] transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-success)]/10">
                  <Upload className="h-5 w-5 text-[var(--color-success)]" />
                </div>
                <p className="text-[13px] font-medium text-[var(--color-ink-muted)]">
                  Drop a traffic photo or click to browse
                </p>
                <p className="mt-1 text-[11px] text-[var(--color-ink-faint)]">
                  JPEG / PNG, max 10MB
                </p>
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={onInputChange}
            />
          </motion.div>

          {/* Action Button */}
          <Button
            onClick={runDetection}
            disabled={!selectedFile || processing}
            className={cn(
              "w-full h-10 text-[13px] font-semibold rounded-xl",
              selectedFile && !processing
                ? "bg-[var(--color-success)] text-white hover:bg-[var(--color-success)]/90"
                : "bg-[var(--color-paper-3)] text-[var(--color-ink-faint)]",
            )}
          >
            {processing ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analysing your report…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Analyse Photo
              </span>
            )}
          </Button>

          {/* Demo Mode Notice */}
          {demoMode && (
            <div className="flex items-center gap-2 rounded-xl bg-[var(--color-warning)]/8 px-3 py-2 ring-1 ring-[var(--color-warning)]/15">
              <AlertTriangle className="h-3.5 w-3.5 text-[var(--color-warning)]" />
              <span className="text-[11px] text-[var(--color-warning)]">
                Demo mode — results are simulated
              </span>
            </div>
          )}
        </div>

        {/* ── Right: Results ── */}
        <div className="flex flex-col gap-4">
          <AnimatePresence mode="wait">
            {processing ? (
              <motion.div
                key="processing"
                initial={prefersReduced ? {} : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card className="border-[var(--color-success)]/20 bg-[var(--color-success)]/5">
                  <CardContent className="flex flex-col items-center justify-center p-8">
                    <div className="relative mb-4">
                      <div className="h-14 w-14 rounded-full bg-[var(--color-success)]/10 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-success)]" />
                      </div>
                    </div>
                    <p className="text-[13px] font-semibold text-[var(--color-ink)]">
                      Analysing your report…
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--color-ink-faint)]">
                      Our AI is scanning the image for traffic violations
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ) : result ? (
              <motion.div
                key="results"
                initial={prefersReduced ? {} : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-4"
              >
                {/* Success Banner */}
                <div className="flex items-center gap-3 rounded-2xl bg-[var(--color-success)]/8 px-4 py-3 ring-1 ring-[var(--color-success)]/20">
                  <CheckCircle2 className="h-5 w-5 text-[var(--color-success)]" />
                  <div>
                    <p className="text-[13px] font-semibold text-[var(--color-success)]">
                      Report processed successfully
                    </p>
                    <p className="text-[11px] text-[var(--color-success)]/70">
                      {result.processing_time_ms}ms processing time
                    </p>
                  </div>
                </div>

                {/* Violation Count */}
                <Card className="border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/70">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[13px] font-semibold text-[var(--color-ink)]">
                        Violations Detected
                      </h3>
                      <span className="font-mono text-[22px] font-bold tabular-nums text-[var(--color-success)]">
                        {result.violations_found}
                      </span>
                    </div>

                    {result.violation_types.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {result.violation_types.map((vType) => {
                          const label =
                            CITIZEN_VIOLATION_LABELS[vType] ??
                            VIOLATION_LABELS[vType as keyof typeof VIOLATION_LABELS] ??
                            vType;
                          const color =
                            VIOLATION_COLORS[vType as keyof typeof VIOLATION_COLORS] ??
                            "var(--color-accent)";
                          return (
                            <Badge
                              key={vType}
                              variant="outline"
                              className="text-[11px] font-medium"
                              style={{
                                borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
                                backgroundColor: `color-mix(in srgb, ${color} 8%, transparent)`,
                                color,
                              }}
                            >
                              {label}
                            </Badge>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[12px] text-[var(--color-ink-faint)]">
                        No violations detected in this image. Thank you for reporting!
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Detection Summary */}
                {result.detection_summary &&
                  result.detection_summary.total_objects > 0 && (
                    <Card className="border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/70">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Users className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                          <h3 className="text-[13px] font-semibold text-[var(--color-ink)]">
                            What We Found
                          </h3>
                          <span className="ml-auto font-mono text-[11px] text-[var(--color-ink-faint)]">
                            {result.detection_summary.total_objects} objects
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            {
                              label: "Persons",
                              count: result.detection_summary.persons,
                              icon: "👤",
                            },
                            {
                              label: "Riders",
                              count: result.detection_summary.riders,
                              icon: "🏍️",
                            },
                            {
                              label: "Pedestrians",
                              count: result.detection_summary.pedestrians,
                              icon: "🚶",
                            },
                            {
                              label: "Cars",
                              count: result.detection_summary.cars,
                              icon: "🚗",
                            },
                            {
                              label: "Motorcycles",
                              count: result.detection_summary.motorcycles,
                              icon: "🏍",
                            },
                            {
                              label: "Buses",
                              count: result.detection_summary.buses,
                              icon: "🚌",
                            },
                            {
                              label: "Trucks",
                              count: result.detection_summary.trucks,
                              icon: "🚛",
                            },
                            {
                              label: "Bicycles",
                              count: result.detection_summary.bicycles,
                              icon: "🚲",
                            },
                          ]
                            .filter((item) => item.count > 0)
                            .map((item) => (
                              <div
                                key={item.label}
                                className="rounded-xl bg-[var(--color-paper-2)]/50 px-2.5 py-2 text-center ring-1 ring-[var(--color-paper-3)]/40"
                              >
                                <span className="block text-[14px]">{item.icon}</span>
                                <span className="block font-mono text-[14px] font-bold tabular-nums text-[var(--color-ink)]">
                                  {item.count}
                                </span>
                                <span className="block text-[10px] text-[var(--color-ink-faint)]">
                                  {item.label}
                                </span>
                              </div>
                            ))}
                        </div>
                        {result.detection_summary.vehicle_categories.length > 0 && (
                          <div className="mt-2.5 flex items-center gap-2">
                            <span className="text-[11px] text-[var(--color-ink-faint)]">
                              Vehicle types:
                            </span>
                            {result.detection_summary.vehicle_categories.map((cat) => (
                              <Badge
                                key={cat}
                                variant="outline"
                                className="text-[10px] border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                              >
                                {cat}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                {/* Thank You Message */}
                <Card className="border-[var(--color-success)]/15 bg-[var(--color-success)]/5">
                  <CardContent className="flex items-start gap-3 p-4">
                    <Heart className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-success)]" />
                    <div>
                      <p className="text-[12px] font-semibold text-[var(--color-ink)]">
                        Thank you for making our roads safer
                      </p>
                      <p className="text-[11px] text-[var(--color-ink-faint)]">
                        {result.message}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                initial={prefersReduced ? {} : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card className="border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5">
                  <CardContent className="flex flex-col items-center justify-center p-8">
                    <AlertTriangle className="mb-3 h-8 w-8 text-[var(--color-danger)]" />
                    <p className="text-[13px] font-semibold text-[var(--color-danger)]">
                      Analysis Failed
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--color-danger)]/70">{error}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearSelection}
                      className="mt-3 text-[11px]"
                    >
                      Try Again
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={prefersReduced ? {} : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card className="border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/30">
                  <CardContent className="flex flex-col items-center justify-center p-8 min-h-[300px]">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-paper-3)]/30">
                      <Shield className="h-5 w-5 text-[var(--color-ink-faint)]" />
                    </div>
                    <p className="text-[13px] text-[var(--color-ink-muted)]">
                      Upload a traffic photo to get started
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--color-ink-faint)]">
                      Our AI will detect any visible violations and provide a summary
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
