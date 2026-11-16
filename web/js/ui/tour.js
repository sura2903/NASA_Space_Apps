// Guided tour: a "Take a tour" button that walks a first-time visitor through the page, one highlighted part at a
// time, with a short card (Back / Next / Close). No library. Steps whose part is missing (for example a panel that
// has not loaded) are skipped. Strings live here, English and Tamil, like ui/references.js.
import { h } from "./dom.js";
import { getLang, onLangChange } from "../i18n.js";

const UI = {
  en: { btn: "🧭 Take a tour", next: "Next", back: "Back", done: "Done", close: "Close tour", step: "{i} of {n}", show: "↕ Show me" },
  ta: { btn: "🧭 சுற்றிப் பார்க்க", next: "அடுத்து", back: "முந்தைய", done: "முடிந்தது", close: "சுற்றுலாவை மூடு", step: "{n}-இல் {i}", show: "↕ காட்டு" },
};

// Each step: a CSS selector (first visible match), a title and text in both languages, and an optional prepare()
// that makes the part visible first (for example opening a folded section).
const FARM = [
  { sel: ".tabs", en: ["Two views", "This tool has two views: Farmers (this page) for one farm, and Policy makers for the whole of Tamil Nadu. Home gives a short overview."],
    ta: ["இரண்டு பார்வைகள்", "இந்தக் கருவியில் இரண்டு பார்வைகள் உள்ளன: ஒரு பண்ணைக்கான விவசாயிகள் பகுதி (இந்தப் பக்கம்), முழு தமிழ்நாட்டுக்கான கொள்கை வகுப்பாளர்கள் பகுதி. முகப்புப் பக்கம் ஒரு சுருக்கமான அறிமுகம் தருகிறது."] },
  { sel: "#place-bar", en: ["1. Where is your farm?", "Choose your district, then the place closest to your village. Or tap “Use my location”, or pick on the map. Each place is a square of NASA data about 28 km wide."],
    ta: ["1. உங்கள் பண்ணை எங்கே?", "உங்கள் மாவட்டத்தையும், பிறகு உங்கள் ஊருக்கு அருகில் உள்ள இடத்தையும் தேர்ந்தெடுங்கள். அல்லது “என் இருப்பிடம்” பொத்தானை அழுத்துங்கள், அல்லது வரைபடத்தில் தேர்ந்தெடுங்கள். ஒவ்வொரு இடமும் சுமார் 28 கி.மீ. அகலமுள்ள நாசா தரவுச் சதுரம்."] },
  { sel: "#mycrops .mc-when-h", en: ["2. When do you sow?", "Pick a traditional sowing season (pattam) or a month first. The crops that did best then at your place are listed under “Best here” in the next step."],
    ta: ["2. எப்போது விதைக்கிறீர்கள்?", "முதலில் ஒரு பாரம்பரிய விதைப்புப் பருவத்தை (பட்டம்) அல்லது மாதத்தைத் தேர்ந்தெடுங்கள். அப்போது உங்கள் இடத்தில் சிறப்பாக இருந்த பயிர்கள் அடுத்த படியில் “இங்கே சிறந்தவை” என்பதில் காட்டப்படும்."] },
  { sel: "#mycrops .mc-crops-h, #mycrops .mc-field", en: ["3. Your water and crops", "Tick every water source you can use, then your crops: from all crops, the ones that did best here for your sowing time, or the others. On canal water in the Cauvery delta, you are also asked whether Mettur dam has opened this year."],
    ta: ["3. உங்கள் நீரும் பயிர்களும்", "பயன்படுத்தக்கூடிய எல்லா நீர் ஆதாரங்களையும், பிறகு உங்கள் பயிர்களையும் தேர்ந்தெடுங்கள்: எல்லாப் பயிர்களிலிருந்தும், உங்கள் விதைப்புக் காலத்துக்கு இங்கே சிறப்பாக இருந்தவற்றிலிருந்தும், அல்லது மற்றவற்றிலிருந்தும். காவிரி டெல்டாவில் கால்வாய் நீர் என்றால், இந்த ஆண்டு மேட்டூர் அணை திறக்கப்பட்டதா என்றும் கேட்கப்படும்."] },
  { sel: "#mycrops .mc-tiles, #mycrops .mc-result", en: ["Your answer", "Once you have chosen, each crop gets a tile with its chance of coming through when sown then, from 24 real seasons of NASA data. Tap ⓘ on a tile to see the season counts and the water it needs."],
    ta: ["உங்கள் பதில்", "நீங்கள் தேர்ந்தெடுத்த பிறகு, ஒவ்வொரு பயிருக்கும், அப்போது விதைத்தால் தாக்குப்பிடிக்கும் வாய்ப்பு, 24 உண்மையான பருவங்களின் நாசா தரவிலிருந்து காட்டப்படும். பருவ எண்ணிக்கையையும் நீர்த் தேவையையும் காண ⓘ-ஐ அழுத்துங்கள்."] },
  { sel: "#cards, #more-plans", prepare: () => { const d = document.getElementById("more-plans"); if (d && !d.open) d.open = true; },
    en: ["Plans for the whole year", "Compare your current rotation with a small step and a bigger shift. Each plan has 24 squares, one per real year; hover or tap a square to see why that year failed."],
    ta: ["முழு ஆண்டுக்கான திட்டங்கள்", "உங்கள் தற்போதைய பயிர் சுழற்சியை ஒரு சிறிய மாற்றம், ஒரு பெரிய மாற்றம் ஆகியவற்றுடன் ஒப்பிடுங்கள். ஒவ்வொரு திட்டத்திலும் 24 சதுரங்கள், ஒவ்வொன்றும் ஓர் உண்மையான ஆண்டு; அந்த ஆண்டு ஏன் தோல்வியடைந்தது என்று பார்க்க ஒரு சதுரத்தைத் தொடுங்கள்."] },
  { sel: "#lang", en: ["தமிழ் / English", "Switch the whole site between English and Tamil at any time."],
    ta: ["தமிழ் / English", "எப்போது வேண்டுமானாலும் முழு தளத்தையும் தமிழுக்கும் ஆங்கிலத்துக்கும் இடையே மாற்றலாம்."] },
  { sel: "#refs-foot", en: ["Where the numbers come from", "Every number comes from NASA and other public datasets, listed here, along with how we used AI to build the tool."],
    ta: ["எண்கள் எங்கிருந்து வருகின்றன", "ஒவ்வொரு எண்ணும் நாசா மற்றும் பிற பொதுத் தரவுத் தொகுப்புகளிலிருந்து வருகிறது; அவை இங்கே பட்டியலிடப்பட்டுள்ளன. கருவியை உருவாக்க செயற்கை நுண்ணறிவை எப்படிப் பயன்படுத்தினோம் என்பதும் இங்கே உள்ளது."] },
  { sel: '.tabs a[href="policy.html"]', en: ["Next: the Policy makers view", "For planners and district officers, the Policy makers tab runs the same engine for 185 places across Tamil Nadu: risk maps, what to avoid in a drought year, water saved by a crop switch, and crop ideas for each district. Open it and press “Take a tour” there for its own walk-through."],
    ta: ["அடுத்து: கொள்கை வகுப்பாளர்கள் பார்வை", "திட்டமிடுபவர்களுக்கும் மாவட்ட அலுவலர்களுக்கும், கொள்கை வகுப்பாளர்கள் பகுதி அதே கணிப்பு முறையை தமிழ்நாடு முழுவதும் 185 இடங்களுக்கு இயக்குகிறது: அபாய வரைபடங்கள், வறட்சி ஆண்டில் எதைத் தவிர்க்க வேண்டும், பயிர் மாற்றத்தால் மிச்சமாகும் நீர், ஒவ்வொரு மாவட்டத்துக்குமான பயிர் யோசனைகள். அதைத் திறந்து அங்குள்ள “சுற்றிப் பார்க்க” பொத்தானை அழுத்துங்கள்."] },
];
const POLICY = [
  { sel: ".tabs", en: ["The whole state", "This tab is for planners and district agriculture officers: the same engine as the Farmers tab, run for 185 places across Tamil Nadu."],
    ta: ["முழு மாநிலம்", "இந்தப் பகுதி திட்டமிடுபவர்களுக்கும் மாவட்ட வேளாண் அலுவலர்களுக்கும் ஆனது: விவசாயிகள் பகுதியின் அதே கணிப்பு முறை, தமிழ்நாடு முழுவதும் 185 இடங்களுக்கு."] },
  { sel: "#pmap", en: ["The risk map", "Each square is a place about 28 km wide. Colour the map by any risk: drought, heavy rain, cyclones, heat by 2041–2060, groundwater and more. Hover a square for its numbers."],
    ta: ["அபாய வரைபடம்", "ஒவ்வொரு சதுரமும் சுமார் 28 கி.மீ. அகலமுள்ள ஓர் இடம். வறட்சி, கனமழை, புயல், 2041–2060 வெப்பம், நிலத்தடி நீர் போன்ற எந்த அபாயத்தைக் கொண்டும் வரைபடத்துக்கு வண்ணம் தீட்டலாம். எண்களைக் காண ஒரு சதுரத்தின் மேல் வையுங்கள்."] },
  { sel: "#components", en: ["What counts as exposed", "Choose which warning signs make up the overall exposure score. Each sign is ranked across the state."],
    ta: ["எது பாதிப்பாகக் கருதப்படுகிறது", "ஒட்டுமொத்த பாதிப்பு மதிப்பெண்ணில் எந்த எச்சரிக்கை அறிகுறிகள் சேர வேண்டும் என்று தேர்ந்தெடுங்கள். ஒவ்வொரு அறிகுறியும் மாநிலம் முழுவதும் வரிசைப்படுத்தப்படுகிறது."] },
  { sel: "#whatif-panel", en: ["Click a place", "See its worst drought on record, what to avoid and what is safer in a drought year, and how much irrigation water a crop switch would save in its district."],
    ta: ["ஓர் இடத்தைத் தொடுங்கள்", "அதன் மிக மோசமான வறட்சி, வறட்சி ஆண்டில் எதைத் தவிர்க்க வேண்டும், எது பாதுகாப்பானது, பயிர் மாற்றத்தால் அதன் மாவட்டத்தில் எவ்வளவு பாசன நீர் மிச்சமாகும் என்று பாருங்கள்."] },
  { sel: "#ideas-panel", en: ["Crop ideas by district", "Crops that suit each district's rain but are rarely grown there today. Tap a crop in the chart to see its districts."],
    ta: ["மாவட்ட வாரியான பயிர் யோசனைகள்", "ஒவ்வொரு மாவட்டத்தின் மழைக்கும் ஏற்ற, ஆனால் இன்று அங்கு அரிதாகப் பயிரிடப்படும் பயிர்கள். அவற்றின் மாவட்டங்களைக் காண வரைபடத்தில் ஒரு பயிரைத் தொடுங்கள்."] },
  { sel: "#refs-foot", en: ["Sources", "Every dataset behind the map, and how we used AI to build the tool."],
    ta: ["ஆதாரங்கள்", "வரைபடத்தின் பின்னால் உள்ள ஒவ்வொரு தரவுத் தொகுப்பும், கருவியை உருவாக்க செயற்கை நுண்ணறிவை எப்படிப் பயன்படுத்தினோம் என்பதும்."] },
  { sel: '.tabs a[href="index.html"]', en: ["Next: the Farmers view", "The Farmers tab answers the same questions for one farm: pick a district and village area, your sowing month, water and crops, and see each crop's chance of coming through and three full-year plans. Open it and press “Take a tour” there for its own walk-through."],
    ta: ["அடுத்து: விவசாயிகள் பார்வை", "விவசாயிகள் பகுதி அதே கேள்விகளுக்கு ஒரு பண்ணைக்குப் பதில் தருகிறது: மாவட்டம், ஊர்ப் பகுதி, விதைப்பு மாதம், நீர், பயிர்கள் ஆகியவற்றைத் தேர்ந்தெடுத்து, ஒவ்வொரு பயிரும் தாக்குப்பிடிக்கும் வாய்ப்பையும் மூன்று முழு ஆண்டுத் திட்டங்களையும் பாருங்கள். அதைத் திறந்து அங்குள்ள “சுற்றிப் பார்க்க” பொத்தானை அழுத்துங்கள்."] },
];

const ui = (k) => UI[getLang()]?.[k] ?? UI.en[k];
const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");
const visible = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
// "a, b": try a first, then b (querySelectorAll would return whichever comes first on the page, often the outer box)
const find = (sel) => {
  for (const one of sel.split(",")) { const el = [...document.querySelectorAll(one.trim())].find(visible); if (el) return el; }
  return null;
};

/** Mount the tour button. page: "farm" or "policy". */
export function mountTour(page) {
  const wrap = document.querySelector(".lang-wrap");
  if (!wrap || document.getElementById("tour-btn")) return;
  const btn = h("button", { type: "button", id: "tour-btn", class: "btn-ghost tour-btn", onclick: () => start(page === "policy" ? POLICY : FARM) }, ui("btn"));
  wrap.prepend(btn);
  onLangChange(() => { btn.textContent = ui("btn"); render(); });   // render() does nothing when no tour is open
}

let cur = null;   // { steps, i, spot, card, cleanup }
function start(all) {
  stop();
  const spot = h("div", { class: "tour-spot", "aria-hidden": "true" });
  const card = h("div", { class: "tour-card", role: "dialog", "aria-modal": "false", "aria-live": "polite", tabindex: "-1" });
  // no click-blocking layer: the page stays usable during the tour (close with ×, Done or Escape)
  document.body.append(spot, card);
  const onKey = (e) => {
    if (e.key === "Escape") stop();
    else if (e.key === "ArrowRight") go(1);
    else if (e.key === "ArrowLeft") go(-1);
  };
  const onMove = () => place();
  document.addEventListener("keydown", onKey);
  window.addEventListener("resize", onMove);
  // capture: also hears scrolling inside other scroll boxes, not only the page
  document.addEventListener("scroll", onMove, { passive: true, capture: true });
  // and follow the part on every frame, so folds opening, results redrawing or images loading never leave the
  // highlight behind (place() only touches the DOM when something actually moved)
  let raf = 0;
  const loop = () => { place(); raf = requestAnimationFrame(loop); };
  raf = requestAnimationFrame(loop);
  cur = { steps: all, i: -1, spot, card, last: "", cleanup: () => {
    cancelAnimationFrame(raf);
    document.removeEventListener("keydown", onKey); window.removeEventListener("resize", onMove);
    document.removeEventListener("scroll", onMove, { capture: true });
  } };
  go(1);
}

function stop() {
  if (!cur) return;
  cur.cleanup(); cur.spot.remove(); cur.card.remove(); cur = null;
  document.getElementById("tour-btn")?.focus();
}

// move to the next (dir 1) or previous (dir -1) step whose part is on the page
function go(dir) {
  if (!cur) return;
  let i = cur.i + dir;
  while (i >= 0 && i < cur.steps.length) {
    cur.steps[i].prepare?.();
    if (find(cur.steps[i].sel)) break;
    i += dir;
  }
  if (i < 0) return;
  if (i >= cur.steps.length) { stop(); return; }
  cur.i = i;
  const el = find(cur.steps[i].sel);
  // a part taller than most of the screen is shown from its top; otherwise centred
  show(el);
  render();
}

// bring the step's part into view: a part taller than most of the screen from its top, otherwise centred
function show(el) {
  const tall = el.getBoundingClientRect().height > window.innerHeight * 0.6;
  el.scrollIntoView({ block: tall ? "start" : "center" });
  // the sticky header (desktop) would cover the top of a tall part: scroll back by its height
  const head = document.querySelector(".top");
  if (tall && head && getComputedStyle(head).position === "sticky") window.scrollBy(0, -(head.offsetHeight + 8));
}

function render() {
  if (!cur) return;
  const steps = cur.steps.filter((s) => find(s.sel));   // count only the steps present on this page
  const st = cur.steps[cur.i], [title, text] = st[getLang()] ?? st.en;
  const n = steps.length, idx = steps.indexOf(st) + 1, last = idx === n;
  cur.card.replaceChildren(
    h("div", { class: "tour-top" }, h("span", { class: "tour-count" }, fill(ui("step"), { i: idx, n })),
      h("button", { type: "button", class: "tour-x", "aria-label": ui("close"), title: ui("close"), onclick: () => stop() }, "×")),
    h("h3", { class: "tour-h" }, title),
    h("p", { class: "tour-p" }, text),
    // shown only while the part is scrolled off the screen (place() toggles it)
    h("button", { type: "button", class: "btn-ghost tour-show", hidden: true, onclick: () => { const el = find(cur.steps[cur.i].sel); if (el) show(el); } }, ui("show")),
    h("div", { class: "tour-nav" },
      idx > 1 ? h("button", { type: "button", class: "btn-ghost", onclick: () => go(-1) }, ui("back")) : h("span"),
      h("button", { type: "button", class: "tour-next", onclick: () => go(1) }, last ? ui("done") : ui("next"))));
  cur.last = "";          // force place() to redraw for the new card
  place();
  cur.card.querySelector(".tour-next")?.focus({ preventScroll: true });
}

// Position the highlight over the on-screen part of the element and the card beside it (below if there is room,
// else above, always kept on screen; on a phone, pinned to the bottom). If the part has been scrolled right off the
// screen, the ring is hidden and the card offers "Show me" to scroll back.
function place() {
  if (!cur) return;
  const el = find(cur.steps[cur.i].sel);
  if (!el) return;
  const r = el.getBoundingClientRect(), pad = 6, vw = window.innerWidth, vh = window.innerHeight;
  const c = cur.card, ch = c.offsetHeight || 180;
  const key = [r.top, r.left, r.width, r.height, vw, vh, ch].map(Math.round).join(",");
  if (key === cur.last) return;      // nothing moved since the last frame
  cur.last = key;
  const off = r.bottom < 8 || r.top > vh - 8 || r.width === 0;
  cur.spot.hidden = off;
  const showBtn = c.querySelector(".tour-show");
  if (showBtn) showBtn.hidden = !off;
  // ring only the on-screen part of the element, so a tall section does not push the ring off the screen
  const top = Math.max(r.top - pad, 4), bottom = Math.min(r.bottom + pad, vh - 4);
  if (!off) Object.assign(cur.spot.style, { top: `${top}px`, left: `${Math.max(r.left - pad, 4)}px`,
    width: `${Math.min(r.width + 2 * pad, vw - 8)}px`, height: `${Math.max(bottom - top, 0)}px` });
  if (vw < 640 || off) {
    const w = Math.min(380, vw - 24);
    Object.assign(c.style, vw < 640 ? { left: "12px", right: "12px", top: "auto", bottom: "12px", width: "auto" }
      : { left: `${Math.round((vw - w) / 2)}px`, right: "auto", top: "auto", bottom: "16px", width: `${w}px` });
    return;
  }
  const cw = Math.min(380, vw - 24);
  const below = bottom + 12, above = top - 12 - ch;
  let ctop = below + ch < vh - 8 ? below : above > 8 ? above : vh - ch - 12;
  ctop = Math.min(Math.max(8, ctop), Math.max(8, vh - ch - 8));      // always fully on screen
  const left = Math.min(Math.max(12, r.left), vw - cw - 12);
  Object.assign(c.style, { left: `${left}px`, top: `${ctop}px`, right: "auto", bottom: "auto", width: `${cw}px` });
}
