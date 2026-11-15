// One hover card for a Leaflet grid map (Policy makers heatmap, Crop map).
// Leaflet's per-shape sticky tooltips close and reopen a new tooltip at every cell edge, so with ~185 cells the card
// trailed the cursor and flickered when the mouse moved fast. This keeps a single card in the map container, finds the
// cell under the cursor by arithmetic, only rebuilds the text when the cell changes, and moves it once per frame.
export function mapHoverCard(map, { cellDeg, points, tip }) {
  const el = document.createElement("div");
  el.className = "map-hover";
  el.hidden = true;
  el.setAttribute("aria-hidden", "true");   // the same facts are in the table and the side panel
  map.getContainer().append(el);
  let cur = null, pt = null, raf = 0;

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
    if (!pt || el.hidden) return;
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
    if (p !== cur) { cur = p; el.innerHTML = html; }
    el.hidden = false;
    pt = e.containerPoint;
    if (!raf) raf = requestAnimationFrame(place);
  };
  const hide = () => { el.hidden = true; cur = null; pt = null; };

  map.on("mousemove", show);
  map.on("click", show);          // a tap on a phone shows the card too
  map.on("mouseout movestart zoomstart", hide);
  return {
    // after a redraw (new colouring, language): rebuild the text of the card that is showing
    refresh() { if (cur && !el.hidden) { const html = tip(cur); if (html) el.innerHTML = html; else hide(); } },
    hide,
  };
}
