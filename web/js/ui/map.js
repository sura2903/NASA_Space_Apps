// B1 Site picker: Leaflet map of the demo sites. Falls back to the dropdown alone
// if Leaflet (CDN) did not load.
import { siteName } from "../i18n.js";
import { mapHoverCard } from "./hovercard.js";
import { loadBoundaries, addOutlines } from "./boundaries.js";
export function createSiteMap(el, sites, onPick) {
  const L = window.L;
  if (!L) { el.hidden = true; return { select() {}, relabel() {} }; }
  const map = L.map(el, { scrollWheelZoom: false, attributionControl: true, zoomControl: true });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 12, minZoom: 5,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  const markers = {};
  // every place is the same small dot; only the chosen place is enlarged. (The three original demo places used to be
  // drawn larger with permanent labels, from before the whole state was covered.) One shared hover card names the dot
  // nearest the cursor (within 22 px), so the label no longer waits for the pointer to land exactly on a 5 px dot,
  // and a click near a dot picks it.
  let chosen = null, hover = null;
  const style = (id) => {
    const m = markers[id]; if (!m) return;
    const on = id === chosen, hv = id === hover;
    m.setStyle({ radius: on ? 10 : hv ? 7 : 5, weight: on || hv ? 2 : 1, fillOpacity: on ? 0.95 : hv ? 0.85 : 0.55 });
  };
  for (const s of sites) {
    const m = L.circleMarker([s.lat, s.lon], { radius: 5, weight: 1, className: "site-marker grid-marker", bubblingMouseEvents: true })
      .addTo(map);
    m.getElement?.()?.setAttribute("aria-label", s.name);
    markers[s.id] = m;
  }
  const card = mapHoverCard(map, {
    cellDeg: () => 0, points: () => sites,
    tip: (s) => { const d = document.createElement("span"); d.textContent = siteName(s); return d.outerHTML; },
    onHover: (s) => { const was = hover; hover = s?.id ?? null; style(was); style(hover); if (hover && hover !== chosen) markers[hover].bringToFront(); },
  });
  map.on("click", (e) => { const s = card.at(e.latlng); if (s) onPick(s.id); });
  const bounds = L.latLngBounds(sites.map((s) => [s.lat, s.lon]));
  map.fitBounds(bounds.pad(sites.length > 10 ? 0.05 : 0.6));
  // district lines + soft mask outside Tamil Nadu; the chosen place's district is drawn thicker
  let outlines = null;
  const districtOf = (id) => sites.find((s) => s.id === id)?.district ?? null;
  loadBoundaries().then((b) => { if (b) { outlines = addOutlines(map, b, { maskOpacity: 0.6, maskZ: 380, linesZ: 390 }); outlines.highlight(districtOf(chosen)); } });

  return {
    select(id) {
      chosen = id;
      outlines?.highlight(districtOf(id));
      for (const [k, m] of Object.entries(markers)) {
        style(k);
        m.getElement?.()?.classList.toggle("selected", k === id);
        if (k === id) m.bringToFront();
      }
    },
    invalidate() { map.invalidateSize(); },
    relabel() { card.refresh(); },
  };
}
