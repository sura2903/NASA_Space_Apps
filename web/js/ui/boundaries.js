// Tamil Nadu and district outlines on the Leaflet maps (data/boundaries.json, OpenStreetMap via Nominatim, ODbL;
// pipeline/fetch_boundaries.py). Shared by the Policy makers map, the Crop map and the Farmers "Pick on a map".
//  - a soft mask outside Tamil Nadu, so the 28 km squares look trimmed to the coast and the state border;
//  - the 38 district boundaries as thin lines on top;
//  - districtLayer(): districts filled by a value (the Policy map's "By district" view).
import { cssVar } from "./dom.js";

let cache = null;
/** Fetch the outlines once; resolves to null if the file is missing (the maps then draw as before). */
export function loadBoundaries() {
  cache ??= fetch("data/boundaries.json").then((r) => (r.ok ? r.json() : null)).catch(() => null);
  return cache;
}

const polysOf = (g) => (g?.type === "Polygon" ? [g.coordinates] : g?.type === "MultiPolygon" ? g.coordinates : []);
const ll = (ring) => ring.map(([x, y]) => [y, x]);      // GeoJSON [lon, lat] -> Leaflet [lat, lon]

/** Add the mask and the district lines to a map. Returns { lines, mask, highlight(name) }. */
export function addOutlines(map, b, { mask = true, maskOpacity = 0.72, maskZ = 450, linesZ = 460 } = {}) {
  const L = window.L;
  if (!L || !b) return { highlight() {} };
  // panes: above the coloured squares by default; the Farmers map puts them under its clickable dots (z < 400)
  for (const [name, z] of [["tnMask", maskZ], ["tnLines", linesZ]]) {
    if (!map.getPane(name)) { const p = map.createPane(name); p.style.zIndex = z; p.style.pointerEvents = "none"; }
  }
  let maskLayer = null;
  if (mask && b.state) {
    // one big polygon covering the region, with Tamil Nadu cut out as holes
    const world = [[0, 60], [0, 100], [25, 100], [25, 60]];
    const holes = polysOf(b.state).map((poly) => ll(poly[0]));
    maskLayer = L.polygon([world, ...holes], {
      pane: "tnMask", stroke: false, fillColor: cssVar("--bg") || "#f5f3ec", fillOpacity: maskOpacity, interactive: false,
    }).addTo(map);
  }
  // dark lines read on both the pale and the deep map colours, in light and dark themes alike
  const lineColor = "#2a2a2a";
  const lines = L.layerGroup().addTo(map);
  const byName = {};
  for (const d of b.districts) {
    const shape = L.polygon(polysOf(d.geometry).map((poly) => poly.map(ll)),
      { pane: "tnLines", color: lineColor, weight: 1.3, opacity: 0.8, fill: false, interactive: false });
    shape.addTo(lines);
    byName[d.name] = shape;
  }
  if (b.state) {
    L.polygon(polysOf(b.state).map((poly) => ll(poly[0])),
      { pane: "tnLines", color: lineColor, weight: 2, opacity: 0.9, fill: false, interactive: false }).addTo(lines);
  }
  let on = null;
  return {
    lines, mask: maskLayer,
    /** Draw one district's outline thicker (the farmer's chosen district); null clears it. */
    highlight(name) {
      if (on && byName[on]) byName[on].setStyle({ weight: 1.3, opacity: 0.8, color: lineColor });
      on = name && byName[name] ? name : null;
      if (on) byName[on].setStyle({ weight: 2.6, opacity: 1, color: cssVar("--accent") || "#2f7d32" }).bringToFront();
    },
  };
}

/** Districts filled by value. valueOf(name) -> { v: 0..1, tip: html } | null. Returns an L.LayerGroup. */
export function districtLayer(b, { valueOf, colour, onClick, selected = null }) {
  const L = window.L;
  const g = L.layerGroup();
  if (!L || !b) return g;
  for (const d of b.districts) {
    const val = valueOf(d.name);
    const shape = L.polygon(polysOf(d.geometry).map((poly) => poly.map(ll)), {
      weight: d.name === selected ? 2.5 : 0.8, color: d.name === selected ? cssVar("--ink") : "#ffffff",
      fillColor: val ? colour(val.v) : cssVar("--grid") || "#ccc", fillOpacity: val ? 0.85 : 0.3,
    });
    if (val?.tip) shape.bindTooltip(val.tip, { sticky: true, direction: "top" });
    if (onClick) shape.on("click", () => onClick(d.name));
    shape.addTo(g);
  }
  return g;
}
