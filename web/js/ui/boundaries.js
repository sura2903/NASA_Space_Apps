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

/** Districts filled by value. valueOf(name) -> { v: 0..1, tip: html } | null. Returns an L.LayerGroup.
 *  With `map`, hovering shows ONE card pinned in the map's top-right corner (like the 28 km squares' card): the
 *  district under the cursor is found once per animation frame (bounding box, then point-in-polygon), and the card
 *  and the hovered outline only change when the district changes. (Per-district sticky Leaflet tooltips closed and
 *  reopened at every district edge and lagged behind the mouse.) Without `map`, each district gets a tooltip. */
export function districtLayer(b, { valueOf, colour, onClick, selected = null, map = null }) {
  const L = window.L;
  const g = L.layerGroup();
  if (!L || !b) return g;
  const items = [];
  for (const d of b.districts) {
    const val = valueOf(d.name);
    const base = { weight: d.name === selected ? 2.5 : 0.8, color: d.name === selected ? cssVar("--ink") : "#ffffff" };
    const shape = L.polygon(polysOf(d.geometry).map((poly) => poly.map(ll)), {
      ...base, fillColor: val ? colour(val.v) : cssVar("--grid") || "#ccc", fillOpacity: val ? 0.85 : 0.3,
    });
    if (val?.tip && !map) shape.bindTooltip(val.tip, { sticky: true, direction: "top" });
    // stop the click here, so a map-wide click handler (the Crop map picks the nearest place) does not also fire
    if (onClick) shape.on("click", (e) => { L.DomEvent.stopPropagation(e); onClick(d.name); });
    shape.addTo(g);
    // bounding box per district for a fast first test
    let x0 = 180, x1 = -180, y0 = 90, y1 = -90;
    for (const poly of polysOf(d.geometry)) for (const [x, y] of poly[0]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    items.push({ d, val, shape, base, box: [x0, y0, x1, y1] });
  }
  if (!map) return g;

  const inRing = (x, y, r) => {
    let hit = false;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, yi] = r[i], [xj, yj] = r[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  };
  const at = (lng, lat) => items.find(({ d, box }) => lng >= box[0] && lng <= box[2] && lat >= box[1] && lat <= box[3]
    && polysOf(d.geometry).some((poly) => inRing(lng, lat, poly[0]) && !poly.slice(1).some((hole) => inRing(lng, lat, hole)))) ?? null;

  const card = document.createElement("div");
  card.className = "map-hover fixed";
  card.hidden = true;
  card.setAttribute("aria-hidden", "true");
  map.getContainer().append(card);
  let cur = null, pending = null, raf = 0;
  const setCur = (it) => {
    if (it === cur) return;
    if (cur) cur.shape.setStyle(cur.base);
    cur = it;
    if (cur) {
      cur.shape.setStyle({ weight: 2.5, color: cssVar("--ink") || "#1c201b" });
      cur.shape.bringToFront();
      card.innerHTML = cur.val?.tip ?? `<strong>${cur.d.name}</strong>`;
      card.hidden = false;
    } else card.hidden = true;
  };
  const frame = () => { raf = 0; if (pending) setCur(at(pending.lng, pending.lat)); };
  const onMove = (e) => { pending = e.latlng; if (!raf) raf = requestAnimationFrame(frame); };
  const onOut = () => { pending = null; setCur(null); };
  const onScroll = () => onOut();
  map.on("mousemove", onMove);
  map.on("mouseout movestart zoomstart", onOut);
  document.addEventListener("scroll", onScroll, { passive: true, capture: true });
  g.on("remove", () => {
    map.off("mousemove", onMove); map.off("mouseout movestart zoomstart", onOut);
    document.removeEventListener("scroll", onScroll, { capture: true });
    if (raf) cancelAnimationFrame(raf);
    card.remove();
  });
  return g;
}
