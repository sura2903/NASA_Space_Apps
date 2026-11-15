// Policy view: "Colour the map by" any statewide risk layer + a "Risk at this place" box.
// Data: data/statewide_risk.json (Lane A, contract 2j). Kept in its own module (strings included, English + Tamil)
// so the Policy view's own code and i18n.js barely change; Lane B can restyle or move the strings later.
import { h } from "./dom.js";
import { getLang, cropName } from "../i18n.js";

const S = {
  en: {
    by: "Colour the map by", exposure: "Exposure score (the signs above)",
    rank: "{label}: {v} {unit}", legendLow: "lower", legendHigh: "higher", better: "better", worse: "worse",
    boxTitle: "Risk at this place", water: "With {water} water",
    rain100: "1-in-100-year day of rain", drought100: "1-in-100-year NE-monsoon drought", storms: "Cyclone / storm days",
    perYear: "per year", ofNormal: "of normal", worst: "Worst drought on record: {year}, {pct}% of normal ({label})",
    avoidDry: "Avoid in a drought year", saferDry: "Safer in a drought year", came2016: "Came through 2016",
    hit2016: "Hit in 2016", windy: "Exposed to damaging wind", memory: "A 2005-2014 memory over-trusts",
    none: "none", future: "By 2041-2060 (SSP2-4.5)", hot: "{v} more very hot days a year", ne: "NE monsoon {v}% (models {a} to {b}%)",
    pending: "future projections still loading", district: "District: {d} (crop-mix mismatch {m} of 100)",
    source: "Source: NASA IMERG, POWER, NEX-GDDP; engine replay 2001-2024. See statewide_risk.json.",
  },
  ta: {
    by: "வரைபடத்தின் நிறம் எதைப் பொறுத்து", exposure: "பாதிப்பு மதிப்பெண் (மேலே உள்ள அடையாளங்கள்)",
    rank: "{label}: {v} {unit}", legendLow: "குறைவு", legendHigh: "அதிகம்", better: "நல்லது", worse: "மோசம்",
    boxTitle: "இந்த இடத்தின் அபாயங்கள்", water: "{water} நீருடன்",
    rain100: "100 ஆண்டுக்கு ஒருமுறை வரும் ஒருநாள் மழை", drought100: "100 ஆண்டுக்கு ஒருமுறை வரும் வடகிழக்கு பருவமழை வறட்சி",
    storms: "புயல் நாட்கள்", perYear: "ஆண்டுக்கு", ofNormal: "இயல்பில்",
    worst: "பதிவான மோசமான வறட்சி: {year}, இயல்பில் {pct}% ({label})",
    avoidDry: "வறட்சி ஆண்டில் தவிர்க்கவும்", saferDry: "வறட்சி ஆண்டில் பாதுகாப்பானவை", came2016: "2016-ஐத் தாங்கியவை",
    hit2016: "2016-இல் பாதிக்கப்பட்டவை", windy: "பலத்த காற்றுக்கு ஆளாகும் பயிர்கள்", memory: "2005-2014 நினைவு அதிகமாக நம்பும் பயிர்கள்",
    none: "இல்லை", future: "2041-2060 வாக்கில் (SSP2-4.5)", hot: "ஆண்டுக்கு {v} கூடுதல் மிக வெப்ப நாட்கள்",
    ne: "வடகிழக்கு பருவமழை {v}% (மாதிரிகள் {a} முதல் {b}%)", pending: "எதிர்கால கணிப்புகள் இன்னும் ஏற்றப்படுகின்றன",
    district: "மாவட்டம்: {d} (பயிர்-மழை பொருத்தமின்மை 100-க்கு {m})",
    source: "ஆதாரம்: NASA IMERG, POWER, NEX-GDDP; 2001-2024 மறுஓட்டம். statewide_risk.json பார்க்கவும்.",
  },
};
// Tamil names for the data's layer labels (English comes from the file)
const LAYER_TA = {
  "district.mismatch_index": "பயிர்க் கலவை vs மழை (பொருத்தமின்மை)",
  "extremes.rain_1day_100yr_mm": "100 ஆண்டுக்கு ஒருமுறை வரும் ஒருநாள் மழை",
  "extremes.drought_100yr_pct_of_normal": "100 ஆண்டுக்கு ஒருமுறை வரும் வறட்சி",
  "wind.storm_days_per_year": "புயல் நாட்கள்",
  "climate.hot_days_per_year": "மிக வெப்ப நாட்கள் (>38 °C)",
  "future.ssp245.hot_days_change": "2041-60 கூடுதல் மிக வெப்ப நாட்கள்",
  "future.ssp245.ne_rain_change_pct": "2041-60 வடகிழக்கு பருவமழை மாற்றம்",
  "engine.tank.rice_long.share": "ஏரி நீர் நீண்டகால நெல்: தாங்கிய பருவங்கள்",
  "engine.rainfed.future.rice_long.ssp245.median": "2041-60 மானாவாரி நீண்டகால நெல்",
};
const tr = (k, vars = {}) => (S[getLang()]?.[k] ?? S.en[k]).replace(/\{(\w+)\}/g, (_, x) => vars[x] ?? "");

export const pathGet = (obj, key) => key.split(".").reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), obj);
// plain-English overrides for data labels that use "tank" (a word many readers do not know in this sense)
const LAYER_EN = { "engine.tank.rice_long.share": "Lake / pond-fed long rice: share of seasons it came through" };
export const layerLabel = (L) => (getLang() === "ta" ? LAYER_TA[L.key] ?? L.label : LAYER_EN[L.key] ?? L.label);

export async function loadRisk(getJSON) {
  try {
    const r = await getJSON("data/statewide_risk.json");
    return { layers: r.layers.filter((L) => L.available > 0), byId: Object.fromEntries(r.points.map((p) => [p.id, p])) };
  } catch { return null; }
}

/** Within-state rank 0 (best) .. 1 (worst) for one layer. */
export function layerRanks(risk, L, ids) {
  const vals = ids.map((id) => ({ id, v: pathGet(risk.byId[id], L.key) })).filter((x) => typeof x.v === "number");
  const ex = (v) => (L.worse === "high" ? v : -v);
  const out = {};
  for (const a of vals) {
    const below = vals.filter((b) => ex(b.v) < ex(a.v)).length;
    const ties = vals.filter((b) => b !== a && ex(b.v) === ex(a.v)).length;
    out[a.id] = vals.length > 1 ? (below + ties / 2) / (vals.length - 1) : 0.5;
  }
  return out;
}

export function layerValueText(risk, L, id) {
  const v = pathGet(risk.byId[id], L.key);
  if (typeof v !== "number") return "–";
  return tr("rank", { label: layerLabel(L), v: Math.abs(v) < 1 && v !== 0 ? v.toFixed(2) : Math.round(v * 10) / 10, unit: L.unit });
}

export function layerPicker(risk, current, onChange) {
  const sel = h("select", { id: "risk-layer", onchange: (e) => onChange(e.target.value || null) },
    h("option", { value: "", selected: !current }, tr("exposure")),
    ...risk.layers.map((L) => h("option", { value: L.key, selected: L.key === current }, layerLabel(L))));
  return h("label", { class: "risk-picker" }, h("span", {}, tr("by")), sel);
}

export function legendWords(L) {
  return { title: layerLabel(L), low: L.worse === "high" ? tr("better") : tr("worse"), high: L.worse === "high" ? tr("worse") : tr("better"),
           range: L.range ? `${L.range[0]}–${L.range[1]} ${L.unit}` : "" };
}

const names = (ids, cropById) => (ids?.length ? ids.map((id) => (cropById[id] ? cropName(cropById[id]) : id)).join(", ") : tr("none"));

/** "Risk at this place" box for the click panel. water: the what-if water source (tank / rainfed shown). */
export function riskBox(risk, id, water, cropById, waterLabel) {
  const r = risk?.byId[id];
  if (!r) return null;
  const src = water === "rainfed" ? "rainfed" : "tank";
  const e = r.engine?.[src];
  const ex = r.extremes, wi = r.wind, fu = r.future?.ssp245;
  const row = (k, v) => h("li", {}, h("strong", {}, k + ": "), v);
  return h("div", { class: "risk-box" },
    h("h3", { class: "vuln-h" }, tr("boxTitle")),
    r.district ? h("p", { class: "note" }, tr("district", { d: r.district.name, m: r.district.mismatch_index })) : null,
    h("ul", { class: "vuln-notes" },
      ex ? row(tr("rain100"), `${ex.rain_1day_100yr_mm} mm (${ex.rain_1day_100yr_range[0]}–${ex.rain_1day_100yr_range[1]})`) : null,
      ex ? row(tr("drought100"), `${ex.drought_100yr_pct_of_normal}% ${tr("ofNormal")}`) : null,
      ex ? h("li", {}, tr("worst", { year: ex.worst_drought.year, pct: ex.worst_drought.pct_of_normal, label: ex.worst_drought.label })) : null,
      wi ? row(tr("storms"), `${wi.storm_days_per_year} ${tr("perYear")}`) : null,
      row(tr("future"), fu ? `${tr("hot", { v: Math.round(fu.hot_days_change) })}; ${tr("ne", { v: Math.round(fu.ne_rain_change_pct), a: Math.round(fu.ne_rain_change_range[0]), b: Math.round(fu.ne_rain_change_range[1]) })}` : tr("pending"))),
    e ? h("p", { class: "note" }, tr("water", { water: waterLabel(src) })) : null,
    e ? h("ul", { class: "vuln-notes" },
      row(tr("avoidDry"), names(e.avoid_drought, cropById)),
      row(tr("saferDry"), names(e.safer_drought?.slice(0, 6), cropById)),
      e.drought_2016 ? row(tr("came2016"), names(e.drought_2016.came_through, cropById)) : null,
      row(tr("windy"), names(e.wind_most_exposed, cropById)),
      row(tr("memory"), names(e.memory_2014_looks_safer, cropById))) : null,
    h("p", { class: "note" }, tr("source")));
}
