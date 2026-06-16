/**
 * AnnotatedViewer — renders an image with violation bounding boxes overlaid
 * using a canvas positioned on top of the image element.
 *
 * Bounding boxes are normalized (0–1) and scaled to the image's display
 * dimensions at render time.
 */

import { useRef, useEffect, useCallback, useState } from "react";
import type { ViolationRecord, ViolationType } from "@/types/violation";
import { VIOLATION_COLORS, VIOLATION_LABELS } from "@/types/violation";

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
 * The canvas is absolutely positioned and sized to match the image's display
 * dimensions. On resize, the overlay is recalculated.
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
      ctx.font = "bold 11px 'IBM Plex Sans', sans-serif";
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
  }, [violations, imgSize, getStrokeColor]);

  /** Handle image load — capture display dimensions and trigger draw. */
  const handleLoad = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    setImgSize({ w: img.clientWidth, h: img.clientHeight });
  }, []);

  // Redraw when image size or violations change
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

  return (
    <div ref={containerRef} className={className}>
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
        />
      </div>
    </div>
  );
}
