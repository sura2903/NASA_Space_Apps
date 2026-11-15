// B1 Site picker: Leaflet map of the demo sites. Falls back to the dropdown alone
// if Leaflet (CDN) did not load.
import { siteName } from "../i18n.js";
export function createSiteMap(el, sites, onPick) {
  const L = window.L;
  if (!L) { el.hidden = true; return { select() {}, relabel() {} }; }
  const map = L.map(el, { scrollWheelZoom: false, attributionControl: true, zoomControl: true });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 12, minZoom: 5,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  const markers = {};
  // every place is the same small dot with a hover label; only the chosen place is enlarged. (The three original demo
  // places used to be drawn larger with permanent labels, from before the whole state was covered.)
  for (const s of sites) {
    const m = L.circleMarker([s.lat, s.lon], { radius: 5, weight: 1, className: "site-marker grid-marker" })
      .addTo(map)
      .bindTooltip(siteName(s).replace(/\s*\(.*\)/, ""), { direction: "top" })
      .on("click", () => onPick(s.id));
    m.getElement?.()?.setAttribute("aria-label", s.name);
    markers[s.id] = m;
  }
  const bounds = L.latLngBounds(sites.map((s) => [s.lat, s.lon]));
  map.fitBounds(bounds.pad(sites.length > 10 ? 0.05 : 0.6));

  return {
    select(id) {
      for (const [k, m] of Object.entries(markers)) {
        const on = k === id;
        m.setStyle({ radius: on ? 10 : 5, weight: on ? 2 : 1, fillOpacity: on ? 0.95 : 0.55 });
        m.getElement?.()?.classList.toggle("selected", on);
        if (on) m.bringToFront();
      }
    },
    invalidate() { map.invalidateSize(); },
    relabel() {
      for (const s of sites) markers[s.id].setTooltipContent(siteName(s).replace(/\s*\(.*\)/, ""));
    },
  };
}
