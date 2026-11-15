// One hover card for a Leaflet map (Policy makers heatmap, Crop map, the Farmers place picker).
// Leaflet's per-shape sticky tooltips close and reopen a new tooltip at every cell edge, so with ~185 cells the card
// trailed the cursor and flickered when the mouse moved fast. This keeps a single card in the map container, finds the
// cell (or the nearest dot) under the cursor by arithmetic, only rebuilds the text when it changes, and moves it once
// per frame. fixed: true pins the card to the map's top-right corner instead, so it never covers the cells being read;
// onHover(p | null) lets the map mark the cell or dot the card is describing.
export function mapHoverCard(map, { cellDeg, points, tip, fixed = false, onHover = null }) {
  const el = document.createElement("div");
  el.className = "map-hover" + (fixed ? " fixed" : "");
  el.hidden = true;
  el.setAttribute("aria-hidden", "true");   // the same facts are in the table and the side panel
  map.getContainer().append(el);
  let cur = null, pt = null, raf = 0;
  // with the card pinned in a corner, an outline marks the cell it describes (drawn above the cells, not clickable)
  let ring = null;
  const mark = (p) => {
    ring?.remove(); ring = null;
    const d = cellDeg() / 2, L = window.L;
    if (!fixed || !p || !d || !L) return;
    ring = L.rectangle([[p.lat - d, p.lon - d], [p.lat + d, p.lon + d]],
      { interactive: false, fill: false, weight: 2.5, color: getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#1c201b" }).addTo(map);
  };

  const find = (ll) => {
    const d = cellDeg() / 2;
    if (d) return points().find((p) => Math.abs(ll.lat - p.lat) <= d && Math.abs(ll.lng - p.lon) <= d) ?? null;
    // round markers: the nearest one within 22 px
    const c = map.latLngToContainerPoint(ll);
    let best = null, bd = 22;
    for (const p of points()) { const q = map.latLngToContainerPoint([p.lat, p.lon]); const dd = c.distanceTo(q); if (dd < bd) { bd = dd; best = p; } }
    return best;
  };
  const place = () => {
    raf = 0;
    if (!pt || el.hidden || fixed) return;
    const size = map.getSize(), w = el.offsetWidth, h = el.offsetHeight;
    let x = pt.x + 16, y = pt.y + 16;
    if (x + w > size.x - 4) x = pt.x - w - 16;
    if (y + h > size.y - 4) y = pt.y - h - 16;
    el.style.transform = `translate(${Math.max(4, x)}px, ${Math.max(4, y)}px)`;
  };
  const show = (e) => {
    const p = find(e.latlng);
    if (!p) return hide();
    const html = tip(p);
    if (!html) return hide();
    if (p !== cur) { cur = p; el.innerHTML = html; mark(p); onHover?.(p); }
    el.hidden = false;
    pt = e.containerPoint;
    if (!raf) raf = requestAnimationFrame(place);
  };
  const hide = () => { if (cur) { mark(null); onHover?.(null); } el.hidden = true; cur = null; pt = null; };

  map.on("mousemove", show);
  map.on("click", show);          // a tap on a phone shows the card too
  map.on("mouseout movestart zoomstart", hide);
  return {
    // after a redraw (new colouring, language): rebuild the text of the card that is showing
    refresh() { if (cur && !el.hidden) { const html = tip(cur); if (html) { el.innerHTML = html; ring?.bringToFront(); } else hide(); } },
    hide,
    at: find,
    // room on the right for the pinned card on a wide map, so the state's north-east tip is not hidden under it
    fitPad: () => window.L.point(fixed && map.getSize().x >= 700 ? 270 : 0, 0),       // the cell or dot at a map position (the place picker picks the nearest dot on a click)
  };
}
