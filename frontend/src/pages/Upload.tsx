/**
 * Upload page — drag-and-drop image upload for violation detection.
 *
 * Design: "Detection Pipeline Console"
 * - Glass-morphic drop zone with animated border
 * - Stepped pipeline visualization with timing stages
 * - Rich violation result cards with shadcn components
 * - AnnotatedViewer with bbox overlays
 */

import { useState, useRef, useCallback } from "react";
import {
  Upload as UploadIcon,
  Camera,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  ArrowRight,
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

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

/** Pipeline stages with display metadata. */
const PIPELINE_STAGES: { key: string; label: string; color: string; abbr: string }[] = [
  { key: "preprocess_ms", label: "Preprocess", color: "var(--color-ink-faint)", abbr: "PRE" },
  { key: "detect_coco_ms", label: "COCO Detect", color: "var(--color-accent)", abbr: "COCO" },
  { key: "detect_helmet_ms", label: "Helmet Detect", color: "var(--color-accent-bright)", abbr: "HELM" },
  { key: "violation_logic_ms", label: "Violation Logic", color: "var(--color-warning)", abbr: "VIOL" },
  { key: "detect_plate_ms", label: "Plate Detect", color: "var(--color-triple)", abbr: "PLATE" },
  { key: "ocr_ms", label: "OCR", color: "var(--color-plate)", abbr: "OCR" },
  { key: "evidence_gen_ms", label: "Evidence Gen", color: "var(--color-success)", abbr: "EVID" },
];

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [cameraId, setCameraId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DetectResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
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
      setDragOver(false);
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
    <div className="p-5">
      <header className="mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-accent)]/15">
            <Zap className="h-4 w-4 text-[var(--color-accent)]" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">
              Detect Violations
            </h1>
            <p className="text-[11px] text-[var(--color-ink-faint)]">
              Upload a traffic camera image to run the violation detection pipeline
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        {/* Upload panel — 2 cols */}
        <div className="space-y-4 lg:col-span-2">
          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={cn(
              "group relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-all duration-300",
              dragOver
                ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5"
                : preview
                  ? "border-[var(--color-accent)]/40 bg-[var(--color-paper-1)]/50"
                  : "border-[var(--color-paper-3)] bg-[var(--color-paper-1)]/30 hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-paper-1)]/50",
            )}
          >
            {/* Animated border glow on drag */}
            {dragOver && (
              <div className="absolute inset-0 rounded-lg glow-accent pointer-events-none" />
            )}

            {preview ? (
              <div className="relative w-full">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-56 mx-auto rounded object-contain"
                />
                <div className="absolute right-1 top-1">
                  <Badge
                    variant="outline"
                    className="border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[9px] text-[var(--color-success)]"
                  >
                    Ready
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-paper-3)]/40">
                  <UploadIcon className="h-5 w-5 text-[var(--color-ink-faint)]" />
                </div>
                <p className="text-sm text-[var(--color-ink-muted)]">
                  Drop image or click to browse
                </p>
                <p className="mt-1 text-[10px] text-[var(--color-ink-faint)]">
                  JPEG / PNG, max 10MB
                </p>
              </div>
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
          <Card className="border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/70">
            <CardContent className="space-y-3 p-3.5">
              {/* Camera select */}
              <div>
                <label className="mb-1.5 block text-[10px] font-medium tracking-wider text-[var(--color-ink-faint)] uppercase">
                  Camera ID
                </label>
                <Select value={cameraId} onValueChange={setCameraId}>
                  <SelectTrigger className="h-8 border-[var(--color-paper-3)] bg-[var(--color-paper-2)]/50 text-xs">
                    <SelectValue placeholder="Select camera (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEMO_CAMERAS.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="text-xs">{c.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Signal state */}
              <div className="flex items-center gap-2 rounded-md bg-[var(--color-paper-2)]/50 px-3 py-1.5">
                <Camera className="h-3.5 w-3.5 text-[var(--color-ink-faint)]" />
                <span className="text-[10px] text-[var(--color-ink-faint)] uppercase tracking-wider">
                  Signal:
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] font-mono",
                    signalState === "red"
                      ? "border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 text-[var(--color-danger)]"
                      : signalState === "green"
                        ? "border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]"
                        : "border-[var(--color-paper-4)] bg-[var(--color-paper-3)]/30 text-[var(--color-ink-faint)]",
                  )}
                >
                  {signalState.toUpperCase()}
                </Badge>
              </div>

              {/* Submit button */}
              <Button
                onClick={onSubmit}
                disabled={!file || loading}
                className={cn(
                  "w-full text-xs font-semibold",
                  file && !loading
                    ? "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-bright)]"
                    : "bg-[var(--color-paper-3)] text-[var(--color-ink-faint)]",
                )}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Processing pipeline...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5" />
                    Run Detection
                  </span>
                )}
              </Button>

              {error && (
                <div className="flex items-center gap-2 rounded-md bg-[var(--color-danger)]/10 px-3 py-2">
                  <XCircle className="h-3.5 w-3.5 shrink-0 text-[var(--color-danger)]" />
                  <span className="text-[11px] text-[var(--color-danger)]">{error}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Results panel — 3 cols */}
        <div className="lg:col-span-3">
          {result ? (
            <div className="space-y-4">
              {/* Result summary */}
              <div className="flex items-center gap-3 rounded-lg bg-[var(--color-success)]/8 px-4 py-2.5 ring-1 ring-[var(--color-success)]/20">
                <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
                <span className="text-sm font-medium text-[var(--color-success)]">
                  {result.violations.length} violation(s) detected
                </span>
                <Separator orientation="vertical" className="h-4 bg-[var(--color-success)]/20" />
                <span className="font-mono text-xs tabular-nums text-[var(--color-success)]/80">
                  {result.processing_time_ms}ms
                </span>
              </div>

              {/* Pipeline waterfall chart */}
              <Card className="border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/70">
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
                      Pipeline Timing
                    </h3>
                    <span className="font-mono text-[10px] tabular-nums text-[var(--color-accent)]">
                      {result.processing_time_ms}ms total
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {PIPELINE_STAGES.map((stage, i) => {
                      const ms =
                        (result.timing_breakdown as unknown as Record<string, number>)[
                          stage.key
                        ] ?? 0;
                      const pct = Math.max((ms / maxMs) * 100, 3);
                      return (
                        <div key={stage.key} className="flex items-center gap-2">
                          <span className="w-12 shrink-0 text-right font-mono text-[9px] font-medium text-[var(--color-ink-faint)]">
                            {stage.abbr}
                          </span>
                          <div className="flex-1 overflow-hidden rounded-sm bg-[var(--color-paper-3)]/30">
                            <div
                              className="h-4 rounded-sm transition-all duration-700"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: stage.color,
                                opacity: 0.7,
                              }}
                            />
                          </div>
                          <span className="w-14 shrink-0 text-right font-mono text-[10px] tabular-nums text-[var(--color-ink-muted)]">
                            {ms}ms
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Annotated image */}
              {preview && result.violations.length > 0 && (
                <Card className="border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/70 overflow-hidden">
                  <CardContent className="p-2">
                    <AnnotatedViewer
                      imageUrl={preview}
                      violations={result.violations}
                      alt="Detected violations"
                    />
                  </CardContent>
                </Card>
              )}

              {/* Violation result cards */}
              <div className="space-y-2">
                {result.violations.map((v: ViolationRecord) => (
                  <ViolationResultCard key={v.id} violation={v} />
                ))}
              </div>
            </div>
          ) : (
            <Card className="flex h-80 items-center justify-center border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/30">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-paper-3)]/30">
                  <AlertTriangle className="h-5 w-5 text-[var(--color-ink-faint)]" />
                </div>
                <p className="text-sm text-[var(--color-ink-muted)]">
                  Upload an image to see detection results
                </p>
                <p className="mt-1 text-[10px] text-[var(--color-ink-faint)]">
                  The pipeline will process and return violations in real-time
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/** Compact result card for a single detected violation. */
function ViolationResultCard({ violation: v }: { violation: ViolationRecord }) {
  const vColor =
    VIOLATION_COLORS[v.violation_type] ?? "var(--color-accent)";
  const vLabel =
    VIOLATION_LABELS[v.violation_type] ?? v.violation_type;
  const vSection =
    VIOLATION_SECTIONS[v.violation_type] ?? "S.177";

  const tierColor = {
    high: "border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]",
    medium: "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
    low: "border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
  }[v.confidence_tier] ?? "";

  return (
    <Card className="border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/70 overflow-hidden">
      <div className="flex">
        {/* Left color accent strip */}
        <div className="w-1 shrink-0" style={{ backgroundColor: vColor }} />
        <CardContent className="flex-1 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--color-ink)]">
                {vLabel}
              </span>
              <Badge variant="outline" className={cn("text-[9px]", tierColor)}>
                {v.confidence_tier}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              {v.license_plate && (
                <span className="rounded bg-[var(--color-accent)]/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-[var(--color-accent)]">
                  {v.license_plate.text}
                </span>
              )}
              <span className="font-mono text-[11px] tabular-nums text-[var(--color-ink-muted)]">
                {(v.confidence * 100).toFixed(0)}%
              </span>
              <span className="font-mono text-[10px] text-[var(--color-ink-faint)]">
                {vSection}
              </span>
            </div>
          </div>
          <div className="mt-1 flex items-center gap-4 text-[10px] text-[var(--color-ink-faint)]">
            <span>
              Fine: <span className="font-medium text-[var(--color-warning)]">₹{v.fine_amount.toLocaleString("en-IN")}</span>
            </span>
            {v.camera_id && <span>Camera: {v.camera_id}</span>}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
