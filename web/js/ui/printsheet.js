// B8 Printable "take this to your agriculture officer" sheet. Shown only in print.
import { MONTHS, PRIORITIES, WATER_SOURCES, cropLabel } from "../scoring.js";
import { h, clear, fmt, signed } from "./dom.js";
import { orderedSlots } from "./cards.js";

const LEVEL_WORDS = ["not important", "a little", "somewhat", "important", "very important", "top priority"];

const rotText = (rotation, cropById) => rotation.map((yr, yi) =>
  (rotation.length > 1 ? `Year ${yi + 1}: ` : "") +
  orderedSlots(yr).map((s) => `${cropById[s.crop] ? cropLabel(cropById[s.crop]) : s.crop} (sown ${MONTHS[s.sow - 1]})`).join(" → ")).join("; ");

export function renderPrintSheet(el, { site, strategies, prefs, cropById, highlights }) {
  clear(el);
  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const cur = strategies[0];
  const curIds = new Set(cur.rotation.flat().map((s) => s.crop));
  const newCrops = [...new Set(strategies.slice(1).flatMap((s) => s.rotation.flat().map((x) => x.crop)))]
    .filter((id) => !curIds.has(id) && cropById[id]);

  const checklist = [
    ...new Set([
      ...newCrops.map((id) => `Is ${cropLabel(cropById[id])} suited to my soil and village? Good seed variety and sowing window?`),
      ...strategies.flatMap((s) => s.issues),
      ...strategies.flatMap((s) => s.gaps),
    ]),
  ];
  const sc = prefs.scenario;

  el.append(
    h("header", {},
      h("h1", {}, "Field Shift: crop plan notes for my agriculture officer"),
      h("p", {}, `${site.name} · ${fmt(site.lat, 2)}°N, ${fmt(site.lon, 2)}°E · printed ${today}`)),
    h("section", {},
      h("h2", {}, "My farm today"),
      h("p", {}, h("strong", {}, "What I grow: "), rotText(cur.rotation, cropById)),
      h("p", {}, h("strong", {}, "Water source: "), WATER_SOURCES[prefs.water_source]?.label ?? prefs.water_source),
      h("p", {}, h("strong", {}, "What matters to me: "),
        Object.entries(PRIORITIES).map(([k, l]) => `${l}: ${LEVEL_WORDS[prefs.weights[k]] ?? prefs.weights[k]}`).join(" · ")),
      sc.dT_c || sc.dPrecip_pct
        ? h("p", {}, h("strong", {}, "Climate what-if used: "), `${signed(sc.dT_c, 1)} °C, ${signed(sc.dPrecip_pct)}% rain (illustration, not a forecast)`)
        : null),
    h("section", {},
      h("h2", {}, "What the NASA data says about this place"),
      h("ul", {}, highlights.map((t) => h("li", {}, t)))),
    h("section", {},
      h("h2", {}, "Three options compared"),
      h("table", {},
        h("thead", {}, h("tr", {}, ["Option", "Crops", "Fit (0–100)", "Came through", "Water need / irrigation", "Hardest years"].map((t) => h("th", {}, t)))),
        h("tbody", {}, strategies.map((s) => h("tr", {},
          h("td", {}, s.tag),
          h("td", {}, rotText(s.rotation, cropById)),
          h("td", {}, fmt(s.total)),
          h("td", {}, `${s.replay.good_years} of ${s.replay.total_years} years`),
          h("td", {}, `${fmt(s.water_use.need_mm)} mm / ${fmt(s.water_use.irrigation_mm)} mm`),
          h("td", {}, s.replay.worst.map((w) => w.year).join(", ") || "–")))))),
    ...strategies.map((s) => h("section", { class: "ps-strat" },
      h("h3", {}, `${s.tag}: ${rotText(s.rotation, cropById)}`),
      h("div", { class: "ps-cols" },
        h("div", {}, h("h4", {}, "Why"), h("ul", {}, s.why.slice(0, 3).map((t) => h("li", {}, t)))),
        h("div", {}, h("h4", {}, "Benefits"), h("ul", {}, s.benefits.slice(0, 3).map((t) => h("li", {}, t)))),
        h("div", {}, h("h4", {}, "Risks"), h("ul", {}, s.risks.slice(0, 4).map((t) => h("li", {}, t))))))),
    h("section", {},
      h("h2", {}, "Please help me check (the data cannot tell us these)"),
      h("ul", { class: "checklist" }, checklist.map((t) => h("li", {}, t)))),
    h("section", { class: "ps-notes" },
      h("h2", {}, "Officer's notes"),
      Array.from({ length: 5 }, () => h("div", { class: "line" }))),
    h("footer", {},
      h("p", {}, `Data: ${site.source} ${site.period?.start}–${site.period?.end}; soil: ${site.soil?.source ?? "n/a"}` +
        (site.ndvi?.source ? `; greenness: ${site.ndvi.source}` : "") +
        ". Weather data describes the region, not this exact field. Scores are simple, explainable rules, not a prediction."),
      h("p", {}, "Field Shift supports your judgment and local advice; it does not replace them.")),
  );
}
