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
  for (const s of sites) {
    // detailed places get a permanent label; the statewide grid points are small dots with a hover label
    const detailed = s.demo !== false;
    const m = L.circleMarker([s.lat, s.lon], { radius: detailed ? 9 : 5, weight: detailed ? 2 : 1, className: detailed ? "site-marker" : "site-marker grid-marker" })
      .addTo(map)
      .bindTooltip(siteName(s).replace(/\s*\(.*\)/, ""), detailed ? { permanent: true, direction: "right", offset: [10, 0], className: "site-label" } : { direction: "top" })
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
        const detailed = sites.find((s) => s.id === k)?.demo !== false;
        m.setStyle({ radius: on ? 12 : detailed ? 8 : 5, fillOpacity: on ? 0.95 : 0.55 });
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
