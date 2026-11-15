// B8 Printable "take this to your agriculture officer" sheet. Shown only in print.
import { PRIORITIES, EXTRA_PRIORITIES, WATER_SOURCES } from "../scoring.js";
import { h, clear, fmt, signed } from "./dom.js";
import { orderedSlots } from "./cards.js";
import { t, cropName, monthName, prioLabel, waterLabel, siteName, tagLabel, translateEngine, fmtDate } from "../i18n.js";

const rotText = (rotation, cropById) => rotation.map((yr, yi) =>
  (rotation.length > 1 ? t("card.year", { n: yi + 1 }) + ": " : "") +
  orderedSlots(yr).map((s) => `${cropById[s.crop] ? cropName(cropById[s.crop]) : s.crop} (${t("ps.sown", { m: monthName(s.sow) })})`).join(" → ")).join("; ");

export function renderPrintSheet(el, { site, strategies, prefs, cropById, highlights }) {
  clear(el);
  const cur = strategies[0];
  const curIds = new Set(cur.rotation.flat().map((s) => s.crop));
  const newCrops = [...new Set(strategies.slice(1).flatMap((s) => s.rotation.flat().map((x) => x.crop)))]
    .filter((id) => !curIds.has(id) && cropById[id]);
  const tr = (x) => translateEngine(x, PRIORITIES);

  const checklist = [...new Set([
    ...newCrops.map((id) => t("ps.newcrop", { crop: cropName(cropById[id]) })),
    ...strategies.flatMap((s) => s.issues),
    ...strategies.flatMap((s) => s.gaps),
  ])];
  const sc = prefs.scenario;
  const levels = t("ps.levels");

  el.append(
    h("header", {},
      h("h1", {}, t("ps.title")),
      h("p", {}, `${siteName(site)} · ${fmt(site.lat, 2)}°N, ${fmt(site.lon, 2)}°E · ${t("ps.printed", { date: fmtDate(new Date()) })}`)),
    h("section", {},
      h("h2", {}, t("ps.farm")),
      h("p", {}, h("strong", {}, t("ps.grow")), rotText(cur.rotation, cropById)),
      h("p", {}, h("strong", {}, t("ps.water")), waterLabel(prefs.water_source, WATER_SOURCES[prefs.water_source]?.label ?? prefs.water_source)),
      h("p", {}, h("strong", {}, t("ps.matters")),
        Object.entries({ ...PRIORITIES, ...EXTRA_PRIORITIES }).map(([k, l]) => `${prioLabel(k, l)}: ${levels[prefs.weights[k] ?? 0] ?? prefs.weights[k]}`).join(" · ")),
      sc.dT_c || sc.dPrecip_pct
        ? h("p", {}, h("strong", {}, t("ps.whatif")), t("ps.whatif.val", { dT: signed(sc.dT_c, 1), dP: signed(sc.dPrecip_pct) }))
        : null),
    h("section", {},
      h("h2", {}, t("ps.says")),
      h("ul", {}, highlights.map((x) => h("li", {}, x)))),
    h("section", {},
      h("h2", {}, t("ps.compared")),
      h("table", {},
        h("thead", {}, h("tr", {}, t("ps.cols").map((x) => h("th", {}, x)))),
        h("tbody", {}, strategies.map((s) => h("tr", {},
          h("td", {}, tagLabel(s.tag)),
          h("td", {}, rotText(s.rotation, cropById)),
          h("td", {}, fmt(s.total)),
          h("td", {}, t("ps.years", { good: s.replay.good_years, total: s.replay.total_years })),
          h("td", {}, `${fmt(s.water_use.need_mm)} mm / ${fmt(s.water_use.irrigation_mm)} mm`),
          h("td", {}, s.replay.worst.map((w) => w.year).join(", ") || "–")))))),
    ...strategies.map((s) => h("section", { class: "ps-strat" },
      h("h3", {}, `${tagLabel(s.tag)}: ${rotText(s.rotation, cropById)}`),
      h("div", { class: "ps-cols" },
        h("div", {}, h("h4", {}, t("ps.why")), h("ul", {}, s.why.slice(0, 3).map((x) => h("li", {}, tr(x))))),
        h("div", {}, h("h4", {}, t("ps.benefits")), h("ul", {}, s.benefits.slice(0, 3).map((x) => h("li", {}, x)))),
        h("div", {}, h("h4", {}, t("ps.risks")), h("ul", {}, s.risks.slice(0, 4).map((x) => h("li", {}, x))))))),
    h("section", {},
      h("h2", {}, t("ps.check")),
      h("ul", { class: "checklist" }, checklist.map((x) => h("li", {}, x)))),
    h("section", { class: "ps-notes" },
      h("h2", {}, t("ps.notes")),
      Array.from({ length: 5 }, () => h("div", { class: "line" }))),
    h("footer", {},
      h("p", {}, t("ps.data", {
        start: site.period?.start, end: site.period?.end,
        rain: site.precip_source ? `${site.precip_source}; ` : "", weather: site.source,
        soil: site.soil?.source ?? "n/a", ndvi: site.ndvi?.source ? `; ${site.ndvi.source}` : "",
      })),
      h("p", {}, t("ps.support"))),
  );
}
