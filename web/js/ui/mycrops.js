// Farm view, steps 2-3 and the answer: the farmer ticks the crops they usually grow, picks their water and when they
// sow (a Tamil sowing-season shortcut or any single month), and gets their crops ranked for that sowing time. Each crop
// is replayed (scoring.js scoreRotation, the same engine as the plan cards) at its best sowing month inside the chosen
// window, through every year of this place's record. If none held up, crops that did are suggested, each with
// "Not for me" (no seed, tools, labour or buyer). Short crops that fit the gap are listed too.
// Sowing time is never fixed per season: the strip shows THIS place's own average rain per month and when its reliable
// sowing rains usually start (site.sowing_rain_onset), and any month can be chosen.
// Lane B. Calls only scoring.js exports; every number shown comes from web/data (site file or the engine replay).
// Strings live here (English + Tamil), like risk.js, so i18n.js stays small.
import { scoreRotation, WATER_SOURCES } from "../scoring.js";
import { h, clear } from "./dom.js";
import { decorate } from "./glossary.js";
import { getLang, cropName, monthName, monthShort, waterLabel } from "../i18n.js";

const GOOD = 0.75, RISKY = 0.5;      // share of seasons the crop came through: >= 3 in 4 good, >= 2 in 4 risky
const QUICK_DAYS = 95;                // "quick crop": about 3 months in the field
const MAX_PICK = 8;
const STORE_KEY = "fs-mycrops";

// Tamil sowing seasons (pattam) as shortcuts. Each Tamil month runs mid-month to mid-month, so a pattam spans the two
// calendar months it touches. The farmer can still tap any single month on the strip.
const PATTAMS = [
  { id: "thai", months: [1, 2], ta: "தைப் பட்டம்" },
  { id: "masi", months: [2, 3], ta: "மாசிப் பட்டம்" },
  { id: "chithirai", months: [4, 5], ta: "சித்திரைப் பட்டம்" },
  { id: "aadi", months: [7, 8], ta: "ஆடிப் பட்டம்" },
  { id: "purattasi", months: [9, 10], ta: "புரட்டாசிப் பட்டம்" },
  { id: "karthigai", months: [11, 12], ta: "கார்த்திகைப் பட்டம்" },
];

const S = {
  en: {
    cropsH: "Your crops and water",
    crops: "Tick the crops you usually grow",
    max: "You can tick up to {n} crops.",
    water: "Water for the field",
    whenH: "When do you sow?",
    whenNote: "Tap a sowing time, or any single month. Bars show this place's average rain each month ({start}–{end}).",
    pattam: "Sow in {range}",
    onset: "Reliable sowing rains usually start around {date} here.",
    onsetMark: "Sowing rains usually start",
    monthTitle: "{month}: about {mm} mm of rain on average",
    answerH: "Your crops for {when}",
    when1: "sowing in {month}",
    whenR: "sowing in {range}",
    pick: "Tick at least one crop above to see how it did.",
    good: "Good choice", risky: "Risky", poor: "Not advised", off: "Not sown then",
    line: "Came through {good} of {n} seasons when sown in {month}. Ready by about {ready}.",
    need: "Needs about {mm} mm of water in its season.",
    usual: "Usually sown in {months}.",
    allBad: "None of your crops is a good choice for this sowing time here.",
    sugHead: "Crops that did better if sown then",
    sugNote: "Only switch to a crop you have seed, tools, labour and a buyer for. Tap \"Not for me\" to rule one out.",
    notForMe: "Not for me",
    restore: "Show the crops I ruled out ({n})",
    none: "No other crop came through at least 3 seasons in 4 when sown then with this water. A short green manure, leaving the field fallow, or another water source may be better: talk to your agriculture officer.",
    quickH: "Quick crops for this gap",
    quickNote: "Short crops (about 3 months) that came through most years when sown then. Useful between your main crops.",
    quickRow: "{crop}: ready by about {ready}, came through {good} of {n}",
    key: "Good choice: came through at least 3 seasons in 4. Risky: at least 2 in 4. Not advised: fewer than half.",
    askH: "Ask locally before you decide",
    ask: "Seed and fertiliser supply, this year's prices at your market, pests seen nearby, and how much water your lake, canal or well really has this year. Only you and local experts know these.",
  },
  ta: {
    cropsH: "உங்கள் பயிர்களும் நீரும்",
    crops: "நீங்கள் வழக்கமாகப் பயிரிடும் பயிர்களைத் தேர்ந்தெடுங்கள்",
    max: "அதிகபட்சம் {n} பயிர்களைத் தேர்ந்தெடுக்கலாம்.",
    water: "வயலுக்கான நீர்",
    whenH: "எப்போது விதைக்கிறீர்கள்?",
    whenNote: "ஒரு பட்டத்தை அல்லது எந்த ஒரு மாதத்தையும் தொடுங்கள். கம்பிகள் இந்த இடத்தின் ஒவ்வொரு மாத சராசரி மழையைக் காட்டுகின்றன ({start}–{end}).",
    pattam: "{ta} ({range})",
    onset: "இங்கே நம்பகமான விதைப்பு மழை வழக்கமாக {date} அளவில் தொடங்குகிறது.",
    onsetMark: "விதைப்பு மழை வழக்கமாகத் தொடங்கும் மாதம்",
    monthTitle: "{month}: சராசரியாக சுமார் {mm} மி.மீ மழை",
    answerH: "{when}: உங்கள் பயிர்கள்",
    when1: "{month} விதைப்பு",
    whenR: "{range} விதைப்பு",
    pick: "எப்படி இருந்தது என்று பார்க்க மேலே குறைந்தது ஒரு பயிரைத் தேர்ந்தெடுங்கள்.",
    good: "நல்ல தேர்வு", risky: "ஆபத்தானது", poor: "பரிந்துரைக்கப்படவில்லை", off: "அப்போது விதைப்பதில்லை",
    line: "{month} மாதம் விதைத்தபோது {n} பருவங்களில் {good} பருவங்களில் தாக்குப்பிடித்தது. சுமார் {ready} மாதத்துக்குள் அறுவடைக்குத் தயார்.",
    need: "அதன் பருவத்தில் சுமார் {mm} மி.மீ நீர் தேவை.",
    usual: "வழக்கமாக {months} மாதங்களில் விதைக்கப்படுகிறது.",
    allBad: "இந்த விதைப்புக் காலத்துக்கு இங்கே உங்கள் பயிர்கள் எதுவும் நல்ல தேர்வாக இல்லை.",
    sugHead: "அப்போது விதைத்தால் சிறப்பாக இருந்த பயிர்கள்",
    sugNote: "விதை, கருவிகள், வேலையாட்கள், வாங்குபவர் உள்ள பயிருக்கு மட்டுமே மாறுங்கள். ஒரு பயிரை நீக்க \"எனக்கு வேண்டாம்\" என்பதைத் தொடுங்கள்.",
    notForMe: "எனக்கு வேண்டாம்",
    restore: "நீக்கிய பயிர்களைக் காட்டு ({n})",
    none: "இந்த நீருடன் அப்போது விதைத்தால் வேறு எந்தப் பயிரும் 4 பருவங்களில் 3-இல் தாக்குப்பிடிக்கவில்லை. குறுகிய பசுந்தாள் உரம், நிலத்தைத் தரிசாக விடுதல் அல்லது வேறு நீர் ஆதாரம் சிறந்ததாக இருக்கலாம்: உங்கள் வேளாண் அலுவலரிடம் பேசுங்கள்.",
    quickH: "இடைவெளிக்கான குறுகிய காலப் பயிர்கள்",
    quickNote: "அப்போது விதைத்தபோது பெரும்பாலான ஆண்டுகளில் தாக்குப்பிடித்த குறுகிய காலப் பயிர்கள் (சுமார் 3 மாதம்). உங்கள் முக்கியப் பயிர்களுக்கு இடையே பயன்படும்.",
    quickRow: "{crop}: சுமார் {ready} மாதத்துக்குள் தயார், {n}-இல் {good} பருவங்களில் தாக்குப்பிடித்தது",
    key: "நல்ல தேர்வு: 4 பருவங்களில் குறைந்தது 3-இல் தாக்குப்பிடித்தது. ஆபத்தானது: 4-இல் குறைந்தது 2. பரிந்துரைக்கப்படவில்லை: பாதிக்கும் குறைவு.",
    askH: "முடிவெடுக்கும் முன் உள்ளூரில் கேளுங்கள்",
    ask: "விதை, உரம் கிடைப்பது, உங்கள் சந்தையில் இந்த ஆண்டு விலை, அருகில் காணப்பட்ட பூச்சிகள், உங்கள் ஏரி, கால்வாய் அல்லது கிணற்றில் இந்த ஆண்டு உண்மையில் எவ்வளவு நீர் உள்ளது. இவை உங்களுக்கும் உள்ளூர் நிபுணர்களுக்கும் மட்டுமே தெரியும்.",
  },
};
const s = (k, v = {}) => (S[getLang()]?.[k] ?? S.en[k]).replace(/\{(\w+)\}/g, (_, x) => (v[x] ?? `{${x}}`));
const fmt = (n) => Math.round(n).toLocaleString("en-IN");
const range = (ms) => (ms.length > 1 ? `${monthShort(ms[0])}–${monthShort(ms[ms.length - 1])}` : monthName(ms[0]));
const readyMonth = (sow, crop) => ((sow - 1 + Math.max(1, Math.round(crop.duration_days / 30.4))) % 12) + 1;

function defaultSel() {
  const m = new Date().getMonth() + 1;
  const p = PATTAMS.find((x) => x.months[0] === m) ?? PATTAMS.find((x) => x.months.includes(m));
  return p ? { pattam: p.id } : { month: m };
}
const selMonths = (sel) => (sel.pattam ? PATTAMS.find((p) => p.id === sel.pattam).months : [sel.month]);

// module state: survives re-renders (language, priorities, water) but not page reloads, except the ticked crops
const ui = { sel: defaultSel(), picked: null, ruledOut: new Set() };
const cache = new Map();

function loadPicked() {
  try { const a = JSON.parse(localStorage.getItem(STORE_KEY) || "null"); if (Array.isArray(a)) return new Set(a); } catch {}
  return null;
}
function savePicked() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify([...ui.picked])); } catch {}
}

/** One crop at its best sowing month inside the window: { crop, off } or { crop, sow, good, n, share, total, need, verdict }. */
function windowPick(site, crops, crop, months, prefs) {
  const sows = crop.sow_months.filter((m) => months.includes(m));
  if (!sows.length) return { crop, off: true };
  let best = null;
  for (const sow of sows) {
    const st = scoreRotation(site, crops, [[{ crop: crop.id, sow }]], prefs, { skipText: true });
    if (!best || st.replay.good_years > best.replay.good_years || (st.replay.good_years === best.replay.good_years && st.total > best.total)) best = st;
  }
  const n = best.replay.total_years, good = best.replay.good_years, share = n ? good / n : 0;
  const sow = best.rotation[0][0].sow;
  return {
    crop, sow, ready: readyMonth(sow, crop), good, n, share, total: best.total, need: best.water_use.need_mm,
    verdict: share >= GOOD ? "good" : share >= RISKY ? "risky" : "poor",
  };
}

function allPicks(site, crops, prefs, months) {
  const key = JSON.stringify([site.id, months, prefs]);
  if (!cache.has(key)) {
    if (cache.size > 40) cache.clear();
    cache.set(key, crops.filter((c) => c.type !== "green_manure").map((c) => windowPick(site, crops, c, months, prefs)));
  }
  return cache.get(key);
}

const order = (a, b) => (a.off - b.off) || (b.share ?? 0) - (a.share ?? 0) || (b.total ?? 0) - (a.total ?? 0);
const diverse = (list, n) => { const fams = new Set(); return list.filter((p) => !fams.has(p.crop.pest_family) && fams.add(p.crop.pest_family)).slice(0, n); };

function row(p, extra = null) {
  const badge = h("span", { class: `mc-badge mc-${p.off ? "off" : p.verdict}` }, s(p.off ? "off" : p.verdict));
  const body = p.off
    ? [h("p", {}, s("usual", { months: p.crop.sow_months.slice().sort((a, b) => a - b).map(monthShort).join(", ") }))]
    : [h("p", { html: decorate(s("line", { good: p.good, n: p.n, month: monthName(p.sow), ready: monthName(p.ready) })) }),
       h("p", { class: "note" }, s("need", { mm: fmt(p.need) }))];
  return h("li", { class: "mc-row" + (p.off ? " is-off" : "") },
    h("div", { class: "mc-row-head" }, h("strong", {}, cropName(p.crop)), badge), body, extra);
}

/** Month strip: this place's own average rain per month, the usual start of sowing rains, any month tappable. */
function monthStrip(site, months, onPick) {
  const rain = (site.monthly || []).map((m) => m.precip_mm);
  const max = Math.max(1, ...rain);
  const doy = site.sowing_rain_onset?.median_doy;
  const onsetM = doy ? new Date(Date.UTC(2001, 0, doy)).getUTCMonth() + 1 : null;
  return h("div", { class: "mc-strip", role: "group", "aria-label": s("whenH") },
    Array.from({ length: 12 }, (_, i) => {
      const m = i + 1, on = months.includes(m), mm = rain[i];
      const title = mm != null ? s("monthTitle", { month: monthName(m), mm: fmt(mm) }) : monthName(m);
      return h("button", {
        type: "button", class: "mc-month" + (on ? " on" : "") + (m === onsetM ? " onset" : ""),
        "aria-pressed": on ? "true" : "false", title, "aria-label": title + (m === onsetM ? `. ${s("onsetMark")}` : ""),
        onclick: () => onPick(m),
      },
      h("span", { class: "mc-bar-wrap", "aria-hidden": "true" }, h("span", { class: "mc-bar", style: { height: `${Math.round(100 * (mm ?? 0) / max)}%` } })),
      h("span", { class: "mc-mlabel" }, monthShort(m)),
      m === onsetM ? h("span", { class: "mc-onset", "aria-hidden": "true" }, "●") : null);
    }));
}

function onsetLine(site) {
  const doy = site.sowing_rain_onset?.median_doy;
  if (!doy) return null;
  const d = new Date(Date.UTC(2001, 0, doy));
  return h("p", { class: "note mc-onset-note" }, h("span", { class: "mc-onset", "aria-hidden": "true" }, "● "),
    s("onset", { date: `${d.getUTCDate()} ${monthName(d.getUTCMonth() + 1)}` }));
}

/**
 * Render the panel. args: { site, crops, prefs, currentIds, onWater }
 * currentIds = crop ids in the current rotation, the starting ticks when the farmer has not ticked anything yet.
 * onWater(id) = the page's water-source setter (shared with the full-year plans).
 */
export function renderMyCrops(el, args) {
  const { site, crops, prefs, currentIds = [], onWater } = args;
  if (!site || !crops?.length) return;
  const field = crops.filter((c) => c.type !== "green_manure");
  if (!ui.picked) ui.picked = loadPicked() ?? new Set(currentIds.filter((id) => field.some((c) => c.id === id)));
  const rerender = () => renderMyCrops(el, args);
  const years = (site.by_year || []).map((y) => y.year);
  const months = selMonths(ui.sel);

  // step 2: crops + water
  const full = ui.picked.size >= MAX_PICK;
  const cropChips = h("div", { class: "mc-crops" },
    field.map((c) => {
      const on = ui.picked.has(c.id);
      return h("label", { class: "mc-chip" + (on ? " on" : "") },
        h("input", { type: "checkbox", value: c.id, checked: on, disabled: !on && full,
          onchange: (e) => { e.target.checked ? ui.picked.add(c.id) : ui.picked.delete(c.id); savePicked(); rerender(); } }),
        h("span", {}, cropName(c)));
    }));
  const water = h("div", { class: "choices mc-water", role: "radiogroup", "aria-label": s("water") },
    Object.entries(WATER_SOURCES).map(([id, ws]) => h("label", { class: "choice" + (id === prefs.water_source ? " on" : "") },
      h("input", { type: "radio", name: "mc-water", value: id, checked: id === prefs.water_source, onchange: () => onWater?.(id) }),
      h("span", {}, waterLabel(id, ws.label)))));

  // step 3: when
  const chips = h("div", { class: "mc-pattams" },
    PATTAMS.map((p) => h("button", {
      type: "button", class: "mc-pattam" + (ui.sel.pattam === p.id ? " on" : ""), "aria-pressed": ui.sel.pattam === p.id ? "true" : "false",
      onclick: () => { ui.sel = { pattam: p.id }; rerender(); },
    }, s("pattam", { ta: p.ta, range: range(p.months) }))));
  const strip = monthStrip(site, months, (m) => { ui.sel = { month: m }; rerender(); });

  // the answer
  const picks = allPicks(site, crops, prefs, months);
  const mine = picks.filter((p) => ui.picked.has(p.crop.id)).sort(order);
  const when = months.length > 1 ? s("whenR", { range: range(months) }) : s("when1", { month: monthName(months[0]) });
  const result = h("div", { class: "mc-result", "aria-live": "polite" }, h("h2", { id: "mc-answer-title" }, s("answerH", { when })));
  let shown = new Set(mine.map((p) => p.crop.id));
  if (!mine.length) {
    result.append(h("p", { class: "note" }, s("pick")));
  } else {
    result.append(h("ol", { class: "mc-list" }, mine.map((p) => row(p))));
    if (!mine.some((p) => p.verdict === "good")) {
      const sug = diverse(picks.filter((p) => !p.off && p.verdict === "good" && !shown.has(p.crop.id) && !ui.ruledOut.has(p.crop.id)).sort(order), 3);
      sug.forEach((p) => shown.add(p.crop.id));
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
  }
  const quick = diverse(picks.filter((p) => !p.off && p.verdict === "good" && p.crop.duration_days <= QUICK_DAYS
    && !shown.has(p.crop.id) && !ui.ruledOut.has(p.crop.id)).sort(order), 3);
  if (quick.length) {
    result.append(h("div", { class: "mc-quick" }, h("h3", {}, s("quickH")), h("p", { class: "note" }, s("quickNote")),
      h("ul", {}, quick.map((p) => h("li", {}, s("quickRow", { crop: cropName(p.crop), ready: monthName(p.ready), good: p.good, n: p.n }))))));
  }
  if (mine.length) result.append(h("p", { class: "note mc-key" }, s("key")));
  result.append(askLocally(s("askH"), s("ask")));

  clear(el).append(
    h("div", { class: "mc-grid" },
      h("div", { class: "mc-inputs" },
        h("h2", {}, h("span", { class: "n" }, "2"), " ", s("cropsH")),
        h("fieldset", { class: "mc-field" }, h("legend", {}, s("crops")), cropChips, h("p", { class: "note" }, s("max", { n: MAX_PICK }))),
        h("fieldset", { class: "mc-field" }, h("legend", {}, s("water")), water),
        h("h2", { class: "mc-when-h" }, h("span", { class: "n" }, "3"), " ", s("whenH")),
        h("p", { class: "note" }, s("whenNote", { start: years[0] ?? "", end: years[years.length - 1] ?? "" })),
        chips, strip, onsetLine(site)),
      result));
}

/** A small "ask locally" callout: where the farmer's and local experts' judgement matters more than our data. */
export function askLocally(title, text) {
  return h("aside", { class: "ask-local" }, h("strong", {}, h("span", { "aria-hidden": "true" }, "👤 "), title), h("p", {}, text));
}
