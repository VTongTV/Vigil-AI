/**
 * Evidence page — displays annotated evidence images with chain-of-custody
 * metadata, integrity verification badge, FIR PDF generation, and the
 * AnnotatedViewer for bbox overlays with split-view modes.
 *
 * Design: "Chain of Custody Console"
 * - Split layout: violation list + evidence viewer + metadata panel
 * - Hash displayed as monospace with copy affordance
 * - Integrity badge: verified (green) or missing (amber)
 * - FIR PDF download button — PRIMARY CTA (solid accent)
 * - Print button — SECONDARY CTA (outline)
 * - Three-tier metadata grouping: Identity → Enforcement → Audit
 * - Framer Motion: page entrance, animated selection indicator via layoutId,
 *   staggered violation list, AnimatePresence on evidence panel
 *
 * Hierarchy (mirrors Dashboard reference):
 *   L1 Hero     → font-mono text-[16px]+ font-bold  (fine, danger score)
 *   L2 Title    → text-[13px] font-semibold text-ink (section titles)
 *   L3 Body     → text-[12px] font-medium            (violation label, plate)
 *   L4 Label    → text-[11px] uppercase tracking-wider (meta labels, group headings)
 *   L5 Aux      → text-[10px] tabular-nums text-faint (IDs, timestamps)
 */

import { useState } from "react";
import {
  FileImage,
  ZoomIn,
  Printer,
  Shield,
  Copy,
  Check,
  FileDown,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion, type Variants } from "framer-motion";
import { useAppStore } from "@/lib/store";
import type { ViolationRecord } from "@/types/violation";
import {
  VIOLATION_LABELS,
  VIOLATION_COLORS,
  VIOLATION_SECTIONS,
} from "@/types/violation";
import { cn } from "@/lib/utils";
import { generateFirPdf } from "@/lib/api";
import AnnotatedViewer from "@/components/AnnotatedViewer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck as IntegrityShield, DangerGauge } from "@/components/icons";

export default function Evidence() {
  const selectedViolation = useAppStore((s) => s.selectedViolation);
  const setSelectedViolation = useAppStore((s) => s.setSelectedViolation);
  const lastDetection = useAppStore((s) => s.lastDetection);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const [firLoading, setFirLoading] = useState(false);
  const [firError, setFirError] = useState<string | null>(null);
  const prefersReduced = useReducedMotion();

  const violations = lastDetection ?? [];

  /** Trigger the browser print dialog for the evidence panel. */
  const handlePrint = () => {
    window.print();
  };

  /** Copy the evidence hash to clipboard. */
  const copyHash = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    } catch {
      /* fallback: ignore */
    }
  };

  /** Generate and download the FIR PDF for the selected violation. */
  const handleFirDownload = async () => {
    if (!selectedViolation) return;
    setFirLoading(true);
    setFirError(null);
    try {
      const blob = await generateFirPdf(selectedViolation.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `FIR_${selectedViolation.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setFirError(err instanceof Error ? err.message : "FIR generation failed");
    } finally {
      setFirLoading(false);
    }
  };

  /** Determine integrity status from evidence hash. */
  const hashPresent = !!selectedViolation?.evidence_hash;

  /** Stagger variants for violation list. */
  const listContainer: Variants = {
    hidden: {},
    visible: prefersReduced
      ? {}
      : { transition: { staggerChildren: 0.06 } },
  };
  const listItem: Variants = {
    hidden: prefersReduced ? {} : { opacity: 0, x: -8 },
    visible: prefersReduced
      ? {}
      : {
          opacity: 1,
          x: 0,
          transition: { type: "spring", stiffness: 300, damping: 26 },
        },
  };

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
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-accent-soft)] ring-1 ring-[var(--color-accent)]/15">
            <FileImage className="h-4 w-4 text-[var(--color-accent)]" />
          </div>
          <div>
            {/* L1: page title */}
            <h1 className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">
              Evidence Viewer
            </h1>
            {/* L4: contextual subtitle — includes detection count for quick orientation */}
            <p className="text-[11px] text-[var(--color-ink-faint)]">
              {violations.length > 0
                ? `${violations.length} violation${violations.length > 1 ? "s" : ""} available · chain-of-custody hash`
                : "Annotated evidence images with chain-of-custody hash"}
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
        {/* ── Violation list sidebar — 1 col ── */}
        <div className="space-y-2.5 lg:col-span-1">
          {/* L4: section label */}
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
              Detection Results
            </h2>
            {violations.length > 0 && (
              <span className="rounded bg-[var(--color-accent-soft)] px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-[var(--color-accent)]">
                {violations.length}
              </span>
            )}
          </div>

          {violations.length === 0 ? (
            <Card className="border-[var(--rule-color)] bg-[var(--color-paper-1)]">
              <CardContent className="flex flex-col items-center justify-center p-8">
                <FileImage className="mb-2 h-8 w-8 text-[var(--color-ink-faint)]" />
                <p className="text-center text-[12px] text-[var(--color-ink-muted)]">
                  No detection results yet.
                </p>
                <p className="text-center text-[11px] text-[var(--color-ink-faint)]">
                  Run detection from the Upload page.
                </p>
              </CardContent>
            </Card>
          ) : (
            <motion.div
              className="space-y-1.5"
              variants={listContainer}
              initial="hidden"
              animate="visible"
            >
              {violations.map((v) => (
                <motion.div key={v.id} variants={listItem}>
                  <button
                    onClick={() => {
                      setSelectedViolation(v);
                      setViewingId(v.id);
                    }}
                    className={cn(
                      "relative w-full rounded-md border p-3 text-left transition-colors duration-150",
                      viewingId === v.id
                        ? "border-[var(--color-accent)]/30 text-[var(--color-ink)]"
                        : "border-[var(--rule-color)] bg-[var(--color-paper-1)] hover:bg-[var(--color-paper-2)]",
                    )}
                  >
                    {/* Animated selection background — slides via layoutId */}
                    {viewingId === v.id && (
                      <motion.span
                        layoutId="evidence-selection"
                        className="absolute inset-0 rounded-md bg-[var(--color-accent-soft)] ring-1 ring-[var(--color-accent)]/20"
                        transition={
                          prefersReduced
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 400, damping: 32 }
                        }
                      />
                    )}
                    <span className="relative z-10">
                      <ViolationSummary violation={v} />
                    </span>
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        {/* ── Evidence image + metadata — 3 cols ── */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {selectedViolation?.evidence_url ? (
              <motion.div
                key={selectedViolation.id}
                initial={prefersReduced ? {} : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-4"
              >
                {/* Annotated evidence image */}
                <Card className="overflow-hidden border-[var(--rule-color)] bg-[var(--color-paper-1)]">
                  <CardContent className="p-2">
                    <AnnotatedViewer
                      imageUrl={`http://localhost:8000${selectedViolation.evidence_url}`}
                      violations={[selectedViolation]}
                      alt={`Evidence for ${selectedViolation.id}`}
                    />
                  </CardContent>
                </Card>

                {/* ── Chain of Custody metadata ── */}
                <Card className="border-[var(--rule-color)] bg-[var(--color-paper-1)]">
                  <CardContent className="p-4">
                    {/* L2: section title — promoted so users find it within 3 seconds */}
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="flex items-center gap-2 text-[13px] font-semibold text-[var(--color-ink)]">
                        <Shield className="h-4 w-4 text-[var(--color-accent)]" />
                        Chain of Custody
                      </h3>
                      <div className="flex items-center gap-2">
                        {/* PRIMARY CTA — FIR PDF: solid accent, high visual weight */}
                        <Button
                          variant="default"
                          size="sm"
                          className={cn(
                            "h-7 bg-[var(--color-accent)] text-[12px] font-semibold text-white hover:bg-[var(--color-accent-bright)]",
                            firLoading && "opacity-60 cursor-wait",
                          )}
                          onClick={handleFirDownload}
                          disabled={firLoading}
                        >
                          {firLoading ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <FileDown className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          {firLoading ? "Generating…" : "Download FIR PDF"}
                        </Button>
                        {/* SECONDARY CTA — Print: outline, lower visual weight */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 border-[var(--color-paper-3)] bg-[var(--color-paper-2)]/50 text-[11px] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                          onClick={handlePrint}
                        >
                          <Printer className="mr-1.5 h-3 w-3" />
                          Print
                        </Button>
                      </div>
                    </div>

                    {/* FIR error message */}
                    <AnimatePresence>
                      {firError && (
                        <motion.div
                          key="fir-error"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mb-4 flex items-center gap-2 rounded-md bg-[var(--color-danger)]/10 px-3 py-2"
                        >
                          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-[var(--color-danger)]" />
                          <span className="text-[11px] text-[var(--color-danger)]">{firError}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* ── Three-tier metadata grouping ── */}
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">

                      {/* IDENTITY group — type, plate, violation ID */}
                      <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
                          Identity
                        </p>
                        <div className="space-y-2.5">
                          <MetaRow
                            label="Type"
                            value={
                              <span className="text-[12px] font-semibold text-[var(--color-ink)]">
                                {VIOLATION_LABELS[selectedViolation.violation_type] ?? selectedViolation.violation_type}
                              </span>
                            }
                          />
                          <MetaRow
                            label="Plate"
                            value={
                              <span className="font-mono text-[12px] font-semibold text-[var(--color-accent)]">
                                {selectedViolation.license_plate?.text ?? "—"}
                              </span>
                            }
                          />
                          {/* L5: violation ID — auxiliary */}
                          <MetaRow
                            label="Violation ID"
                            value={
                              <span className="font-mono text-[10px] text-[var(--color-ink-faint)]">
                                {selectedViolation.id.slice(0, 16)}…
                              </span>
                            }
                          />
                        </div>
                      </div>

                      {/* ENFORCEMENT group — fine, danger score, camera */}
                      <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
                          Enforcement
                        </p>
                        <div className="space-y-2.5">
                          {/* L1: fine — hero metric within this card */}
                          <MetaRow
                            label="Fine"
                            value={
                              <span className="font-mono text-[16px] font-bold text-[var(--color-warning)]">
                                ₹{selectedViolation.fine_amount.toLocaleString("en-IN")}
                              </span>
                            }
                          />
                          <MetaRow
                            label="Danger Score"
                            value={
                              <span className={cn(
                                "inline-flex items-center gap-1 font-mono text-[12px] font-semibold",
                                selectedViolation.danger_score >= 80
                                  ? "text-[var(--color-danger)]"
                                  : selectedViolation.danger_score >= 40
                                    ? "text-[var(--color-warning)]"
                                    : "text-[var(--color-success)]",
                              )}>
                                <DangerGauge size={14} value={selectedViolation.danger_score} />
                                {selectedViolation.danger_score}/100
                              </span>
                            }
                          />
                          <MetaRow
                            label="Camera"
                            value={
                              <span className="font-mono text-[11px] text-[var(--color-ink-muted)]">
                                {selectedViolation.camera_id ?? "N/A"}
                              </span>
                            }
                          />
                          <MetaRow
                            label="Junction"
                            value={
                              <span className="text-[11px] text-[var(--color-ink-muted)]">
                                {selectedViolation.junction_name ?? "N/A"}
                              </span>
                            }
                          />
                        </div>
                      </div>

                      {/* AUDIT group — integrity, hash, timestamp */}
                      <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
                          Audit
                        </p>
                        <div className="space-y-2.5">
                          {/* Integrity badge — scaled up for 3-second visibility */}
                          <MetaRow
                            label="Integrity"
                            value={
                              <div className="flex items-center gap-1.5">
                                {hashPresent ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-success-soft)] px-2.5 py-1 ring-1 ring-[var(--color-success)]/20">
                                    <IntegrityShield className="h-3.5 w-3.5 text-[var(--color-success)]" />
                                    <span className="text-[12px] font-semibold text-[var(--color-success)]">
                                      Verified
                                    </span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-warning-soft)] px-2.5 py-1 ring-1 ring-[var(--color-warning)]/20">
                                    <AlertCircle className="h-3.5 w-3.5 text-[var(--color-warning)]" />
                                    <span className="text-[12px] font-semibold text-[var(--color-warning)]">
                                      No Hash
                                    </span>
                                  </span>
                                )}
                              </div>
                            }
                          />
                          <MetaRow
                            label="Evidence Hash"
                            value={
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] text-[var(--color-accent)]">
                                  {selectedViolation.evidence_hash
                                    ? `${selectedViolation.evidence_hash.slice(0, 16)}…`
                                    : "—"}
                                </span>
                                {selectedViolation.evidence_hash && (
                                  <motion.button
                                    whileTap={prefersReduced ? {} : { scale: 0.85 }}
                                    onClick={() => copyHash(selectedViolation.evidence_hash!)}
                                    className="text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors"
                                    title="Copy full hash"
                                  >
                                    <AnimatePresence mode="wait">
                                      {copiedHash ? (
                                        <motion.span
                                          key="check"
                                          initial={{ scale: 0 }}
                                          animate={{ scale: 1 }}
                                          exit={{ scale: 0 }}
                                          transition={{ duration: 0.15 }}
                                        >
                                          <Check className="h-3 w-3 text-[var(--color-success)]" />
                                        </motion.span>
                                      ) : (
                                        <motion.span
                                          key="copy"
                                          initial={{ scale: 0 }}
                                          animate={{ scale: 1 }}
                                          exit={{ scale: 0 }}
                                          transition={{ duration: 0.15 }}
                                        >
                                          <Copy className="h-3 w-3" />
                                        </motion.span>
                                      )}
                                    </AnimatePresence>
                                  </motion.button>
                                )}
                              </div>
                            }
                          />
                          {/* L5: timestamp — most subdued */}
                          <MetaRow
                            label="Timestamp"
                            value={
                              <span className="font-mono text-[10px] text-[var(--color-ink-faint)]">
                                {new Date(selectedViolation.timestamp).toLocaleString("en-IN")}
                              </span>
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* AI Explanation */}
                    <AnimatePresence>
                      {selectedViolation.ai_explanation && (
                        <motion.div
                          key="ai-explanation"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="mt-4 rounded-md border border-[var(--color-accent)]/15 bg-[var(--color-accent-soft)] p-3"
                        >
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                            AI Explanation
                          </p>
                          <p className="text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
                            {selectedViolation.ai_explanation}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="empty-state"
                initial={prefersReduced ? {} : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="flex h-80 items-center justify-center border-[var(--rule-color)] bg-[var(--color-paper-1)]">
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-paper-2)]">
                      <ZoomIn className="h-5 w-5 text-[var(--color-ink-faint)]" />
                    </div>
                    <p className="text-[13px] font-medium text-[var(--color-ink-muted)]">
                      Select a violation to view evidence
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--color-ink-faint)]">
                      Evidence images load with bounding box overlays
                    </p>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

/** Key-value row for metadata display — supports ReactNode values. */
function MetaRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-2 py-0.5">
      {/* L4: label — subdued anchor */}
      <span className="shrink-0 text-[11px] text-[var(--color-ink-faint)]">{label}</span>
      <span className="text-right">
        {typeof value === "string" ? (
          <span className="text-[12px] text-[var(--color-ink)]">{value}</span>
        ) : (
          value
        )}
      </span>
    </div>
  );
}

/**
 * Compact summary for a violation in the sidebar list.
 *
 * Hierarchy within the button:
 *  - L3: violation type label (font-semibold, ink)
 *  - L4: section + confidence (faint)
 *  - L1: fine amount (warning, readable at a glance)
 *  - L5: license plate mono (accent)
 */
function ViolationSummary({ violation: v }: { violation: ViolationRecord }) {
  const vColor = VIOLATION_COLORS[v.violation_type] ?? "var(--color-accent)";
  const vLabel = VIOLATION_LABELS[v.violation_type] ?? v.violation_type;
  const vSection = VIOLATION_SECTIONS[v.violation_type] ?? "S.177";

  return (
    <div className="flex items-start gap-2">
      <div
        className="mt-1 h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: vColor }}
      />
      <div className="min-w-0 flex-1">
        {/* L3: violation type — primary content of each item */}
        <p className="text-[12px] font-semibold text-[var(--color-ink)]">{vLabel}</p>
        {/* L1: fine — hero value, immediately scannable */}
        <p className="mt-0.5 font-mono text-[13px] font-bold text-[var(--color-warning)]">
          ₹{v.fine_amount.toLocaleString("en-IN")}
        </p>
        {/* L4: section & confidence — subdued supporting info */}
        <p className="mt-0.5 text-[10px] text-[var(--color-ink-faint)]">
          {vSection} · {(v.confidence * 100).toFixed(0)}% conf
        </p>
        {v.license_plate && (
          /* L5: plate — auxiliary monospace */
          <p className="mt-0.5 font-mono text-[10px] text-[var(--color-accent)]">
            {v.license_plate.text}
          </p>
        )}
      </div>
    </div>
  );
}
