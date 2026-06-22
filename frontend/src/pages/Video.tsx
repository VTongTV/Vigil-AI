/**
 * Video page — drag-and-drop video upload for frame-by-frame violation detection.
 *
 * Processes uploaded video through the detection pipeline at configurable FPS.
 * Shows per-frame results with violation types, timestamps, and a timeline view.
 *
 * Design: matches Upload page glass-morphic style with pipeline visualization.
 */

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Video as VideoIcon,
  Upload as UploadIcon,
  Loader2,
  AlertTriangle,
  Play,
  Film,
  Clock,
} from "lucide-react";
import { detectVideo } from "@/lib/api";
import type { VideoDetectResponse, VideoFrameResult } from "@/types/violation";
import { VIOLATION_LABELS, VIOLATION_COLORS } from "@/types/violation";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
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

const DEMO_CAMERAS = [
  { id: "MGROAD-01", name: "MG Road — Trinity Circle" },
  { id: "SILKBOARD-01", name: "Silk Board Junction" },
  { id: "HEBBAL-01", name: "Hebbal Flyover" },
  { id: "WHITEFIELD-01", name: "Whitefield Main Road" },
  { id: "ELECTRONIC-01", name: "Electronic City Phase 1" },
  { id: "MARATHAHALLI-01", name: "Marathahalli Bridge" },
  { id: "KRPURAM-01", name: "KR Puram Railway Junction" },
  { id: "KORMANGALA-01", name: "Koramangala 100ft Road" },
];

const FPS_OPTIONS = [0.5, 1, 2, 5];

type ProcessingStatus = "idle" | "processing" | "done" | "error";

export default function Video() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraId, setCameraId] = useState("");
  const [fps, setFps] = useState<string>("1");
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [result, setResult] = useState<VideoDetectResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const prefersReduced = useReducedMotion();
  const demoMode = useAppStore((s) => s.demoMode);

  /** Handle file selection from input or drop. */
  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("video/")) {
      setError("Please select a video file (MP4, AVI, MOV, MKV, WebM).");
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setResult(null);
    setError(null);
    setStatus("idle");
    setProgress({ processed: 0, total: 0 });
  }, []);

  /** Run video detection. */
  const runDetection = useCallback(async () => {
    if (!file) return;

    setStatus("processing");
    setError(null);
    setProgress({ processed: 0, total: 1 });

    try {
      // Simulate progress ticks during processing
      const progressTimer = setInterval(() => {
        setProgress((prev) => ({
          processed: Math.min(prev.processed + 1, prev.total + 4),
          total: prev.total + 4,
        }));
      }, 800);

      const res = await detectVideo(file, cameraId || undefined, Number(fps));

      clearInterval(progressTimer);
      setResult(res);
      setStatus("done");
      setProgress({ processed: res.frames_processed, total: res.total_frames });
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Video processing failed");
    }
  }, [file, cameraId, fps, demoMode]);

  /** Reset state for a new upload. */
  const reset = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setStatus("idle");
    setProgress({ processed: 0, total: 0 });
  }, [previewUrl]);

  const formatMs = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
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
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-accent-soft)] ring-1 ring-[var(--color-accent)]/15">
              <Film className="h-4 w-4 text-[var(--color-accent)]" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">
                Video Analysis
              </h1>
              <p className="text-[11px] text-[var(--color-ink-faint)]">
                Upload traffic camera footage for frame-by-frame violation detection
              </p>
            </div>
          </div>
          {result && status !== "processing" && (
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-[var(--color-success)]/10 px-2.5 py-1 font-mono text-[13px] font-bold tabular-nums text-[var(--color-success)] ring-1 ring-[var(--color-success)]/20">
                {result.total_violations} violation{result.total_violations !== 1 ? "s" : ""}
              </span>
              <span className="rounded-md bg-[var(--color-paper-2)] px-2.5 py-1 font-mono text-[12px] tabular-nums text-[var(--color-ink-muted)] ring-1 ring-[var(--color-paper-3)]/50">
                {formatMs(result.processing_time_ms)}
              </span>
            </div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ── Left: Upload + Controls ── */}
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Drop zone */}
            <motion.div
              animate={prefersReduced ? {} : dragOver ? { scale: 1.02 } : { scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files[0];
                if (f) handleFile(f);
              }}
              onClick={() => fileRef.current?.click()}
              className={cn(
                "group relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 h-[280px]",
                dragOver
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5"
                  : file
                    ? "border-[var(--color-accent)]/40 bg-[var(--color-paper-1)]/50"
                    : "border-[var(--color-paper-3)] bg-[var(--color-paper-1)]/30 hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-paper-1)]/50",
              )}
            >
              {dragOver && (
                <div className="absolute inset-0 rounded-lg glow-accent pointer-events-none" />
              )}

              {file ? (
                <div className="text-center space-y-2">
                  <VideoIcon className="mx-auto h-8 w-8 text-[var(--color-accent)]" />
                  <p className="text-sm font-medium text-[var(--color-ink)] truncate max-w-[200px]">
                    {file.name}
                  </p>
                  <p className="text-[11px] text-[var(--color-ink-faint)]">
                    {(file.size / (1024 * 1024)).toFixed(1)} MB — click to change
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-paper-3)]/40">
                    <UploadIcon className="h-5 w-5 text-[var(--color-ink-faint)]" />
                  </div>
                  <p className="text-sm text-[var(--color-ink-muted)]">
                    Drop a video or click to browse
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--color-ink-faint)]">
                    MP4 / AVI / MOV / MKV / WebM, max 200MB, 120s
                  </p>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".mp4,.avi,.mov,.mkv,.webm,video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
            </motion.div>

            {/* Controls card */}
            <Card className="border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/70 h-[280px] flex flex-col justify-between">
              <CardContent className="space-y-3 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
                  Processing Settings
                </p>

                {/* FPS selector */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold tracking-wider text-[var(--color-ink-faint)] uppercase">
                    Frame Rate
                  </label>
                  <Select value={fps} onValueChange={(v) => { if (v) setFps(v); }}>
                    <SelectTrigger className="h-8 border-[var(--color-paper-3)] bg-[var(--color-paper-2)]/50 text-[12px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FPS_OPTIONS.map((f) => (
                        <SelectItem key={f} value={String(f)}>
                          <span className="text-[12px]">{f} fps</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Camera selector */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold tracking-wider text-[var(--color-ink-faint)] uppercase">
                    Camera ID
                  </label>
                  <Select value={cameraId} onValueChange={(val) => { if (val !== null) setCameraId(val); }}>
                    <SelectTrigger className="h-8 border-[var(--color-paper-3)] bg-[var(--color-paper-2)]/50 text-[12px]">
                      <SelectValue placeholder="Select camera (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEMO_CAMERAS.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="text-[12px]">{c.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 pt-1">
                  <Button
                    onClick={runDetection}
                    disabled={!file || status === "processing"}
                    className={cn(
                      "flex-1 h-9 text-[13px] font-semibold",
                      file && status !== "processing"
                        ? "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-bright)]"
                        : "bg-[var(--color-paper-3)] text-[var(--color-ink-faint)]",
                    )}
                  >
                    {status === "processing" ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Play className="h-4 w-4" />
                        Process Video
                      </span>
                    )}
                  </Button>
                  {file && status !== "processing" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={reset}
                      className="h-9 text-[12px] text-[var(--color-ink-faint)] hover:text-[var(--color-danger)]"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Processing progress */}
          <AnimatePresence>
            {status === "processing" && (
              <motion.div
                initial={prefersReduced ? {} : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                <Card className="border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Loader2 className="h-4 w-4 animate-spin text-[var(--color-accent)]" />
                      <span className="text-[13px] font-semibold text-[var(--color-ink)]">
                        Analyzing video frames…
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-paper-3)]/50">
                      <motion.div
                        className="h-full rounded-full bg-[var(--color-accent)]"
                        initial={{ width: "10%" }}
                        animate={{ width: progress.total > 0 ? `${(progress.processed / progress.total) * 100}%` : "60%" }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-[var(--color-ink-faint)]">
                      Extracting and analyzing frames at {fps} fps — this may take a moment
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error state */}
          <AnimatePresence>
            {error && status === "error" && (
              <motion.div
                initial={prefersReduced ? {} : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card className="border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5">
                  <CardContent className="p-4 flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-[var(--color-danger)]" />
                    <div>
                      <p className="text-sm font-medium text-[var(--color-danger)]">
                        Processing Failed
                      </p>
                      <p className="text-[11px] text-[var(--color-danger)]/70">{error}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Frame-by-frame results */}
          <AnimatePresence mode="wait">
            {result && result.frame_results.length > 0 && (
              <motion.div
                key="frame-results"
                className="space-y-2"
                variants={prefersReduced ? {} : { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0 }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
                  Frames with Violations ({result.frame_results.length})
                </p>
                {result.frame_results.map((fr) => (
                  <FrameResultCard key={fr.frame_index} frame={fr} prefersReduced={prefersReduced ?? false} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Right: Results summary + Timeline ── */}
        <div className="flex flex-col gap-4">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="video-results"
                initial={prefersReduced ? {} : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-4"
              >
                {/* Summary card */}
                <Card className="border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/70">
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-[13px] font-semibold text-[var(--color-ink)]">
                        Processing Summary
                      </h3>
                      <span className="font-mono text-[18px] font-bold tabular-nums text-[var(--color-accent)]">
                        {formatMs(result.processing_time_ms)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Total Frames", value: result.total_frames, color: "var(--color-ink)" },
                        { label: "Processed", value: result.frames_processed, color: "var(--color-accent)" },
                        {
                          label: "Violations",
                          value: result.total_violations,
                          color: result.total_violations > 0 ? "var(--color-danger)" : "var(--color-success)",
                        },
                        {
                          label: "Frames w/ Issues",
                          value: result.frame_results.length,
                          color: result.frame_results.length > 0 ? "var(--color-warning)" : "var(--color-ink-muted)",
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="rounded-md bg-[var(--color-paper-2)]/50 px-3 py-2 text-center ring-1 ring-[var(--color-paper-3)]/50"
                        >
                          <span
                            className="block font-mono text-[20px] font-bold tabular-nums"
                            style={{ color: item.color }}
                          >
                            {item.value}
                          </span>
                          <span className="block text-[10px] text-[var(--color-ink-faint)]">
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Violation type breakdown */}
                {result.summary && typeof result.summary === "object" && "violation_counts" in result.summary && (
                  <Card className="border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/70">
                    <CardContent className="p-4">
                      <h3 className="mb-3 text-[13px] font-semibold text-[var(--color-ink)]">
                        Violation Breakdown
                      </h3>
                      <div className="space-y-2">
                        {Object.entries(result.summary.violation_counts as Record<string, number>).map(
                          ([type, count]) => {
                            const label = VIOLATION_LABELS[type as keyof typeof VIOLATION_LABELS] ?? type;
                            const color = VIOLATION_COLORS[type as keyof typeof VIOLATION_COLORS] ?? "var(--color-accent)";
                            return (
                              <div key={type} className="flex items-center gap-2.5">
                                <span
                                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                                  style={{ backgroundColor: color }}
                                />
                                <span className="flex-1 text-[12px] font-medium text-[var(--color-ink)]">
                                  {label}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[11px] font-mono"
                                  style={{ borderColor: color, color }}
                                >
                                  {count}
                                </Badge>
                              </div>
                            );
                          },
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Timeline visualization */}
                {result.frames_processed > 0 && (
                  <Card className="border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/70">
                    <CardContent className="p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-[var(--color-ink-faint)]" />
                        <h3 className="text-[13px] font-semibold text-[var(--color-ink)]">
                          Timeline
                        </h3>
                        <span className="ml-auto text-[10px] font-mono text-[var(--color-ink-faint)]">
                          {result.frames_processed} frames
                        </span>
                      </div>
                      <div className="relative h-6 overflow-hidden rounded bg-[var(--color-paper-3)]/30">
                        {result.frame_results.map((fr) => {
                          const left = (fr.frame_index / Math.max(result.total_frames - 1, 1)) * 100;
                          return (
                            <motion.div
                              key={fr.frame_index}
                              className="absolute top-0 h-full w-1.5 rounded-sm"
                              style={{ left: `${left}%` }}
                              initial={prefersReduced ? { opacity: 1 } : { opacity: 0, scaleY: 0 }}
                              animate={{ opacity: 0.85, scaleY: 1 }}
                              transition={{ duration: 0.3, delay: fr.frame_index * 0.01 }}
                            >
                              {/* Stack violation type colors vertically */}
                              <div className="flex h-full flex-col">
                                {fr.violation_types.map((vt, i) => (
                                  <div
                                    key={i}
                                    className="flex-1"
                                    style={{
                                      backgroundColor: VIOLATION_COLORS[vt as keyof typeof VIOLATION_COLORS] ?? "var(--color-accent)",
                                    }}
                                  />
                                ))}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                      <div className="mt-1.5 flex justify-between text-[10px] font-mono text-[var(--color-ink-faint)]">
                        <span>0s</span>
                        <span>{(result.total_frames / (result.frames_processed / (result.frame_results.length || 1))).toFixed(0)}s est.</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Video preview */}
                {previewUrl && (
                  <Card className="border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/70 overflow-hidden">
                    <CardContent className="p-2">
                      <video
                        src={previewUrl}
                        controls
                        className="w-full rounded object-contain max-h-[400px]"
                      />
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            ) : !result && status === "idle" ? (
              <motion.div
                key="empty-state"
                initial={prefersReduced ? {} : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card className="flex h-[584px] items-center justify-center border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/30">
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-paper-3)]/30">
                      <Film className="h-5 w-5 text-[var(--color-ink-faint)]" />
                    </div>
                    <p className="text-sm text-[var(--color-ink-muted)]">
                      Upload a video to analyze
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--color-ink-faint)]">
                      Supports MP4, AVI, MOV, MKV, and WebM formats
                    </p>
                  </div>
                </Card>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

/** Compact result card for a single frame with violations. */
function FrameResultCard({
  frame,
  prefersReduced,
}: {
  frame: VideoFrameResult;
  prefersReduced: boolean;
}) {
  const formatTime = (ms: number) => {
    const s = ms / 1000;
    return s >= 60
      ? `${Math.floor(s / 60)}m ${Math.floor(s % 60)}s`
      : `${s.toFixed(1)}s`;
  };

  return (
    <motion.div
      variants={prefersReduced ? {} : {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 26 } },
      }}
    >
      <Card className="border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/70 overflow-hidden">
        <div className="flex">
          <div className="w-1 shrink-0 bg-[var(--color-warning)]" />
          <CardContent className="flex-1 p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[14px] font-semibold text-[var(--color-ink)]">
                  Frame #{frame.frame_index}
                </span>
                <span className="font-mono text-[11px] text-[var(--color-ink-faint)]">
                  {formatTime(frame.timestamp_ms)}
                </span>
              </div>
              <span className="font-mono text-[12px] font-semibold text-[var(--color-warning)]">
                {frame.violations_count} violation{frame.violations_count !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {frame.violation_types.map((vt, i) => {
                const label = VIOLATION_LABELS[vt as keyof typeof VIOLATION_LABELS] ?? vt;
                const color = VIOLATION_COLORS[vt as keyof typeof VIOLATION_COLORS] ?? "var(--color-accent)";
                return (
                  <Badge
                    key={i}
                    variant="outline"
                    className="text-[11px]"
                    style={{ borderColor: color, color, backgroundColor: `color-mix(in srgb, ${color} 8%, transparent)` }}
                  >
                    {label}
                  </Badge>
                );
              })}
            </div>
            {frame.evidence_url && (
              <p className="mt-1.5 text-[10px] text-[var(--color-ink-faint)]">
                Evidence saved
              </p>
            )}
          </CardContent>
        </div>
      </Card>
    </motion.div>
  );
}
