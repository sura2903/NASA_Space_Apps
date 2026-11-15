// "Your crops this season": the farmer ticks the crops they usually grow and picks a sowing season; each crop is
// replayed (scoring.js scoreRotation, the same engine as the plan cards) at its best sowing month inside that season,
// through every year of this place's record, and ranked. If none held up, crops that did are suggested, each with a
// "Not for me" button so the farmer can rule out what they have no seed, tools, labour or buyer for.
// Lane B. Calls only scoring.js exports; every number shown comes from the engine replay of web/data/sites/*.json.
// Strings live here (English + Tamil), like risk.js, so i18n.js stays untouched.
import { scoreRotation, WATER_SOURCES } from "../scoring.js";
import { h, clear } from "./dom.js";
import { decorate } from "./glossary.js";
import { getLang, cropName, monthName, waterLabel } from "../i18n.js";

const GOOD = 0.75, RISKY = 0.5;      // share of seasons the crop came through: >= 3 in 4 good, >= 2 in 4 risky
const MAX_PICK = 8;
const STORE_KEY = "fs-mycrops";

// Sowing seasons, by sowing month. Tamil Nadu's usual seasons; months overlap a little in practice.
const SEASONS = {
  sw:     { months: [6, 7], en: "southwest monsoon", ta: "குறுவை" },
  ne:     { months: [8, 9, 10], en: "northeast monsoon, main season", ta: "சம்பா" },
  late:   { months: [11, 12, 1], en: "late season", ta: "தாளடி / நவரை" },
  summer: { months: [2, 3, 4, 5], en: "summer", ta: "கோடை" },
};

const S = {
  en: {
    eyebrow: "Your crops",
    title: "Which of your crops suit this season?",
    intro: "Tick the crops you usually grow and pick when you sow. Each crop is checked against every season from {start} to {end} at this place, with your water source ({water}).",
    season: "When do you sow?",
    crops: "Crops you usually grow",
    max: "You can tick up to {n} crops.",
    pick: "Tick at least one crop above to see how it did.",
    head: "Your crops, best first",
    good: "Good choice", risky: "Risky", poor: "Not advised", off: "Not sown in these months",
    line: "Came through {good} of {n} seasons when sown in {month}.",
    need: "Needs about {mm} mm of water in its season.",
    usual: "Usually sown in {months}.",
    allBad: "None of your crops is a good choice for this season here.",
    sugHead: "Crops that did better in this season here",
    sugNote: "Only switch to a crop you have seed, tools, labour and a buyer for. Tap \"Not for me\" to rule one out.",
    notForMe: "Not for me",
    restore: "Show the crops I ruled out ({n})",
    none: "No other crop came through at least 3 seasons in 4 in these months with this water source. A short green manure, leaving the field fallow, or another water source may be better: talk to your agriculture officer.",
    key: "Good choice: came through at least 3 seasons in 4. Risky: at least 2 in 4. Not advised: fewer than half.",
    askH: "Ask locally before you decide",
    ask: "Seed and fertiliser supply, this year's prices at your market, pests seen nearby, and how much water your lake, canal or well really has this year. Only you and local experts know these.",
  },
  ta: {
    eyebrow: "உங்கள் பயிர்கள்",
    title: "இந்தப் பருவத்துக்கு உங்கள் பயிர்களில் எது ஏற்றது?",
    intro: "நீங்கள் வழக்கமாகப் பயிரிடும் பயிர்களைத் தேர்ந்தெடுத்து, விதைக்கும் காலத்தைத் தேர்வு செய்யுங்கள். ஒவ்வொரு பயிரும் இந்த இடத்தில் {start} முதல் {end} வரையிலான ஒவ்வொரு பருவத்துடனும், உங்கள் நீர் ஆதாரத்துடனும் ({water}) சரிபார்க்கப்படுகிறது.",
    season: "எப்போது விதைக்கிறீர்கள்?",
    crops: "நீங்கள் வழக்கமாகப் பயிரிடும் பயிர்கள்",
    max: "அதிகபட்சம் {n} பயிர்களைத் தேர்ந்தெடுக்கலாம்.",
    pick: "எப்படி இருந்தது என்று பார்க்க மேலே குறைந்தது ஒரு பயிரைத் தேர்ந்தெடுங்கள்.",
    head: "உங்கள் பயிர்கள், சிறந்தது முதலில்",
    good: "நல்ல தேர்வு", risky: "ஆபத்தானது", poor: "பரிந்துரைக்கப்படவில்லை", off: "இந்த மாதங்களில் விதைப்பதில்லை",
    line: "{month} மாதம் விதைத்தபோது {n} பருவங்களில் {good} பருவங்களில் தாக்குப்பிடித்தது.",
    need: "அதன் பருவத்தில் சுமார் {mm} மி.மீ நீர் தேவை.",
    usual: "வழக்கமாக {months} மாதங்களில் விதைக்கப்படுகிறது.",
    allBad: "இந்தப் பருவத்துக்கு இங்கே உங்கள் பயிர்கள் எதுவும் நல்ல தேர்வாக இல்லை.",
    sugHead: "இந்தப் பருவத்தில் இங்கே சிறப்பாக இருந்த பயிர்கள்",
    sugNote: "விதை, கருவிகள், வேலையாட்கள், வாங்குபவர் உள்ள பயிருக்கு மட்டுமே மாறுங்கள். ஒரு பயிரை நீக்க \"எனக்கு வேண்டாம்\" என்பதைத் தொடுங்கள்.",
    notForMe: "எனக்கு வேண்டாம்",
    restore: "நீக்கிய பயிர்களைக் காட்டு ({n})",
    none: "இந்த நீர் ஆதாரத்துடன் இந்த மாதங்களில் வேறு எந்தப் பயிரும் 4 பருவங்களில் 3-இல் தாக்குப்பிடிக்கவில்லை. குறுகிய பசுந்தாள் உரம், நிலத்தைத் தரிசாக விடுதல் அல்லது வேறு நீர் ஆதாரம் சிறந்ததாக இருக்கலாம்: உங்கள் வேளாண் அலுவலரிடம் பேசுங்கள்.",
    key: "நல்ல தேர்வு: 4 பருவங்களில் குறைந்தது 3-இல் தாக்குப்பிடித்தது. ஆபத்தானது: 4-இல் குறைந்தது 2. பரிந்துரைக்கப்படவில்லை: பாதிக்கும் குறைவு.",
    askH: "முடிவெடுக்கும் முன் உள்ளூரில் கேளுங்கள்",
    ask: "விதை, உரம் கிடைப்பது, உங்கள் சந்தையில் இந்த ஆண்டு விலை, அருகில் காணப்பட்ட பூச்சிகள், உங்கள் ஏரி, கால்வாய் அல்லது கிணற்றில் இந்த ஆண்டு உண்மையில் எவ்வளவு நீர் உள்ளது. இவை உங்களுக்கும் உள்ளூர் நிபுணர்களுக்கும் மட்டுமே தெரியும்.",
  },
};
const s = (k, v = {}) => (S[getLang()]?.[k] ?? S.en[k]).replace(/\{(\w+)\}/g, (_, x) => (v[x] ?? `{${x}}`));
const fmt = (n) => Math.round(n).toLocaleString("en-IN");

function seasonLabel(id) {
  const se = SEASONS[id], a = se.months[0], b = se.months[se.months.length - 1];
  const range = `${monthName(a)}–${monthName(b)}`;
  return getLang() === "ta" ? `${se.ta} (${range})` : `${range} (${se.en})`;
}
function seasonOf(month) {
  return Object.keys(SEASONS).find((k) => SEASONS[k].months.includes(month)) ?? "ne";
}

// module state: survives re-renders (language, priorities) but not page reloads, except the ticked crops
const ui = { season: seasonOf(new Date().getMonth() + 1), picked: null, ruledOut: new Set() };
const cache = new Map();

function loadPicked() {
  try { const a = JSON.parse(localStorage.getItem(STORE_KEY) || "null"); if (Array.isArray(a)) return new Set(a); } catch {}
  return null;
}
function savePicked() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify([...ui.picked])); } catch {}
}

/** One crop at its best sowing month inside the season: { crop, off } or { crop, sow, good, n, share, total, need, verdict }. */
function seasonPick(site, crops, crop, months, prefs) {
  const sows = crop.sow_months.filter((m) => months.includes(m));
  if (!sows.length) return { crop, off: true };
  let best = null;
  for (const sow of sows) {
    const st = scoreRotation(site, crops, [[{ crop: crop.id, sow }]], prefs, { skipText: true });
    if (!best || st.replay.good_years > best.replay.good_years || (st.replay.good_years === best.replay.good_years && st.total > best.total)) best = st;
  }
  const n = best.replay.total_years, good = best.replay.good_years, share = n ? good / n : 0;
  return {
    crop, sow: best.rotation[0][0].sow, good, n, share, total: best.total, need: best.water_use.need_mm,
    verdict: share >= GOOD ? "good" : share >= RISKY ? "risky" : "poor",
  };
}

function allPicks(site, crops, prefs) {
  const key = JSON.stringify([site.id, ui.season, prefs]);
  if (!cache.has(key)) {
    if (cache.size > 30) cache.clear();
    const months = SEASONS[ui.season].months;
    cache.set(key, crops.filter((c) => c.type !== "green_manure").map((c) => seasonPick(site, crops, c, months, prefs)));
  }
  return cache.get(key);
}

const order = (a, b) => (a.off - b.off) || (b.share ?? 0) - (a.share ?? 0) || (b.total ?? 0) - (a.total ?? 0);

function row(p, extra = null) {
  const badge = h("span", { class: `mc-badge mc-${p.off ? "off" : p.verdict}` }, s(p.off ? "off" : p.verdict));
  const body = p.off
    ? [h("p", {}, s("usual", { months: p.crop.sow_months.slice().sort((a, b) => a - b).map(monthName).join(", ") }))]
    : [h("p", { html: decorate(s("line", { good: p.good, n: p.n, month: monthName(p.sow) })) }),
       h("p", { class: "note" }, s("need", { mm: fmt(p.need) }))];
  return h("li", { class: "mc-row" + (p.off ? " is-off" : "") },
    h("div", { class: "mc-row-head" }, h("strong", {}, cropName(p.crop)), badge), body, extra);
}

/**
 * Render the panel. args: { site, crops, prefs, currentIds } (currentIds = crop ids in the current rotation,
 * used as the starting ticks when the farmer has not ticked anything yet).
 */
export function renderMyCrops(el, args) {
  const { site, crops, prefs, currentIds = [] } = args;
  if (!site || !crops?.length) return;
  const field = crops.filter((c) => c.type !== "green_manure");
  if (!ui.picked) ui.picked = loadPicked() ?? new Set(currentIds.filter((id) => field.some((c) => c.id === id)));
  const rerender = () => renderMyCrops(el, args);
  const water = waterLabel(prefs.water_source, WATER_SOURCES[prefs.water_source]?.label ?? prefs.water_source);
  const years = (site.by_year || []).map((y) => y.year);

  const seasonChips = h("div", { class: "mc-seasons", role: "radiogroup", "aria-label": s("season") },
    Object.keys(SEASONS).map((id) => h("label", { class: "choice" + (id === ui.season ? " on" : "") },
      h("input", { type: "radio", name: "mc-season", value: id, checked: id === ui.season,
        onchange: () => { ui.season = id; rerender(); } }),
      h("span", {}, seasonLabel(id)))));

  const full = ui.picked.size >= MAX_PICK;
  const cropChips = h("div", { class: "mc-crops" },
    field.map((c) => {
      const on = ui.picked.has(c.id);
      return h("label", { class: "mc-chip" + (on ? " on" : "") },
        h("input", { type: "checkbox", value: c.id, checked: on, disabled: !on && full,
          onchange: (e) => { e.target.checked ? ui.picked.add(c.id) : ui.picked.delete(c.id); savePicked(); rerender(); } }),
        h("span", {}, cropName(c)));
    }));

  const picks = allPicks(site, crops, prefs);
  const mine = picks.filter((p) => ui.picked.has(p.crop.id)).sort(order);
  const result = h("div", { class: "mc-result", "aria-live": "polite" });
  if (!mine.length) {
    result.append(h("p", { class: "note" }, s("pick")));
  } else {
    result.append(h("h3", {}, s("head")), h("ol", { class: "mc-list" }, mine.map((p) => row(p))));
    if (!mine.some((p) => p.verdict === "good")) {
      const fams = new Set();
      const sug = picks.filter((p) => !p.off && p.verdict === "good" && !ui.picked.has(p.crop.id) && !ui.ruledOut.has(p.crop.id))
        .sort(order).filter((p) => !fams.has(p.crop.pest_family) && fams.add(p.crop.pest_family)).slice(0, 3);
      result.append(h("div", { class: "mc-alert" },
        h("p", { class: "mc-alert-h" }, s("allBad")),
        sug.length
          ? [h("h3", {}, s("sugHead")), h("p", { class: "note" }, s("sugNote")),
             h("ol", { class: "mc-list mc-sug" }, sug.map((p) => row(p,
               h("button", { type: "button", class: "btn-ghost small mc-no", onclick: () => { ui.ruledOut.add(p.crop.id); rerender(); } }, s("notForMe")))))]
          : h("p", {}, s("none")),
        ui.ruledOut.size
          ? h("button", { type: "button", class: "btn-ghost small", onclick: () => { ui.ruledOut.clear(); rerender(); } }, s("restore", { n: ui.ruledOut.size }))
          : null));
    }
    result.append(h("p", { class: "note mc-key" }, s("key")));
  }

  clear(el).append(
    h("div", { class: "panel-head" }, h("div", {},
      h("p", { class: "eyebrow" }, s("eyebrow")),
      h("h2", { id: "mc-title" }, s("title")))),
    h("p", { class: "note" }, s("intro", { start: years[0] ?? "", end: years[years.length - 1] ?? "", water: water.toLowerCase() })),
    h("fieldset", { class: "mc-field" }, h("legend", {}, s("season")), seasonChips),
    h("fieldset", { class: "mc-field" }, h("legend", {}, s("crops")), cropChips, h("p", { class: "note" }, s("max", { n: MAX_PICK }))),
    result,
    askLocally(s("askH"), s("ask")));
}

/** A small "ask locally" callout: where the farmer's and local experts' judgement matters more than our data. */
export function askLocally(title, text) {
  return h("aside", { class: "ask-local" }, h("strong", {}, h("span", { "aria-hidden": "true" }, "👤 "), title), h("p", {}, text));
}
