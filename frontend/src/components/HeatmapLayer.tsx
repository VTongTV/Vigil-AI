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
        0.2: "#1a237e",  // deep blue
        0.4: "#0d47a1",  // blue
        0.5: "#00838f",  // teal
        0.6: "#2e7d32",  // green
        0.7: "#f9a825",  // amber
        0.8: "#e65100",  // orange
        0.9: "#b71c1c",  // red
        1.0: "#d50000",  // bright red
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
