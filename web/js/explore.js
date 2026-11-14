// Crop map (Lane B, ideas I3 + I4 in docs/IDEAS.md).
// Pick a crop -> colour each place by how that crop would have done there.
// Click anywhere -> top 3 crops at the nearest place with data.
// Scores come only from scoring.js (scoreRotation on a one-crop rotation per sowing month).
// Places: Lane A's grid (data/grid/index.json) when it exists, otherwise the 3 demo sites.
import { scoreRotation, PRIORITIES, WATER_SOURCES } from "./scoring.js";
import { $, h, clear, fmt } from "./ui/dom.js";
import { rich, decorate, initTooltips } from "./ui/glossary.js";
import { t, initLang, setLang, onLangChange, getLang, cropName, monthName, siteName, waterLabel } from "./i18n.js";

// Same starting priorities as the rotation tool (preferences, not data).
const WEIGHTS = { water: 3, income: 3, soil_structure: 3, nitrogen: 3, erosion: 3, forage: 1, reliability: 4 };
const KM = (a, b) => {
  const R = 6371, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

const state = {
  kind: "sites", cellDeg: null, points: [], sites: {}, crops: [], cropById: {},
  crop: null, measure: "came", water: "rainfed", results: {}, selected: null, clickLatLng: null,
};

async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json();
}

/* ---------- data ---------- */
async function loadPoints() {
  try {
    const g = await getJSON("data/grid/index.json");
    const pts = Array.isArray(g) ? g : g.points;
    if (pts?.length) return { kind: "grid", points: pts, base: "data/grid/", cellDeg: g.cell_deg ?? null };
  } catch { /* no grid yet: fall back to the demo sites */ }
  return { kind: "sites", points: await getJSON("data/sites/index.json"), base: "data/sites/", cellDeg: null };
}

/** Every non-green-manure crop at its best sowing month for one place. */
function rankCrops(site) {
  const prefs = { weights: WEIGHTS, water_source: state.water, scenario: { dT_c: 0, dPrecip_pct: 0 } };
  const out = [];
  for (const c of state.crops) {
    if (c.type === "green_manure") continue;
    let best = null;
    for (const sow of c.sow_months) {
      const st = scoreRotation(site, state.crops, [[{ crop: c.id, sow }]], prefs);
      if (!best || st.total > best.st.total) best = { crop: c, sow, st };
    }
    if (best) out.push(best);
  }
  return out.sort((a, b) => b.st.total - a.st.total);
}

async function computeAll() {
  setBusy(true);
  const key = state.water;
  state.results[key] ??= {};
  for (const p of state.points) {
    if (!state.results[key][p.id]) {
      state.results[key][p.id] = rankCrops(state.sites[p.id]);
      await new Promise((r) => setTimeout(r, 0)); // keep the page responsive on big grids
    }
  }
  setBusy(false);
}
const resultsFor = (id) => state.results[state.water]?.[id] ?? [];

/* ---------- colour scale: one hue, light -> dark ---------- */
const LIGHT = [227, 240, 223], DARK = [27, 94, 32];
const colour = (v) => `rgb(${LIGHT.map((l, i) => Math.round(l + (DARK[i] - l) * Math.max(0, Math.min(1, v)))).join(",")})`;
const measureOf = (r) => (state.measure === "came" ? r.st.replay.good_years / (r.st.replay.total_years || 1) : r.st.total / 100);
const measureText = (r) => (state.measure === "came"
  ? t("x.came.short", { good: r.st.replay.good_years, total: r.st.replay.total_years })
  : `${r.st.total}/100`);

/* ---------- map ---------- */
let map = null, layer = null, clickMarker = null;
function initMap() {
  const L = window.L;
  if (!L) { $("#xmap").hidden = true; return; }
  map = L.map("xmap", { scrollWheelZoom: false });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 12, minZoom: 5, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
  map.fitBounds(L.latLngBounds(state.points.map((p) => [p.lat, p.lon])).pad(state.kind === "grid" ? 0.05 : 0.8));
  layer = L.layerGroup().addTo(map);
  map.on("click", (e) => selectNearest({ lat: e.latlng.lat, lon: e.latlng.lng }, true));
}

function drawMap() {
  if (!map) return;
  const L = window.L;
  layer.clearLayers();
  for (const p of state.points) {
    const r = resultsFor(p.id).find((x) => x.crop.id === state.crop);
    if (!r) continue;
    const fill = colour(measureOf(r));
    const tip = `<strong>${placeName(p).replace(/\s*\(.*\)/, "")}</strong><br>${cropName(r.crop)}: ${measureText(r)} · ${t("x.sow", { m: monthName(r.sow) })}`;
    const sel = state.selected?.id === p.id;
    let shape;
    if (state.kind === "grid" && state.cellDeg) {
      const d = state.cellDeg / 2;
      shape = L.rectangle([[p.lat - d, p.lon - d], [p.lat + d, p.lon + d]],
        { weight: sel ? 3 : 0.5, color: sel ? "#f5c400" : "#ffffff", fillColor: fill, fillOpacity: 0.85 });
    } else {
      shape = L.circleMarker([p.lat, p.lon], { radius: sel ? 20 : 16, weight: sel ? 4 : 2, color: sel ? "#f5c400" : "#ffffff", fillColor: fill, fillOpacity: 0.95 });
    }
    shape.bindTooltip(tip, state.kind === "grid" ? { sticky: true } : { permanent: true, direction: "auto", offset: [18, 0], className: "site-label" });
    shape.on("click", (e) => { L.DomEvent.stopPropagation(e); selectPoint(p); });
    shape.addTo(layer);
  }
}

function drawLegend() {
  const el = $("#legend");
  clear(el);
  el.append(
    h("span", { class: "xlegend-l" }, state.measure === "came" ? t("x.legend.came") : t("x.legend.fit")),
    h("span", { class: "xlegend-ends" }, state.measure === "came" ? "0%" : "0"),
    h("span", { class: "xlegend-bar", style: { background: `linear-gradient(90deg, ${colour(0)}, ${colour(1)})` } }),
    h("span", { class: "xlegend-ends" }, state.measure === "came" ? "100%" : "100"));
}

/* ---------- this crop at each place ---------- */
function drawCropTable() {
  const el = $("#crop-table");
  clear(el);
  const rows = state.points.map((p) => ({ p, r: resultsFor(p.id).find((x) => x.crop.id === state.crop) }))
    .filter((x) => x.r).sort((a, b) => measureOf(b.r) - measureOf(a.r)).slice(0, 12);
  if (!rows.length) return;
  el.append(h("div", { class: "table-wrap" }, h("table", { class: "compare xtable" },
    h("thead", {}, h("tr", {}, [t("x.col.place"), t("x.col.sow"), t("x.col.came"), t("x.col.fit"), t("x.col.water")].map((x) => h("th", { scope: "col" }, x)))),
    h("tbody", {}, rows.map(({ p, r }) => h("tr", { class: state.selected?.id === p.id ? "sel" : "", onclick: () => selectPoint(p), style: { cursor: "pointer" } },
      h("th", { scope: "row" }, placeName(p)),
      h("td", {}, monthName(r.sow)),
      h("td", {}, t("x.came.short", { good: r.st.replay.good_years, total: r.st.replay.total_years })),
      h("td", {}, String(r.st.total)),
      h("td", {}, `${fmt(r.st.water_use.need_mm)} mm`)))))));
}

/* ---------- top 3 at a place ---------- */
const placeName = (p) => siteName(p);

function selectNearest(ll, fromClick) {
  let best = null, d = Infinity;
  for (const p of state.points) { const k = KM(ll, p); if (k < d) { d = k; best = p; } }
  state.clickLatLng = fromClick ? { ...ll, km: d } : null;
  if (best) selectPoint(best, true);
}

function selectPoint(p, keepClick = false) {
  if (!keepClick) state.clickLatLng = null;
  state.selected = p;
  const L = window.L;
  if (map) {
    clickMarker?.remove();
    if (state.clickLatLng && state.clickLatLng.km > 1) {
      clickMarker = L.polyline([[state.clickLatLng.lat, state.clickLatLng.lon], [p.lat, p.lon]], { color: "#f5c400", weight: 2, dashArray: "4 4" }).addTo(map);
    }
  }
  drawMap();
  drawCropTable();
  drawTop3();
}

function topThree(list) {
  // best three with different crop families, so the list is not three pulses
  const out = [], fam = new Set();
  for (const r of list) { if (!fam.has(r.crop.pest_family)) { out.push(r); fam.add(r.crop.pest_family); } if (out.length === 3) break; }
  return out;
}

function drawTop3() {
  const p = state.selected;
  const box = $("#top3");
  clear(box);
  if (!p) { $("#top3-title").textContent = t("x.top.empty"); $("#top3-meta").textContent = ""; $("#all-crops").hidden = true; return; }
  const list = resultsFor(p.id);
  $("#top3-title").textContent = placeName(p);
  const c = state.clickLatLng;
  $("#top3-meta").textContent = [
    c && c.km > 1 ? t("x.nearest", { km: fmt(c.km) }) : null,
    t("x.top.meta", { water: waterLabel(state.water, WATER_SOURCES[state.water]?.label).toLowerCase() }),
  ].filter(Boolean).join(" ");

  topThree(list).forEach((r, i) => {
    const st = r.st;
    const years = st.replay.years?.length ? st.replay.years : null;
    const squares = h("div", { class: "replay-squares" + (years ? " ordered" : "") },
      years ? years.map((y) => h("span", { class: y.ok ? "ok" : "bad", title: y.ok ? t("replay.ok", { year: y.year }) : t("replay.bad", { year: y.year, reason: y.reason ?? "" }) }))
        : Array.from({ length: st.replay.total_years }, (_, k) => h("span", { class: k < st.replay.good_years ? "ok" : "bad" })));
    const ev = st.evidence.find((e) => e.months?.length);
    box.append(h("article", { class: "card top3-card" },
      h("div", { class: "top3-head" },
        h("span", { class: "top3-rank" }, String(i + 1)),
        h("div", {},
          h("h3", {}, cropName(r.crop)),
          h("p", { class: "note" }, t("x.sow", { m: monthName(r.sow) }) + " · " + t("x.water.need", { mm: fmt(st.water_use.need_mm) }))),
        h("div", { class: "score" }, h("span", { class: "score-n" }, String(st.total)), h("span", { class: "score-l" }, t("card.outof"), h("br"), t("card.fit")))),
      h("div", { class: "replay" },
        h("div", { class: "replay-l", html: rich(t("x.came.long", { good: st.replay.good_years, total: st.replay.total_years })) }),
        squares),
      ev ? h("p", { class: "water-line", html: decorate(ev.text) }) : null,
      st.risks[0] ? h("p", { class: "note", html: "⚠ " + decorate(st.risks[0]) }) : null));
  });

  if (state.kind === "sites") {
    box.append(h("a", { class: "btn-ghost nav-link", href: `index.html#site=${p.id}` }, t("x.compare.link")));
  }

  const all = $("#all-crops-list");
  clear(all);
  all.append(h("table", { class: "compare xtable" },
    h("thead", {}, h("tr", {}, [t("x.col.crop"), t("x.col.sow"), t("x.col.came"), t("x.col.fit")].map((x) => h("th", { scope: "col" }, x)))),
    h("tbody", {}, list.map((r) => h("tr", {},
      h("th", { scope: "row" }, cropName(r.crop)),
      h("td", {}, monthName(r.sow)),
      h("td", {}, t("x.came.short", { good: r.st.replay.good_years, total: r.st.replay.total_years })),
      h("td", {}, String(r.st.total)))))));
  $("#all-crops").hidden = false;
}

/* ---------- controls ---------- */
function drawControls() {
  const sel = $("#crop-select");
  clear(sel);
  for (const c of state.crops.filter((c) => c.type !== "green_manure")) sel.append(h("option", { value: c.id, selected: c.id === state.crop }, cropName(c)));

  const m = $("#measure");
  clear(m);
  for (const [id, key] of [["came", "x.m.came"], ["fit", "x.m.fit"]]) {
    m.append(h("label", { class: "choice" + (id === state.measure ? " on" : "") },
      h("input", { type: "radio", name: "measure", value: id, checked: id === state.measure, onchange: () => { state.measure = id; refresh(); } }),
      h("span", { html: rich(t(key)) })));
  }

  const w = $("#water");
  clear(w);
  for (const [id, ws] of Object.entries(WATER_SOURCES)) {
    w.append(h("label", { class: "choice" + (id === state.water ? " on" : "") },
      h("input", { type: "radio", name: "water", value: id, checked: id === state.water, onchange: async () => { state.water = id; drawControls(); await computeAll(); refresh(); } }),
      h("span", {}, waterLabel(id, ws.label))));
  }
  $("#points-note").textContent = state.kind === "grid"
    ? t("x.points.grid", { n: state.points.length })
    : t("x.points.sites", { n: state.points.length });
}

function refresh() {
  const c = state.cropById[state.crop];
  $("#map-title").textContent = c ? t("x.map.title", { crop: cropName(c) }) : "";
  drawControls();
  drawMap();
  drawLegend();
  drawCropTable();
  drawTop3();
}

function setBusy(on) {
  const b = $("#busy");
  b.textContent = on ? t("x.busy", { n: state.points.length }) : "";
  b.classList.toggle("on", on);
}

function applyStatic() {
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
  const btn = $("#lang");
  btn.textContent = t("lang.switch");
  btn.setAttribute("aria-label", t("lang.switch.aria"));
  btn.lang = getLang() === "ta" ? "en" : "ta";
  document.title = `${t("brand")} · ${t("x.map.eyebrow")}`;
}

/* ---------- boot ---------- */
async function init() {
  initLang();
  initTooltips();
  applyStatic();
  $("#lang").addEventListener("click", () => setLang(getLang() === "ta" ? "en" : "ta"));
  onLangChange(() => { applyStatic(); refresh(); });
  try {
    const [pts, crops] = await Promise.all([loadPoints(), getJSON("data/crops.json")]);
    Object.assign(state, { kind: pts.kind, cellDeg: pts.cellDeg, points: pts.points, crops });
    state.cropById = Object.fromEntries(crops.map((c) => [c.id, c]));
    const files = await Promise.all(pts.points.map((p) => getJSON(`${pts.base}${p.id}.json`)));
    pts.points.forEach((p, i) => { state.sites[p.id] = files[i]; });
  } catch (err) {
    $("#error").hidden = false;
    $("#error").textContent = t("err.load", { msg: err.message });
    return;
  }
  const q = new URLSearchParams(location.hash.slice(1));
  state.crop = state.cropById[q.get("crop")] ? q.get("crop") : (state.crops.find((c) => c.id === "black_gram") ?? state.crops[0]).id;
  $("#crop-select").addEventListener("change", (e) => {
    state.crop = e.target.value;
    history.replaceState(null, "", `#crop=${state.crop}`);
    refresh();
  });
  initMap();
  await computeAll();
  refresh();
}

init();
window.fieldShiftMap = { state, PRIORITIES };
