/**
 * Upload page — drag-and-drop image upload for violation detection.
 * Shows a pipeline waterfall chart for timing breakdown and the
 * AnnotatedViewer with overlaid bounding boxes for detection results.
 */

import { useState, useRef, useCallback } from "react";
import {
  Upload as UploadIcon,
  Camera,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { detectViolation } from "@/lib/api";
import type { DetectResponse, ViolationRecord } from "@/types/violation";
import {
  VIOLATION_LABELS,
  VIOLATION_COLORS,
  VIOLATION_SECTIONS,
} from "@/types/violation";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import AnnotatedViewer from "@/components/AnnotatedViewer";

const DEMO_CAMERAS = [
  { id: "MGROAD-01", name: "MG Road — Trinity Circle" },
  { id: "SILKBOARD-01", name: "Silk Board Junction" },
  { id: "HEBBAL-01", name: "Hebbal Flyover" },
  { id: "WHITEFIELD-01", name: "Whitefield Main Road" },
  { id: "ELECTRONIC-01", name: "Electronic City Phase 1" },
  { id: "MARATHAHALLI-01", name: "Marathahalli Bridge" },
  { id: "KRPURAM-01", name: "KR Puram Railway Junction" },
  { id: "YELAHANKA-01", name: "Yelahanka New Town" },
  { id: "BANNERGHATTA-01", name: "Bannerghatta Road — Jayadeva" },
  { id: "KORMANGALA-01", name: "Koramangala 100ft Road" },
];

/** Mapping from timing_breakdown keys to display labels and CSS colors. */
const PIPELINE_STAGES: { key: string; label: string; color: string }[] = [
  { key: "preprocess_ms", label: "Preprocess", color: "var(--color-ink-faint)" },
  { key: "detect_coco_ms", label: "COCO Detect", color: "var(--color-accent)" },
  { key: "detect_helmet_ms", label: "Helmet Detect", color: "var(--color-accent-bright)" },
  { key: "violation_logic_ms", label: "Violation Logic", color: "var(--color-warning)" },
  { key: "detect_plate_ms", label: "Plate Detect", color: "var(--color-triple)" },
  { key: "ocr_ms", label: "OCR", color: "var(--color-plate)" },
  { key: "evidence_gen_ms", label: "Evidence Gen", color: "var(--color-success)" },
];

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [cameraId, setCameraId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DetectResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const signalState = useAppStore((s) => s.signalState);
  const setLastDetection = useAppStore((s) => s.setLastDetection);

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please upload a JPEG or PNG image.");
      return;
    }
    setFile(f);
    setError(null);
    setResult(null);
    const url = URL.createObjectURL(f);
    setPreview(url);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const onSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const res = await detectViolation(file, cameraId || undefined);
      setResult(res);
      setLastDetection(res.violations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Detection failed");
    } finally {
      setLoading(false);
    }
  };

  /** Compute the max stage duration for scaling waterfall bars. */
  const maxMs = result
    ? Math.max(
        ...Object.values(result.timing_breakdown).map((v) => Number(v)),
        1,
      )
    : 1;

  return (
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-[var(--color-ink)]">
          Detect Violations
        </h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Upload a traffic camera image to run violation detection
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upload area */}
        <div>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors",
              "border-[var(--color-paper-3)] hover:border-[var(--color-accent-dim)] hover:bg-[var(--color-paper-1)]",
              preview &&
                "border-[var(--color-accent-dim)] bg-[var(--color-paper-1)]",
            )}
          >
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="max-h-64 rounded object-contain"
              />
            ) : (
              <>
                <UploadIcon className="mb-3 h-10 w-10 text-[var(--color-ink-faint)]" />
                <p className="text-sm text-[var(--color-ink-muted)]">
                  Drop image or click to browse
                </p>
                <p className="mt-1 text-xs text-[var(--color-ink-faint)]">
                  JPEG / PNG, max 10MB
                </p>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>

          {/* Controls */}
          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-ink-muted)]">
                Camera ID
              </label>
              <select
                value={cameraId}
                onChange={(e) => setCameraId(e.target.value)}
                className="w-full rounded-md border border-[var(--color-paper-3)] bg-[var(--color-paper-2)] px-3 py-2 text-sm text-[var(--color-ink)]"
              >
                <option value="">Select camera (optional)</option>
                {DEMO_CAMERAS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 rounded-md bg-[var(--color-paper-2)] px-3 py-2">
              <Camera className="h-4 w-4 text-[var(--color-ink-faint)]" />
              <span className="text-xs text-[var(--color-ink-muted)]">
                Signal:{" "}
                <span className="font-medium capitalize text-[var(--color-ink)]">
                  {signalState}
                </span>
              </span>
            </div>

            <button
              onClick={onSubmit}
              disabled={!file || loading}
              className={cn(
                "w-full rounded-md px-4 py-2.5 text-sm font-semibold transition-colors",
                file && !loading
                  ? "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-bright)]"
                  : "bg-[var(--color-paper-3)] text-[var(--color-ink-faint)] cursor-not-allowed",
              )}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </span>
              ) : (
                "Run Detection"
              )}
            </button>
          </div>

          {error && (
            <div className="mt-3 flex items-center gap-2 rounded-md bg-[var(--color-danger)]/10 px-3 py-2">
              <XCircle className="h-4 w-4 text-[var(--color-danger)]" />
              <span className="text-xs text-[var(--color-danger)]">{error}</span>
            </div>
          )}
        </div>

        {/* Results */}
        <div>
          {result ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-md bg-[var(--color-success)]/10 px-3 py-2">
                <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
                <span className="text-sm font-medium text-[var(--color-success)]">
                  {result.violations.length} violation(s) detected in{" "}
                  {result.processing_time_ms}ms
                </span>
              </div>

              {/* Pipeline waterfall chart */}
              <div className="rounded-lg border border-[var(--color-paper-3)] bg-[var(--color-paper-1)] p-4">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
                  Pipeline Timing — {result.processing_time_ms}ms total
                </h3>
                <div className="space-y-2">
                  {PIPELINE_STAGES.map((stage) => {
                    const ms =
                      (result.timing_breakdown as unknown as Record<string, number>)[
                        stage.key
                      ] ?? 0;
                    const pct = Math.max((ms / maxMs) * 100, 2);
                    return (
                      <div key={stage.key} className="flex items-center gap-3">
                        <span className="w-28 shrink-0 text-[10px] font-medium text-[var(--color-ink-muted)]">
                          {stage.label}
                        </span>
                        <div className="flex-1 overflow-hidden rounded bg-[var(--color-paper-3)]/50">
                          <div
                            className="h-5 rounded transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: stage.color,
                            }}
                          />
                        </div>
                        <span className="w-14 shrink-0 text-right font-mono text-[10px] tabular-nums text-[var(--color-ink)]">
                          {ms}ms
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Annotated image with bbox overlay */}
              {preview && result.violations.length > 0 && (
                <AnnotatedViewer
                  imageUrl={preview}
                  violations={result.violations}
                  className="rounded-lg border border-[var(--color-paper-3)] bg-[var(--color-paper-1)] p-2"
                  alt="Detected violations"
                />
              )}

              {/* Violation list */}
              <div className="space-y-2">
                {result.violations.map((v: ViolationRecord) => (
                  <ViolationCard key={v.id} violation={v} />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-[var(--color-paper-3)] bg-[var(--color-paper-1)] p-10">
              <div className="text-center">
                <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-[var(--color-ink-faint)]" />
                <p className="text-sm text-[var(--color-ink-muted)]">
                  Upload an image to see detection results
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Compact card for a single violation row in the results list. */
function ViolationCard({ violation }: { violation: ViolationRecord }) {
  const vColor =
    VIOLATION_COLORS[violation.violation_type] ?? "var(--color-accent)";
  const vLabel =
    VIOLATION_LABELS[violation.violation_type] ?? violation.violation_type;
  const vSection =
    VIOLATION_SECTIONS[violation.violation_type] ?? "S.177";

  return (
    <div className="flex items-start gap-3 rounded-md border border-[var(--color-paper-3)] bg-[var(--color-paper-1)] p-3">
      <div
        className="mt-0.5 h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: vColor }}
      />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--color-ink)]">
            {vLabel}
          </span>
          <span className="font-mono text-xs text-[var(--color-ink-muted)]">
            {vSection}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-[var(--color-ink-muted)]">
          <span>
            Confidence:{" "}
            <span className="font-medium text-[var(--color-ink)]">
              {(violation.confidence * 100).toFixed(0)}%
            </span>
          </span>
          <span className="capitalize">{violation.confidence_tier}</span>
          {violation.license_plate && (
            <span className="font-mono font-medium text-[var(--color-accent)]">
              {violation.license_plate.text}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
          Fine: ₹{violation.fine_amount.toLocaleString("en-IN")}
        </p>
      </div>
    </div>
  );
}
