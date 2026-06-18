/**
 * Type declarations for leaflet.heat plugin.
 *
 * Provides the L.heatLayer() factory which creates an L.HeatLayer from
 * an array of [lat, lng, intensity?] points.
 */

import * as L from "leaflet";

declare module "leaflet" {
  interface HeatLayerOptions {
    /** Radius of each "heat circle" in pixels (default: 25). */
    radius?: number;
    /** Blur intensity, higher = more spread (default: 15). */
    blur?: number;
    /** Maximum zoom level for clustering (default: 18). */
    maxZoom?: number;
    /** Maximum point intensity (default: 1.0). */
    max?: number;
    /** Minimum opacity (default: 0). */
    minOpacity?: number;
    /** Gradient colour stops — { stop: colour } (default: {0.4:'blue',0.6:'cyan',0.7:'lime',0.8:'yellow',1.0:'red'}). */
    gradient?: Record<number, string>;
  }

  class HeatLayer extends Layer {
    setLatLngs(latLngs: Array<[number, number, number?]>): this;
    addLatLng(latlng: [number, number, number?]): this;
    setOptions(options: HeatLayerOptions): this;
    redraw(): this;
  }

  function heatLayer(
    latlngs: Array<[number, number, number?]>,
    options?: HeatLayerOptions,
  ): HeatLayer;
}
