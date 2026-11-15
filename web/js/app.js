// SowSmart UI (Lane B). Reads web/data/*.json, calls only the scoring.js exports
// (docs/data_contract.md section 4), and renders. No scoring logic lives here.
import {
  generateStrategies, siteHighlights, trendScenario, scenarioMonthly, DEFAULT_CURRENT, PRIORITIES, WATER_SOURCES,
} from "./scoring.js";
import { $, h, clear, debounce, fmt, signed } from "./ui/dom.js";
import { decorate, rich, initTooltips, renderGlossaryList } from "./ui/glossary.js";
import { t, initLang, setLang, onLangChange, getLang, siteName, tagLabel, setPlaceInfo } from "./i18n.js";
import { describePlaces } from "./ui/places.js";
import { createSiteMap } from "./ui/map.js";
import { renderRotationEditor, renderWaterSource, renderPriorities, renderClimate, mainWater } from "./ui/inputs.js";
import { drawMonthlyChart, drawMonsoonChart, drawNdviChart, monsoonSeries, resizeCharts } from "./ui/charts.js";
import { renderTrends, resizeTrendCharts } from "./ui/trends.js";
import { renderSowing } from "./ui/sowing.js";
import { strategyCard } from "./ui/cards.js";
import { renderPrintSheet } from "./ui/printsheet.js";
import { renderMyCrops } from "./ui/mycrops.js";

// Starting slider positions (the farmer changes these; they are preferences, not data).
const DEFAULT_WEIGHTS = { water: 3, income: 3, soil_structure: 3, nitrogen: 3, erosion: 3, forage: 1, reliability: 4 };
// Places without a preset (the 47 grid points): long rice on a village tank, the common Tamil Nadu pattern.
const FALLBACK_CURRENT = { rotation: [[{ crop: "rice_long", sow: 9 }]], water_source: "tank" };
const SITE_KEY = "fs-site";
// index.html?view=detail = "This place in detail" (a Policy sub-tab for agriculture officers and planners): the same page
// with the full-year plans, charts and climate trends open. The plain Farm view keeps those folded or hidden.
const DETAIL = new URLSearchParams(location.search).get("view") === "detail";

const state = {
  sites: [], crops: [], cropById: {}, siteCache: {}, trendCache: {}, trends: null, sowChoice: null,
  site: null, rotation: null, water_source: "rainfed", waters: new Set(["rainfed"]),
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
    resizeTrendCharts();
  });
}

/* ---------------- site selection ---------------- */
async function selectSite(id) {
  const meta = state.sites.find((s) => s.id === id) ?? state.sites[0];
  setBusy(true, t("loading.data"));
  const site = state.siteCache[meta.id] ??= await getJSON(`${meta.base ?? "data/sites/"}${meta.id}.json`);
  state.site = site;
  // B11: climate-trend file is optional (contract §2b); the panel hides when it is missing.
  if (!(meta.id in state.trendCache)) state.trendCache[meta.id] = meta.demo ? await getJSON(`data/trends/${meta.id}.json`).catch(() => null) : null;
  state.trends = state.trendCache[meta.id];
  state.sowChoice = null;
  const def = DEFAULT_CURRENT[site.id] ?? FALLBACK_CURRENT;
  state.rotation = clone(def.rotation);
  setWaterSet(new Set([def.water_source]));
  state.scenario = { dT_c: 0, dPrecip_pct: 0 };

  $("#site-select").value = site.id;
  map?.select(site.id);
  if (!state.example) history.replaceState(null, "", `#site=${site.id}`);   // an example place is not a choice
  if (!state.example) { try { localStorage.setItem(SITE_KEY, site.id); } catch {} }
  renderExampleNote();

  renderSitePanel();
  renderInputs();
  recompute();
}

function renderSitePanel() {
  const s = state.site;
  $("#site-title").textContent = siteName(s);
  $("#site-meta").textContent = `${fmt(s.lat, 2)}°N, ${fmt(s.lon, 2)}°E · ${s.period.start}–${s.period.end} · ` +
    (s.precip_source ? t("meta.rain", { rain: rainName(s) }) : s.source);
  renderRainComparison(s);
  renderTrends($("#trend-panel"), state.trends);
  drawMonthlyChart($("#ch-monthly"), s);
  drawMonsoonChart($("#ch-monsoon"), s);
  const { deficient, years } = monsoonSeries(s);
  $("#monsoon-note").textContent = deficient.length
    ? t("monsoon.note", { n: deficient.length, total: years.length, years: deficient.map((d) => d.year).join(", ") })
    : "";
  const hasNdvi = drawNdviChart($("#ch-ndvi"), s);
  $("#ndvi-fig").hidden = !hasNdvi;
  if (hasNdvi) $("#ndvi-note").textContent = t("ndvi.note", { years: s.ndvi.years.join("–"), source: s.ndvi.source }) +
    (s.ndvi.bare_months?.length ? "" : t("ndvi.mixed"));

  const src = [s.precip_source && t("src.rain", { x: s.precip_source }), s.source && t("src.weather", { x: `${s.source} (${s.period.start}–${s.period.end})` }),
    s.soil?.source && t("src.soil", { x: s.soil.source }), s.ndvi?.source && t("src.ndvi", { x: s.ndvi.source })].filter(Boolean);
  $("#data-sources").textContent = src.join(" · ");
}

/* "Two NASA datasets" box: POWER vs GPM IMERG rainfall, from site.rain_comparison */
export const rainName = (s) => (/IMERG/.test(s.precip_source || "") ? "GPM IMERG" : "NASA POWER");

function renderRainComparison(s) {
  const box = $("#rain-compare");
  const rc = s.rain_comparison;
  box.hidden = !rc;
  if (!rc) return;
  const diff = (rc.power_annual_mean_mm - rc.imerg_annual_mean_mm) / rc.imerg_annual_mean_mm;
  const agreeDry = rc.driest_ne_year_power === rc.driest_ne_year_imerg;
  const row = (label, a, b) => h("tr", {}, h("th", { scope: "row" }, label), h("td", {}, a), h("td", {}, b));
  clear(box).append(
    h("figcaption", {}, t("fig.compare")),
    h("table", { class: "compare" },
      h("thead", {}, h("tr", {}, h("th", {}, ""), h("th", { scope: "col" }, "NASA POWER"), h("th", { scope: "col" }, "GPM IMERG"))),
      h("tbody", {},
        row(t("cmp.year"), `${fmt(rc.power_annual_mean_mm)} mm`, `${fmt(rc.imerg_annual_mean_mm)} mm`),
        row(t("cmp.ne"), `${fmt(rc.power_ne_monsoon_mean_mm)} mm`, `${fmt(rc.imerg_ne_monsoon_mean_mm)} mm`),
        row(t("cmp.dry"), String(rc.driest_ne_year_power), String(rc.driest_ne_year_imerg)))),
    h("p", { class: "note", html: decorate(
      (agreeDry ? t("cmp.agree", { year: rc.driest_ne_year_imerg }) : t("cmp.disagree")) +
      t("cmp.corr", { r: fmt(rc.ne_monsoon_correlation, 2) }) +
      (Math.abs(diff) >= 0.15
        ? t("cmp.bigdiff", { pct: fmt(Math.abs(diff) * 100), dir: diff > 0 ? t("cmp.more") : t("cmp.less") })
        : t("cmp.close", { pct: fmt(Math.ceil(Math.abs(diff) * 100)) }))) }),
  );
}

function renderInputs() {
  renderEditor();
  renderInputsWater();
  renderClimate($("#climate"), {
    scenario: state.scenario, trend: trendScenario(state.site), period: state.site.period, rainSource: rainName(state.site),
    onChange: (sc, now) => { state.scenario = sc; now ? recompute() : recomputeSoon(); },
  });
}
const renderInputsWater = () => renderWaterSource($("#water"), { value: state.waters, onChange: setWaters });
// one set of ticked water sources for the Farmers panel (mycrops) and the full-year plans (aside);
// the engine scores a plan with one source, so water_source is the first ticked one (inputs.js WATER_ORDER)
function setWaterSet(set) { state.waters = set; state.water_source = mainWater(set); }
function setWaters(set) { setWaterSet(set); renderInputsWater(); recompute(); }

function renderEditor() {
  renderRotationEditor($("#rot-editor"), {
    rotation: state.rotation, crops: state.crops,
    onChange: (rot) => { state.rotation = rot; renderEditor(); recompute(); },
    onReset: () => {
      const def = DEFAULT_CURRENT[state.site.id] ?? FALLBACK_CURRENT;
      state.rotation = clone(def.rotation); setWaterSet(new Set([def.water_source]));
      renderEditor(); renderInputsWater(); recompute();
    },
  });
}

/* ---------------- scoring + results ---------------- */
let runId = 0;
function setBusy(on, text = t("busy")) {
  const b = $("#busy");
  b.textContent = on ? text : "";
  b.classList.toggle("on", on);
  $("#cards").classList.toggle("stale", on);
}

function recompute() {
  const id = ++runId;
  const yrs = state.site?.by_year?.length;
  setBusy(true, yrs ? t("busy.years", { n: yrs }) : t("busy"));
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
      $("#error").textContent = t("err.score", { msg: err.message });
    }
    setBusy(false);
  }, 0));
}
const recomputeSoon = debounce(recompute, 250);

function renderSowPanel() {
  renderSowing($("#sow-body"), {
    site: state.site, trends: state.trends, crops: state.crops, cropById: state.cropById, prefs: prefs(),
    rotation: state.rotation, choice: state.sowChoice,
    onChange: (c) => { state.sowChoice = c; renderSowPanel(); },
  });
}

function renderResults() {
  const s = state.site, P = prefs(), sts = state.strategies;
  renderSowPanel();
  renderMyCrops($("#mycrops"), { site: s, crops: state.crops, prefs: P, currentIds: state.rotation.flat().map((x) => x.crop), waters: state.waters, onWaters: setWaters });
  // highlights depend on the climate scenario
  $("#highlights").innerHTML = siteHighlights(s, P).map((x) => `<li>${decorate(x)}</li>`).join("");

  const cur = sts[0];
  const alts = sts.slice(1).sort((a, b) => b.total - a.total);
  const ordered = [cur, ...alts];
  const best = ordered.reduce((a, b) => (b.total > a.total ? b : a));

  // one-line summary, every number from the engine output
  const sum = $("#summary");
  clear(sum);
  if (best === cur) {
    sum.innerHTML = decorate(t("sum.current", { total: cur.total, good: cur.replay.good_years, years: cur.replay.total_years }));
  } else {
    sum.innerHTML = decorate(t("sum.best", {
      tag: tagLabel(best.tag), total: best.total, cur: cur.total, good: best.replay.good_years, years: best.replay.total_years,
      curGood: cur.replay.good_years, need: fmt(best.water_use.need_mm), curNeed: fmt(cur.water_use.need_mm),
    }));
  }
  $("#engine-note").hidden = !t("engine.english");
  $("#engine-note").textContent = t("engine.english");

  const sc = state.scenario;
  const scenarioOn = !!(sc.dT_c || sc.dPrecip_pct);
  $("#scenario-note").hidden = !scenarioOn;
  $("#scenario-note").textContent = t("scenario.on", { dT: signed(sc.dT_c, 1), dP: signed(sc.dPrecip_pct) });

  // calendar bands use the same scenario-adjusted climate as the scores
  let monthly = null;
  try { monthly = scenarioMonthly(s, sc); } catch { monthly = null; }
  const cards = $("#cards");
  clear(cards);
  ordered.forEach((st, i) => cards.append(strategyCard(st, {
    site: s, cropById: state.cropById, isBest: st === best && sts.length > 1, rank: i, monthly, scenarioOn,
  })));

  const issues = $("#rot-issues");
  clear(issues);
  if (cur.issues.length) issues.append(h("ul", { class: "rot-issues", role: "status" }, cur.issues.map((x) => h("li", {}, "⚠ " + x))));

  renderPrintSheet($("#print-sheet"), { site: s, strategies: ordered, prefs: P, cropById: state.cropById, highlights: siteHighlights(s, P) });
}

/* ---------------- language (English / Tamil) ---------------- */
function applyStatic() {
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => { el.innerHTML = rich(t(el.dataset.i18nHtml)); });
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
  const btn = $("#lang");
  btn.textContent = t("lang.switch");
  btn.setAttribute("aria-label", t("lang.switch.aria"));
  btn.lang = getLang() === "ta" ? "en" : "ta";
  document.title = DETAIL ? `${t("brand")} · ${t("tab.detail")}` : getLang() === "ta" ? `${t("brand")} · SowSmart` : t("brand");
  renderGlossaryList($("#glossary-list"));
}

function rerenderAll() {
  applyStatic();
  fillPlaceSelect($("#site-select"));     // also re-labels the two place groups
  renderExampleNote();
  map?.relabel();
  renderPriorities($("#prios"), { weights: state.weights, onChange: (k, v) => { state.weights[k] = v; recomputeSoon(); } });
  if (!state.site) return;
  renderSitePanel();
  renderInputs();
  if (state.strategies.length) renderResults();
}

/* ---------------- boot ---------------- */
function initView() {
  document.body.classList.toggle("view-detail", DETAIL);
  if (!DETAIL) return;
  document.querySelectorAll(".tabs .tab").forEach((a) => {
    const pol = a.getAttribute("href") === "policy.html";
    a.classList.toggle("active", pol);
    if (pol) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  ["#more-plans", ".site-panel", "#trend-panel"].forEach((sel) => { const d = $(sel); if (d) d.open = true; });
  const tag = $(".top .tagline");
  if (tag) tag.dataset.i18n = "d.tagline";
  // this view sits under the Policy makers tab, so it explains that tab's purpose
  const why = document.querySelector('.intro [data-i18n="why.farm"]');
  if (why) why.dataset.i18n = "why.policy";
  const note = $("#intro-note");
  if (note) note.dataset.i18n = "why.policy.note";
}

async function init() {
  initLang();
  initView();
  initTooltips();
  initExpertToggle();
  applyStatic();
  $("#lang").addEventListener("click", () => setLang(getLang() === "ta" ? "en" : "ta"));
  onLangChange(rerenderAll);
  try {
    const [sites, crops, grid, dists] = await Promise.all([getJSON("data/sites/index.json"), getJSON("data/crops.json"),
      getJSON("data/grid/index.json").catch(() => null), getJSON("data/districts.json").catch(() => null)]);
    // 3 detailed demo places + the statewide 0.5° grid (same file format, fewer extras), so any farmer can pick a place
    const gridPts = (grid?.points ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
    state.sites = [...sites.map((s) => ({ ...s, base: "data/sites/", demo: true })), ...gridPts.map((p) => ({ ...p, base: "data/grid/", demo: false }))];
    // one list grouped by nearest district town, each place named "Chennai, 19 km north-west" (ui/places.js)
    state.places = describePlaces(state.sites, dists?.districts);
    setPlaceInfo(state.places.info);
    state.cellKm = grid?.cell_deg ? Math.round(grid.cell_deg * 111) : null;   // 111 km per degree (unit conversion)
    state.crops = crops;
    state.cropById = Object.fromEntries(crops.map((c) => [c.id, c]));
  } catch (err) {
    $("#error").hidden = false;
    $("#error").textContent = t("err.load", { msg: err.message });
    return;
  }

  const sel = $("#site-select");
  fillPlaceSelect(sel);
  sel.addEventListener("change", () => chooseByUser(sel.value));

  renderPriorities($("#prios"), { weights: state.weights, onChange: (k, v) => { state.weights[k] = v; recomputeSoon(); } });
  $("#print").addEventListener("click", () => window.print());
  window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", () => state.site && renderSitePanel());

  window.addEventListener("hashchange", () => {
    const id = new URLSearchParams(location.hash.slice(1)).get("site");
    if (id && id !== state.site?.id && state.sites.some((s) => s.id === id)) selectSite(id);
  });
  // the folded sections hold charts: redraw them at full size when a section opens
  document.querySelectorAll("details.fold").forEach((d) => d.addEventListener("toggle", () => { if (d.open) { resizeCharts(); resizeTrendCharts(); } }));

  const known = (id) => state.sites.some((s) => s.id === id);
  const fromHash = new URLSearchParams(location.hash.slice(1)).get("site");
  let saved = null;
  try { saved = localStorage.getItem(SITE_KEY); } catch {}
  // open with something useful straight away: the farmer's last place, or an example they can change
  state.example = !known(fromHash) && !known(saved);
  setupPlaceBar();
  await selectSite(known(fromHash) ? fromHash : known(saved) ? saved : state.sites[0].id);
}

/* ---------------- where is your farm? ---------------- */
function fillPlaceSelect(sel) {
  clear(sel);
  const opt = (s) => h("option", { value: s.id }, siteName(s));
  // one list, grouped by district; the three demo places sit first in their district's group
  const { info = {}, townOf = {}, townTa = {} } = state.places ?? {};
  const groups = new Map();
  for (const s of state.sites) {
    const town = townOf[s.id] ?? s.name;
    if (!groups.has(town)) groups.set(town, []);
    groups.get(town).push(s);
  }
  const label = (town) => t("places.group", { town: getLang() === "ta" && townTa[town] ? townTa[town] : town });
  [...groups.keys()].sort((a, b) => a.localeCompare(b)).forEach((town) => {
    // demo place first, then villages A–Z (in the current language)
    const list = groups.get(town).sort((a, b) => (a.demo ? -1 : 0) - (b.demo ? -1 : 0) || siteName(a).localeCompare(siteName(b)));
    sel.append(h("optgroup", { label: label(town) }, ...list.map(opt)));
  });
  if (state.site) sel.value = state.site.id;
  const note = $("#place-note");
  if (note) note.textContent = state.cellKm ? t("places.note", { km: state.cellKm }) : "";
}

function chooseByUser(id) {        // any deliberate choice ends "example" mode and is remembered
  state.example = false;
  return selectSite(id);
}

function setupPlaceBar() {
  const fold = $("#map-fold");
  fold.addEventListener("toggle", () => {   // build the map only when first opened (Leaflet needs a visible box)
    if (fold.open && !map) { map = createSiteMap($("#map"), state.sites, (pid) => chooseByUser(pid)); map.select(state.site?.id); }
  });
  const msg = $("#locate-msg");
  $("#locate").addEventListener("click", () => {
    if (!navigator.geolocation) { msg.textContent = t("welcome.denied"); return; }
    msg.textContent = t("welcome.locating");
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude: la, longitude: lo } = pos.coords;
      const km = (s) => 6371 * 2 * Math.asin(Math.sqrt(Math.sin(((s.lat - la) * Math.PI) / 360) ** 2 +
        Math.cos((la * Math.PI) / 180) * Math.cos((s.lat * Math.PI) / 180) * Math.sin(((s.lon - lo) * Math.PI) / 360) ** 2));
      const best = state.sites.reduce((a, b) => (km(b) < km(a) ? b : a));
      msg.textContent = t("welcome.located", { place: siteName(best), km: Math.round(km(best)) }) + " " + t("welcome.privacy");
      chooseByUser(best.id);
    }, () => { msg.textContent = t("welcome.denied"); }, { timeout: 10000, maximumAge: 600000 });
  });
}

function renderExampleNote() {
  const el = $("#example-note");
  el.hidden = !state.example;
  if (state.example && state.site) el.textContent = t("welcome.example", { place: siteName(state.site) });
}

init();

// handy for debugging in the console
window.fieldShift = { state, PRIORITIES, WATER_SOURCES };
