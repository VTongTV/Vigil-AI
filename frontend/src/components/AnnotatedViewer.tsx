/**
 * AnnotatedViewer — renders an image with violation bounding boxes overlaid
 * using a canvas positioned on top of the image element.
 *
 * F11: Split-View Modes
 * - Original: image only, no canvas overlay
 * - Annotated: image + full-opacity bbox overlay (default)
 * - Overlay: image + adjustable-opacity bbox overlay with slider
 *
 * Bounding boxes are normalized (0–1) and scaled to the image's display
 * dimensions at render time.
 */

import { useRef, useEffect, useCallback, useState } from "react";
import { Eye, Layers, Image } from "lucide-react";
import type { ViolationRecord, ViolationType } from "@/types/violation";
import { VIOLATION_COLORS, VIOLATION_LABELS } from "@/types/violation";
import { cn } from "@/lib/utils";

/** View mode for the evidence image. */
type ViewMode = "original" | "annotated" | "overlay";

/** Resolved CSS color values for each violation type (cached). */
const RESOLVED_COLORS: Partial<Record<ViolationType, string>> = {};

/**
 * Resolve a CSS variable color to a concrete value by painting a temporary element.
 * Falls back to the raw string if resolution fails.
 */
function resolveColor(cssVar: string): string {
  if (!cssVar.startsWith("var(")) return cssVar;
  if (RESOLVED_COLORS[cssVar as ViolationType]) {
    return RESOLVED_COLORS[cssVar as ViolationType]!;
  }
  try {
    const el = document.createElement("div");
    el.style.color = cssVar;
    document.body.appendChild(el);
    const computed = getComputedStyle(el).color;
    document.body.removeChild(el);
    return computed;
  } catch {
    return cssVar;
  }
}

export interface AnnotatedViewerProps {
  /** URL of the image to display (original or evidence). */
  imageUrl: string;
  /** List of violations whose bboxes should be drawn. */
  violations: ViolationRecord[];
  /** Optional CSS class on the outer container. */
  className?: string;
  /** Alt text for the image. */
  alt?: string;
}

/**
 * AnnotatedViewer
 *
 * Renders an image with a canvas overlay that draws violation bounding boxes.
 * Three view modes: Original (no overlay), Annotated (full overlay),
 * Overlay (adjustable opacity overlay with slider).
 */
export default function AnnotatedViewer({
  imageUrl,
  violations,
  className,
  alt = "Annotated evidence",
}: AnnotatedViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("annotated");
  const [overlayOpacity, setOverlayOpacity] = useState(0.6);

  /** Map violation types to resolved canvas stroke colors. */
  const getStrokeColor = useCallback((type: ViolationType): string => {
    const cssVar = VIOLATION_COLORS[type] ?? "var(--color-accent)";
    if (!RESOLVED_COLORS[type]) {
      RESOLVED_COLORS[type] = resolveColor(cssVar);
    }
    return RESOLVED_COLORS[type]!;
  }, []);

  /** Draw all bboxes onto the canvas. */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imgSize) return;

    const { w, h } = imgSize;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, w, h);

    // Skip drawing if in original mode
    if (viewMode === "original") return;

    // Apply opacity for overlay mode
    const alpha = viewMode === "overlay" ? overlayOpacity : 1.0;
    ctx.globalAlpha = alpha;

    for (const v of violations) {
      const { x1, y1, x2, y2 } = v.bbox;
      const bx = x1 * w;
      const by = y1 * h;
      const bw = (x2 - x1) * w;
      const bh = (y2 - y1) * h;

      const color = getStrokeColor(v.violation_type);
      const label = VIOLATION_LABELS[v.violation_type] ?? v.violation_type;
      const conf = `${(v.confidence * 100).toFixed(0)}%`;

      // Bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, bw, bh);

      // Semi-transparent fill
      ctx.fillStyle = color.replace(")", ", 0.12)").replace("rgb", "rgba");
      ctx.fillRect(bx, by, bw, bh);

      // Label background pill
      const text = `${label} ${conf}`;
      ctx.font = "bold 11px 'DM Sans', system-ui, sans-serif";
      const textMetrics = ctx.measureText(text);
      const textH = 16;
      const textW = textMetrics.width + 10;
      const labelY = by - textH > 0 ? by - textH : by;

      ctx.fillStyle = color;
      ctx.beginPath();
      const r = 3;
      ctx.roundRect(bx, labelY, textW, textH, [r, r, r, r]);
      ctx.fill();

      // Label text
      ctx.fillStyle = "#fff";
      ctx.fillText(text, bx + 5, labelY + 12);
    }

    // Reset global alpha
    ctx.globalAlpha = 1.0;
  }, [violations, imgSize, getStrokeColor, viewMode, overlayOpacity]);

  /** Handle image load — capture display dimensions and trigger draw. */
  const handleLoad = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    setImgSize({ w: img.clientWidth, h: img.clientHeight });
  }, []);

  // Redraw when image size, violations, view mode, or opacity change
  useEffect(() => {
    draw();
  }, [draw]);

  // Redraw on container resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      const img = imgRef.current;
      if (img && img.clientWidth > 0) {
        setImgSize({ w: img.clientWidth, h: img.clientHeight });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const viewModes: { mode: ViewMode; label: string; icon: React.ElementType }[] = [
    { mode: "original", label: "Original", icon: Image },
    { mode: "annotated", label: "Annotated", icon: Eye },
    { mode: "overlay", label: "Overlay", icon: Layers },
  ];

  return (
    <div ref={containerRef} className={className}>
      {/* View mode toggle bar */}
      <div className="mb-2 flex items-center gap-2">
        <div className="flex rounded-md border border-[var(--rule-color)] bg-[var(--color-paper-2)] p-0.5">
          {viewModes.map(({ mode, label, icon: Icon }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                "flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-[10px] font-medium transition-all duration-200",
                viewMode === mode
                  ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/25"
                  : "text-[var(--color-ink-faint)] hover:text-[var(--color-ink-muted)] hover:bg-[var(--color-paper-3)]",
              )}
              title={label}
            >
              <Icon className="h-3 w-3" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Opacity slider — only visible in overlay mode */}
        {viewMode === "overlay" && (
          <div className="flex items-center gap-2 ml-3">
            <span className="text-[9px] text-[var(--color-ink-faint)] uppercase tracking-wider">
              Opacity
            </span>
            <input
              type="range"
              min={0.1}
              max={1.0}
              step={0.05}
              value={overlayOpacity}
              onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
              className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-[var(--color-paper-3)] accent-[var(--color-accent)]"
            />
            <span className="w-8 text-right font-mono text-[10px] tabular-nums text-[var(--color-ink-muted)]">
              {(overlayOpacity * 100).toFixed(0)}%
            </span>
          </div>
        )}
      </div>

      {/* Image + canvas */}
      <div className="relative inline-block w-full">
        <img
          ref={imgRef}
          src={imageUrl}
          alt={alt}
          className="w-full object-contain"
          onLoad={handleLoad}
        />
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute left-0 top-0 h-full w-full"
          style={{ opacity: viewMode === "original" ? 0 : 1 }}
        />
      </div>
    </div>
  );
}
