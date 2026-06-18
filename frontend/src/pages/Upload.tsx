/**
 * Upload page — drag-and-drop image upload for violation detection.
 *
 * F10: Batch Multi-File Upload — accept up to 10 images, process
 * sequentially, and show aggregate results with per-file status.
 *
 * Design: "Detection Pipeline Console"
 * - Glass-morphic drop zone with animated border
 * - Stepped pipeline visualization with timing stages
 * - Rich violation result cards with shadcn components
 * - AnnotatedViewer with bbox overlays
 * - Batch progress bar with per-file status tracking
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
  X,
  FileImage,
  Trash2,
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
import { UploadArrow } from "@/components/icons";

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

/** Maximum number of files in a batch. */
const MAX_BATCH_SIZE = 10;

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

/** Status of a single file in the batch queue. */
type FileStatus = "queued" | "processing" | "done" | "error";

/** Tracked file in the batch queue. */
interface BatchFile {
  file: File;
  preview: string;
  status: FileStatus;
  result: DetectResponse | null;
  error: string | null;
}

export default function Upload() {
  const [batchFiles, setBatchFiles] = useState<BatchFile[]>([]);
  const [cameraId, setCameraId] = useState("");
  const [dragOver, setDragOver] = useState(false);
  /** Index of the file currently shown in the results panel. */
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  /** Whether batch processing is running. */
  const [batchRunning, setBatchRunning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const signalState = useAppStore((s) => s.signalState);
  const setLastDetection = useAppStore((s) => s.setLastDetection);

  /** Add files to the batch (respects MAX_BATCH_SIZE). */
  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    setBatchFiles((prev) => {
      const remaining = MAX_BATCH_SIZE - prev.length;
      const toAdd = arr.slice(0, remaining);
      return [
        ...prev,
        ...toAdd.map((f) => ({
          file: f,
          preview: URL.createObjectURL(f),
          status: "queued" as FileStatus,
          result: null as DetectResponse | null,
          error: null as string | null,
        })),
      ];
    });
  }, []);

  /** Remove a file from the batch by index. */
  const removeFile = useCallback((index: number) => {
    setBatchFiles((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].preview);
      next.splice(index, 1);
      return next;
    });
    setActiveIndex((prev) => {
      if (prev === null) return null;
      if (prev >= index && prev > 0) return prev - 1;
      return prev;
    });
  }, []);

  /** Clear the entire batch. */
  const clearBatch = useCallback(() => {
    batchFiles.forEach((bf) => URL.revokeObjectURL(bf.preview));
    setBatchFiles([]);
    setActiveIndex(null);
  }, [batchFiles]);

  /** Run batch detection — process each file sequentially. */
  const runBatch = async () => {
    setBatchRunning(true);

    for (let i = 0; i < batchFiles.length; i++) {
      const bf = batchFiles[i];
      if (bf.status === "done") continue; // skip already processed

      // Mark current file as processing
      setBatchFiles((prev) => {
        const next = [...prev];
        next[i] = { ...next[i], status: "processing" };
        return next;
      });
      setActiveIndex(i);

      try {
        const res = await detectViolation(bf.file, cameraId || undefined);
        setBatchFiles((prev) => {
          const next = [...prev];
          next[i] = { ...next[i], status: "done", result: res };
          return next;
        });
        // Update store with the latest detection
        setLastDetection(res.violations);
      } catch (err) {
        setBatchFiles((prev) => {
          const next = [...prev];
          next[i] = {
            ...next[i],
            status: "error",
            error: err instanceof Error ? err.message : "Detection failed",
          };
          return next;
        });
      }
    }

    setBatchRunning(false);
  };

  /** The currently active file for the results panel. */
  const activeFile = activeIndex !== null ? batchFiles[activeIndex] : null;

  /** Aggregate batch stats. */
  const batchStats = {
    total: batchFiles.length,
    done: batchFiles.filter((bf) => bf.status === "done").length,
    errors: batchFiles.filter((bf) => bf.status === "error").length,
    totalViolations: batchFiles.reduce(
      (sum, bf) => sum + (bf.result?.violations.length ?? 0),
      0,
    ),
    totalTime: batchFiles.reduce(
      (sum, bf) => sum + (bf.result?.processing_time_ms ?? 0),
      0,
    ),
  };

  /** Compute the max stage duration for scaling waterfall bars. */
  const maxMs = activeFile?.result
    ? Math.max(
        ...Object.values(activeFile.result.timing_breakdown).map((v) => Number(v)),
        1,
      )
    : 1;

  return (
    <div className="p-5">
      <header className="mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-accent-soft)] ring-1 ring-[var(--color-accent)]/15">
            <UploadArrow className="h-4 w-4 text-[var(--color-accent)]" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">
              Detect Violations
            </h1>
            <p className="text-[11px] text-[var(--color-ink-faint)]">
              Upload up to {MAX_BATCH_SIZE} traffic camera images for batch violation detection
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
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              addFiles(e.dataTransfer.files);
            }}
            onClick={() => fileRef.current?.click()}
            className={cn(
              "group relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-all duration-300",
              dragOver
                ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5"
                : batchFiles.length > 0
                  ? "border-[var(--color-accent)]/40 bg-[var(--color-paper-1)]/50"
                  : "border-[var(--color-paper-3)] bg-[var(--color-paper-1)]/30 hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-paper-1)]/50",
            )}
          >
            {/* Animated border glow on drag */}
            {dragOver && (
              <div className="absolute inset-0 rounded-lg glow-accent pointer-events-none" />
            )}

            {batchFiles.length > 0 ? (
              <div className="w-full">
                <p className="mb-2 text-center text-[11px] text-[var(--color-ink-faint)]">
                  {batchFiles.length}/{MAX_BATCH_SIZE} files queued — click to add more
                </p>
              </div>
            ) : (
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-paper-3)]/40">
                  <UploadIcon className="h-5 w-5 text-[var(--color-ink-faint)]" />
                </div>
                <p className="text-sm text-[var(--color-ink-muted)]">
                  Drop images or click to browse
                </p>
                <p className="mt-1 text-[10px] text-[var(--color-ink-faint)]">
                  JPEG / PNG, max 10MB each, up to {MAX_BATCH_SIZE} files
                </p>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {/* Batch file list */}
          {batchFiles.length > 0 && (
            <Card className="border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/70">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
                    Batch Queue ({batchFiles.length}/{MAX_BATCH_SIZE})
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearBatch}
                    disabled={batchRunning}
                    className="h-5 text-[9px] text-[var(--color-ink-faint)] hover:text-[var(--color-danger)]"
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Clear
                  </Button>
                </div>
                <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
                  {batchFiles.map((bf, i) => (
                    <div
                      key={i}
                      onClick={() => setActiveIndex(i)}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-colors",
                        activeIndex === i
                          ? "bg-[var(--color-accent)]/10 ring-1 ring-[var(--color-accent)]/30"
                          : "hover:bg-[var(--color-paper-2)]/50",
                      )}
                    >
                      <FileImage className="h-3.5 w-3.5 shrink-0 text-[var(--color-ink-faint)]" />
                      <span className="flex-1 truncate text-[11px] text-[var(--color-ink-muted)]">
                        {bf.file.name}
                      </span>
                      {bf.status === "done" && (
                        <CheckCircle2 className="h-3 w-3 shrink-0 text-[var(--color-success)]" />
                      )}
                      {bf.status === "error" && (
                        <XCircle className="h-3 w-3 shrink-0 text-[var(--color-danger)]" />
                      )}
                      {bf.status === "processing" && (
                        <Loader2 className="h-3 w-3 shrink-0 animate-spin text-[var(--color-accent)]" />
                      )}
                      {bf.status === "done" && bf.result && (
                        <Badge variant="outline" className="text-[8px] h-4 border-[var(--color-accent)]/30 text-[var(--color-accent)]">
                          {bf.result.violations.length}V
                        </Badge>
                      )}
                      {!batchRunning && (
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                          className="shrink-0 text-[var(--color-ink-faint)] hover:text-[var(--color-danger)]"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {/* Batch progress */}
                {batchRunning && (
                  <div className="space-y-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-paper-3)]/50">
                      <div
                        className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-500"
                        style={{ width: `${(batchStats.done / batchStats.total) * 100}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-[var(--color-ink-faint)]">
                      Processing {batchStats.done + 1}/{batchStats.total}…
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Controls */}
          <Card className="border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/70">
            <CardContent className="space-y-3 p-3.5">
              {/* Camera select */}
              <div>
                <label className="mb-1.5 block text-[10px] font-medium tracking-wider text-[var(--color-ink-faint)] uppercase">
                  Camera ID
                </label>
                <Select value={cameraId} onValueChange={(val) => { if (val !== null) setCameraId(val); }}>
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

              {/* Batch submit button */}
              <Button
                onClick={runBatch}
                disabled={batchFiles.length === 0 || batchRunning}
                className={cn(
                  "w-full text-xs font-semibold",
                  batchFiles.length > 0 && !batchRunning
                    ? "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-bright)]"
                    : "bg-[var(--color-paper-3)] text-[var(--color-ink-faint)]",
                )}
              >
                {batchRunning ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Processing ({batchStats.done}/{batchStats.total})…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5" />
                    Run Detection{batchFiles.length > 1 ? ` (${batchFiles.length} files)` : ""}
                  </span>
                )}
              </Button>

              {/* Batch aggregate summary */}
              {batchStats.done > 0 && !batchRunning && (
                <div className="rounded-md bg-[var(--color-success)]/8 px-3 py-2 ring-1 ring-[var(--color-success)]/20">
                  <p className="text-[11px] font-medium text-[var(--color-success)]">
                    Batch complete: {batchStats.totalViolations} violation(s) across {batchStats.done} image(s)
                  </p>
                  <p className="text-[9px] text-[var(--color-success)]/70">
                    Total processing time: {batchStats.totalTime}ms
                    {batchStats.errors > 0 && ` · ${batchStats.errors} error(s)`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Results panel — 3 cols */}
        <div className="lg:col-span-3">
          {activeFile?.result ? (
            <div className="space-y-4">
              {/* Result summary */}
              <div className="flex items-center gap-3 rounded-lg bg-[var(--color-success)]/8 px-4 py-2.5 ring-1 ring-[var(--color-success)]/20">
                <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
                <span className="text-sm font-medium text-[var(--color-success)]">
                  {activeFile.result.violations.length} violation(s) detected
                </span>
                <Separator orientation="vertical" className="h-4 bg-[var(--color-success)]/20" />
                <span className="font-mono text-xs tabular-nums text-[var(--color-success)]/80">
                  {activeFile.result.processing_time_ms}ms
                </span>
                <span className="text-[10px] text-[var(--color-success)]/60">
                  — {activeFile.file.name}
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
                      {activeFile.result.processing_time_ms}ms total
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {PIPELINE_STAGES.map((stage) => {
                      const ms =
                        (activeFile.result!.timing_breakdown as unknown as Record<string, number>)[
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
              {activeFile.preview && activeFile.result.violations.length > 0 && (
                <Card className="border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/70 overflow-hidden">
                  <CardContent className="p-2">
                    <AnnotatedViewer
                      imageUrl={activeFile.preview}
                      violations={activeFile.result.violations}
                      alt="Detected violations"
                    />
                  </CardContent>
                </Card>
              )}

              {/* Violation result cards */}
              <div className="space-y-2">
                {activeFile.result.violations.map((v: ViolationRecord) => (
                  <ViolationResultCard key={v.id} violation={v} />
                ))}
              </div>
            </div>
          ) : activeFile?.error ? (
            <Card className="flex h-80 items-center justify-center border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5">
              <div className="text-center">
                <XCircle className="mx-auto mb-3 h-8 w-8 text-[var(--color-danger)]" />
                <p className="text-sm font-medium text-[var(--color-danger)]">
                  Detection Failed
                </p>
                <p className="mt-1 text-[11px] text-[var(--color-danger)]/70">
                  {activeFile.error}
                </p>
                <p className="mt-0.5 text-[10px] text-[var(--color-ink-faint)]">
                  — {activeFile.file.name}
                </p>
              </div>
            </Card>
          ) : (
            <Card className="flex h-80 items-center justify-center border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/30">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-paper-3)]/30">
                  <AlertTriangle className="h-5 w-5 text-[var(--color-ink-faint)]" />
                </div>
                <p className="text-sm text-[var(--color-ink-muted)]">
                  Upload images to see detection results
                </p>
                <p className="mt-1 text-[10px] text-[var(--color-ink-faint)]">
                  Select up to {MAX_BATCH_SIZE} files for batch processing
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
              {v.danger_score > 0 && (
                <Badge variant="outline" className="text-[9px] border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 text-[var(--color-danger)]">
                  ⚠ {v.danger_score}
                </Badge>
              )}
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
            {v.ai_explanation && (
              <span className="truncate max-w-xs" title={v.ai_explanation}>
                {v.ai_explanation.slice(0, 80)}{v.ai_explanation.length > 80 ? "…" : ""}
              </span>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
