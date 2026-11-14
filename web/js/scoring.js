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
  tank:     { label: "Village tank (eri / kulam)", budget_mm: 500, months: [11, 12, 1, 2, 3], monsoon_linked: true },
  canal:    { label: "River canal / dam", budget_mm: 1800, months: [6, 7, 8, 9, 10, 11, 12, 1, 2], monsoon_linked: true },
  borewell: { label: "Borewell / well", budget_mm: 1200, months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], monsoon_linked: false },
};

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
  const u = [...new Set(ms)].sort((a, b) => a - b);
  if (!u.length) return "";
  if (u.length > 2 && u.every((m, i) => i === 0 || m === u[i - 1] + 1)) return `${MONTHS[u[0] - 1]}–${MONTHS[u[u.length - 1] - 1]}`;
  return u.map((m) => MONTHS[m - 1]).join(", ");
};
const cropMap = (crops) => Object.fromEntries(crops.map((c) => [c.id, c]));

// ---------- climate access with scenario adjustment ----------
function adjustMonth(m, sc) {
  const dT = sc?.dT_c || 0, dP = (sc?.dPrecip_pct || 0) / 100;
  const precip = (m.precip_mm ?? 0) * (1 + dP);
  const et0 = (m.et0_mm ?? Math.max(0, (m.precip_mm ?? 0) - (m.water_balance_mm ?? 0))) * (1 + 0.03 * dT);
  const hot = (m.heat_days ?? 0) * (1 + 0.4 * dT) + Math.max(0, (m.tmax_c ?? 0) - 34) * 0.8 * dT;
  return {
    precip_mm: precip,
    et0_mm: et0,
    water_balance_mm: precip - et0,
    heat_days: clamp(hot, 0, 31),
    heavy_rain_days: (m.heavy_rain_days ?? 0) * (1 + 0.07 * dT) * (1 + dP), // ~7%/°C more intense rain
    tmax_c: (m.tmax_c ?? 0) + dT,
    max_daily_precip_mm: m.max_daily_precip_mm ?? null,
  };
}

function climate(site, sc) {
  const monthly = site.monthly.map((m) => adjustMonth(m, sc));
  const byYear = (site.by_year || []).map((y) => ({ year: y.year, months: y.months.map((m) => adjustMonth(m, sc)) }));
  // Monsoon normals for tank/canal scaling.
  const ne = (ms) => ms[9].precip_mm + ms[10].precip_mm + ms[11].precip_mm;           // Oct-Dec
  const junDec = (ms) => sum(ms.slice(5, 12).map((m) => m.precip_mm));               // Jun-Dec
  const neNormal = byYear.length ? mean(byYear.map((y) => ne(y.months))) : ne(monthly);
  const jdNormal = byYear.length ? mean(byYear.map((y) => junDec(y.months))) : junDec(monthly);
  return { monthly, byYear, ne, junDec, neNormal, jdNormal };
}

// Index (0.3..1.3) for how full tanks/canals are in a given water-year.
function sourceIndex(cl, src, yearIdx) {
  if (!WATER_SOURCES[src].monsoon_linked || yearIdx == null) return 1;
  const y = cl.byYear[yearIdx];
  if (!y) return 1;
  const v = src === "tank" ? cl.ne(y.months) / cl.neNormal : cl.junDec(y.months) / cl.jdNormal;
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
      const servable = calMonths.filter((m) => srcDef.months.includes(m)).length / calMonths.length;
      const wyIdx = yearOf(s.abs[0] + (calMonths[0] < 6 ? -12 : 0)); // water-year starts in June
      const key = String(wyIdx ?? Math.floor(s.start / 12));
      if (!(key in budgets)) budgets[key] = srcDef.budget_mm * sourceIndex(cl_ref, src, wyIdx);
      irr = Math.min(deficit * servable, budgets[key]);
      budgets[key] -= irr;
      deficit -= irr;
    }
    const ratio = (eff + buffer + irr) / need;
    const heat = sum(ms.map((m) => m.heat_days));
    const heavy = sum(ms.map((m) => m.heavy_rain_days));
    const fails = [];
    if (ratio < WATER_OK) fails.push({ kind: "water", sev: 1 - ratio, text: `water: ~${r0(eff + buffer + irr)} mm available vs ${need} mm need` });
    if (heat > HEAT_LIMIT[s.crop.heat_tolerance]) fails.push({ kind: "heat", sev: heat / 30, text: `heat: ${r0(heat)} very hot days in season` });
    if (heavy >= FLOOD_LIMIT[s.crop.flood_tolerance]) fails.push({ kind: "flood", sev: heavy / 5, text: `waterlogging: ${r0(heavy)} heavy-rain days in season` });
    return { slot: s, rain, eff, buffer, irr, need, ratio, heat, heavy, rainShare: clamp((eff + buffer) / need), fails };
  });
}
let cl_ref = null; // climate object for sourceIndex inside evalSlots (set per scoring call)

// ---------- main scoring ----------
export function scoreRotation(site, crops, rotation, prefs, opts = {}) {
  const cm = cropMap(crops);
  const cl = climate(site, prefs.scenario);
  cl_ref = cl;
  const L = layout(rotation, cm);
  const src = prefs.water_source || "rainfed";
  const soilBuffer = 0.5 * (AWC[site.soil?.texture_class] ?? 150);

  // 1) average year
  const avg = evalSlots(L, (a) => cl.monthly[a % 12], () => null, src, soilBuffer);

  // 2) historical replay: start the cycle in every possible year
  let units = 0, goodUnits = 0;
  const failures = [];
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
  const subscores = { water, income, soil_structure, nitrogen, erosion, forage, reliability, pest };

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
    replay: { good_years: r0(reliability * nYears), total_years: nYears, worst },
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
  for (const r of A) {
    const months = r.slot.abs.map((a) => (a % 12) + 1);
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
  const options = crops.flatMap((c) => c.sow_months.map((sow) => ({ crop: c.id, sow })));
  const fits = (yr) => layout([yr], cm).issues.length === 0;
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
    const a = [options[i]];
    if (gmOk(a)) singles.push(a);
    for (let j = i + 1; j < options.length; j++) {
      if (options[j].crop === options[i].crop && cm[options[i].crop].type !== "cash") continue;
      const b = [options[i], options[j]];
      if (!fits(b)) continue;
      if (gmOk(b)) singles.push(b);
      for (let k = j + 1; k < options.length; k++) {
        const c3 = [options[i], options[j], options[k]];
        if (fits(c3) && gmOk(c3)) singles.push(c3);
      }
    }
  }
  // stage 1: fast score without replay; stage 2: full score for the best
  const quick = singles.map((yr) => ({ rot: [yr], s: scoreRotation(site, crops, [yr], prefs, { skipReplay: true, skipText: true, currentIds: curIds }).total }));
  quick.sort((a, b) => b.s - a.s);
  const top = quick.slice(0, 40).map((q) => q.rot[0]);
  const cands = top.map((yr) => [yr]);
  for (let i = 0; i < 25; i++) for (let j = i + 1; j < 25; j++) if (top[i] && top[j]) cands.push([top[i], top[j]]);
  const full = cands.map((rot) => scoreRotation(site, crops, rot, prefs, { skipText: true, currentIds: curIds }))
    .filter((s) => s.feasible && s.label !== cur.label)
    .sort((a, b) => b.total - a.total);

  const picks = [];
  const big = full[0];
  if (big) picks.push({ s: big, tag: "Bigger shift" });
  const keepsCurrent = (s) => s.rotation.flat().filter((x) => curIds.has(x.crop)).length >= Math.min(1, curIds.size);
  const small = full.find((s) => s !== big && keepsCurrent(s) && s.label !== big?.label);
  if (small) picks.push({ s: small, tag: "Small step" });
  for (const s of full) { if (picks.length >= n) break; if (!picks.some((p) => p.s.label === s.label)) picks.push({ s, tag: "Alternative" }); }

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

export function trendScenario(site, years = 10) {
  const t = site.trends || {};
  const annual = sum(site.monthly.map((m) => m.precip_mm)) || 1;
  // 24-year trends are noisy, so cap the preset to a plausible range.
  return {
    dT_c: r2(clamp((t.tmax_c_per_decade || 0) * (years / 10), -1, 2)),
    dPrecip_pct: r0(clamp((100 * (t.precip_mm_per_decade || 0) * (years / 10)) / annual, -15, 15)),
  };
}

export function cropLabel(crop) { return crop.tamil_name ? `${shortName(crop)} · ${crop.tamil_name}` : shortName(crop); }
