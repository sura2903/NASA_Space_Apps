// B7 Glossary: plain-language definitions + tooltips on terms found in any text.
import { esc, h } from "./dom.js";
import { getLang } from "../i18n.js";

export const GLOSSARY = {
  et: {
    term: "Evapotranspiration (ET)",
    def: "Water that leaves the field as vapour, from the soil and through crop leaves. Hot, dry, sunny months have high ET, so crops get thirsty faster. We estimate it from NASA POWER temperatures (Hargreaves method).",
    match: /evapotranspiration|\bET0?\b/i,
  },
  water_balance: {
    term: "Water balance",
    def: "Rain minus evapotranspiration for a month. A negative number means the field loses more water than the rain brings, so the crop lives on water stored in the soil or on irrigation.",
    match: /water balance/i,
  },
  ne_monsoon: {
    term: "Northeast monsoon",
    def: "The October to December rains (வடகிழக்கு பருவமழை). It is the main rainy season for most of Tamil Nadu and fills the village tanks, but it changes a lot from year to year.",
    match: /north-?east monsoon/i,
  },
  heavy_rain: {
    term: "Heavy-rain day",
    def: "A day with 64.5 mm of rain or more, the India Meteorological Department's definition of heavy rain. Several in one season can waterlog crops and wash topsoil off bare fields.",
    match: /heavy-rain days?|heavy rain/i,
  },
  green_manure: {
    term: "Green manure",
    def: "A fast-growing plant such as daincha (தக்கைப்பூண்டு) or sunnhemp (சணப்பு), grown for a few weeks and then ploughed into wet soil. It adds organic matter and nitrogen for the next crop and covers the soil.",
    match: /green manure/i,
  },
  msp: {
    term: "Minimum support price (MSP)",
    def: "A price the Government of India announces for some crops each season, at which government agencies will buy. It lowers the risk of a price crash for those crops.",
    match: /minimum support price \(MSP\)|\bMSP\b/,
  },
  ndvi: {
    term: "NDVI (satellite greenness)",
    def: "Normalized Difference Vegetation Index. NASA's MODIS satellite measures how green the land is, from about 0 for bare soil to about 0.8 for a dense crop. Low values in a month suggest fields are bare or dry.",
    match: /\bNDVI\b|greenness/i,
  },
  soil_moisture: {
    term: "Root-zone soil moisture",
    def: "How wet the soil is where roots grow, from 0 (dry) to 1 (soaked). NASA POWER and the SMAP satellite estimate it from space. An anomaly means wetter or drier than normal for that month.",
    match: /soil moisture|soil wetness/i,
  },
  replay: {
    term: "Historical replay",
    def: "We run each crop plan through every real year in the NASA weather record, one at a time. A year counts as 'came through' if no crop ran short of water, had too many very hot days, or was hit by waterlogging rain.",
    match: /replayed|came through/i,
  },
  frost: {
    term: "Frost risk",
    def: "The chance of night temperatures below 0 °C that damage crops. The NASA record shows no frost at these Tamil Nadu sites, so the tool checks heat and water instead.",
    match: /\bfrost\b/i,
  },
  soilgrids: {
    term: "SoilGrids",
    def: "A global soil map (ISRIC, 250 m) built from soil samples and satellite data. It gives texture, organic carbon and pH, but a soil test on your own field is more accurate.",
    match: /SoilGrids/,
  },
  nitrogen_fix: {
    term: "Nitrogen fixing",
    def: "Pulses such as black gram, green gram and cowpea, and green manures, host root bacteria that take nitrogen from the air. The next crop then needs less urea.",
    match: /fix(es)? nitrogen|natural nitrogen/i,
  },
};

// Tamil wording (first draft; to be checked by a native speaker).
const GLOSSARY_TA = {
  et: { term: "ஆவியுயிர்ப்பு (ET)", def: "மண்ணிலிருந்தும் பயிர் இலைகள் வழியாகவும் நீராவியாக வெளியேறும் நீர். வெயில் அதிகமான, வறண்ட மாதங்களில் இது அதிகம், அதனால் பயிர்களுக்கு விரைவில் தாகம் எடுக்கும். நாசா POWER வெப்பநிலையிலிருந்து (ஹார்கிரீவ்ஸ் முறை) கணக்கிடுகிறோம்." },
  water_balance: { term: "நீர் சமநிலை", def: "ஒரு மாதத்தின் மழையிலிருந்து ஆவியுயிர்ப்பைக் கழித்தது. எதிர்மறை என்றால் மழை கொண்டுவருவதை விட வயல் அதிக நீரை இழக்கிறது; பயிர் மண்ணில் சேமித்த நீர் அல்லது பாசனத்தை நம்பி இருக்கும்." },
  ne_monsoon: { term: "வடகிழக்கு பருவமழை", def: "அக்டோபர் முதல் டிசம்பர் வரை பெய்யும் மழை. தமிழ்நாட்டின் பெரும்பகுதிக்கு இதுவே முக்கிய மழைக்காலம்; ஏரி குளங்களை நிரப்புகிறது, ஆனால் ஆண்டுக்கு ஆண்டு பெரிதும் மாறுகிறது." },
  heavy_rain: { term: "கனமழை நாள்", def: "64.5 மி.மீ அல்லது அதற்கு மேல் மழை பெய்யும் நாள் (இந்திய வானிலை ஆய்வுத் துறையின் வரையறை). ஒரு பருவத்தில் பல நாட்கள் இருந்தால் பயிரில் நீர் தேங்கும், வெற்று வயலின் மேல்மண் அரித்துச் செல்லும்." },
  green_manure: { term: "பசுந்தாள் உரம்", def: "தக்கைப்பூண்டு, சணப்பு போன்ற வேகமாக வளரும் செடிகள்; சில வாரங்கள் வளர்த்து ஈரமண்ணில் உழுது சேர்க்கப்படும். அடுத்த பயிருக்கு அங்ககப் பொருளும் நைட்ரஜனும் தரும், மண்ணை மூடி வைக்கும்." },
  msp: { term: "குறைந்தபட்ச ஆதரவு விலை (MSP)", def: "சில பயிர்களுக்கு ஒவ்வொரு பருவத்திலும் இந்திய அரசு அறிவிக்கும் விலை; அந்த விலையில் அரசு நிறுவனங்கள் கொள்முதல் செய்யும். விலை வீழ்ச்சி அபாயத்தைக் குறைக்கும்." },
  ndvi: { term: "NDVI (செயற்கைக்கோள் பசுமை)", def: "நாசாவின் MODIS செயற்கைக்கோள் நிலம் எவ்வளவு பசுமையாக உள்ளது என்பதை அளக்கிறது: வெற்று மண்ணுக்கு சுமார் 0, அடர்ந்த பயிருக்கு சுமார் 0.8. ஒரு மாதத்தில் குறைவாக இருந்தால் வயல்கள் வெற்றாக அல்லது வறண்டு இருக்கலாம்." },
  soil_moisture: { term: "வேர்ப்பகுதி மண் ஈரம்", def: "வேர்கள் வளரும் இடத்தில் மண் எவ்வளவு ஈரமாக உள்ளது: 0 (வறண்டது) முதல் 1 (நனைந்தது) வரை. நாசா POWER மற்றும் SMAP செயற்கைக்கோள் விண்ணிலிருந்து மதிப்பிடுகின்றன." },
  replay: { term: "வரலாற்று மறுஓட்டம்", def: "ஒவ்வொரு பயிர்த் திட்டத்தையும் நாசா வானிலைப் பதிவின் ஒவ்வொரு உண்மையான ஆண்டிலும் சோதிக்கிறோம். எந்தப் பயிருக்கும் நீர்ப் பற்றாக்குறை, அதிக வெப்ப நாட்கள், அல்லது நீர் தேங்கும் கனமழை இல்லாவிட்டால் அந்த ஆண்டு 'தாங்கியது'." },
  frost: { term: "உறைபனி அபாயம்", def: "0 °C-க்குக் கீழ் இரவு வெப்பநிலை பயிர்களைச் சேதப்படுத்தும் வாய்ப்பு. இந்தத் தமிழ்நாட்டு இடங்களில் நாசா பதிவில் உறைபனி இல்லை, அதனால் வெப்பமும் நீரும் மட்டும் சோதிக்கப்படுகின்றன." },
  soilgrids: { term: "SoilGrids", def: "மண் மாதிரிகள், செயற்கைக்கோள் தரவிலிருந்து உருவாக்கிய உலக மண் வரைபடம் (ISRIC, 250 மீ). மண் வகை, அங்கக கரிமம், pH தருகிறது; ஆனால் உங்கள் வயலின் மண் பரிசோதனை துல்லியமானது." },
  nitrogen_fix: { term: "நைட்ரஜன் நிலைநிறுத்தம்", def: "உளுந்து, பாசிப்பயறு, தட்டைப்பயறு போன்ற பயறுகளும் பசுந்தாள் உரங்களும் வேர்களில் உள்ள பாக்டீரியா மூலம் காற்றிலிருந்து நைட்ரஜனை எடுக்கின்றன. அடுத்த பயிருக்கு யூரியா குறைவாகத் தேவைப்படும்." },
};
const entry = (id) => (getLang() === "ta" && GLOSSARY_TA[id] ? GLOSSARY_TA[id] : GLOSSARY[id]);

const IDS = Object.keys(GLOSSARY);

/** "[[et|evapotranspiration]] text" -> HTML with glossary term triggers. */
export const rich = (s) => esc(s).replace(/\[\[(\w+)\|([^\]]+)\]\]/g, (_, id, label) => termHtml(id, label));

/**
 * Escape text and wrap the first match of each glossary term in a tooltip trigger.
 * Returns an HTML string (safe: only our own markup is unescaped).
 */
export function decorate(text, skip = []) {
  let parts = [{ t: String(text ?? ""), term: null }];
  for (const id of IDS) {
    if (skip.includes(id)) continue;
    const re = GLOSSARY[id].match;
    let done = false;
    parts = parts.flatMap((p) => {
      if (done || p.term) return [p];
      const m = re.exec(p.t);
      if (!m) return [p];
      done = true;
      return [
        { t: p.t.slice(0, m.index), term: null },
        { t: m[0], term: id },
        { t: p.t.slice(m.index + m[0].length), term: null },
      ];
    });
  }
  return parts.map((p) => (p.term ? termHtml(p.term, p.t) : esc(p.t))).join("");
}

export const termHtml = (id, label) =>
  `<span class="term" tabindex="0" role="button" aria-describedby="tip" data-term="${id}">${label != null ? label : esc(entry(id).term)}</span>`;

/** A term trigger as a DOM node. */
export function term(id, label) {
  const span = h("span", { class: "term", tabindex: "0", role: "button", "aria-describedby": "tip", "data-term": id }, label ?? entry(id).term);
  return span;
}

/** One floating tooltip for the whole page; hover, focus or tap a .term. */
export function initTooltips() {
  const tip = h("div", { id: "tip", role: "tooltip", class: "tip", hidden: true });
  document.body.append(tip);
  let current = null;
  const show = (el) => {
    const g = GLOSSARY[el.dataset.term] && entry(el.dataset.term);
    if (!g) return;
    current = el;
    tip.innerHTML = `<strong>${esc(g.term)}</strong><span>${esc(g.def)}</span>`;
    tip.hidden = false;
    const r = el.getBoundingClientRect();
    const tw = Math.min(320, window.innerWidth - 24);
    tip.style.width = tw + "px";
    let left = Math.min(Math.max(12, r.left + r.width / 2 - tw / 2), window.innerWidth - tw - 12);
    tip.style.left = left + window.scrollX + "px";
    const below = r.bottom + 8 + tip.offsetHeight < window.innerHeight;
    tip.style.top = (below ? r.bottom + 8 : r.top - tip.offsetHeight - 8) + window.scrollY + "px";
  };
  const hide = () => { tip.hidden = true; current = null; };
  const termOf = (e) => e.target.closest?.(".term");
  document.addEventListener("mouseover", (e) => { const t = termOf(e); if (t) show(t); });
  document.addEventListener("mouseout", (e) => { if (termOf(e)) hide(); });
  document.addEventListener("focusin", (e) => { const t = termOf(e); if (t) show(t); });
  document.addEventListener("focusout", (e) => { if (termOf(e)) hide(); });
  document.addEventListener("click", (e) => {
    const t = termOf(e);
    if (t) { e.preventDefault(); current === t && !tip.hidden ? hide() : show(t); }
    else if (!e.target.closest(".tip")) hide();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") hide(); });
  window.addEventListener("scroll", hide, { passive: true });
}

/** Full glossary list for the bottom of the page. */
export function renderGlossaryList(el) {
  el.innerHTML = IDS.map((id) => `<div class="gloss-item" id="g-${id}"><dt>${esc(entry(id).term)}</dt><dd>${esc(entry(id).def)}</dd></div>`).join("");
}
