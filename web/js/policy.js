// Policy view (Lane B, ideas I20 + I23 in docs/IDEAS.md).
// I20: climate-exposure map. Each grid point gets a score from within-state ranks of its rain trend,
//      very-hot-day trend and (when Lane A adds it) GRACE groundwater trend. All values come from
//      data/grid/<id>.json; the ranking is plain arithmetic, shown in the table so it can be checked.
// I23: "what if X% of farms switch": irrigation saved from the engine's cropSuitability (irrigation_mm)
//      × 10 m³ per hectare per mm × farm area × share. Farm area is typed in until district crop
//      areas arrive (data request in docs/PROGRESS.md).
import { cropSuitability, rankCrops, statewideContext, WATER_SOURCES } from "./scoring.js";
import { $, h, clear, fmt } from "./ui/dom.js";
import { initTooltips } from "./ui/glossary.js";
import { t, initLang, setLang, onLangChange, getLang, cropName, siteName, waterLabel, monthName } from "./i18n.js";

const WEIGHTS = { water: 3, income: 3, soil_structure: 3, nitrogen: 3, erosion: 3, forage: 1, reliability: 4 };
const M3_PER_HA_PER_MM = 10;      // 1 mm of water over 1 hectare = 10 m³ (unit conversion, not data)

// Signs of exposure. `worse`: which direction is worse for farming. Values come from each grid file.
const COMPONENTS = [
  { id: "rain", on: true, worse: "low", get: (s) => s.trends?.precip_mm_per_decade, unit: "mm",
    disagree: (s) => s.trends?.power_precip_mm_per_decade != null && Math.sign(s.trends.power_precip_mm_per_decade) !== Math.sign(s.trends.precip_mm_per_decade) },
  { id: "heat", on: true, worse: "high", get: (s) => s.trends?.heat_days_per_decade, unit: "days" },
  { id: "gw", on: true, worse: "low", get: (s) => s.groundwater?.lwe_trend_cm_per_year, unit: "cm" },
  { id: "soil", on: false, worse: "low", get: (s) => s.trends?.root_soil_wetness_per_decade, unit: "" },
];

const state = {
  points: [], sites: {}, crops: [], cropById: {}, cellDeg: null, kind: "grid",
  on: Object.fromEntries(COMPONENTS.map((c) => [c.id, c.on])),
  scores: {}, selected: null,
  wi: { from: "rice_long", to: null, water: "canal", share: 25, area: 1000, areaAuto: true, district: null },
  districts: [], districtsMeta: null,
  ctx: {},
};
let map = null, layer = null;

async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json();
}

async function loadPoints() {
  try {
    const g = await getJSON("data/grid/index.json");
    const pts = Array.isArray(g) ? g : g.points;
    if (pts?.length) return { kind: "grid", points: pts, base: "data/grid/", cellDeg: g.cell_deg ?? null };
  } catch { /* fall back to the demo sites */ }
  return { kind: "sites", points: await getJSON("data/sites/index.json"), base: "data/sites/", cellDeg: null };
}

/* ---------- I20 exposure score ---------- */
const hasData = (c) => state.points.some((p) => c.get(state.sites[p.id]) != null);

/** Within-state rank of every place for one sign: 0 = least exposed, 1 = most. */
function ranks(c) {
  const vals = state.points.map((p) => ({ id: p.id, v: c.get(state.sites[p.id]) })).filter((x) => x.v != null);
  const ex = (v) => (c.worse === "high" ? v : -v);
  const out = {};
  for (const a of vals) {
    const below = vals.filter((b) => ex(b.v) < ex(a.v)).length;
    const ties = vals.filter((b) => b !== a && ex(b.v) === ex(a.v)).length;
    out[a.id] = vals.length > 1 ? (below + ties / 2) / (vals.length - 1) : 0.5;
  }
  return out;
}

function computeScores() {
  const used = COMPONENTS.filter((c) => state.on[c.id] && hasData(c));
  const r = Object.fromEntries(used.map((c) => [c.id, ranks(c)]));
  state.used = used;
  state.scores = Object.fromEntries(state.points.map((p) => {
    const parts = used.map((c) => r[c.id][p.id]).filter((x) => x != null);
    return [p.id, parts.length ? Math.round((100 * parts.reduce((s, x) => s + x, 0)) / parts.length) : null];
  }));
}

const LIGHT = [253, 240, 225], DARK = [138, 59, 0];
const colour = (v) => `rgb(${LIGHT.map((l, i) => Math.round(l + (DARK[i] - l) * Math.max(0, Math.min(1, v)))).join(",")})`;
const placeName = (p) => siteName(p);
const short = (p) => placeName(p).replace(/\s*\(\d+\s*km\)\s*$/, "");

function compText(c, s) {
  const v = c.get(s);
  if (v == null) return t("p.pending");
  if (c.id === "rain") return t("p.v.rain", { v: signed(v, 0) });
  if (c.id === "heat") return t("p.v.heat", { v: signed(v, 1) });
  if (c.id === "gw") return t("p.v.gw", { v: signed(v, 1) });
  return t("p.v.soil", { v: signed(v, 3) });
}
const signed = (v, d) => (v > 0 ? "+" : v < 0 ? "−" : "") + fmt(Math.abs(v), d);

function initMap() {
  const L = window.L;
  if (!L) { $("#pmap").hidden = true; return; }
  map = L.map("pmap", { scrollWheelZoom: false });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 12, minZoom: 5, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
  map.fitBounds(L.latLngBounds(state.points.map((p) => [p.lat, p.lon])).pad(state.kind === "grid" ? 0.05 : 0.8));
  layer = L.layerGroup().addTo(map);
}

function drawMap() {
  if (!map) return;
  const L = window.L;
  layer.clearLayers();
  for (const p of state.points) {
    const sc = state.scores[p.id];
    if (sc == null) continue;
    const s = state.sites[p.id];
    const sel = state.selected?.id === p.id;
    const tip = `<strong>${short(p)}</strong><br>${t("p.score", { v: sc })}<br>` +
      state.used.map((c) => `${t(`p.c.${c.id}`)}: ${compText(c, s)}${c.disagree?.(s) ? " ⚠" : ""}`).join("<br>");
    const opts = { weight: sel ? 3 : 0.5, color: sel ? "#1f2420" : "#ffffff", fillColor: colour(sc / 100), fillOpacity: 0.85 };
    let shape;
    if (state.kind === "grid" && state.cellDeg) {
      const d = state.cellDeg / 2;
      shape = L.rectangle([[p.lat - d, p.lon - d], [p.lat + d, p.lon + d]], opts);
    } else {
      shape = L.circleMarker([p.lat, p.lon], { ...opts, radius: 16 });
    }
    shape.bindTooltip(tip, { sticky: true });
    shape.on("click", () => selectPoint(p));
    shape.addTo(layer);
  }
}

function drawLegend() {
  const el = $("#legend");
  clear(el).append(
    h("span", { class: "xlegend-l" }, t("p.legend")),
    h("span", { class: "xlegend-ends" }, t("p.legend.low")),
    h("span", { class: "xlegend-bar", style: { background: `linear-gradient(90deg, ${colour(0)}, ${colour(1)})` } }),
    h("span", { class: "xlegend-ends" }, t("p.legend.high")));
}

function drawNotes() {
  const el = clear($("#vuln-notes"));
  const rain = COMPONENTS[0];
  const n = state.points.length;
  const dis = state.points.filter((p) => rain.disagree(state.sites[p.id])).length;
  const notes = [];
  if (state.on.rain && dis) notes.push(t("p.note.rain", { d: dis, n }));
  if (!hasData(COMPONENTS[2])) notes.push(t("p.note.gw"));
  const period = state.sites[state.points[0].id]?.period;
  if (period) notes.push(t("p.note.period", { a: period.start, b: period.end }));
  notes.push(t("p.note.relative"));
  el.append(h("ul", { class: "vuln-notes" }, ...notes.map((x) => h("li", {}, x))));
}

function drawTable() {
  const el = clear($("#vuln-table"));
  const rows = state.points.filter((p) => state.scores[p.id] != null)
    .sort((a, b) => state.scores[b.id] - state.scores[a.id]).slice(0, 10);
  const cols = COMPONENTS.filter((c) => state.on[c.id]);
  el.append(
    h("h3", { class: "vuln-h" }, t("p.table.title")),
    h("div", { class: "table-wrap" }, h("table", { class: "compare xtable" },
      h("thead", {}, h("tr", {}, h("th", { scope: "col" }, t("x.col.place")), h("th", { scope: "col" }, t("p.col.score")),
        ...cols.map((c) => h("th", { scope: "col" }, t(`p.c.${c.id}`))))),
      h("tbody", {}, ...rows.map((p) => {
        const s = state.sites[p.id];
        return h("tr", { class: state.selected?.id === p.id ? "sel" : "", onclick: () => selectPoint(p), style: { cursor: "pointer" } },
          h("th", { scope: "row" }, placeName(p)),
          h("td", {}, String(state.scores[p.id])),
          ...cols.map((c) => h("td", { class: c.get(s) == null ? "muted" : "" },
            compText(c, s), c.disagree?.(s) ? h("span", { class: "flag", title: t("p.flag.rain") }, " ⚠") : null)));
      })))));
}

/* ---------- I23 what if farms switch ---------- */
const prefs = (water) => ({ weights: WEIGHTS, water_source: water, scenario: { dT_c: 0, dPrecip_pct: 0 } });
const ctxFor = (water) => (state.ctx[water] ??= statewideContext(Object.values(state.sites), state.crops, prefs(water)));

function selectPoint(p) {
  state.selected = p;
  const s = state.sites[p.id];
  // default "switch to": the top-ranked seasonal crop here that needs less water than the current one
  // (perennials like sugarcane / banana are left out: they hold the field all year)
  const from = state.cropById[state.wi.from];
  const fits = (c) => c.id !== from.id && c.duration_days <= 200 && c.water_need_mm < from.water_need_mm;
  const top = rankCrops(s, state.crops, prefs(state.wi.water), state.crops.length, ctxFor(state.wi.water)).find((k) => fits(state.cropById[k.crop]));
  state.wi.to = top?.crop ?? state.wi.to;
  state.wi.toAuto = true;
  // district(s) this grid point belongs to (data/districts.json, contract §1c)
  const ds = districtsAt(p);
  state.wi.district = ds[0]?.id ?? null;
  state.wi.areaAuto = true;
  fillArea();
  drawMap(); drawTable(); drawWhatIf();
}

const districtsAt = (p) => state.districts.filter((d) => d.points?.includes(p.id));
const districtById = (id) => state.districts.find((d) => d.id === id) ?? null;
// rice areas are reported for all rice together, under rice_long (contract §1c)
const areaKey = (cropId) => (cropId === "rice_short" ? "rice_long" : cropId);
function fillArea() {
  const d = districtById(state.wi.district);
  if (d && state.wi.areaAuto) state.wi.area = Math.round(d.area_ha?.[areaKey(state.wi.from)] ?? 0);
}

function drawWhatIf() {
  const p = state.selected;
  const box = clear($("#whatif"));
  if (!p) { $("#wi-title").textContent = t("p.wi.empty"); return; }
  const s = state.sites[p.id];
  const w = state.wi;
  $("#wi-title").textContent = t("p.wi.title", { place: short(p) });

  const crops = state.crops.filter((c) => c.type !== "green_manure");
  const sel = (id, val, on) => h("select", { id, onchange: (e) => on(e.target.value) },
    ...crops.map((c) => h("option", { value: c.id, selected: c.id === val }, cropName(c))));
  const a = cropSuitability(s, state.crops, w.from, prefs(w.water));
  const b = cropSuitability(s, state.crops, w.to, prefs(w.water));
  const savedMm = (a.irrigation_mm ?? 0) - (b.irrigation_mm ?? 0);
  
  const controls = h("div", { class: "wi-controls" },
    h("label", {}, h("span", {}, t("p.wi.from")), sel("wi-from", w.from, (v) => { w.from = v; fillArea(); drawWhatIf(); })),
    h("label", {}, h("span", {}, t("p.wi.to") + (w.toAuto ? ` (${t("p.wi.top")})` : "")), sel("wi-to", w.to, (v) => { w.to = v; w.toAuto = false; drawWhatIf(); })),
    h("label", {}, h("span", {}, t("p.wi.water")), h("select", { id: "wi-water", onchange: (e) => { w.water = e.target.value; drawWhatIf(); } },
      ...Object.keys(WATER_SOURCES).map((k) => h("option", { value: k, selected: k === w.water }, waterLabel(k, WATER_SOURCES[k].label))))),
    h("label", {}, h("span", {}, t("p.wi.area", { crop: cropName(state.cropById[w.from]) })),
      h("input", { id: "wi-area", type: "number", min: "0", step: "100", value: String(w.area), onchange: (e) => { w.area = Math.max(0, +e.target.value || 0); w.areaAuto = false; drawWhatIf(); } })),
    h("label", { class: "wi-share" }, h("span", {}, t("p.wi.share", { v: w.share })),
      h("input", { id: "wi-share", type: "range", min: "0", max: "100", step: "5", value: String(w.share),
        oninput: (e) => { w.share = +e.target.value; drawResult(); e.target.previousSibling.textContent = t("p.wi.share", { v: w.share }); } })));

  const dist = districtById(w.district);
  const cands = districtsAt(p);
  if (cands.length > 1) {
    controls.prepend(h("label", {}, h("span", {}, t("p.wi.district")), h("select", { id: "wi-district", onchange: (e) => { w.district = e.target.value; w.areaAuto = true; fillArea(); drawWhatIf(); } },
      ...cands.map((d) => h("option", { value: d.id, selected: d.id === w.district }, d.name)))));
  }
  const low = dist?.mismatch?.confidence === "low";
  const areaNote = dist
    ? h("p", { class: "note" + (low ? " wi-low" : "") },
        w.areaAuto ? t("p.wi.area.from", { d: dist.name, src: t("p.wi.area.src") }) : t("p.wi.area.typed", { d: dist.name }),
        low ? " " + t("p.wi.low", { d: dist.name }) + (dist.mismatch.confidence_reasons?.length ? ` (${dist.mismatch.confidence_reasons.join("; ")})` : "") : "")
    : h("p", { class: "note" }, t("p.wi.areanote"));
  const result = h("div", { id: "wi-result", class: low ? "wi-low" : "" });
  box.append(controls, result, areaNote);
  drawResult();

  function drawResult() {
    const hs = (w.area * w.share) / 100;
    const vol = savedMm * M3_PER_HA_PER_MM * hs;
    const rel = t("p.wi.rel", { a: cropName(state.cropById[w.from]), b: cropName(state.cropById[w.to]), ga: a.good_years, gb: b.good_years, n: a.total_years, ma: monthName(a.sow), mb: monthName(b.sow) });
    const r = clear(result);
    if (w.from === w.to) { r.append(h("p", { class: "sow-verdict warn" }, t("p.wi.same"))); return; }
    if (w.water === "rainfed") {
      r.append(h("p", { class: "sow-verdict" }, t("p.wi.rainfed")), h("p", {}, rel));
      return;
    }
    if (savedMm <= 0) {
      r.append(h("p", { class: "sow-verdict warn" }, t("p.wi.nosave", { b: cropName(state.cropById[w.to]), mm: fmt(-savedMm) })), h("p", {}, rel));
      return;
    }
    r.append(
      h("div", { class: "wi-big" },
        h("span", { class: "wi-n" }, fmt(vol / 1e6, vol >= 1e7 ? 0 : 2)),
        h("span", { class: "wi-l" }, t("p.wi.mcm"), h("br"), t("p.wi.peryear"))),
      h("p", {}, t("p.wi.calc", { mm: fmt(savedMm), ha: fmt(hs), m3: fmt(vol) })),
      h("p", {}, rel),
      h("p", { class: "note" }, t("p.wi.irr", { a: cropName(state.cropById[w.from]), b: cropName(state.cropById[w.to]), ia: fmt(a.irrigation_mm ?? 0), ib: fmt(b.irrigation_mm ?? 0), water: waterLabel(w.water, WATER_SOURCES[w.water].label).toLowerCase() })));
  }
}

/* ---------- controls ---------- */
function drawControls() {
  const box = clear($("#components"));
  for (const c of COMPONENTS) {
    const avail = hasData(c);
    const id = `c-${c.id}`;
    box.append(h("label", { class: "choice" + (state.on[c.id] && avail ? " on" : "") + (avail ? "" : " pending") },
      h("input", { type: "checkbox", id, checked: state.on[c.id] && avail, disabled: !avail,
        onchange: (e) => { state.on[c.id] = e.target.checked; refresh(); } }),
      h("span", {}, h("strong", {}, t(`p.c.${c.id}`)), h("br"), h("small", {}, avail ? t(`p.c.${c.id}.src`) : t("p.c.gw.pending")))));
  }
  $("#points-note").textContent = state.kind === "grid" ? t("x.points.grid", { n: state.points.length }) : t("x.points.sites", { n: state.points.length });
}

function refresh() {
  computeScores();
  drawControls(); drawMap(); drawLegend(); drawNotes(); drawTable(); drawWhatIf();
}

function applyStatic() {
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
  const btn = $("#lang");
  btn.textContent = t("lang.switch");
  btn.setAttribute("aria-label", t("lang.switch.aria"));
  btn.lang = getLang() === "ta" ? "en" : "ta";
  document.title = `${t("brand")} · ${t("p.eyebrow")}`;
}

async function init() {
  initLang();
  initTooltips();
  applyStatic();
  $("#lang").addEventListener("click", () => setLang(getLang() === "ta" ? "en" : "ta"));
  onLangChange(() => { applyStatic(); refresh(); });
  try {
    const [pts, crops, dists] = await Promise.all([loadPoints(), getJSON("data/crops.json"), getJSON("data/districts.json").catch(() => null)]);
    state.districts = dists?.districts ?? [];
    state.districtsMeta = dists?.meta ?? null;
    Object.assign(state, { kind: pts.kind, cellDeg: pts.cellDeg, points: pts.points, crops });
    state.cropById = Object.fromEntries(crops.map((c) => [c.id, c]));
    const files = await Promise.all(pts.points.map((p) => getJSON(`${pts.base}${p.id}.json`)));
    pts.points.forEach((p, i) => { state.sites[p.id] = files[i]; });
  } catch (err) {
    $("#error").hidden = false;
    $("#error").textContent = t("err.load", { msg: err.message });
    return;
  }
  initMap();
  refresh();
}

init();
