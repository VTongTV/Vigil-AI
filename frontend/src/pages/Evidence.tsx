/**
 * Evidence page — displays annotated evidence images with chain-of-custody
 * metadata, integrity verification badge, FIR PDF generation, and the
 * AnnotatedViewer for bbox overlays with split-view modes.
 *
 * Design: "Chain of Custody Console"
 * - Split layout: violation list + evidence viewer + metadata panel
 * - Hash displayed as monospace with copy affordance
 * - Integrity badge: verified (green) or missing (amber)
 * - FIR PDF download button
 * - Print button triggers browser dialog
 * - Clean metadata grid with labeled rows
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

  return (
    <div className="p-5">
      <header className="mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-accent-soft)] ring-1 ring-[var(--color-accent)]/15">
            <FileImage className="h-4 w-4 text-[var(--color-accent)]" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">
              Evidence Viewer
            </h1>
            <p className="text-[11px] text-[var(--color-ink-faint)]">
              Annotated evidence images with chain-of-custody hash
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
        {/* Violation list — 1 col */}
        <div className="space-y-2 lg:col-span-1">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
            Detected Violations
          </h2>
          {violations.length === 0 ? (
            <Card className="border-[var(--rule-color)] bg-[var(--color-paper-1)]">
              <CardContent className="flex flex-col items-center justify-center p-8">
                <FileImage className="mb-2 h-8 w-8 text-[var(--color-ink-faint)]" />
                <p className="text-center text-xs text-[var(--color-ink-muted)]">
                  No detection results yet.
                </p>
                <p className="text-center text-[11px] text-[var(--color-ink-faint)]">
                  Run detection from the Upload page.
                </p>
              </CardContent>
            </Card>
          ) : (
            violations.map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  setSelectedViolation(v);
                  setViewingId(v.id);
                }}
                className={cn(
                  "w-full rounded-md border p-2.5 text-left transition-all duration-200",
                  viewingId === v.id
                    ? "border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)] ring-1 ring-[var(--color-accent)]/20"
                    : "border-[var(--rule-color)] bg-[var(--color-paper-1)] hover:bg-[var(--color-paper-2)]",
                )}
              >
                <ViolationSummary violation={v} />
              </button>
            ))
          )}
        </div>

        {/* Evidence image + metadata — 3 cols */}
        <div className="lg:col-span-3">
          {selectedViolation?.evidence_url ? (
            <div className="space-y-4">
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

              {/* Chain of Custody metadata */}
              <Card className="border-[var(--rule-color)] bg-[var(--color-paper-1)]">
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
                      <Shield className="h-3 w-3" />
                      Chain of Custody
                    </h3>
                    <div className="flex items-center gap-2">
                      {/* FIR PDF Download Button (F2) */}
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "h-6 border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 text-[11px] text-[var(--color-accent)] hover:bg-[var(--color-accent)]/15 hover:text-[var(--color-accent-bright)]",
                          firLoading && "opacity-60 cursor-wait",
                        )}
                        onClick={handleFirDownload}
                        disabled={firLoading}
                      >
                        {firLoading ? (
                          <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                        ) : (
                          <FileDown className="mr-1.5 h-3 w-3" />
                        )}
                        {firLoading ? "Generating..." : "FIR PDF"}
                      </Button>
                      {/* Print Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 border-[var(--color-paper-3)] bg-[var(--color-paper-2)]/50 text-[11px] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                        onClick={handlePrint}
                      >
                        <Printer className="mr-1.5 h-3 w-3" />
                        Print Evidence
                      </Button>
                    </div>
                  </div>

                  {/* FIR error message */}
                  {firError && (
                    <div className="mb-3 flex items-center gap-2 rounded-md bg-[var(--color-danger)]/10 px-3 py-2">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-[var(--color-danger)]" />
                      <span className="text-[11px] text-[var(--color-danger)]">{firError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                    {/* Integrity Badge (F1) — verified or missing */}
                    <MetaRow
                      label="Integrity"
                      value={
                        <div className="flex items-center gap-1.5">
                          {hashPresent ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success-soft)] px-2 py-0.5 ring-1 ring-[var(--color-success)]/20">
                              <IntegrityShield className="h-3 w-3 text-[var(--color-success)]" />
                              <span className="text-[11px] font-medium text-[var(--color-success)]">
                                Verified
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-warning-soft)] px-2 py-0.5 ring-1 ring-[var(--color-warning)]/20">
                              <AlertCircle className="h-3 w-3 text-[var(--color-warning)]" />
                              <span className="text-[11px] font-medium text-[var(--color-warning)]">
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
                          <span className="font-mono text-[11px] text-[var(--color-accent)]">
                            {selectedViolation.evidence_hash
                              ? `${selectedViolation.evidence_hash.slice(0, 16)}…`
                              : "—"}
                          </span>
                          {selectedViolation.evidence_hash && (
                            <button
                              onClick={() => copyHash(selectedViolation.evidence_hash!)}
                              className="text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors"
                              title="Copy full hash"
                            >
                              {copiedHash ? (
                                <Check className="h-3 w-3 text-[var(--color-success)]" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          )}
                        </div>
                      }
                    />
                    <MetaRow
                      label="Violation ID"
                      value={
                        <span className="font-mono text-[11px] text-[var(--color-ink)]">
                          {selectedViolation.id}
                        </span>
                      }
                    />
                    <MetaRow
                      label="Timestamp"
                      value={
                        <span className="font-mono text-[11px] text-[var(--color-ink)]">
                          {new Date(selectedViolation.timestamp).toLocaleString("en-IN")}
                        </span>
                      }
                    />
                    <MetaRow
                      label="Camera"
                      value={
                        <span className="text-[11px] text-[var(--color-ink)]">
                          {selectedViolation.camera_id ?? "N/A"}
                        </span>
                      }
                    />
                    <MetaRow
                      label="Junction"
                      value={
                        <span className="text-[11px] text-[var(--color-ink)]">
                          {selectedViolation.junction_name ?? "N/A"}
                        </span>
                      }
                    />
                    <MetaRow
                      label="Danger Score"
                      value={
                        <span className={cn(
                          "inline-flex items-center gap-1 font-mono text-[11px] font-semibold",
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
                      label="Fine Amount"
                      value={
                        <span className="font-medium text-[var(--color-warning)]">
                          ₹{selectedViolation.fine_amount.toLocaleString("en-IN")}
                        </span>
                      }
                    />
                  </div>

                  {/* AI Explanation */}
                  {selectedViolation.ai_explanation && (
                    <div className="mt-3 rounded-md border border-[var(--color-accent)]/15 bg-[var(--color-accent-soft)] p-2.5">
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                        AI Explanation
                      </p>
                      <p className="text-[11px] leading-relaxed text-[var(--color-ink-muted)]">
                        {selectedViolation.ai_explanation}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="flex h-80 items-center justify-center border-[var(--rule-color)] bg-[var(--color-paper-1)]">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-paper-2)]">
                  <ZoomIn className="h-5 w-5 text-[var(--color-ink-faint)]" />
                </div>
                <p className="text-sm text-[var(--color-ink-muted)]">
                  Select a violation to view evidence
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/** Key-value row for metadata display. */
function MetaRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[11px] text-[var(--color-ink-faint)]">{label}</span>
      {typeof value === "string" ? (
        <span className="text-[11px] text-[var(--color-ink)]">{value}</span>
      ) : (
        value
      )}
    </div>
  );
}

/** Compact summary for a violation in the sidebar list. */
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
      <div>
        <p className="text-[12px] font-medium text-[var(--color-ink)]">{vLabel}</p>
        <p className="text-[11px] text-[var(--color-ink-faint)]">
          {vSection} · {(v.confidence * 100).toFixed(0)}% · ₹
          {v.fine_amount.toLocaleString("en-IN")}
        </p>
        {v.license_plate && (
          <p className="mt-0.5 font-mono text-[11px] text-[var(--color-accent)]">
            {v.license_plate.text}
          </p>
        )}
      </div>
    </div>
  );
}
