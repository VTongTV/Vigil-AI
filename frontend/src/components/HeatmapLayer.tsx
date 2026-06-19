/**
 * React-Leaflet HeatmapLayer — wraps leaflet.heat as a React component.
 *
 * Usage:
 *   <HeatmapLayer points={[[lat, lng, intensity], ...]} options={{ radius: 25 }} />
 *
 * Must be placed inside a <MapContainer> (uses useMap()).
 */

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

export interface HeatmapLayerProps {
  /** Array of [lat, lng, intensity?] tuples. Intensity defaults to 1.0. */
  points: Array<[number, number, number?]>;
  /** leaflet.heat options — radius, blur, max, gradient, etc. */
  options?: L.HeatLayerOptions;
}

/**
 * Renders a leaflet.heat layer on the parent map.
 *
 * Points are converted into an L.heatLayer which draws a smooth heatmap.
 * The layer is cleaned up on unmount or when points/options change.
 */
export default function HeatmapLayer({ points, options = {} }: HeatmapLayerProps) {
  const map = useMap();
  const layerRef = useRef<L.HeatLayer | null>(null);

  useEffect(() => {
    // Remove existing layer if present
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    if (points.length === 0) return;

    // Create and add the heatmap layer
    const heat = L.heatLayer(points, {
      radius: 30,
      blur: 20,
      max: 1.0,
      minOpacity: 0.15,
      gradient: {
        0.2: "#3b82f6",  // signal blue
        0.4: "#06b6d4",  // cyan
        0.5: "#10b981",  // emerald
        0.6: "#84cc16",  // lime
        0.7: "#f59e0b",  // amber
        0.8: "#f97316",  // orange
        0.9: "#ef4444",  // red
        1.0: "#f43f5e",  // rose
      },
      ...options,
    });

    heat.addTo(map);
    layerRef.current = heat;

    // Cleanup on unmount or deps change
    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, points, options]);

  return null;
}
