/**
 * Map page — full-page Leaflet map centered on Bengaluru with violation
 * markers fetched from the API. Each marker is colour-coded by violation
 * type and shows a popup with details on click.
 */

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { listViolations } from "@/lib/api";
import type { ViolationRecord } from "@/types/violation";
import { VIOLATION_LABELS, VIOLATION_COLORS } from "@/types/violation";

/** Bengaluru city-centre coordinates. */
const BENGALURU_CENTER: [number, number] = [12.9716, 77.5946];

/** CartoDB Dark tile URL — no API key required. */
const TILE_URL =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

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

  useEffect(() => {
    listViolations({ page_size: 500 })
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

  return (
    <div className="relative h-full w-full">
      {loading && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-[var(--color-paper)]/80">
          <p className="text-sm text-[var(--color-ink-muted)]">
            Loading violations...
          </p>
        </div>
      )}

      <MapContainer
        center={BENGALURU_CENTER}
        zoom={12}
        className="h-full w-full"
        scrollWheelZoom={true}
        style={{ background: "var(--color-paper)" }}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />

        {mapped.map((v) => {
          const rawColor =
            VIOLATION_COLORS[v.violation_type] ?? "var(--color-accent)";
          const color = resolveLeafletColor(rawColor);

          return (
            <CircleMarker
              key={v.id}
              center={[v.latitude!, v.longitude!]}
              radius={7}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.7,
                weight: 2,
              }}
            >
              <Popup>
                <div
                  className="space-y-1 text-xs"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  <p className="font-semibold text-[var(--color-ink)]">
                    {VIOLATION_LABELS[v.violation_type] ?? v.violation_type}
                  </p>
                  <p className="text-[var(--color-ink-muted)]">
                    ID:{" "}
                    <span className="font-mono text-[var(--color-ink)]">
                      {v.id}
                    </span>
                  </p>
                  <p className="text-[var(--color-ink-muted)]">
                    Confidence:{" "}
                    <span className="font-medium text-[var(--color-ink)]">
                      {(v.confidence * 100).toFixed(0)}%
                    </span>
                  </p>
                  <p className="text-[var(--color-ink-muted)]">
                    Fine:{" "}
                    <span className="font-medium text-[var(--color-warning)]">
                      ₹{v.fine_amount.toLocaleString("en-IN")}
                    </span>
                  </p>
                  {v.junction_name && (
                    <p className="text-[var(--color-ink-muted)]">
                      Junction: {v.junction_name}
                    </p>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Marker count overlay */}
      <div className="absolute bottom-4 left-4 z-[1000] rounded-md bg-[var(--color-paper-1)]/90 px-3 py-1.5 text-xs font-medium text-[var(--color-ink-muted)] backdrop-blur-sm">
        {mapped.length} violation{mapped.length !== 1 ? "s" : ""} mapped
      </div>
    </div>
  );
}
