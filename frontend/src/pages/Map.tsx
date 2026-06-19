/**
 * Map page — full-page Leaflet map centered on Bengaluru with violation
 * markers fetched from the API. Colour-coded by violation type with
 * popups showing details on click.
 *
 * F5: Heatmap Layer Toggle — switch between marker view and heatmap view.
 * The heatmap visualises violation density using leaflet.heat with an
 * intensity gradient from deep blue (low) to bright red (high).
 *
 * Design: "Tactical Map Overlay"
 * - Dark CartoDB tiles with violation markers / heatmap
 * - Floating filter/count panel in the corner
 * - Legend overlay with animated legend swap
 * - Animated sliding pill for marker/heatmap toggle
 */

import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, ZoomControl } from "react-leaflet";
import { listViolations } from "@/lib/api";
import type { ViolationRecord, ViolationType } from "@/types/violation";
import { VIOLATION_LABELS, VIOLATION_COLORS } from "@/types/violation";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import HeatmapLayer from "@/components/HeatmapLayer";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

/** Bengaluru city-centre coordinates. */
const BENGALURU_CENTER: [number, number] = [12.9716, 77.5946];

/** CartoDB Dark tile URL — no API key required. */
const TILE_URL =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

/** Map display mode — markers or heatmap. */
type MapViewMode = "markers" | "heatmap";

const MAP_MODES: { id: MapViewMode; label: string; icon: React.ElementType }[] = [
  { id: "markers", label: "Markers", icon: MapPin },
  { id: "heatmap", label: "Heatmap", icon: Flame },
];

/**
 * Resolve a CSS variable colour to a concrete hex/rgb value for Leaflet.
 * Falls back to a default blue if resolution fails.
 */
function resolveLeafletColor(cssVar: string): string {
  if (!cssVar.startsWith("var(")) return cssVar;
  try {
    const el = document.createElement("div");
    el.style.color = cssVar;
    document.body.appendChild(el);
    const computed = getComputedStyle(el).color;
    document.body.removeChild(el);
    return computed;
  } catch {
    return "#3b82f6";
  }
}

export default function Map() {
  const [violations, setViolations] = useState<ViolationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<MapViewMode>("markers");
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    listViolations({ page_size: 500, hide_duplicates: false })
      .then((res) => setViolations(res.violations))
      .catch(() => setViolations([]))
      .finally(() => setLoading(false));
  }, []);

  /** Only plot violations that have valid lat/lng. */
  const mapped = violations.filter(
    (v) =>
      v.latitude != null &&
      v.longitude != null &&
      !Number.isNaN(v.latitude) &&
      !Number.isNaN(v.longitude),
  );

  /** Build heatmap points: [lat, lng, intensity] where intensity = danger_score / 100. */
  const heatmapPoints = useMemo<Array<[number, number, number]>>(
    () =>
      mapped.map((v) => [
        v.latitude!,
        v.longitude!,
        Math.max(0.1, Math.min(1.0, (v.danger_score ?? 45) / 100)),
      ]),
    [mapped],
  );

  /** Compute type counts for the legend. */
  const typeCounts: Partial<Record<ViolationType, number>> = {};
  for (const v of mapped) {
    typeCounts[v.violation_type] = (typeCounts[v.violation_type] ?? 0) + 1;
  }
  const legendEntries = Object.entries(typeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  return (
    <div className="relative h-full w-full">
      {/* Loading overlay — AnimatePresence so it fades out smoothly */}
      <AnimatePresence>
        {loading && (
          <motion.div
            key="loading-overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-[1000] flex items-center justify-center bg-[var(--color-paper)]/80 backdrop-blur-sm"
          >
            <div className="space-y-3 text-center">
              <div className="mx-auto h-8 w-8 rounded-full border-2 border-t-transparent border-[var(--color-accent)] animate-spin" />
              <p className="text-xs tracking-wider text-[var(--color-ink-faint)] uppercase">
                Loading violations...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <MapContainer
        center={BENGALURU_CENTER}
        zoom={12}
        className="h-full w-full"
        scrollWheelZoom={true}
        zoomControl={false}
        style={{ background: "var(--color-paper)" }}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <ZoomControl position="topleft" />
        <style>{`
          .leaflet-top.leaflet-left {
            left: 200px;
            top: 6px;
          }
        `}</style>

        {/* F5: Heatmap layer — shown when viewMode === "heatmap" */}
        {viewMode === "heatmap" && (
          <HeatmapLayer points={heatmapPoints} />
        )}

        {/* Marker layer — shown when viewMode === "markers" */}
        {viewMode === "markers" &&
          mapped.map((v) => {
            const rawColor =
              VIOLATION_COLORS[v.violation_type] ?? "var(--color-accent)";
            const color = resolveLeafletColor(rawColor);

            return (
              <CircleMarker
                key={v.id}
                center={[v.latitude!, v.longitude!]}
                radius={6}
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: 0.65,
                  weight: 1.5,
                }}
              >
                <Popup>
                  <div
                    className="min-w-40 space-y-1 text-[11px]"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    <p className="font-semibold text-[var(--color-ink)]">
                      {VIOLATION_LABELS[v.violation_type] ?? v.violation_type}
                    </p>
                    <div className="space-y-0.5 text-[var(--color-ink-muted)]">
                      <p>
                        ID:{" "}
                        <span className="font-mono text-[var(--color-ink)]">
                          {v.id.slice(0, 8)}…
                        </span>
                      </p>
                      <p>
                        Confidence:{" "}
                        <span className="font-medium text-[var(--color-ink)]">
                          {(v.confidence * 100).toFixed(0)}%
                        </span>
                      </p>
                      <p>
                        Danger:{" "}
                        <span className="font-medium text-[var(--color-danger)]">
                          {v.danger_score}
                        </span>
                      </p>
                      <p>
                        Fine:{" "}
                        <span className="font-medium text-[var(--color-warning)]">
                          ₹{v.fine_amount.toLocaleString("en-IN")}
                        </span>
                      </p>
                      {v.junction_name && <p>Junction: {v.junction_name}</p>}
                      {v.license_plate && (
                        <p className="font-mono text-[var(--color-accent)]">
                          {v.license_plate.text}
                        </p>
                      )}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
      </MapContainer>

      {/* F5: View mode toggle — sliding pill indicator */}
      <div className="absolute left-4 top-4 z-[1000]">
        <div className="relative flex gap-0 rounded-lg border border-[var(--rule-color)] bg-[var(--color-paper-1)]/90 p-1 backdrop-blur-md shadow-lg">
          {/* Sliding pill background */}
          {MAP_MODES.map((mode) => (
            mode.id === viewMode && (
              <motion.div
                key="pill"
                layoutId="map-mode-pill"
                className="absolute inset-y-1 rounded-md bg-[var(--color-accent)]"
                style={{
                  width: `calc(50% - 2px)`,
                  left: viewMode === "markers" ? "4px" : "calc(50% + 2px)",
                }}
                transition={
                  prefersReduced
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 400, damping: 32 }
                }
              />
            )
          ))}
          {MAP_MODES.map((mode) => {
            const Icon = mode.icon;
            const isActive = viewMode === mode.id;
            return (
              <motion.button
                key={mode.id}
                whileTap={prefersReduced ? {} : { scale: 0.94 }}
                onClick={() => setViewMode(mode.id)}
                className={cn(
                  "relative z-10 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold transition-colors duration-150",
                  isActive
                    ? "text-white"
                    : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]",
                )}
              >
                <Icon className="h-3 w-3" />
                {mode.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Bottom-left: marker count */}
      <div className="absolute bottom-4 left-4 z-[1000]">
        <Card className="border-[var(--rule-color)] bg-[var(--color-paper-1)]/90 backdrop-blur-md">
          <CardContent className="px-3 py-1.5">
            <span className="font-mono text-[11px] tabular-nums text-[var(--color-ink-muted)]">
              {mapped.length}
            </span>
            <span className="ml-1 text-[11px] text-[var(--color-ink-faint)]">
              violation{mapped.length !== 1 ? "s" : ""} mapped
            </span>
            {viewMode === "heatmap" && (
              <span className="ml-2 text-[11px] text-[var(--color-accent)]">
                ● heatmap
              </span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top-right: legend — AnimatePresence swaps content */}
      <div className="absolute right-4 top-4 z-[1000]">
        <Card className="border-[var(--rule-color)] bg-[var(--color-paper-1)]/90 backdrop-blur-md">
          <CardContent className="p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
              {viewMode === "heatmap" ? "Intensity" : "Legend"}
            </p>
            <AnimatePresence mode="wait">
              {viewMode === "heatmap" ? (
                <motion.div
                  key="heatmap-legend"
                  initial={prefersReduced ? {} : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-1.5"
                >
                  {/* Heatmap intensity gradient legend */}
                  <div className="h-2.5 w-full rounded-sm" style={{
                    background: "linear-gradient(to right, #3b82f6, #06b6d4, #10b981, #84cc16, #f59e0b, #f97316, #ef4444, #f43f5e)",
                  }} />
                  <div className="flex justify-between text-[11px] text-[var(--color-ink-faint)]">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                  <p className="pt-1 text-[11px] text-[var(--color-ink-faint)]">
                    Intensity based on danger score
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="marker-legend"
                  initial={prefersReduced ? {} : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-1.5"
                >
                  {legendEntries.map(([type, count]) => {
                    const vType = type as ViolationType;
                    const color = VIOLATION_COLORS[vType] ?? "var(--color-accent)";
                    const label = VIOLATION_LABELS[vType] ?? type;
                    return (
                      <div key={type} className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-[11px] text-[var(--color-ink-muted)]">
                          {label}
                        </span>
                        <span className="ml-auto font-mono text-[11px] tabular-nums text-[var(--color-ink-faint)]">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
