// Field Shift UI (Lane B). Reads web/data/*.json, calls only the scoring.js exports
// (docs/data_contract.md section 4), and renders. No scoring logic lives here.
import {
  generateStrategies, siteHighlights, trendScenario, DEFAULT_CURRENT, PRIORITIES, WATER_SOURCES,
} from "./scoring.js";
import { $, h, clear, debounce, fmt, signed } from "./ui/dom.js";
import { decorate, initTooltips, renderGlossaryList } from "./ui/glossary.js";
import { createSiteMap } from "./ui/map.js";
import { renderRotationEditor, renderWaterSource, renderPriorities, renderClimate } from "./ui/inputs.js";
import { drawMonthlyChart, drawMonsoonChart, drawNdviChart, monsoonSeries, resizeCharts } from "./ui/charts.js";
import { strategyCard } from "./ui/cards.js";
import { renderPrintSheet } from "./ui/printsheet.js";

// Starting slider positions (the farmer changes these; they are preferences, not data).
const DEFAULT_WEIGHTS = { water: 3, income: 3, soil_structure: 3, nitrogen: 3, erosion: 3, forage: 1, reliability: 4 };
const FALLBACK_CURRENT = { rotation: [[{ crop: "rice_long", sow: 9 }]], water_source: "rainfed" };

const state = {
  sites: [], crops: [], cropById: {}, siteCache: {},
  site: null, rotation: null, water_source: "rainfed",
  weights: { ...DEFAULT_WEIGHTS }, scenario: { dT_c: 0, dPrecip_pct: 0 },
  strategies: [],
};
let map = null;
const clone = (x) => JSON.parse(JSON.stringify(x));
const prefs = () => ({ weights: { ...state.weights }, water_source: state.water_source, scenario: { ...state.scenario } });

async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json();
}

/* ---------------- expert toggle ---------------- */
function initExpertToggle() {
  const box = $("#expert");
  let on = false;
  try { on = localStorage.getItem("fs-expert") === "1"; } catch {}
  box.checked = on;
  document.body.classList.toggle("expert", on);
  box.addEventListener("change", () => {
    document.body.classList.toggle("expert", box.checked);
    try { localStorage.setItem("fs-expert", box.checked ? "1" : "0"); } catch {}
    if (box.checked && state.site) drawNdviChart($("#ch-ndvi"), state.site);
    resizeCharts();
  });
}

/* ---------------- site selection ---------------- */
async function selectSite(id) {
  const meta = state.sites.find((s) => s.id === id) ?? state.sites[0];
  setBusy(true, "Loading NASA data…");
  const site = state.siteCache[meta.id] ??= await getJSON(`data/sites/${meta.id}.json`);
  state.site = site;
  const def = DEFAULT_CURRENT[site.id] ?? FALLBACK_CURRENT;
  state.rotation = clone(def.rotation);
  state.water_source = def.water_source;
  state.scenario = { dT_c: 0, dPrecip_pct: 0 };

  $("#site-select").value = site.id;
  map?.select(site.id);
  history.replaceState(null, "", `#site=${site.id}`);

  renderSitePanel();
  renderInputs();
  recompute();
}

function renderSitePanel() {
  const s = state.site;
  $("#site-title").textContent = s.name;
  $("#site-meta").textContent = `${fmt(s.lat, 2)}°N, ${fmt(s.lon, 2)}°E · ${s.source}, ${s.period.start}–${s.period.end}`;
  drawMonthlyChart($("#ch-monthly"), s);
  drawMonsoonChart($("#ch-monsoon"), s);
  const { deficient, years } = monsoonSeries(s);
  $("#monsoon-note").textContent = deficient.length
    ? `${deficient.length} of ${years.length} northeast monsoons were 20% or more below this site's average: ${deficient.map((d) => d.year).join(", ")}.`
    : "";
  const hasNdvi = drawNdviChart($("#ch-ndvi"), s);
  $("#ndvi-fig").hidden = !hasNdvi;
  if (hasNdvi) $("#ndvi-note").textContent = `Median ${s.ndvi.years.join("–")}, ${s.ndvi.source}. ` +
    (s.ndvi.bare_months?.length ? "" : "This pixel window mixes in trees, so bare months do not show clearly yet.");

  const src = [s.source && `Weather: ${s.source} (${s.period.start}–${s.period.end})`, s.soil?.source && `Soil: ${s.soil.source}`,
    s.ndvi?.source && `Greenness: ${s.ndvi.source}`].filter(Boolean);
  $("#data-sources").textContent = src.join(" · ");
}

function renderInputs() {
  renderEditor();
  renderWaterSource($("#water"), { value: state.water_source, onChange: (v) => { state.water_source = v; renderInputsWater(); recompute(); } });
  renderClimate($("#climate"), {
    scenario: state.scenario, trend: trendScenario(state.site), period: state.site.period,
    onChange: (sc, now) => { state.scenario = sc; now ? recompute() : recomputeSoon(); },
  });
}
const renderInputsWater = () => renderWaterSource($("#water"), { value: state.water_source, onChange: (v) => { state.water_source = v; renderInputsWater(); recompute(); } });

function renderEditor() {
  renderRotationEditor($("#rot-editor"), {
    rotation: state.rotation, crops: state.crops,
    onChange: (rot) => { state.rotation = rot; renderEditor(); recompute(); },
    onReset: () => {
      const def = DEFAULT_CURRENT[state.site.id] ?? FALLBACK_CURRENT;
      state.rotation = clone(def.rotation); state.water_source = def.water_source;
      renderEditor(); renderInputsWater(); recompute();
    },
  });
}

/* ---------------- scoring + results ---------------- */
let runId = 0;
function setBusy(on, text = "Re-scoring…") {
  const b = $("#busy");
  b.textContent = on ? text : "";
  b.classList.toggle("on", on);
  $("#cards").classList.toggle("stale", on);
}

function recompute() {
  const id = ++runId;
  const yrs = state.site?.by_year?.length;
  setBusy(true, yrs ? `Re-scoring against ${yrs} real years…` : "Scoring…");
  // let the browser paint the busy state first; generateStrategies is synchronous (~0.4 s)
  requestAnimationFrame(() => setTimeout(() => {
    if (id !== runId) return;
    try {
      state.strategies = generateStrategies(state.site, state.crops, state.rotation, prefs());
      renderResults();
      $("#error").hidden = true;
    } catch (err) {
      console.error(err);
      $("#error").hidden = false;
      $("#error").textContent = `Could not score this rotation: ${err.message}`;
    }
    setBusy(false);
  }, 0));
}
const recomputeSoon = debounce(recompute, 250);

function renderResults() {
  const s = state.site, P = prefs(), sts = state.strategies;
  // highlights depend on the climate scenario
  $("#highlights").innerHTML = siteHighlights(s, P).map((t) => `<li>${decorate(t)}</li>`).join("");

  const cur = sts[0];
  const alts = sts.slice(1).sort((a, b) => b.total - a.total);
  const ordered = [cur, ...alts];
  const best = ordered.reduce((a, b) => (b.total > a.total ? b : a));

  // one-line summary, every number from the engine output
  const sum = $("#summary");
  clear(sum);
  if (best === cur) {
    sum.innerHTML = decorate(`Your current rotation is already the best fit for these priorities (${cur.total}/100). It came through ${cur.replay.good_years} of ${cur.replay.total_years} years.`);
  } else {
    sum.innerHTML = decorate(`"${best.tag}" fits your priorities best: ${best.total}/100 vs ${cur.total} for what you grow now. ` +
      `It came through ${best.replay.good_years} of ${best.replay.total_years} years (yours: ${cur.replay.good_years}) and needs ~${fmt(best.water_use.need_mm)} mm of water a year (yours: ~${fmt(cur.water_use.need_mm)} mm).`);
  }

  const sc = state.scenario;
  $("#scenario-note").hidden = !(sc.dT_c || sc.dPrecip_pct);
  $("#scenario-note").textContent = `Climate what-if is on: ${signed(sc.dT_c, 1)} °C and ${signed(sc.dPrecip_pct)}% rain applied to every year. This is an illustration, not a forecast.`;

  const cards = $("#cards");
  clear(cards);
  ordered.forEach((st, i) => cards.append(strategyCard(st, { site: s, cropById: state.cropById, isBest: st === best && sts.length > 1, rank: i })));

  const issues = $("#rot-issues");
  clear(issues);
  if (cur.issues.length) issues.append(h("ul", { class: "rot-issues", role: "status" }, cur.issues.map((t) => h("li", {}, "⚠ " + t))));

  renderPrintSheet($("#print-sheet"), { site: s, strategies: ordered, prefs: P, cropById: state.cropById, highlights: siteHighlights(s, P) });
}

/* ---------------- boot ---------------- */
async function init() {
  initTooltips();
  initExpertToggle();
  renderGlossaryList($("#glossary-list"));
  try {
    const [sites, crops] = await Promise.all([getJSON("data/sites/index.json"), getJSON("data/crops.json")]);
    state.sites = sites;
    state.crops = crops;
    state.cropById = Object.fromEntries(crops.map((c) => [c.id, c]));
  } catch (err) {
    $("#error").hidden = false;
    $("#error").textContent = `Could not load data (${err.message}). If you opened the file directly, run: python -m http.server 8000 --directory web`;
    return;
  }

  const sel = $("#site-select");
  sel.append(...state.sites.map((s) => h("option", { value: s.id }, s.name)));
  sel.addEventListener("change", () => selectSite(sel.value));
  map = createSiteMap($("#map"), state.sites, (id) => selectSite(id));

  renderPriorities($("#prios"), { weights: state.weights, onChange: (k, v) => { state.weights[k] = v; recomputeSoon(); } });
  $("#print").addEventListener("click", () => window.print());
  window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", () => state.site && renderSitePanel());

  const fromHash = new URLSearchParams(location.hash.slice(1)).get("site");
  await selectSite(state.sites.some((s) => s.id === fromHash) ? fromHash : state.sites[0].id);
}

init();

// handy for debugging in the console
window.fieldShift = { state, PRIORITIES, WATER_SOURCES };
