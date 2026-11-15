// Field Shift scoring engine: season-based rotations for monsoon climates.
// Spec: docs/data_contract.md, section 4. Owned by Lane A. The UI only calls the exports.
//
// Model in one paragraph: a rotation is a cycle of 1-2 years; each year holds crop
// "slots" (crop + sowing month). We lay slots on a month calendar, then check each
// slot's water (effective rain + soil buffer + irrigation from the chosen water
// source), heat days and heavy-rain days, first against the 2001-2024 average and
// then replayed through every real year. Irrigation from tanks and canals depends
// on that year's monsoon, so failed monsoons hurt the way they do on real farms.
// All rules are simple and explainable on purpose.

const LEVEL = { low: 0.2, medium: 0.6, high: 1.0 };
const ROOT_M = { shallow: 0.4, medium: 0.8, deep: 1.4 };        // rooting depth, m
const HEAT_LIMIT = { low: 3, medium: 10, high: 30 };            // hot days tolerated per season
const FLOOD_LIMIT = { low: 2, medium: 4, high: 99 };            // heavy-rain days tolerated per season
const EFFECTIVE_RAIN = 0.75;                                    // share of rain a crop can use
const WATER_OK = 0.75;                                          // supply/need ratio counted as "ok"
const PEST_WEIGHT = 2;                                          // fixed weight, not a slider
const CHANGE_PENALTY = 3;                                       // points per crop new to the farmer
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Plant-available water capacity by USDA texture class, mm per m of soil.
const AWC = {
  "sand": 60, "loamy sand": 80, "sandy loam": 110, "loam": 160, "silt loam": 200, "silt": 200,
  "sandy clay loam": 140, "clay loam": 160, "silty clay loam": 180, "sandy clay": 120,
  "silty clay": 160, "clay": 140,
};

// Irrigation sources. budget_mm = water per water-year (Jun-May) in a normal monsoon
// year; months = when it can be delivered. Tank and canal budgets scale with that
// water-year's monsoon at the site (a rough proxy for tank inflow and dam storage).
export const WATER_SOURCES = {
  rainfed:  { label: "Rain only", budget_mm: 0, months: [], monsoon_linked: false },
  tank:     { label: "Lake / pond", budget_mm: 500, months: [11, 12, 1, 2, 3], monsoon_linked: true },
  canal:    { label: "River canal / dam", budget_mm: 1800, months: [6, 7, 8, 9, 10, 11, 12, 1, 2], monsoon_linked: true },
  borewell: { label: "Borewell / well", budget_mm: 1200, months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], monsoon_linked: false },
};

// Extra priorities the engine understands but the UI doesn't show yet (add to the slider list + Tamil label
// first, then they count when prefs.weights[key] > 0).
export const EXTRA_PRIORITIES = { storage: "Can store and sell later" };
export const PRIORITIES = {
  water: "Save water", income: "Income", soil_structure: "Soil health", nitrogen: "Natural nitrogen",
  erosion: "Erosion control", forage: "Fodder for animals", reliability: "Reliability in bad years",
};

// Starting "current rotation" per demo site (the UI lets the farmer change it).
export const DEFAULT_CURRENT = {
  tirunelveli: { rotation: [[{ crop: "rice_short", sow: 6 }, { crop: "rice_long", sow: 10 }]], water_source: "canal" },
  madurai:     { rotation: [[{ crop: "rice_long", sow: 9 }]], water_source: "tank" },
  thanjavur:   { rotation: [[{ crop: "rice_short", sow: 6 }, { crop: "rice_long", sow: 10 }]], water_source: "canal" },
};

// ---------- small helpers ----------
const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
const sum = (a) => a.reduce((s, x) => s + x, 0);
const mean = (a) => (a.length ? sum(a) / a.length : 0);
const r0 = (x) => Math.round(x);
const r2 = (x) => Math.round(x * 100) / 100;
const monthsLen = (crop) => Math.max(1, Math.round(crop.duration_days / 30.4));
const shortName = (crop) => crop.name.replace(/\s*\(.*?\)\s*/g, " ").replace(/\s+/g, " ").trim();
const monthList = (ms) => {
  // [10,11,12] -> "Oct–Dec"; non-contiguous -> "Jan, Mar"
  // contiguity is cyclic, so [1,2,10,11,12] -> "Oct–Feb"
  const u = [...new Set(ms)].sort((a, b) => a - b);
  if (!u.length) return "";
  if (u.length >= 12) return "all year";
  const breaks = u.map((m, i) => ((u[(i + 1) % u.length] - m + 12) % 12 === 1 ? -1 : i)).filter((i) => i >= 0);
  if (u.length > 2 && breaks.length === 1) {
    const end = u[breaks[0]], start = u[(breaks[0] + 1) % u.length];
    return `${MONTHS[start - 1]}–${MONTHS[end - 1]}`;
  }
  return u.map((m) => MONTHS[m - 1]).join(", ");
};
const cropMapCache = new WeakMap();
const cropMap = (crops) => {
  if (!cropMapCache.has(crops)) cropMapCache.set(crops, Object.fromEntries(crops.map((c) => [c.id, c])));
  return cropMapCache.get(crops);
};

// ---------- climate access with scenario adjustment ----------
function adjustMonth(m, sc, mi) {
  // Projection mode (NEX-GDDP-CMIP6 change factors for one model; see futureRange) replaces the sliders.
  const d = sc?.deltas;
  if (d) {
    const precip = (m.precip_mm ?? 0) * d.p_ratio[mi];
    const et0 = (m.et0_mm ?? Math.max(0, (m.precip_mm ?? 0) - (m.water_balance_mm ?? 0))) * d.et0_ratio[mi];
    // Hot days: apply the model's TEMPERATURE change to our observed baseline (same relation as the sliders),
    // not the model's own hot-day count change. NEX's baseline highs can sit just under 38 C, so a small warming
    // adds +40 hot days there; adding that on top of POWER's baseline double-counted the threshold jump and made
    // every Thanjavur rotation fail (RESEARCH_LOG I-20).
    const dT = d.d_tmax[mi];
    const hot = (m.heat_days ?? 0) * (1 + 0.4 * dT) + Math.max(0, (m.tmax_c ?? 0) - 34) * 0.8 * dT;
    return {
      precip_mm: precip, et0_mm: et0, water_balance_mm: precip - et0,
      heat_days: clamp(hot, 0, 31),
      heavy_rain_days: Math.max(0, (m.heavy_rain_days ?? 0) + d.d_heavy[mi]),
      tmax_c: (m.tmax_c ?? 0) + d.d_tmax[mi],
      max_daily_precip_mm: m.max_daily_precip_mm ?? null,
    };
  }
  const dT = sc?.dT_c || 0, dP = (sc?.dPrecip_pct || 0) / 100;
  const precip = (m.precip_mm ?? 0) * (1 + dP);
  const et0 = (m.et0_mm ?? Math.max(0, (m.precip_mm ?? 0) - (m.water_balance_mm ?? 0))) * (1 + 0.03 * dT);
  const hot = (m.heat_days ?? 0) * (1 + 0.4 * dT) + Math.max(0, (m.tmax_c ?? 0) - 34) * 0.8 * dT;
  return {
    precip_mm: precip,
    et0_mm: et0,
    water_balance_mm: precip - et0,
    heat_days: clamp(hot, 0, 31),
    // Extremes intensify ~7%/°C (Clausius-Clapeyron) even if the mean dries, so a drier
    // scenario only half-reduces heavy-rain days. Prevents "less rain => fewer floods" artefacts.
    heavy_rain_days: Math.max(0, (m.heavy_rain_days ?? 0) * (1 + 0.07 * dT) * (1 + 0.5 * dP)),
    tmax_c: (m.tmax_c ?? 0) + dT,
    max_daily_precip_mm: m.max_daily_precip_mm ?? null,
  };
}

// The adjusted climate depends only on (site, scenario); generateStrategies scores
// thousands of candidates, so cache it instead of re-adjusting 288 months each time.
const climateCache = new WeakMap();
function climate(site, sc) {
  const key = sc?.deltas ? `proj|${sc.projection_key}` : `${sc?.dT_c || 0}|${sc?.dPrecip_pct || 0}`;
  let perSite = climateCache.get(site);
  if (!perSite) climateCache.set(site, (perSite = new Map()));
  if (!perSite.has(key)) perSite.set(key, buildClimate(site, sc));
  return perSite.get(key);
}

function buildClimate(site, sc) {
  const monthly = site.monthly.map((m, i) => adjustMonth(m, sc, i));
  const byYear = (site.by_year || []).map((y) => ({ year: y.year, months: y.months.map((m, i) => adjustMonth(m, sc, i)) }));
  // Monsoon normals for tank/canal scaling.
  const ne = (ms) => ms[9].precip_mm + ms[10].precip_mm + ms[11].precip_mm;           // Oct-Dec
  const junDec = (ms) => sum(ms.slice(5, 12).map((m) => m.precip_mm));               // Jun-Dec
  // Normals come from today's OBSERVED climate, not the adjusted one: in a drier scenario tanks and canals
  // should fill less than today, not "normally for a drier world" (which hid scenario water stress).
  const obsYears = site.by_year || [];
  const neNormal = obsYears.length ? mean(obsYears.map((y) => ne(y.months))) : ne(site.monthly);
  const jdNormal = obsYears.length ? mean(obsYears.map((y) => junDec(y.months))) : junDec(site.monthly);
  // Upstream canal index (e.g. Cauvery: Mettur fills from Western Ghats monsoon rain, not local rain).
  const canalIndex = site.canal_index?.years || null;
  return { monthly, byYear, ne, junDec, neNormal, jdNormal, canalIndex };
}

// Index (0.3..1.3) for how full tanks/canals are in a given water-year.
// Canal: use the site's upstream catchment index when provided (RESEARCH_LOG I-17), else local Jun-Dec rain.
function sourceIndex(cl, src, yearIdx) {
  if (!WATER_SOURCES[src].monsoon_linked || yearIdx == null) return 1;
  const y = cl.byYear[yearIdx];
  if (!y) return 1;
  let v;
  if (src === "canal" && cl.canalIndex && cl.canalIndex[String(y.year)] != null) {
    // Upstream users take their share first, so downstream supply falls faster than catchment rain.
    // Assumption (one parameter): about half of normal flow is used upstream -> supply = (index - 0.5) / 0.5.
    v = (cl.canalIndex[String(y.year)] - 0.5) / 0.5;
  } else v = src === "tank" ? cl.ne(y.months) / cl.neNormal : cl.junDec(y.months) / cl.jdNormal;
  return clamp(v, 0.3, 1.3);
}

// ---------- rotation layout ----------
function layout(rotation, cm) {
  const years = rotation.length;
  const T = years * 12;
  const slots = [];
  rotation.forEach((yr, y) => yr.forEach((s) => {
    const crop = cm[s.crop];
    if (!crop) return;
    const start = y * 12 + (s.sow - 1);
    const len = monthsLen(crop);
    slots.push({ crop, sow: s.sow, yearRow: y, start, len, abs: Array.from({ length: len }, (_, k) => start + k) });
  }));
  slots.sort((a, b) => a.start - b.start);
  const cells = Array.from({ length: T }, () => ({ state: "bare", crop: null }));
  const issues = [];
  for (const s of slots) {
    for (const a of s.abs) {
      const c = cells[a % T];
      if (c.crop) issues.push(`${shortName(s.crop)} (sown ${MONTHS[s.sow - 1]}) overlaps ${shortName(cm[c.crop])} in ${MONTHS[a % 12]}`);
      else { c.state = s.crop.type === "green_manure" ? "cover" : "crop"; c.crop = s.crop.id; }
    }
    if (!s.crop.sow_months.includes(s.sow)) issues.push(`${shortName(s.crop)} is not usually sown in ${MONTHS[s.sow - 1]}`);
  }
  const calendar = Array.from({ length: years }, (_, y) => cells.slice(y * 12, y * 12 + 12));
  return { years, T, slots, cells, calendar, issues: [...new Set(issues)] };
}

// ---------- slot water / stress evaluation ----------
// getMonth(absMonthIdx) -> adjusted month or null; yearOf(absIdx) -> by_year index or null.
function evalSlots(L, getMonth, yearOf, src, soilBuffer) {
  const budgets = {};                 // water-year key -> remaining irrigation mm
  const srcDef = WATER_SOURCES[src] || WATER_SOURCES.rainfed;
  return L.slots.map((s) => {
    const ms = s.abs.map(getMonth);
    if (ms.some((m) => !m)) return null;   // runs past available data
    const rain = sum(ms.map((m) => m.precip_mm));
    const eff = EFFECTIVE_RAIN * rain;
    const buffer = soilBuffer * (ROOT_M[s.crop.root_depth] ?? 0.8);
    const need = s.crop.water_need_mm;
    let deficit = Math.max(0, need - eff - buffer);
    // irrigation: share of the slot's months the source can serve, from that water-year's budget
    let irr = 0;
    if (deficit > 0 && srcDef.budget_mm > 0) {
      const calMonths = s.abs.map((a) => (a % 12) + 1);
      const wyIdx = yearOf(s.abs[0] + (calMonths[0] < 6 ? -12 : 0)); // water-year starts in June
      const ds = damSeason(wyIdx);                                    // actual canal season, when known
      const servable = calMonths.filter((m) => (ds ? ds.months.has(m) : srcDef.months.includes(m))).length / calMonths.length;
      const key = String(wyIdx ?? Math.floor(s.start / 12));
      if (!(key in budgets)) budgets[key] = srcDef.budget_mm * (ds ? clamp(ds.release_index, 0, 1.3) : sourceIndex(cl_ref, src, wyIdx));
      irr = Math.min(deficit * servable, budgets[key]);
      budgets[key] -= irr;
      deficit -= irr;
    }
    const ratio = (eff + buffer + irr) / need;
    const heat = sum(ms.map((m) => m.heat_days));
    const heavy = sum(ms.map((m) => m.heavy_rain_days));
    const fails = [];
    if (ratio < WATER_OK) fails.push({ kind: "water", sev: 1 - ratio, text: `water: ~${r0(eff + buffer + irr)} mm available vs ${need} mm need` });
    // Flooded, fully watered rice canopies run 1-3 °C cooler than air (evaporative cooling), so the air-temperature
    // heat-day limit is doubled for flood-tolerant crops whose water need is fully met. Without this, delta Kuruvai
    // "failed" from heat in 8/24 years although it is grown successfully every year (RESEARCH_LOG I-18).
    const heatLimit = HEAT_LIMIT[s.crop.heat_tolerance] * (s.crop.flood_tolerance === "high" && ratio >= 1 ? 2 : 1);
    if (heat > heatLimit) fails.push({ kind: "heat", sev: heat / 30, text: `heat: ${r0(heat)} very hot days in season` });
    // heavy-rain days are event counts: round before comparing, so a small scenario scaling
    // (2 -> 1.94) can't erase a real downpour year
    if (Math.round(heavy) >= FLOOD_LIMIT[s.crop.flood_tolerance]) fails.push({ kind: "flood", sev: heavy / 5, text: `waterlogging: ${r0(heavy)} heavy-rain days in season` });
    return { slot: s, rain, eff, buffer, irr, need, ratio, heat, heavy, rainShare: clamp((eff + buffer) / need), fails };
  });
}
let cl_ref = null; // climate object for sourceIndex inside evalSlots (set per scoring call)

// ---------- dam season for canal water (TASKS A22; RESEARCH_LOG I-29) ----------
// Where site.dam exists (Cauvery delta: Mettur), canal water flows only while the canals are open that water-year
// (actual opening and closing dates) and the canal budget scales with that year's release instead of the
// rain-based canal_index. prefs.dam = { open: "MM-DD" | null, release_index?: 1 } overrides every year
// ("what if the dam opens late this season / doesn't open"), null open = canals stay shut.
let dam_ref = null;
const wyOrd = (m, d) => ((m - 6 + 12) % 12) * 31 + d;           // position inside a Jun-May water year
const parseMD = (s) => { const [m, d] = s.split("-").slice(-2).map(Number); return wyOrd(m, d); };
function damContext(site, prefs, src) {
  if (src !== "canal") return null;
  if (prefs.dam) return { override: prefs.dam, normal: site.dam?.normal ?? { open: "06-12", close: "01-28" } };
  return site.dam ? { years: site.dam.years, normal: site.dam.normal } : null;
}
function damSeason(wyIdx) {
  if (!dam_ref) return null;
  const close0 = parseMD(dam_ref.normal.close);
  let open, close, idx;
  if (dam_ref.override) {
    if (dam_ref.override.open == null) return { months: new Set(), release_index: 0 };
    open = parseMD(dam_ref.override.open); close = close0; idx = dam_ref.override.release_index ?? 1;
  } else {
    const yr = wyIdx == null ? null : cl_ref?.byYear[wyIdx]?.year;
    const e = yr == null ? null : dam_ref.years[String(yr)];
    if (wyIdx == null) { open = parseMD(dam_ref.normal.open); close = close0; idx = 1; }   // average year
    else if (!e) return null;                                                              // no data: canal_index
    else { open = parseMD(e.open); close = parseMD(e.close); idx = e.release_index; }
  }
  // a month counts as served if the canals are open on its 15th
  const months = new Set([6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5].filter((m) => open <= wyOrd(m, 15) && wyOrd(m, 15) <= close));
  return { months, release_index: idx };
}

// ---------- main scoring ----------
export function scoreRotation(site, crops, rotation, prefs, opts = {}) {
  const cm = cropMap(crops);
  const cl = climate(site, prefs.scenario);
  cl_ref = cl;
  const L = layout(rotation, cm);
  const src = prefs.water_source || "rainfed";
  dam_ref = damContext(site, prefs, src);
  const soilBuffer = 0.5 * (AWC[site.soil?.texture_class] ?? 150);

  // 1) average year
  const avg = evalSlots(L, (a) => cl.monthly[a % 12], () => null, src, soilBuffer);

  // 2) historical replay: start the cycle in every possible year
  let units = 0, goodUnits = 0;
  const failures = [];
  const perYear = {};                 // calendar year -> {n, good, worst}
  const tally = (year, ok, worstFail) => {
    const p = perYear[year] ??= { n: 0, good: 0, worst: null };
    p.n++; if (ok) p.good++;
    if (worstFail && (!p.worst || worstFail.sev > p.worst.sev)) p.worst = worstFail;
  };
  if (!opts.skipReplay && cl.byYear.length) {
    const nY = cl.byYear.length;
    for (let y0 = 0; y0 + L.years <= nY; y0++) {
      const getM = (a) => { const yi = y0 + Math.floor(a / 12); return cl.byYear[yi]?.months[a % 12] ?? null; };
      const yearOf = (a) => { const yi = y0 + Math.floor(a / 12); return yi >= 0 && yi < nY ? yi : null; };
      const res = evalSlots(L, getM, yearOf, src, soilBuffer);
      for (let row = 0; row < L.years; row++) {
        const rs = res.filter((r, i) => r && L.slots[i].yearRow === row);
        if (!rs.length) continue;
        units++;
        const bad = rs.flatMap((r) => r.fails.map((f) => ({ ...f, crop: r.slot.crop, year: cl.byYear[y0 + row].year })));
        if (!bad.length) goodUnits++; else failures.push(...bad);
        tally(cl.byYear[y0 + row].year, !bad.length, bad.reduce((w, f) => (!w || f.sev > w.sev ? f : w), null));
      }
    }
  }
  const reliability = units ? goodUnits / units : mean(avg.map((r) => (r && !r.fails.length ? 1 : 0)));
  const nYears = cl.byYear.length || 1;
  const worstByYear = {};
  for (const f of failures.sort((a, b) => b.sev - a.sev)) if (!worstByYear[f.year]) worstByYear[f.year] = f;
  const worst = Object.values(worstByYear).sort((a, b) => b.sev - a.sev).slice(0, 3)
    .map((f) => ({ year: f.year, crop: f.crop.id, reason: `${shortName(f.crop)}: ${f.text}` }));

  // 3) sub-scores
  const A = avg.filter(Boolean);
  const totalNeed = sum(A.map((r) => r.need)) || 1;
  const water = sum(A.map((r) => r.rainShare * r.need)) / totalNeed;
  const w = (m) => m.precip_mm + 30 * m.heavy_rain_days;
  const allW = sum(L.cells.map((_, i) => w(cl.monthly[i % 12]))) || 1;
  const bareW = sum(L.cells.map((c, i) => (c.state === "bare" ? w(cl.monthly[i % 12]) : 0)));
  const erosion = clamp(1 - bareW / allW);
  const bareFrac = L.cells.filter((c) => c.state === "bare").length / L.T;
  const nRows = new Set(L.slots.filter((s) => s.crop.nitrogen_fixing).map((s) => s.yearRow)).size;
  const nitrogen = clamp(nRows / L.years);
  const durW = sum(L.slots.map((s) => s.len)) || 1;
  const soil_structure = clamp(
    sum(L.slots.map((s) => ((LEVEL[s.crop.root_depth === "deep" ? "high" : s.crop.root_depth === "medium" ? "medium" : "low"] + LEVEL[s.crop.organic_matter]) / 2) * s.len)) / durW
    + (L.slots.some((s) => s.crop.type === "green_manure") ? 0.15 : 0) + 0.2 * (1 - bareFrac) - 0.1);
  const seq = L.slots.filter((s) => s.crop.type !== "green_manure").map((s) => s.crop.pest_family);
  let repeats = 0;
  if (seq.length === 1) repeats = 1;
  else for (let i = 0; i < seq.length; i++) if (seq[i] === seq[(i + 1) % seq.length]) repeats++;
  const pest = seq.length ? clamp(1 - repeats / seq.length) : 0;
  const cashSlots = L.slots.filter((s) => s.crop.type !== "green_manure");
  const grossIncome = sum(cashSlots.map((s) => LEVEL[s.crop.market] * Math.min(2, s.crop.duration_days / 110) * (s.crop.msp ? 1.1 : 1))) / L.years / 2.4;
  const income = clamp(grossIncome * (0.5 + 0.5 * reliability));
  const forage = L.slots.length ? Math.max(...L.slots.map((s) => LEVEL[s.crop.forage_value])) : 0;
  // storage (IDEAS I28 / TASKS A23): can the harvest wait for a better price or feed the family later?
  // Duration-weighted over cash crops; only counts when prefs.weights.storage is set (see EXTRA_PRIORITIES).
  const STORE = { high: 1, medium: 0.6, low: 0.15 };
  const cashLen = sum(cashSlots.map((s) => s.len)) || 1;
  const storage = cashSlots.length ? sum(cashSlots.map((s) => (STORE[s.crop.storage?.level] ?? 0.6) * s.len)) / cashLen : 0;
  const subscores = { water, income, soil_structure, nitrogen, erosion, forage, reliability, pest, storage };

  // 4) total
  const weights = { ...prefs.weights, pest: PEST_WEIGHT };
  const wsum = sum(Object.values(weights)) || 1;
  let total = 100 * sum(Object.entries(weights).map(([k, v]) => v * (subscores[k] ?? 0))) / wsum;
  const feasible = L.issues.length === 0 && L.slots.length > 0;
  if (!feasible) total *= 0.5;
  if (opts.currentIds) total -= CHANGE_PENALTY * cashSlots.filter((s) => !opts.currentIds.has(s.crop.id)).length;

  const strat = {
    rotation, label: labelOf(rotation, cm), water_source: src, is_current: !!opts.isCurrent,
    feasible, issues: L.issues, total: Math.round(clamp(total, 0, 100)),
    subscores: Object.fromEntries(Object.entries(subscores).map(([k, v]) => [k, r2(v)])),
    replay: {
      good_years: r0(reliability * nYears), total_years: nYears, worst,
      // one entry per calendar year, in order. In 2-year rotations a year can be checked
      // as either rotation year, so share = fraction of those checks that passed.
      years: Object.keys(perYear).map(Number).sort((a, b) => a - b).map((y) => {
        const p = perYear[y];
        return { year: y, ok: p.good / p.n >= 0.5, share: r2(p.good / p.n),
                 reason: p.worst ? `${shortName(p.worst.crop)}: ${p.worst.text}` : null };
      }),
    },
    calendar: L.calendar,
    water_use: { need_mm: r0(totalNeed / L.years), irrigation_mm: r0(sum(A.map((r) => r.irr)) / L.years) },
    why: [], evidence: [], benefits: [], risks: [], gaps: [],
  };
  if (!opts.skipText) explain(strat, { site, cl, L, A, src, bareFrac, soilBuffer, scenario: prefs.scenario });
  return strat;
}

function labelOf(rotation, cm) {
  // order each year from April (pre-monsoon) so a green manure precedes the crop it feeds
  return rotation.map((yr) => [...yr].sort((a, b) => ((a.sow + 8) % 12) - ((b.sow + 8) % 12))
    .map((s) => `${cm[s.crop] ? shortName(cm[s.crop]) : s.crop} (${MONTHS[s.sow - 1]})`).join(" → ")).join("  |  ");
}

// ---------- plain-language explanations ----------
function explain(st, { site, cl, L, A, src, bareFrac, soilBuffer, scenario }) {
  const srcLabel = WATER_SOURCES[src]?.label || src;
  const seenSlot = new Set();          // a repeated crop in a 2-year cycle gets one line, not two
  for (const r of A) {
    const months = r.slot.abs.map((a) => (a % 12) + 1);
    const key = `${r.slot.crop.id}@${months.join(",")}`;
    if (seenSlot.has(key)) continue;
    seenSlot.add(key);
    const nm = shortName(r.slot.crop);
    st.evidence.push({ text: `${nm} (${monthList(months)}): ~${r0(r.rain)} mm rain in season vs ~${r.need} mm crop need` + (r.irr > 1 ? `; ~${r0(r.irr)} mm must come from the ${srcLabel.toLowerCase()}` : ""), months });
    if (r.heat > 2) st.evidence.push({ text: `${nm} season has ~${r0(r.heat)} days above ${site.heat_threshold_c ?? 38} °C on average`, months });
    if (r.heavy >= 1 && r.slot.crop.flood_tolerance === "low") st.evidence.push({ text: `${nm} season averages ${r.heavy.toFixed(1)} heavy-rain days (≥64.5 mm), a waterlogging risk`, months });
  }
  const bareMonths = [...new Set(L.cells.map((c, i) => (c.state === "bare" ? (i % 12) + 1 : null)).filter(Boolean))];
  if (bareMonths.length) {
    const share = sum(bareMonths.map((m) => cl.monthly[m - 1].precip_mm)) / (sum(cl.monthly.map((m) => m.precip_mm)) || 1);
    st.evidence.push({ text: `Field is bare in ${monthList(bareMonths)}, which gets ${r0(100 * share)}% of the year's rain`, months: bareMonths });
  }
  const rp = st.replay;
  if (rp.total_years > 1) {
    st.evidence.push({ text: `Replayed through real weather ${site.period?.start}–${site.period?.end}: came through ${rp.good_years} of ${rp.total_years} years without water, heat or flood stress`, months: [] });
    for (const w of rp.worst) st.risks.push(`${w.year}: ${w.reason}`);
  }
  if (site.soil) st.evidence.push({ text: `Soil (SoilGrids): ${site.soil.texture_class}, organic carbon ${site.soil.soc_g_per_kg} g/kg, pH ${site.soil.ph}; holds ~${r0(soilBuffer)} mm per metre of roots at the start of a season`, months: [] });

  // benefits
  const seen = new Set();
  for (const s of L.slots) {
    const c = s.crop, nm = shortName(c);
    if (seen.has(c.id)) continue; seen.add(c.id);
    if (c.type === "green_manure") st.benefits.push(`${nm} is ploughed in before the next crop: adds organic matter and nitrogen`);
    else if (c.nitrogen_fixing) st.benefits.push(`${nm} fixes nitrogen from the air, so the next crop needs less urea`);
    if (c.root_depth === "deep" && c.type !== "green_manure") st.benefits.push(`${nm} has deep roots that open up the soil and help rain soak in`);
    if (c.water_need_mm <= 400 && c.type !== "green_manure") st.benefits.push(`${nm} needs only ~${c.water_need_mm} mm of water, so it suits dry years`);
  }
  if (st.subscores.pest >= 0.99 && L.slots.length > 1) st.benefits.push("Different crop families follow each other, which breaks pest and disease cycles");
  const msp = [...new Set(L.slots.filter((s) => s.crop.msp).map((s) => shortName(s.crop)))];
  if (msp.length) st.benefits.push(`Government minimum support price (MSP) exists for ${msp.join(", ")}`);
  if (bareFrac < 0.2) st.benefits.push("Soil is covered most of the year, protecting it from heavy monsoon rain");

  // risks
  if (st.water_use.irrigation_mm > 50) st.risks.push(`Needs ~${st.water_use.irrigation_mm} mm/year of irrigation from the ${srcLabel.toLowerCase()}; if releases are late or short, yields fall`);
  if (src === "borewell") st.risks.push("Relies on groundwater, which is falling across much of Tamil Nadu; every mm pumped draws down a shared resource");
  if (bareFrac > 0.3) st.risks.push(`Field is bare ${r0(bareFrac * 12)} months a year, so topsoil and nutrients can wash away in heavy rain`);
  for (const s of L.slots) if (s.crop.market === "low" && s.crop.type !== "green_manure") st.risks.push(`${shortName(s.crop)} has a thinner local market; check buyers first`);
  st.risks.push(...st.issues);

  // gaps (always shown)
  st.gaps.push(
    "Soil nutrients and salinity need a soil test (the Soil Health Card from the agriculture department)",
    "Local pest and disease history is not in satellite data",
    "Market prices, buyers and transport are not modelled",
    `Actual ${srcLabel.toLowerCase()} timing and allocation (e.g. dam release dates) can differ from our estimate`,
    "Labour, machinery and seed availability are not considered",
    "Weather data is on a ~50 km grid; your field may differ",
    "Crop water needs and traits are approximate averages",
  );
  if (scenario && (scenario.dT_c || scenario.dPrecip_pct)) st.gaps.push("Climate-shift results are rough illustrations, not a forecast");
}

function addWhy(st, cur, weights) {
  const ranked = Object.keys(PRIORITIES)
    .map((k) => ({ k, gain: (weights[k] || 0) * ((st.subscores[k] ?? 0) - (cur.subscores[k] ?? 0)), d: (st.subscores[k] ?? 0) - (cur.subscores[k] ?? 0) }))
    .filter((x) => x.d > 0.08).sort((a, b) => b.gain - a.gain).slice(0, 3);
  for (const x of ranked) st.why.push(`Better on "${PRIORITIES[x.k]}" (${r0(100 * cur.subscores[x.k])} → ${r0(100 * st.subscores[x.k])} out of 100)`);
  if (st.replay.good_years > cur.replay.good_years) st.why.push(`Would have come through ${st.replay.good_years - cur.replay.good_years} more of the last ${st.replay.total_years} years`);
  if (st.water_use.need_mm < cur.water_use.need_mm * 0.9) st.why.push(`Uses ~${r0(100 * (1 - st.water_use.need_mm / cur.water_use.need_mm))}% less water than your current rotation`);
  if (!st.why.length) st.why.push("Closest alternative to your current rotation with a similar score");
}

// ---------- strategy generation ----------
export function generateStrategies(site, crops, current, prefs, n = 2) {
  const cm = cropMap(crops);
  const curIds = new Set(current.flat().map((s) => s.crop));
  const cur = scoreRotation(site, crops, current, prefs, { isCurrent: true });
  cur.why.push("This is what you grow now: the baseline to compare against");

  // all single slots
  // each option carries a 12-bit month mask (cyclic) so overlap checks are one AND
  const FULL = (1 << 12) - 1;
  const maskOf = (crop, sow) => {
    const len = monthsLen(crop);
    if (len >= 12) return FULL;
    let m = 0;
    for (let k = 0; k < len; k++) m |= 1 << ((sow - 1 + k) % 12);
    return m;
  };
  const options = crops.flatMap((c) => c.sow_months.map((sow) => ({ crop: c.id, sow, mask: maskOf(c, sow) })));
  const strip = (yr) => yr.map(({ crop, sow }) => ({ crop, sow }));
  const gmOk = (yr) => {
    const gms = yr.filter((s) => cm[s.crop].type === "green_manure");
    if (gms.length > 1) return false;
    if (yr.length === gms.length) return false;
    return gms.every((g) => { // must be followed within a month by a crop
      const end = (g.sow - 1 + monthsLen(cm[g.crop])) % 12;
      return yr.some((s) => s !== g && ((s.sow - 1 - end + 12) % 12) <= 1);
    });
  };
  const singles = [];
  for (let i = 0; i < options.length; i++) {
    const oi = options[i];
    if (gmOk([oi])) singles.push([oi]);
    for (let j = i + 1; j < options.length; j++) {
      const oj = options[j];
      if (oi.mask & oj.mask) continue;
      if (oj.crop === oi.crop && cm[oi.crop].type !== "cash") continue;
      const m2 = oi.mask | oj.mask;
      if (gmOk([oi, oj])) singles.push([oi, oj]);
      for (let k = j + 1; k < options.length; k++) {
        const ok = options[k];
        if (m2 & ok.mask) continue;
        const c3 = [oi, oj, ok];
        if (gmOk(c3)) singles.push(c3);
      }
    }
  }
  // stage 1: fast score without replay; stage 2: full score for the best overall
  // plus the best "small step" candidates (at most one new main crop), so they are never cut
  const quick = singles.map((yr) => {
    const rot = [strip(yr)];
    return { rot, s: scoreRotation(site, crops, rot, prefs, { skipReplay: true, skipText: true, currentIds: curIds }).total,
             nNew: new Set(yr.filter((o) => cm[o.crop].type !== "green_manure" && !curIds.has(o.crop)).map((o) => o.crop)).size };
  });
  quick.sort((a, b) => b.s - a.s);
  const top = quick.slice(0, 40).map((q) => q.rot[0]);
  const smallTop = quick.filter((q) => q.nNew <= 1).slice(0, 15).map((q) => q.rot[0]);
  const cands = [...top, ...smallTop.filter((yr) => !top.includes(yr))].map((yr) => [yr]);
  for (let i = 0; i < 25; i++) for (let j = i + 1; j < 25; j++) if (top[i] && top[j]) cands.push([top[i], top[j]]);
  const full = cands.map((rot) => scoreRotation(site, crops, rot, prefs, { skipText: true, currentIds: curIds }))
    .filter((s) => s.feasible && s.label !== cur.label)
    .sort((a, b) => b.total - a.total);

  // "Small step" = at most one new main crop; "Bigger shift" = two or more new main crops.
  // Main crops ignore green manures, so two options never differ only by the manure.
  const mains = (s) => new Set(s.rotation.flat().map((x) => x.crop).filter((id) => cm[id].type !== "green_manure"));
  const sig = (s) => [...mains(s)].sort().join("+");
  const newCount = (s) => [...mains(s)].filter((id) => !curIds.has(id)).length;
  const curSig = sig(cur);
  const pool = full.filter((s) => sig(s) !== curSig || s.label !== cur.label);
  const picks = [];
  const small = pool.find((s) => newCount(s) <= 1 && sig(s) !== curSig) || pool.find((s) => newCount(s) <= 1);
  const big = pool.find((s) => newCount(s) >= 2 && (!small || sig(s) !== sig(small)));
  if (big) picks.push({ s: big, tag: "Bigger shift" });
  if (small) picks.push({ s: small, tag: "Small step" });
  for (const s of pool) {
    if (picks.length >= n) break;
    if (!picks.some((p) => sig(p.s) === sig(s))) picks.push({ s, tag: "Alternative" });
  }

  const out = [cur];
  for (const p of picks.slice(0, n)) {
    const st = scoreRotation(site, crops, p.s.rotation, prefs, { currentIds: curIds });
    st.tag = p.tag;
    addWhy(st, cur, prefs.weights);
    out.push(st);
  }
  cur.tag = "Your current rotation";
  return out;
}

// ---------- site-level facts ----------
export function siteHighlights(site, prefs = {}) {
  const cl = climate(site, prefs.scenario);
  const out = [];
  const annual = sum(cl.monthly.map((m) => m.precip_mm));
  const neAvg = cl.ne(cl.monthly);
  out.push(`Average rainfall ${r0(annual)} mm/year; ${r0((100 * neAvg) / annual)}% falls in the Oct–Dec northeast monsoon`);
  if (cl.byYear.length) {
    const ne = cl.byYear.map((y) => ({ year: y.year, v: cl.ne(y.months) }));
    const sd = Math.sqrt(mean(ne.map((x) => (x.v - cl.neNormal) ** 2)));
    const dry = ne.reduce((a, b) => (b.v < a.v ? b : a));
    const wet = ne.reduce((a, b) => (b.v > a.v ? b : a));
    out.push(`The northeast monsoon is unreliable: it varies by ±${r0((100 * sd) / cl.neNormal)}% year to year (driest ${dry.year}: ${r0(dry.v)} mm; wettest ${wet.year}: ${r0(wet.v)} mm)`);
    let maxEv = null;
    for (const y of site.by_year) y.months.forEach((m, i) => { if (m.max_daily_precip_mm != null && (!maxEv || m.max_daily_precip_mm > maxEv.v)) maxEv = { v: m.max_daily_precip_mm, year: y.year, m: i }; });
    if (maxEv) out.push(`Biggest one-day rain on record here: ${r0(maxEv.v)} mm (${MONTHS[maxEv.m]} ${maxEv.year})`);
  }
  const hot = cl.monthly.map((m, i) => ({ m: i + 1, h: m.heat_days })).filter((x) => x.h >= 2);
  if (hot.length) out.push(`Very hot days (above ${site.heat_threshold_c ?? 38} °C) cluster in ${monthList(hot.map((x) => x.m))}`);
  const t = site.trends || {};
  if (t.tmax_c_per_decade) out.push(`Daytime highs have changed by ${t.tmax_c_per_decade > 0 ? "+" : ""}${t.tmax_c_per_decade.toFixed(2)} °C per decade since ${site.period?.start}`);
  if (t.precip_mm_per_decade) out.push(`Annual rainfall trend: ${t.precip_mm_per_decade > 0 ? "+" : ""}${r0(t.precip_mm_per_decade)} mm per decade (noisy; treat with care)`);
  if (site.soil) out.push(`Soil: ${site.soil.texture_class}, pH ${site.soil.ph}, organic carbon ${site.soil.soc_g_per_kg} g/kg`);
  return out;
}

// Monthly climatology with the climate-shift scenario applied (same adjustment the
// scores use), so the UI's calendar stress bands can move with the sliders.
export function scenarioMonthly(site, scenario) {
  return climate(site, scenario).monthly.map((m, i) => ({
    month: i + 1,
    precip_mm: r2(m.precip_mm), et0_mm: r2(m.et0_mm), water_balance_mm: r2(m.water_balance_mm),
    heat_days: r2(m.heat_days), heavy_rain_days: r2(m.heavy_rain_days), tmax_c: r2(m.tmax_c),
  }));
}

export function trendScenario(site, years = 10) {
  const t = site.trends || {};
  const annual = sum(site.monthly.map((m) => m.precip_mm)) || 1;
  // 24-year trends are noisy, so cap the preset to a plausible range.
  return {
    dT_c: r2(clamp((t.tmax_c_per_decade || 0) * (years / 10), -1, 2)),
    dPrecip_pct: r0(clamp((100 * (t.precip_mm_per_decade || 0) * (years / 10)) / annual, -15, 15)),
  };
}

// ---------- single-crop views (heatmap + "click anywhere": IDEAS.md I3/I4) ----------
// A crop's suitability at a site = its best sowing month, scored as a one-crop year with the
// farmer's priorities and water source, replayed through every real year.
function bestSlot(site, crops, crop, prefs) {
  let best = null;
  for (const sow of crop.sow_months) {
    const st = scoreRotation(site, crops, [[{ crop: crop.id, sow }]], prefs, { skipText: true });
    if (!best || st.total > best.total || (st.total === best.total && st.replay.good_years > best.replay.good_years)) best = st;
  }
  return best;
}

function summarizeSlot(crop, st) {
  const sow = st.rotation[0][0].sow;
  return {
    crop: crop.id, crop_name: shortName(crop), tamil_name: crop.tamil_name ?? null, sow,
    sow_label: MONTHS[sow - 1], total: st.total,
    good_years: st.replay.good_years, total_years: st.replay.total_years,
    share: st.replay.total_years ? r2(st.replay.good_years / st.replay.total_years) : null,
    water_need_mm: crop.water_need_mm, irrigation_mm: st.water_use.irrigation_mm,
    worst: st.replay.worst,
  };
}

// Suitability blends what varies by place with what the user cares about:
//   50% reliability (share of real seasons it came through)        -> site-dependent
//   30% priority fit (the full weighted score `total`)              -> mostly crop traits
//   20% advantage over the statewide median reliability (if known)  -> "better here than elsewhere"
// Diagnostics on the 47-point grid (RESEARCH_LOG I-13): ranking by `total` alone made one crop #1
// almost everywhere (cowpea at 46/47 rain-fed points); this blend gives 7-10 distinct #1 crops.
function suitabilityOf(pick, medianShare) {
  const adv = medianShare == null ? null : pick.share - medianShare;
  const s = adv == null
    ? 0.6 * pick.share * 100 + 0.4 * pick.total
    : 0.5 * pick.share * 100 + 0.3 * pick.total + 0.2 * (50 + 50 * adv);   // adv in [-1,1] -> 0..100
  return { suitability: Math.round(clamp(s, 0, 100)), advantage: adv == null ? null : r2(adv) };
}

// statewideContext(sites, crops, prefs) -> { median_share: {cropId: 0..1} }
// Compute once per water source / scenario over all grid points, then pass to the functions below.
export function statewideContext(sites, crops, prefs) {
  const median_share = {};
  for (const c of crops.filter((x) => x.type !== "green_manure")) {
    const a = sites.map((s) => summarizeSlot(c, bestSlot(s, crops, c, prefs)).share).sort((x, y) => x - y);
    median_share[c.id] = a.length ? a[Math.floor(a.length / 2)] : null;
  }
  return { median_share };
}

// cropSuitability(site, crops, "black_gram", prefs, context?) -> CropPick
export function cropSuitability(site, crops, cropId, prefs, context = null) {
  const crop = cropMap(crops)[cropId];
  if (!crop) throw new Error(`unknown crop: ${cropId}`);
  const pick = summarizeSlot(crop, bestSlot(site, crops, crop, prefs));
  return { ...pick, ...suitabilityOf(pick, context?.median_share?.[cropId]) };
}

// rankCrops(site, crops, prefs, n = 3, context?) -> crops ordered by suitability, with the first
// picks drawn from different crop families (no "legume, legume, legume" top 3). n = crops.length
// returns every crop, diverse leaders first. Each item carries a full Strategy for the card.
export function rankCrops(site, crops, prefs, n = 3, context = null) {
  const all = crops.filter((c) => c.type !== "green_manure").map((c) => {
    const st = bestSlot(site, crops, c, prefs);
    const pick = summarizeSlot(c, st);
    return { c, st, pick: { ...pick, ...suitabilityOf(pick, context?.median_share?.[c.id]) } };
  }).sort((a, b) => b.pick.suitability - a.pick.suitability || b.pick.total - a.pick.total);
  const chosen = [], families = new Set();
  for (const x of all) if (!families.has(x.c.pest_family)) { chosen.push(x); families.add(x.c.pest_family); }
  const ordered = [...chosen, ...all.filter((x) => !chosen.includes(x))].slice(0, n);
  return ordered.map(({ c, st, pick }) => ({
    ...pick,
    strategy: scoreRotation(site, crops, st.rotation, prefs),   // with why/evidence/risks text
  }));
}

// ---------- future projections (NEX-GDDP-CMIP6; climate-change Layer 3) ----------
// futureRange(site, crops, rotation, prefs, projection, ssp) replays the rotation through "future-like years":
// each observed year 2001-2024 with one model's monthly change factors (2041-2060 vs 1995-2014) applied, for
// every model. Returns today's result plus the spread across models (never a single "the future" number).
// `projection` is web/data/projections/<site>.json.
export function futureRange(site, crops, rotation, prefs, projection, ssp = "ssp245") {
  const today = scoreRotation(site, crops, rotation, { ...prefs, scenario: {} }, { skipText: true });
  const per = Object.entries(projection?.deltas?.[ssp] || {}).map(([model, deltas]) => {
    const st = scoreRotation(site, crops, rotation,
      { ...prefs, scenario: { deltas, projection_key: `${ssp}|${model}` } }, { skipText: true });
    return { model, total: st.total, good_years: st.replay.good_years, total_years: st.replay.total_years,
             irrigation_mm: st.water_use.irrigation_mm };
  });
  const stat = (k) => {
    const v = per.map((p) => p[k]).sort((a, b) => a - b);
    return v.length ? { min: v[0], median: v[Math.floor(v.length / 2)], max: v[v.length - 1] } : null;
  };
  return {
    ssp, period: projection?.future ?? null, models: per,
    today: { total: today.total, good_years: today.replay.good_years, total_years: today.replay.total_years,
             irrigation_mm: today.water_use.irrigation_mm },
    good_years: stat("good_years"), total: stat("total"), irrigation_mm: stat("irrigation_mm"),
  };
}

// ---------- El Nino / IOD odds (FIELD_NOTES E1; RESEARCH_LOG I-22) ----------
// phaseOdds(site, crops, rotation, prefs, indices) groups the rotation's replay years by the ENSO and IOD phase
// of each year's NE-monsoon season (web/data/climate_indices.json) and reports "came through X of N" per phase,
// plus the current phase from the latest ONI. Statewide tests (indices.evidence) say whether a crop's odds
// really differ by phase: only water-hungry crops (rice, groundnut) do, and the link isn't stable over decades,
// so the UI must present this as odds, never a forecast.
export function phaseOdds(site, crops, rotation, prefs, indices) {
  const st = scoreRotation(site, crops, rotation, prefs, { skipText: true });
  const by = { enso: {}, iod: {} };
  for (const y of st.replay.years) {
    const ph = indices?.years?.[String(y.year)];
    if (!ph) continue;
    for (const [k, v] of [["enso", ph.enso], ["iod", ph.iod]]) {
      if (!v) continue;
      const a = (by[k][v] ??= { good: 0, n: 0, years: [] });
      a.n++; if (y.ok) a.good++;
      a.years.push({ year: y.year, ok: y.ok });
    }
  }
  const oni = indices?.latest?.oni;
  const current = oni ? { oni: oni.value, season: `${oni.season} ${oni.year}`,
                          enso: oni.value >= 0.5 ? "el_nino" : oni.value <= -0.5 ? "la_nina" : "neutral" } : null;
  const crops_in = [...new Set(rotation.flat().map((s) => s.crop))];
  const evidence = Object.fromEntries(crops_in.map((c) => [c, indices?.evidence?.crops?.[c] ?? null]));
  return { by_enso: by.enso, by_iod: by.iod, current, evidence, overall: { good: st.replay.good_years, n: st.replay.total_years } };
}

// ---------- "Avoid this season" (FIELD_NOTES E2; RESEARCH_LOG I-23) ----------
// Classifies each replay year at this place by its NE-monsoon (Oct-Dec) rain vs the 2001-2024 mean, using IMD's
// categories: deficient (<= -20%, drought-type), excess (>= +20%, flood-prone), else normal. Then, for every crop
// at its usual best sowing month here, counts how often it came through in each season type. Crops that fail in
// most seasons of a type go on that type's "avoid" list; crops that came through >= 80% go on "safer".
// The season type isn't known for sure at sowing, so the UI pairs this with early signals (sowing-rain onset,
// El Nino phase odds) rather than a forecast.
export function avoidThisSeason(site, crops, prefs, opts = {}) {
  const AVOID_BELOW = opts.avoid_below ?? 0.5, SAFE_FROM = opts.safe_from ?? 0.8;
  const ne = (site.by_year || []).map((y) => ({ year: y.year, mm: sum(y.months.slice(9, 12).map((m) => m.precip_mm)) }));
  const normal = mean(ne.map((x) => x.mm)) || 1;
  const typeOf = Object.fromEntries(ne.map((x) => [x.year,
    x.mm <= 0.8 * normal ? "deficient" : x.mm >= 1.2 * normal ? "excess" : "normal"]));
  const years = { deficient: [], normal: [], excess: [] };
  for (const [y, t] of Object.entries(typeOf)) years[t].push(Number(y));

  const rows = crops.filter((c) => c.type !== "green_manure").map((c) => {
    const pick = bestSlot(site, crops, c, prefs);
    const counts = { deficient: { good: 0, n: 0 }, normal: { good: 0, n: 0 }, excess: { good: 0, n: 0 } };
    const why = { deficient: {}, excess: {} };
    for (const y of pick.replay.years) {
      const t = typeOf[y.year];
      if (!t) continue;
      counts[t].n++; if (y.ok) counts[t].good++;
      if (!y.ok && why[t]) {                        // tally failure causes for drought/flood seasons
        const k = /water/.test(y.reason || "") ? "water" : /waterlog/.test(y.reason || "") ? "waterlogging"
          : /heat/.test(y.reason || "") ? "heat" : "other";
        why[t][k] = (why[t][k] || 0) + 1;
      }
    }
    const share = (t) => (counts[t].n ? counts[t].good / counts[t].n : null);
    return { crop: c.id, crop_name: shortName(c), tamil_name: c.tamil_name ?? null, sow: pick.rotation[0][0].sow,
             sow_label: MONTHS[pick.rotation[0][0].sow - 1], counts,
             share: { deficient: share("deficient"), normal: share("normal"), excess: share("excess") }, failure_causes: why };
  });
  // Crops that fail most NORMAL seasons too are "not suitable here" (with this water source), not a
  // season-specific warning; keep them off the season lists so those lists mean "fine normally, risky this time".
  // threshold: fails at least 2 of 3 normal seasons (a borderline crop like Madurai tank rice, 6/13 normal but 0/5
  // in droughts, stays a season-specific "avoid in a drought year" rather than "not suitable")
  const NOT_SUITABLE_BELOW = opts.not_suitable_below ?? 0.34;
  const notSuitable = rows.filter((r) => r.share.normal != null && r.share.normal < NOT_SUITABLE_BELOW).map((r) => r.crop);
  const list = (t, test) => rows.filter((r) => r.counts[t].n >= 2 && test(r.share[t]))
    .sort((a, b) => a.share[t] - b.share[t]).map((r) => r.crop);
  const seasonAvoid = (t) => list(t, (s) => s < AVOID_BELOW).filter((c) => !notSuitable.includes(c));
  return {
    normal_ne_mm: Math.round(normal),
    rule: "NE monsoon (Oct-Dec) rain vs 2001-2024 mean: deficient <= -20%, excess >= +20% (IMD categories)",
    years, crops: rows,
    not_suitable_here: notSuitable,
    avoid: { deficient: seasonAvoid("deficient"), excess: seasonAvoid("excess") },
    safer: { deficient: list("deficient", (s) => s >= SAFE_FROM).reverse(), excess: list("excess", (s) => s >= SAFE_FROM).reverse() },
  };
}

// ---------- 1-in-100-year events (FIELD_NOTES E4; RESEARCH_LOG I-24) ----------
// extremes = web/data/extremes/<id>.json (pipeline/extremes.py: pooled GEV / gamma return levels from IMERG).
// The 24-year replay already contains this place's worst NE-monsoon drought and its wettest multi-day burst;
// extremeYearCheck says how rare each was (return period) and which crops, at their usual sowing month here,
// came through those years. That's the only honest crop link: we can't replay a 1-in-100 event we never saw.
export function extremeYearCheck(site, crops, prefs, extremes) {
  const dr = extremes?.drought?.record, wet = extremes?.rain?.rx3?.record;
  const events = [
    dr && { kind: "drought", year: dr.year, what: `NE monsoon ${dr.pct_of_normal}% of normal`, label: dr.label, return_period_yr: dr.return_period_yr },
    wet && { kind: "heavy_rain", year: wet.year, what: `${wet.mm} mm in 3 days`, label: wet.label, return_period_yr: wet.return_period_yr },
  ].filter(Boolean);
  // hit_by_event = failed for the event's own reason (water shortage in the drought, waterlogging in the burst);
  // failed_other = failed that year for something else (e.g. heat), so it isn't blamed on the event
  const cause = { drought: (r) => /: water:/.test(r), heavy_rain: (r) => /waterlog/.test(r) };
  for (const e of events) { e.came_through = []; e.hit_by_event = []; e.failed_other = []; }
  for (const c of crops.filter((c) => c.type !== "green_manure")) {
    const pick = bestSlot(site, crops, c, prefs);
    for (const e of events) {
      const y = pick.replay.years.find((r) => r.year === e.year);
      if (!y) continue;
      const row = { crop: c.id, crop_name: shortName(c), sow_label: MONTHS[pick.rotation[0][0].sow - 1], reason: y.ok ? null : y.reason ?? null };
      (y.ok ? e.came_through : cause[e.kind](y.reason || "") ? e.hit_by_event : e.failed_other).push(row);
    }
  }
  const lv = (o) => Object.fromEntries(Object.entries(o?.levels ?? {}).map(([T, v]) => [T, v.mm]));
  return {
    events,
    levels: { rain_1day_mm: lv(extremes?.rain?.rx1), rain_3day_mm: lv(extremes?.rain?.rx3),
              ne_drought_mm: lv(extremes?.drought), normal_ne_mm: extremes?.drought?.normal_ne_mm ?? null },
    lifetime_chance: extremes?.lifetime_chance ?? null, lifetime_years: extremes?.lifetime_years ?? 30,
    future: extremes?.future ?? null,
  };
}

// ---------- "Has the dam opened?" (TASKS A22; RESEARCH_LOG I-29) ----------
// damCheck(site, crops, rotation, prefs) for canal-fed places with site.dam (Cauvery delta / Mettur):
//  - history: the rotation's replay years grouped by when Mettur actually opened that water-year
//    (on time <= 15 Jun, late 16 Jun - 31 Aug, very late >= 1 Sep), "came through X of N" per group;
//  - what_if: every year's weather replayed with the canals opening on a chosen date this season
//    (12 Jun / 1 Aug / 15 Sep / not at all), so a farmer can answer "the dam is late this year, what now?".
// Mettur's opening can't be forecast from June information (I-18), so this is an input, not a prediction.
export const DAM_OPTIONS = { on_time: "06-12", late: "08-01", very_late: "09-15", not_opened: null };
export function damCheck(site, crops, rotation, prefs) {
  if (!site.dam) return null;
  const p = { ...prefs, water_source: "canal" };
  const st = scoreRotation(site, crops, rotation, p, { skipText: true });
  const cls = (e) => { const o = parseMD(e.open); return o <= wyOrd(6, 15) ? "on_time" : o <= wyOrd(8, 31) ? "late" : "very_late"; };
  const history = { on_time: { good: 0, n: 0, years: [] }, late: { good: 0, n: 0, years: [] }, very_late: { good: 0, n: 0, years: [] } };
  for (const y of st.replay.years) {
    const e = site.dam.years[String(y.year)];
    if (!e) continue;
    const h = history[cls(e)];
    h.n++; if (y.ok) h.good++;
    h.years.push({ year: y.year, ok: y.ok, opened: e.open.slice(5) });
  }
  const what_if = Object.fromEntries(Object.entries(DAM_OPTIONS).map(([k, open]) => {
    const r = scoreRotation(site, crops, rotation, { ...p, dam: { open } }, { skipText: true });
    return [k, { open, good_years: r.replay.good_years, total_years: r.replay.total_years, irrigation_mm: r.water_use.irrigation_mm }];
  }));
  return { dam: site.dam.name, normal: site.dam.normal, overall: { good: st.replay.good_years, n: st.replay.total_years },
           history, what_if,
           note: "Mettur's opening date can't be forecast from June information; choose what has happened this season." };
}

// ---------- "Your last 10 years vs the full record" (FIELD_NOTES E6; RESEARCH_LOG I-25) ----------
// Farmers judge risk by roughly the last 10 seasons. memoryCheck shows what that memory gets right and wrong:
//  - climate: last-N-year averages vs the full record, and which record years (worst drought, wettest burst)
//    fall outside the remembered window;
//  - crops: each crop's "came through" share in the last N years vs all years, plus the range across EVERY
//    N-year window in the record ("depending on which decade you remember, rice looks 40-90% safe"). The window
//    range is the robust part: it doesn't depend on whether the latest decade happened to be kind or harsh;
//  - the chance a 10-year memory contains no 1-in-T event at all: (1 - 1/T)^N.
// opts.rotation: also compare one rotation (e.g. the farmer's current one).
export function memoryCheck(site, crops, prefs, opts = {}) {
  const N = opts.recent ?? 10, GAP = opts.gap ?? 0.15;
  const yrs = (site.by_year || []).map((y) => y.year).sort((a, b) => a - b);
  const last = yrs[yrs.length - 1];
  // opts.as_of: remember the N years up to this year instead (e.g. 2014 -> 2005-2014, a memory made just before 2016)
  const recentTo = Math.min(opts.as_of ?? last, last), recentFrom = recentTo - N + 1;
  const isRecent = (y) => y >= recentFrom && y <= recentTo;
  const share = (rows) => (rows.length ? rows.filter((r) => r.ok).length / rows.length : null);
  const windows = (rows) => {                       // every N-year window fully inside the record
    const out = [];
    for (let s = yrs[0]; s + N - 1 <= last; s++) {
      const w = rows.filter((r) => r.year >= s && r.year < s + N);
      if (w.length) out.push({ from: s, to: s + N - 1, share: r2(share(w)) });
    }
    return out;
  };
  const compare = (rows) => {
    const full = share(rows), recent = share(rows.filter((r) => isRecent(r.year)));
    const w = windows(rows), ws = w.map((x) => x.share);
    const gap = recent != null && full != null ? recent - full : 0;
    return {
      full: { good: rows.filter((r) => r.ok).length, n: rows.length, share: r2(full) },
      recent: { good: rows.filter((r) => isRecent(r.year) && r.ok).length, n: rows.filter((r) => isRecent(r.year)).length, share: r2(recent) },
      verdict: gap >= GAP ? "recent_looks_safer" : gap <= -GAP ? "recent_looks_riskier" : "same_story",
      window_range: ws.length ? [Math.min(...ws), Math.max(...ws)] : null,
      best_window: w.reduce((a, b) => (b.share > (a?.share ?? -1) ? b : a), null),
      worst_window: w.reduce((a, b) => (b.share < (a?.share ?? 2) ? b : a), null),
      missed_failures: rows.filter((r) => !r.ok && !isRecent(r.year)).map((r) => r.year),   // failures outside the memory
    };
  };

  // climate: what the remembered decade looked like vs the whole record
  const ne = (site.by_year || []).map((y) => ({ year: y.year, mm: sum(y.months.slice(9, 12).map((m) => m.precip_mm)),
    heat: sum(y.months.map((m) => m.heat_days)), heavy: sum(y.months.map((m) => m.heavy_rain_days)),
    maxday: Math.max(...y.months.map((m) => m.max_daily_precip_mm ?? 0)) }));
  const avg = (k, f = () => true) => r0(mean(ne.filter(f).map((x) => x[k])));
  const worstNE = ne.reduce((a, b) => (b.mm < a.mm ? b : a)), wettestDay = ne.reduce((a, b) => (b.maxday > a.maxday ? b : a));
  const climate = {
    ne_rain_mm: { full: avg("mm"), recent: avg("mm", (x) => isRecent(x.year)) },
    hot_days_per_year: { full: avg("heat"), recent: avg("heat", (x) => isRecent(x.year)) },
    heavy_rain_days_per_year: { full: avg("heavy"), recent: avg("heavy", (x) => isRecent(x.year)) },
    worst_ne_monsoon: { year: worstNE.year, mm: r0(worstNE.mm), remembered: isRecent(worstNE.year) },
    wettest_day: { year: wettestDay.year, mm: r0(wettestDay.maxday), remembered: isRecent(wettestDay.year) },
  };

  const cropRows = crops.filter((c) => c.type !== "green_manure").map((c) => {
    const pick = bestSlot(site, crops, c, prefs);
    return { crop: c.id, crop_name: shortName(c), tamil_name: c.tamil_name ?? null, sow_label: MONTHS[pick.rotation[0][0].sow - 1],
             ...compare(pick.replay.years) };
  });
  const T = [10, 25, 50, 100];
  const out = {
    recent_years: [recentFrom, recentTo], full_years: [yrs[0], last], climate, crops: cropRows,
    looks_safer: cropRows.filter((r) => r.verdict === "recent_looks_safer").map((r) => r.crop),
    looks_riskier: cropRows.filter((r) => r.verdict === "recent_looks_riskier").map((r) => r.crop),
    // crops whose verdict depends a lot on which decade you remember (window range >= 0.3)
    decade_dependent: cropRows.filter((r) => r.window_range && r.window_range[1] - r.window_range[0] >= 0.3).map((r) => r.crop),
    chance_memory_has_none: Object.fromEntries(T.map((t) => [`1_in_${t}`, r2((1 - 1 / t) ** N)])),
    note: `A ${N}-year memory misses a 1-in-100 event ${Math.round(100 * (0.99 ** N))}% of the time.`,
  };
  if (opts.rotation) {
    const st = scoreRotation(site, crops, opts.rotation, prefs, { skipText: true });
    out.rotation = { label: st.label, ...compare(st.replay.years) };
  }
  return out;
}

// ---------- Wind / cyclone exposure (FIELD_NOTES E5; RESEARCH_LOG I-26) ----------
// wind = web/data/wind/<id>.json (pipeline/fetch_wind.py, NASA POWER daily). An exposure layer, NOT folded into
// the replay's pass/fail (that stays calibrated against yields). For each crop at its usual sowing month here:
// in how many seasons did a "storm day" (strong wind + >= 50 mm rain) or, for low-tolerance crops, a damaging-wind
// day (WS10M_MAX >= 12 m/s, DAMAGING_WIND_MS) fall in
// the SECOND half of the season (tall crops lodge near flowering / harvest; banana and sugarcane all season)?
// wind_tolerance high crops (short pulses, groundnut) are listed but never counted as exposed.
const DAMAGING_WIND_MS = 12;
export function windRisk(site, crops, prefs, wind) {
  if (!wind?.by_year) return null;
  const years = Object.keys(wind.by_year).map(Number).sort((a, b) => a - b);
  const monthsOf = (sow, days, wholeSeason) => {           // [{y: offset, m: 1..12}] for the exposed months
    const n = Math.max(1, Math.ceil(days / 30)), from = wholeSeason ? 0 : Math.floor(n / 2);
    return Array.from({ length: n - from }, (_, i) => { const k = sow - 1 + from + i; return { y: Math.floor(k / 12), m: (k % 12) + 1 }; });
  };
  const rows = crops.filter((c) => c.type !== "green_manure").map((c) => {
    const tol = c.wind_tolerance ?? "medium";
    const sow = bestSlot(site, crops, c, prefs).rotation[0][0].sow;
    const months = monthsOf(sow, Math.min(c.duration_days, 365), tol === "low" && c.duration_days > 200);
    let hit = 0, n = 0; const hitYears = [];
    for (const y of years) {
      if (months.some((x) => !wind.by_year[String(y + x.y)])) continue;
      n++;
      const storm = sum(months.map((x) => wind.by_year[String(y + x.y)].storm_days[x.m - 1]));
      // damaging wind for low-tolerance crops = a day with WS10M_MAX >= 12 m/s (~top 10% of place-years; the
      // 10 m/s "strong" mark is reached by the SW-monsoon wind almost everywhere, so it flagged banana at 35/47 points)
      const peak = Math.max(...months.map((x) => wind.by_year[String(y + x.y)].max_wind_ms[x.m - 1]));
      const exposed = tol === "high" ? false : tol === "low" ? storm > 0 || peak >= DAMAGING_WIND_MS : storm > 0;
      if (exposed) { hit++; hitYears.push(y); }
    }
    // cyclone best tracks (NOAA IBTrACS, 1981-2024): passes within 100 km that fell in this crop's vulnerable months
    // (catches compact storms like Gaja 2018 that the ~50 km POWER wind smooths away). High-tolerance crops: not counted.
    let cyc = null;
    if (wind.cyclones?.passes) {
      const [c0, c1] = wind.cyclones.years;
      // low tolerance: any cyclonic storm (>= 34 kt); medium: only severe storms (>= 48 kt), else the coast flagged
      // nearly every crop (12 at Nagapattinam) and the list stopped meaning anything
      const hits = tol === "high" ? [] : wind.cyclones.passes.filter((p) => {
        if (tol === "medium" && p.wind_kt < 48) return false;
        const Y = +p.date.slice(0, 4), M = +p.date.slice(5, 7);
        return months.some((x) => x.m === M && Y - x.y >= c0 && Y - x.y <= c1);
      });
      cyc = { seasons_hit: hits.length, seasons: c1 - c0 + 1, share: r2(hits.length / (c1 - c0 + 1)),
              storms: hits.map((p) => `${p.name} ${p.date.slice(0, 7)}`) };
    }
    return { crop: c.id, crop_name: shortName(c), wind_tolerance: tol, sow_label: MONTHS[sow - 1],
             exposed_months: [...new Set(months.map((x) => MONTHS[x.m - 1]))], seasons_hit: hit, seasons: n,
             share_hit: n ? r2(hit / n) : null, hit_years: hitYears, cyclones: cyc };
  });
  const stormMonths = wind.monthly.filter((m) => m.storm_days_per_year >= 0.1).map((m) => MONTHS[m.month - 1]);
  return {
    annual: wind.annual, storm_months: stormMonths, windiest_days: wind.windiest_days.slice(0, 5),
    crops: rows,
    // exposed = damaging POWER wind in >= 25% of seasons, or a real cyclone pass in >= 10% of seasons (IBTrACS)
    most_exposed: rows.filter((r) => r.share_hit >= 0.25 || (r.cyclones?.share ?? 0) >= 0.1)
      .sort((a, b) => Math.max(b.share_hit, b.cyclones?.share ?? 0) - Math.max(a.share_hit, a.cyclones?.share ?? 0)).map((r) => r.crop),
    cyclones: wind.cyclones ? { count: wind.cyclones.count, per_decade: wind.cyclones.per_decade, severe_count: wind.cyclones.severe_count,
                                years: wind.cyclones.years, recent: wind.cyclones.passes.slice(-5) } : null,
    note: "Wind days from NASA POWER (~50 km average, so real gusts are stronger); cyclone passes from NOAA IBTrACS best tracks (within 100 km, 1981-2024). Read as how often wind hits each crop's vulnerable months, not as wind speed.",
  };
}

export function cropLabel(crop) { return crop.tamil_name ? `${shortName(crop)} · ${crop.tamil_name}` : shortName(crop); }
