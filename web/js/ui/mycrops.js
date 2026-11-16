// Farm view, steps 2-3 and the answer: the farmer ticks the crops they usually grow, picks their water and when they
// sow (a Tamil sowing-season shortcut or any single month), and gets their crops ranked for that sowing time. Each crop
// is replayed (scoring.js scoreRotation, the same engine as the plan cards) at its best sowing month inside the chosen
// window, through every year of this place's record. If none held up, crops that did are suggested, each with
// "Not for me" (no seed, tools, labour or buyer). Short crops that fit the gap are listed too.
// Sowing time is never fixed per season: the strip shows THIS place's own average rain per month and when its reliable
// sowing rains usually start (site.sowing_rain_onset), and any month can be chosen.
// Lane B. Calls only scoring.js exports; every number shown comes from web/data (site file or the engine replay).
// Strings live here (English + Tamil), like risk.js, so i18n.js stays small.
import { scoreRotation, WATER_SOURCES, DAM_OPTIONS } from "../scoring.js";
import { h, clear } from "./dom.js";
import { toggleWater } from "./inputs.js";
import { decorate } from "./glossary.js";
import { countUp, revealParts, forgetParts } from "./reveal.js";
import { getLang, cropName, monthName, monthShort, waterLabel } from "../i18n.js";

const GOOD = 0.75, RISKY = 0.5;      // chance of success: >= 75% (about 3 seasons in 4) good, >= 50% risky
// The climate has been changing, so the most recent seasons say more about next season: the last RECENT years of the
// record count RECENT_WEIGHT times in the chance that sets the verdict and the ranking. Both raw counts sit behind the ⓘ.
// The chance is smoothed (Laplace): one good and one failed season are added, (good + 1) / (seasons + 2), so a perfect
// record shows just under 100% and a short record is pulled toward 50% instead of jumping to 0% or 100%.
const RECENT = 10, RECENT_WEIGHT = 2;
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
    cropsH: "Your water and crops",
    crops: "Tick the crops you grow or want to try",
    cropSec: "Show crops",
    sec_all: "All crops", sec_best: "Best here", sec_other: "Other crops",
    bestNote: "Crops that came through at least 3 seasons in 4 here for {when}, with your water. Best first.",
    bestFirst: "Choose when you sow (step 2) to see the crops that did best here.",
    bestNone: "No crop came through at least 3 seasons in 4 here for {when} with this water. Look under All crops.",
    otherNote: "Crops that did less well here for {when}, or are not usually sown then.",
    ticked: "Ticked ({n} of {max}): {list}",
    waitH: "Your answer appears here",
    todoWhen: "Choose when you sow",
    todoCrops: "Tick at least one crop",
    showBtn: "Show how my crops did",
    waitNote: "Then each crop gets a tile with its chance of coming through, from the NASA record for {start}–{end}.",
    max: "You can tick up to {n} crops.",
    water: "Water for the field (tick all you can use)",
    waterNote: "In our check, lake / pond and canal water rise and fall with each year's monsoon, so a dry year means less water. Borewell water is treated as steady for now.",
    multi: "With more than one water source, a season counts as fine if any one of them would have covered the crop. We don't add them together.",
    damQ: "Has {dam} opened for canal water this year?",
    dam_unknown: "Not known yet (use past years)",
    dam_on_time: "Opened on time (about {d})",
    dam_late: "Opened late (about {d})",
    dam_very_late: "Opened very late (about {d})",
    dam_not_opened: "Not opened",
    damNone: "We only have dam opening dates for the Cauvery delta. Here, canal water follows each year's rain.",
    whenH: "When do you sow?",
    whenNote: "Tap a sowing time, or any single month. Bars show this place's average rain each month ({start}–{end}).",
    pattam: "Sow in {range}",
    pattamNote: "These sowing times follow the common sowing seasons (pattams) in Tamil Nadu. Dates shift by place and year, so check them against your own village.",
    onset: "Reliable sowing rains usually start around {date} here.",
    onsetMark: "Sowing rains usually start",
    monthTitle: "{month}: about {mm} mm of rain on average",
    answerH: "Your crops for {when}",
    when1: "sowing in {month}",
    whenR: "sowing in {range}",
    pick: "Tick at least one crop above to see how it did.",
    good: "Good choice", risky: "Some risk", poor: "High risk", off: "Not sown then",
    line: "Came through {good} of {n} seasons when sown in {month}, and {rgood} of the last {rn}. Ready by about {ready}.",
    recentNote: "The last {rn} seasons ({from}–{to}) count double in these verdicts, because the climate has been changing. Ten years alone can mislead, so the full record stays the main count.",
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
    key: "Good choice: a chance of 75% or more (about 3 seasons in 4). Some risk: 50% or more. High risk: below 50%.",
    tileCap: "chance it comes through",
    futH: "By 2041–2060",
    futLine: "{lo}–{hi}% chance with the climate of 2041–2060 in 5 NASA climate models (today {now}%).",
    futSame: "About {lo}% chance with the climate of 2041–2060 in all 5 NASA climate models (today {now}%).",
    futNote: "These are the same real seasons with each model's expected monthly changes in heat and rain applied (NASA NEX-GDDP-CMIP6, middle emissions path SSP2-4.5). A range, not a forecast.",
    futNone: "No climate projection is available for this place.",
    pctNote: "How the % is worked out: the last {rn} seasons count twice, and one good and one failed season are added, so even a perfect record shows a little under 100%.",
    tileReady: "Ready by about {ready}",
    tileUsual: "Usually sown {months}",
    more: "More about {crop}",
    how: "How to read this",
    quickTile: "{pct}%",
    askH: "Ask locally before you decide",
    ask: "Seed and fertiliser supply, this year's prices at your market, pests seen nearby, and how much water your lake, canal or well really has this year. Only you and local experts know these.",
  },
  ta: {
    cropsH: "உங்கள் நீரும் பயிர்களும்",
    crops: "நீங்கள் பயிரிடும் அல்லது முயற்சிக்க விரும்பும் பயிர்களைத் தேர்ந்தெடுங்கள்",
    cropSec: "பயிர்களைக் காட்டு",
    sec_all: "எல்லாப் பயிர்களும்", sec_best: "இங்கே சிறந்தவை", sec_other: "மற்ற பயிர்கள்",
    bestNote: "உங்கள் நீருடன், {when} செய்தபோது இங்கே 4 பருவங்களில் குறைந்தது 3-இல் தாக்குப்பிடித்த பயிர்கள். சிறந்தவை முதலில்.",
    bestFirst: "இங்கே சிறப்பாக இருந்த பயிர்களைக் காண, முதலில் எப்போது விதைக்கிறீர்கள் என்று தேர்ந்தெடுங்கள் (படி 2).",
    bestNone: "இந்த நீருடன், {when} செய்தபோது இங்கே எந்தப் பயிரும் 4 பருவங்களில் 3-இல் தாக்குப்பிடிக்கவில்லை. எல்லாப் பயிர்களும் பகுதியில் பாருங்கள்.",
    otherNote: "{when} செய்தபோது இங்கே குறைவாகச் சிறப்பாக இருந்த பயிர்கள், அல்லது அப்போது வழக்கமாக விதைக்கப்படாதவை.",
    ticked: "தேர்ந்தெடுத்தவை ({max}-இல் {n}): {list}",
    waitH: "உங்கள் பதில் இங்கே தோன்றும்",
    todoWhen: "எப்போது விதைக்கிறீர்கள் என்று தேர்ந்தெடுங்கள்",
    todoCrops: "குறைந்தது ஒரு பயிரைத் தேர்ந்தெடுங்கள்",
    showBtn: "என் பயிர்கள் எப்படி இருந்தன என்று காட்டு",
    waitNote: "பிறகு ஒவ்வொரு பயிருக்கும், {start}–{end} நாசா பதிவிலிருந்து, அது தாக்குப்பிடிக்கும் வாய்ப்பு ஒரு அட்டையில் காட்டப்படும்.",
    max: "அதிகபட்சம் {n} பயிர்களைத் தேர்ந்தெடுக்கலாம்.",
    water: "வயலுக்கான நீர் (பயன்படுத்தக்கூடிய அனைத்தையும் தேர்ந்தெடுங்கள்)",
    waterNote: "எங்கள் சரிபார்ப்பில், ஏரி / குளம், கால்வாய் நீர் ஒவ்வொரு ஆண்டின் பருவமழையுடன் ஏறி இறங்குகிறது; வறண்ட ஆண்டில் நீர் குறைவு. ஆழ்துளைக் கிணற்று நீர் இப்போதைக்கு நிலையானதாகக் கொள்ளப்படுகிறது.",
    multi: "ஒன்றுக்கு மேற்பட்ட நீர் ஆதாரங்கள் இருந்தால், அவற்றில் ஏதாவது ஒன்று பயிருக்குப் போதுமானதாக இருந்த பருவம் நல்லதாகக் கணக்கிடப்படுகிறது. அவற்றைக் கூட்டுவதில்லை.",
    damQ: "இந்த ஆண்டு {dam} கால்வாய் நீருக்குத் திறக்கப்பட்டதா?",
    dam_unknown: "இன்னும் தெரியாது (கடந்த ஆண்டுகளைப் பயன்படுத்து)",
    dam_on_time: "சரியான நேரத்தில் திறக்கப்பட்டது ({d} அளவில்)",
    dam_late: "தாமதமாகத் திறக்கப்பட்டது ({d} அளவில்)",
    dam_very_late: "மிகத் தாமதமாகத் திறக்கப்பட்டது ({d} அளவில்)",
    dam_not_opened: "திறக்கப்படவில்லை",
    damNone: "காவிரி டெல்டாவுக்கு மட்டுமே அணை திறப்புத் தேதிகள் எங்களிடம் உள்ளன. இங்கே கால்வாய் நீர் ஒவ்வொரு ஆண்டின் மழையைப் பின்பற்றுகிறது.",
    whenH: "எப்போது விதைக்கிறீர்கள்?",
    whenNote: "ஒரு பட்டத்தை அல்லது எந்த ஒரு மாதத்தையும் தொடுங்கள். கம்பிகள் இந்த இடத்தின் ஒவ்வொரு மாத சராசரி மழையைக் காட்டுகின்றன ({start}–{end}).",
    pattam: "{ta} ({range})",
    pattamNote: "இவை தமிழ்நாட்டின் வழக்கமான விதைப்புப் பட்டங்கள். இடம், ஆண்டுக்கு ஏற்ப நாட்கள் மாறும், எனவே உங்கள் ஊரின் வழக்கத்துடன் ஒப்பிட்டுப் பாருங்கள்.",
    onset: "இங்கே நம்பகமான விதைப்பு மழை வழக்கமாக {date} அளவில் தொடங்குகிறது.",
    onsetMark: "விதைப்பு மழை வழக்கமாகத் தொடங்கும் மாதம்",
    monthTitle: "{month}: சராசரியாக சுமார் {mm} மி.மீ மழை",
    answerH: "{when}: உங்கள் பயிர்கள்",
    when1: "{month} விதைப்பு",
    whenR: "{range} விதைப்பு",
    pick: "எப்படி இருந்தது என்று பார்க்க மேலே குறைந்தது ஒரு பயிரைத் தேர்ந்தெடுங்கள்.",
    good: "நல்ல தேர்வு", risky: "சிறிது ஆபத்து", poor: "அதிக ஆபத்து", off: "அப்போது விதைப்பதில்லை",
    line: "{month} மாதம் விதைத்தபோது {n} பருவங்களில் {good} பருவங்களில் தாக்குப்பிடித்தது; கடைசி {rn} பருவங்களில் {rgood}. சுமார் {ready} மாதத்துக்குள் அறுவடைக்குத் தயார்.",
    recentNote: "காலநிலை மாறி வருவதால், கடைசி {rn} பருவங்கள் ({from}–{to}) இந்த முடிவுகளில் இரட்டிப்பு எடை பெறுகின்றன. பத்து ஆண்டுகள் மட்டும் தவறாக வழிகாட்டலாம், எனவே முழுப் பதிவே முக்கிய எண்ணிக்கை.",
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
    key: "நல்ல தேர்வு: 75% அல்லது அதற்கு மேல் வாய்ப்பு (சுமார் 4 பருவங்களில் 3). சிறிது ஆபத்து: 50% அல்லது அதற்கு மேல். அதிக ஆபத்து: 50%-க்குக் கீழ்.",
    tileCap: "தாக்குப்பிடிக்கும் வாய்ப்பு",
    futH: "2041–2060-இல்",
    futLine: "5 நாசா காலநிலை மாதிரிகளின் 2041–2060 காலநிலையில் {lo}–{hi}% வாய்ப்பு (இன்று {now}%).",
    futSame: "5 நாசா காலநிலை மாதிரிகளின் 2041–2060 காலநிலையிலும் சுமார் {lo}% வாய்ப்பு (இன்று {now}%).",
    futNote: "இவை அதே உண்மையான பருவங்கள்; ஒவ்வொரு மாதிரியும் எதிர்பார்க்கும் மாதாந்திர வெப்ப, மழை மாற்றங்கள் சேர்க்கப்பட்டுள்ளன (நாசா NEX-GDDP-CMIP6, நடுத்தர உமிழ்வுப் பாதை SSP2-4.5). இது ஒரு வரம்பு, முன்னறிவிப்பு அல்ல.",
    futNone: "இந்த இடத்துக்குக் காலநிலைக் கணிப்பு இல்லை.",
    pctNote: "இந்த % எப்படிக் கணக்கிடப்படுகிறது: கடைசி {rn} பருவங்கள் இரு முறை எண்ணப்படுகின்றன; ஒரு நல்ல, ஒரு தோல்வியடைந்த பருவம் சேர்க்கப்படுகிறது. அதனால் முழு வெற்றிப் பதிவும் 100%-க்குச் சற்றுக் குறைவாகவே காட்டும்.",
    tileReady: "சுமார் {ready} மாதத்துக்குள் தயார்",
    tileUsual: "வழக்கமாக {months} விதைப்பு",
    more: "{crop} பற்றி மேலும்",
    how: "இதை எப்படிப் படிப்பது",
    quickTile: "{pct}%",
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

// module state: survives re-renders (language, priorities, water) but not page reloads, except the ticked crops.
// The answer stays hidden until the farmer has chosen a sowing time (whenChosen) and ticked crops this visit
// (cropsTouched), or pressed "Show" for crops ticked on an earlier visit (showAnyway). cropTab: all / best / other.
const ui = { sel: defaultSel(), whenChosen: false, cropsTouched: false, showAnyway: false, cropTab: null, lastTab: null, lastKey: null,
  picked: null, ruledOut: new Set(), water: null, waterSite: null, dam: "unknown" };
const cache = new Map();

function loadPicked() {
  try { const a = JSON.parse(localStorage.getItem(STORE_KEY) || "null"); if (Array.isArray(a)) return new Set(a); } catch {}
  return null;
}
function savePicked() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify([...ui.picked])); } catch {}
}

/** One crop at its best sowing month inside the window: { crop, off } or { crop, sow, good, n, share, total, need, verdict }. */
// With several water sources, each one is replayed on its own and a season counts as fine if ANY of them covered
// the crop that year (sources are not added together). Canal water uses the farmer's "has the dam opened" answer
// where the place has dam data (prefs.dam, scoring.js damContext).
function windowPick(site, crops, crop, months, prefs, srcs, damOpen) {
  const sows = crop.sow_months.filter((m) => months.includes(m));
  if (!sows.length) return { crop, off: true };
  let best = null;
  for (const sow of sows) {
    const runs = srcs.map((src) => scoreRotation(site, crops, [[{ crop: crop.id, sow }]],
      { ...prefs, water_source: src, ...(src === "canal" && damOpen !== undefined ? { dam: { open: damOpen } } : {}) }, { skipText: true }));
    const okBy = new Map();
    for (const st of runs) for (const y of st.replay.years) okBy.set(y.year, okBy.get(y.year) || y.ok);
    const good = [...okBy.values()].filter(Boolean).length, n = okBy.size;
    const last = Math.max(...okBy.keys()), recent = [...okBy].filter(([y]) => y > last - RECENT);
    const rgood = recent.filter(([, ok]) => ok).length, rn = recent.length;
    const wgood = good + (RECENT_WEIGHT - 1) * rgood, wn = n + (RECENT_WEIGHT - 1) * rn;
    const wshare = (wgood + 1) / (wn + 2);     // smoothed, recency-weighted chance of success (see the top of the file)
    const total = Math.max(...runs.map((st) => st.total));
    const cand = { sow, good, n, rgood, rn, wshare, from: last - rn + 1, to: last, total, need: runs[0].water_use.need_mm };
    if (!best || cand.wshare > best.wshare || (cand.wshare === best.wshare && cand.total > best.total)) best = cand;
  }
  const share = best.wshare;      // smoothed and recency-weighted; the shown %, the verdict and the order all use it
  return {
    crop, ...best, share, pct: Math.round(100 * share), ready: readyMonth(best.sow, crop),
    verdict: share >= GOOD ? "good" : share >= RISKY ? "risky" : "poor",
  };
}

function allPicks(site, crops, prefs, months, srcs, damOpen) {
  const key = JSON.stringify([site.id, months, prefs, srcs, damOpen === undefined ? "unknown" : damOpen === null ? "shut" : damOpen]);
  if (!cache.has(key)) {
    if (cache.size > 40) cache.clear();
    cache.set(key, crops.filter((c) => c.type !== "green_manure").map((c) => windowPick(site, crops, c, months, prefs, srcs, damOpen)));
  }
  return cache.get(key);
}

const order = (a, b) => (a.off - b.off) || (b.share ?? 0) - (a.share ?? 0) || (b.total ?? 0) - (a.total ?? 0);
const diverse = (list, n) => { const fams = new Set(); return list.filter((p) => !fams.has(p.crop.pest_family) && fams.add(p.crop.pest_family)).slice(0, n); };

// One big tile per crop: a symbol + word (never colour alone), the crop, and its chance of success as a %.
// The season counts ("came through 20 of 23"), how the % is worked out and the water need sit behind the ⓘ.
const ICON = { good: "✓", risky: "!", poor: "✕", off: "–" };
// 2041-2060 (issue #30): the same crop, sowing month and water, replayed through each NASA NEX-GDDP-CMIP6 model's
// future-like seasons (SSP2-4.5). Worked out only when the farmer opens the ⓘ, so the tiles themselves (the big %,
// the verdict, the order) never change. futureCtx is set by renderMyCrops for the tiles it draws.
let futureCtx = null;
function futureBlock(p) {
  const c = futureCtx, models = Object.entries(c?.projection?.deltas?.ssp245 || {});
  if (!models.length) return h("p", { class: "note" }, s("futNone"));
  const pcts = models.map(([model, deltas]) => windowPick(c.site, c.crops, p.crop, [p.sow],
    { ...c.prefs, scenario: { deltas, projection_key: `ssp245|${model}` } }, c.srcs, c.damOpen).pct).sort((a, b) => a - b);
  const lo = pcts[0], hi = pcts[pcts.length - 1];
  return h("div", { class: "mc-future" }, h("strong", {}, s("futH")),
    h("p", {}, s(lo === hi ? "futSame" : "futLine", { lo, hi, now: p.pct })), h("p", { class: "note" }, s("futNote")));
}
function tile(p, extra = null) {
  const v = p.off ? "off" : p.verdict;
  const usual = p.crop.sow_months.slice().sort((a, b) => a - b).map(monthShort).join(", ");
  const detail = p.off
    ? [h("p", {}, s("usual", { months: usual }))]
    : [h("p", { html: decorate(s("line", { good: p.good, n: p.n, rgood: p.rgood, rn: p.rn, month: monthName(p.sow), ready: monthName(p.ready) })) }),
       h("p", { class: "note" }, s("pctNote", { rn: p.rn })),
       h("p", {}, s("need", { mm: fmt(p.need) }))];
  return h("li", { class: `mc-tile mc-t-${v}` },
    h("div", { class: "mc-tile-top" },
      h("span", { class: "mc-icon", "aria-hidden": "true" }, ICON[v]),
      h("span", { class: "mc-verdict" }, s(v))),
    h("strong", { class: "mc-tile-crop" }, cropName(p.crop)),
    p.off
      ? h("span", { class: "mc-tile-sub" }, s("tileUsual", { months: usual }))
      : [h("span", { class: "mc-tile-num" }, `${p.pct}%`), h("span", { class: "mc-tile-sub" }, s("tileCap"))],
    p.off ? null : h("span", { class: "mc-tile-sub" }, s("tileReady", { ready: monthShort(p.ready) })),
    h("details", {
      class: "mc-more",
      ontoggle: (e) => {          // add the 2041-2060 range the first time the ⓘ opens
        const d = e.currentTarget;
        if (!d.open || p.off || d.dataset.future) return;
        d.dataset.future = "1";
        d.querySelector(".mc-more-body")?.append(futureBlock(p));
      },
    },
      h("summary", { "aria-label": s("more", { crop: cropName(p.crop) }), title: s("more", { crop: cropName(p.crop) }) }, "ⓘ"),
      h("div", { class: "mc-more-body" }, detail, extra)));
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
      h("span", { class: "mc-bar-wrap", "aria-hidden": "true" }, h("span", { class: "mc-bar", style: { height: `${Math.round(100 * (mm ?? 0) / max)}%`, "--i": i } })),
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
 * waters = the Set of ticked water sources, onWaters(set) = the page's setter (shared with the full-year plans).
 */
export function renderMyCrops(el, args) {
  const { site, crops, prefs, waters, onWaters, projection = null } = args;
  if (!site || !crops?.length) return;
  const field = crops.filter((c) => c.type !== "green_manure");
  // start from the farmer's own ticks from an earlier visit, never from a ready-made example rotation
  if (!ui.picked) ui.picked = loadPicked() ?? new Set();
  const rerender = () => renderMyCrops(el, args);
  const years = (site.by_year || []).map((y) => y.year);
  const months = selMonths(ui.sel);
  const when = months.length > 1 ? s("whenR", { range: range(months) }) : s("when1", { month: monthName(months[0]) });
  const num = (n) => h("span", { class: "n" }, String(n));

  // step 2: when (first, because "best here" depends on it). Nothing is shown as chosen until the farmer taps.
  const chips = h("div", { class: "mc-pattams" },
    PATTAMS.map((p) => { const on = ui.whenChosen && ui.sel.pattam === p.id; return h("button", {
      type: "button", class: "mc-pattam" + (on ? " on" : ""), "aria-pressed": on ? "true" : "false",
      onclick: () => { ui.sel = { pattam: p.id }; ui.whenChosen = true; rerender(); },
    }, s("pattam", { ta: p.ta, range: range(p.months) })); }));
  const strip = monthStrip(site, ui.whenChosen ? months : [], (m) => { ui.sel = { month: m }; ui.whenChosen = true; rerender(); });

  // step 3: water (tick every source the farmer can use; "Rain only" is on its own), then crops.
  // The ticked set lives in the page (shared with the full-year plans' water boxes).
  if (ui.waterSite !== site.id) { ui.waterSite = site.id; ui.dam = "unknown"; }
  ui.water = waters ?? new Set([prefs.water_source]);
  const setW = (id, on) => (onWaters ? onWaters(toggleWater(ui.water, id, on)) : (ui.water = toggleWater(ui.water, id, on), rerender()));
  const srcs = Object.keys(WATER_SOURCES).filter((k) => ui.water.has(k));
  const water = h("div", { class: "choices mc-water", role: "group", "aria-label": s("water") },
    Object.entries(WATER_SOURCES).map(([id, ws]) => h("label", { class: "choice" + (ui.water.has(id) ? " on" : "") },
      h("input", { type: "checkbox", value: id, checked: ui.water.has(id), onchange: (e) => setW(id, e.target.checked) }),
      h("span", {}, waterLabel(id, ws.label)))));
  const fmtMD = (md) => { const [m, d] = md.split("-").map(Number); return `${d} ${monthShort(m)}`; };
  let dam = null;
  if (ui.water.has("canal")) {
    dam = site.dam
      ? h("fieldset", { class: "mc-field mc-dam" }, h("legend", {}, s("damQ", { dam: site.dam.name.split(",")[0] })),
          h("div", { class: "mc-pattams" }, ["unknown", ...Object.keys(DAM_OPTIONS)].map((k) => h("button", {
            type: "button", class: "mc-pattam" + (ui.dam === k ? " on" : ""), "aria-pressed": ui.dam === k ? "true" : "false",
            onclick: () => { ui.dam = k; rerender(); },
          }, s(`dam_${k}`, { d: DAM_OPTIONS[k] ? fmtMD(DAM_OPTIONS[k]) : "" })))))
      : h("p", { class: "note" }, s("damNone"));
  }
  const damOpen = site.dam && ui.dam !== "unknown" ? DAM_OPTIONS[ui.dam] : undefined;
  const picks = allPicks(site, crops, prefs, months, srcs, damOpen);
  futureCtx = { site, crops, prefs, srcs, damOpen, projection };

  // crop sections: all / best here (a good choice for this place, sowing time and water) / other
  const best = ui.whenChosen ? picks.filter((p) => !p.off && p.verdict === "good").sort(order).map((p) => p.crop) : null;
  const bestIds = new Set((best || []).map((c) => c.id));
  const other = field.filter((c) => !bestIds.has(c.id));
  const tab = ui.cropTab ?? (ui.whenChosen ? "best" : "all");
  const list = tab === "best" ? (best || []) : tab === "other" ? other : field;
  const full = ui.picked.size >= MAX_PICK;
  const seg = h("div", { class: "mc-seg", role: "group", "aria-label": s("cropSec") },
    [["all", field.length], ["best", best ? best.length : null], ["other", ui.whenChosen ? other.length : null]].map(([k, n]) => h("button", {
      type: "button", class: "mc-seg-btn" + (tab === k ? " on" : ""), "aria-pressed": tab === k ? "true" : "false", "data-sec": k,
      onclick: () => { ui.cropTab = k; rerender(); },
    }, s(`sec_${k}`), n != null ? h("span", { class: "mc-seg-n" }, ` ${n}`) : null)));
  const secNote = tab === "best" ? s(!best ? "bestFirst" : best.length ? "bestNote" : "bestNone", { when })
    : tab === "other" && ui.whenChosen ? s("otherNote", { when }) : null;
  // switching section: the chips cascade in (app.css .mc-cascade); a tick or other redraw leaves them still
  const cascade = ui.lastTab !== null && ui.lastTab !== tab;
  ui.lastTab = tab;
  const cropChips = h("div", { class: "mc-crops" + (cascade ? " mc-cascade" : ""), "data-sec": tab },
    list.map((c, i) => {
      const on = ui.picked.has(c.id);
      return h("label", { class: "mc-chip" + (on ? " on" : "") + (bestIds.has(c.id) ? " best" : ""), style: { "--i": Math.min(i, 14) } },
        h("input", { type: "checkbox", value: c.id, checked: on, disabled: !on && full,
          onchange: (e) => { e.target.checked ? ui.picked.add(c.id) : ui.picked.delete(c.id); ui.cropsTouched = true; savePicked(); rerender(); } }),
        bestIds.has(c.id) ? h("span", { class: "mc-chip-ok", "aria-hidden": "true" }, "✓") : null,
        h("span", {}, cropName(c)));
    }));
  const tickedNames = field.filter((c) => ui.picked.has(c.id)).map(cropName);
  const ticked = tickedNames.length ? h("p", { class: "mc-ticked" }, s("ticked", { n: tickedNames.length, max: MAX_PICK, list: tickedNames.join(", ") })) : null;

  // the answer: only once the farmer has chosen a sowing time and crops
  const ready = ui.whenChosen && ui.picked.size > 0 && (ui.cropsTouched || ui.showAnyway);
  const key = `${site.id}|${months.join(",")}`;
  const fresh = ready && ui.lastKey !== key;    // first showing, or a new place or sowing time: tiles pop in again
  ui.lastKey = ready ? key : null;
  let result;
  if (!ready) {
    const done = (ok, txt) => h("li", { class: ok ? "done" : "" }, h("span", { class: "mc-todo-i", "aria-hidden": "true" }, ok ? "✓" : "○"), " ", txt);
    result = h("div", { class: "mc-result mc-wait", "aria-live": "polite", "data-rv": "wait" },
      h("h2", { id: "mc-answer-title" }, s("waitH")),
      h("ol", { class: "mc-todo" }, done(ui.whenChosen, s("todoWhen")), done(ui.picked.size > 0, s("todoCrops"))),
      ui.whenChosen && ui.picked.size > 0
        ? h("button", { type: "button", class: "btn mc-show", onclick: () => { ui.showAnyway = true; rerender(); } }, s("showBtn"))
        : null,
      h("p", { class: "note" }, s("waitNote", { start: years[0] ?? "", end: years[years.length - 1] ?? "" })));
  } else {
    result = renderAnswer(picks, when, srcs, rerender);
    result.dataset.rv = "answer";
    if (fresh) {
      result.classList.add("mc-fresh");
      result.querySelectorAll(".mc-tile").forEach((t, i) => t.style.setProperty("--i", Math.min(i, 10)));
      result.querySelectorAll(".mc-tile-num").forEach(countUp);
    }
  }

  forgetParts(el);
  clear(el).append(
    h("div", { class: "mc-grid" },
      h("div", { class: "mc-inputs" },
        h("div", { class: "mc-step", "data-rv": "when" },
          h("h2", { class: "mc-when-h" }, num(2), " ", s("whenH")),
          h("p", { class: "note" }, s("whenNote", { start: years[0] ?? "", end: years[years.length - 1] ?? "" })),
          chips, h("p", { class: "note mc-pattam-note" }, s("pattamNote")), strip, onsetLine(site)),
        h("div", { class: "mc-step", "data-rv": "crops" },
          h("h2", { class: "mc-crops-h" }, num(3), " ", s("cropsH")),
          h("fieldset", { class: "mc-field mc-water-field" }, h("legend", {}, s("water")), water, h("p", { class: "note" }, s("waterNote"))),
          dam,
          h("fieldset", { class: "mc-field mc-crops-field" }, h("legend", {}, s("crops")), seg,
            secNote ? h("p", { class: "note mc-sec-note" }, secNote) : null,
            cropChips, ticked, h("p", { class: "note" }, s("max", { n: MAX_PICK }))))),
      result));
  revealParts(el, ".mc-step, .mc-result");
}

/** The tiles for the ticked crops, other ideas when none is a good choice, quick crops for the gap, and the notes. */
function renderAnswer(picks, when, srcs, rerender) {
  const mine = picks.filter((p) => ui.picked.has(p.crop.id)).sort(order);
  const result = h("div", { class: "mc-result", "aria-live": "polite" }, h("h2", { id: "mc-answer-title" }, s("answerH", { when })));
  const shown = new Set(mine.map((p) => p.crop.id));
  if (!mine.length) {
    result.append(h("p", { class: "note" }, s("pick")));
  } else {
    result.append(h("ol", { class: "mc-tiles" }, mine.map((p) => tile(p))));
    if (!mine.some((p) => p.verdict === "good")) {
      const sug = diverse(picks.filter((p) => !p.off && p.verdict === "good" && !shown.has(p.crop.id) && !ui.ruledOut.has(p.crop.id)).sort(order), 3);
      sug.forEach((p) => shown.add(p.crop.id));
      result.append(h("div", { class: "mc-alert" },
        h("p", { class: "mc-alert-h" }, s("allBad")),
        sug.length
          ? [h("h3", {}, s("sugHead")),
             h("ol", { class: "mc-tiles mc-sug" }, sug.map((p) => tile(p, [h("p", { class: "note" }, s("sugNote")),
               h("button", { type: "button", class: "btn-ghost small mc-no", onclick: () => { ui.ruledOut.add(p.crop.id); rerender(); } }, s("notForMe"))])))]
          : h("p", {}, s("none")),
        ui.ruledOut.size
          ? h("button", { type: "button", class: "btn-ghost small", onclick: () => { ui.ruledOut.clear(); rerender(); } }, s("restore", { n: ui.ruledOut.size }))
          : null));
    }
  }
  const quick = diverse(picks.filter((p) => !p.off && p.verdict === "good" && p.crop.duration_days <= QUICK_DAYS
    && !shown.has(p.crop.id) && !ui.ruledOut.has(p.crop.id)).sort(order), 3);
  if (quick.length) {
    result.append(h("div", { class: "mc-quick" }, h("h3", {}, s("quickH")),
      h("ul", { class: "mc-quick-chips" }, quick.map((p) => h("li", { title: s("quickRow", { crop: cropName(p.crop), ready: monthName(p.ready), good: p.good, n: p.n }) },
        h("span", { "aria-hidden": "true" }, "✓ "), h("strong", {}, cropName(p.crop)), " ", h("span", { class: "mc-quick-n" }, s("quickTile", { pct: p.pct })))))));
  }
  // the reading key, recent-years weighting and multi-source rule: one fold instead of three paragraphs
  const anyIn = picks.find((p) => !p.off);
  const how = [mine.length ? s("key") : null, anyIn ? s("recentNote", { rn: anyIn.rn, from: anyIn.from, to: anyIn.to }) : null,
    srcs.length > 1 ? s("multi") : null, quick.length ? s("quickNote") : null].filter(Boolean);
  if (how.length) result.append(h("details", { class: "mc-how" }, h("summary", {}, h("span", { "aria-hidden": "true" }, "ⓘ "), s("how")), how.map((x) => h("p", { class: "note" }, x))));
  result.append(h("details", { class: "ask-local mc-ask" }, h("summary", {}, h("span", { "aria-hidden": "true" }, "👤 "), s("askH")), h("p", {}, s("ask"))));
  return result;
}

/** A small "ask locally" callout: where the farmer's and local experts' judgement matters more than our data. */
export function askLocally(title, text) {
  return h("aside", { class: "ask-local" }, h("strong", {}, h("span", { "aria-hidden": "true" }, "👤 "), title), h("p", {}, text));
}
