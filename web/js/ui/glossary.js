// B7 Glossary: plain-language definitions + tooltips on terms found in any text.
import { esc, h } from "./dom.js";

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

const IDS = Object.keys(GLOSSARY);

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
  `<span class="term" tabindex="0" role="button" aria-describedby="tip" data-term="${id}">${esc(label ?? GLOSSARY[id].term)}</span>`;

/** A term trigger as a DOM node. */
export function term(id, label) {
  const span = h("span", { class: "term", tabindex: "0", role: "button", "aria-describedby": "tip", "data-term": id }, label ?? GLOSSARY[id].term);
  return span;
}

/** One floating tooltip for the whole page; hover, focus or tap a .term. */
export function initTooltips() {
  const tip = h("div", { id: "tip", role: "tooltip", class: "tip", hidden: true });
  document.body.append(tip);
  let current = null;
  const show = (el) => {
    const g = GLOSSARY[el.dataset.term];
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
  el.innerHTML = IDS.map((id) => `<div class="gloss-item" id="g-${id}"><dt>${esc(GLOSSARY[id].term)}</dt><dd>${esc(GLOSSARY[id].def)}</dd></div>`).join("");
}
