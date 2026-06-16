/**
 * Evidence page — displays annotated evidence images with chain-of-custody
 * metadata, a print button, and the AnnotatedViewer component for bbox
 * overlays.
 */

import { useState } from "react";
import { FileImage, ZoomIn, Hash, Printer } from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { ViolationRecord } from "@/types/violation";
import {
  VIOLATION_LABELS,
  VIOLATION_COLORS,
  VIOLATION_SECTIONS,
} from "@/types/violation";
import { cn } from "@/lib/utils";
import AnnotatedViewer from "@/components/AnnotatedViewer";

export default function Evidence() {
  const selectedViolation = useAppStore((s) => s.selectedViolation);
  const setSelectedViolation = useAppStore((s) => s.setSelectedViolation);
  const lastDetection = useAppStore((s) => s.lastDetection);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const violations = lastDetection ?? [];

  /** Trigger the browser print dialog for the evidence panel. */
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-[var(--color-ink)]">
          Evidence Viewer
        </h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Annotated evidence images with chain-of-custody hash
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Violation list */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
            Detected Violations
          </h2>
          {violations.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--color-paper-3)] bg-[var(--color-paper-1)] p-8">
              <FileImage className="mb-2 h-8 w-8 text-[var(--color-ink-faint)]" />
              <p className="text-sm text-[var(--color-ink-muted)]">
                No detection results yet. Run detection from the Upload page.
              </p>
            </div>
          ) : (
            violations.map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  setSelectedViolation(v);
                  setViewingId(v.id);
                }}
                className={cn(
                  "w-full rounded-md border p-3 text-left transition-colors",
                  viewingId === v.id
                    ? "border-[var(--color-accent-dim)] bg-[var(--color-accent-dim)]/10"
                    : "border-[var(--color-paper-3)] bg-[var(--color-paper-1)] hover:bg-[var(--color-paper-2)]",
                )}
              >
                <ViolationSummary violation={v} />
              </button>
            ))
          )}
        </div>

        {/* Evidence image + metadata */}
        <div className="lg:col-span-2">
          {selectedViolation?.evidence_url ? (
            <div className="space-y-4">
              {/* Annotated evidence image */}
              <div className="rounded-lg border border-[var(--color-paper-3)] bg-[var(--color-paper-1)] p-2">
                <AnnotatedViewer
                  imageUrl={`http://localhost:8000${selectedViolation.evidence_url}`}
                  violations={[selectedViolation]}
                  alt={`Evidence for ${selectedViolation.id}`}
                />
              </div>

              {/* Evidence metadata + print button */}
              <div className="rounded-lg border border-[var(--color-paper-3)] bg-[var(--color-paper-1)] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
                    <Hash className="h-3 w-3" />
                    Chain of Custody
                  </h3>
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 rounded-md border border-[var(--color-paper-3)] bg-[var(--color-paper-2)] px-3 py-1.5 text-[10px] font-medium text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)]"
                  >
                    <Printer className="h-3 w-3" />
                    Print Evidence
                  </button>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[var(--color-ink-muted)]">
                      Evidence Hash
                    </span>
                    <span className="font-mono text-[var(--color-accent)]">
                      {selectedViolation.evidence_hash ?? "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-ink-muted)]">
                      Violation ID
                    </span>
                    <span className="font-mono text-[var(--color-ink)]">
                      {selectedViolation.id}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-ink-muted)]">
                      Timestamp
                    </span>
                    <span className="font-mono text-[var(--color-ink)]">
                      {new Date(
                        selectedViolation.timestamp,
                      ).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-ink-muted)]">
                      Camera
                    </span>
                    <span className="text-[var(--color-ink)]">
                      {selectedViolation.camera_id ?? "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-ink-muted)]">
                      Junction
                    </span>
                    <span className="text-[var(--color-ink)]">
                      {selectedViolation.junction_name ?? "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-ink-muted)]">
                      Fine Amount
                    </span>
                    <span className="font-medium text-[var(--color-warning)]">
                      ₹{selectedViolation.fine_amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-96 items-center justify-center rounded-lg border border-[var(--color-paper-3)] bg-[var(--color-paper-1)]">
              <div className="text-center">
                <ZoomIn className="mx-auto mb-3 h-8 w-8 text-[var(--color-ink-faint)]" />
                <p className="text-sm text-[var(--color-ink-muted)]">
                  Select a violation to view evidence
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
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
        <p className="text-sm font-medium text-[var(--color-ink)]">{vLabel}</p>
        <p className="text-[10px] text-[var(--color-ink-muted)]">
          {vSection} · {(v.confidence * 100).toFixed(0)}% · ₹
          {v.fine_amount.toLocaleString("en-IN")}
        </p>
        {v.license_plate && (
          <p className="mt-0.5 font-mono text-[10px] text-[var(--color-accent)]">
            {v.license_plate.text}
          </p>
        )}
      </div>
    </div>
  );
}
