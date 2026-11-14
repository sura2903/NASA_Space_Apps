// B4 Field Calendar: a 12-month ribbon per rotation year (crop / green manure / bare)
// drawn under climate stress bands. Bands use the same scenario-adjusted monthly climate
// the scores use (scoring.js scenarioMonthly), so they move with the climate sliders.
import { h, fmt } from "./dom.js";
import { t, cropName, cropShort, monthName, monthInitial } from "../i18n.js";

const BANDS = [
  { key: "rain", value: (m) => m.precip_mm, tip: (m) => t("tip.rain", { x: fmt(m.precip_mm) }) },
  { key: "dry", value: (m) => Math.max(0, -m.water_balance_mm),
    tip: (m) => (m.water_balance_mm < 0 ? t("tip.dry.neg", { x: fmt(m.water_balance_mm) }) : t("tip.dry.pos", { x: fmt(m.water_balance_mm) })) },
  { key: "heat", value: (m) => m.heat_days, tip: (m, site) => t("tip.heat", { x: fmt(m.heat_days, 1), t: site.heat_threshold_c ?? 38 }) },
  { key: "heavy", value: (m) => m.heavy_rain_days ?? 0, tip: (m) => t("tip.heavy", { x: fmt(m.heavy_rain_days ?? 0, 1) }) },
];

/**
 * Build the calendar block for one strategy. Returns { el, highlight(months[]) }.
 * monthly: 12 adjusted months (scenarioMonthly); falls back to site.monthly.
 */
export function fieldCalendar(strategy, site, cropById, { monthly, scenarioOn = false } = {}) {
  const clim = monthly?.length === 12 ? monthly : site.monthly;
  const grid = h("div", { class: "cal-grid", role: "table", "aria-label": t("cal.aria") });
  const at = (row, col, span = 1) => ({ gridRow: row, gridColumn: span > 1 ? `${col} / span ${span}` : col });

  // month header
  grid.append(h("div", { class: "cal-lab", role: "rowheader", style: at(1, 1) }, ""));
  for (let m = 1; m <= 12; m++) {
    grid.append(h("div", { class: "cal-mon", "data-m": m, role: "columnheader", style: at(1, m + 1), title: monthName(m) },
      monthInitial(m), h("span", { class: "sr" }, monthName(m))));
  }

  // stress bands
  BANDS.forEach((b, bi) => {
    const vals = clim.map(b.value);
    const max = Math.max(...vals);
    grid.append(h("div", { class: "cal-lab band-lab", role: "rowheader", style: at(2 + bi, 1) }, t(`band.${b.key}`)));
    clim.forEach((m, i) => {
      const v = max > 0 ? vals[i] / max : 0;
      grid.append(h("div", {
        class: `cal-band band-${b.key}`, "data-m": i + 1, role: "cell",
        style: { "--v": v.toFixed(2), ...at(2 + bi, i + 2) }, title: `${monthName(i + 1)}: ${b.tip(m, site)}`,
      }));
    });
  });

  // ribbon rows
  strategy.calendar.forEach((row, yi) => {
    grid.append(h("div", { class: "cal-lab", role: "rowheader", style: at(2 + BANDS.length + yi, 1) },
      strategy.calendar.length > 1 ? t("card.year", { n: yi + 1 }) : t("cal.field")));
    const spans = [];
    let i = 0;
    while (i < 12) {
      const c = row[i];
      let j = i + 1;
      while (j < 12 && row[j].state === c.state && row[j].crop === c.crop) j++;
      spans.push({ start: i, len: j - i, cell: c });
      i = j;
    }
    for (const s of spans) {
      const crop = s.cell.crop ? cropById[s.cell.crop] : null;
      const months = Array.from({ length: s.len }, (_, k) => s.start + k + 1);
      const tip = `${monthName(s.start + 1)}${s.len > 1 ? "–" + monthName(s.start + s.len) : ""}: ` +
        (crop ? cropName(crop) + (s.cell.state === "cover" ? t("cal.gm.tip") : "") : t("cal.bare.tip"));
      grid.append(h("div", {
        class: `cal-span st-${s.cell.state}`, role: "cell",
        style: at(2 + BANDS.length + yi, s.start + 2, s.len),
        "data-months": months.join(","), title: tip,
      }, h("span", {}, crop ? cropShort(crop) : t("cal.bare"))));
    }
  });

  const legend = h("div", { class: "cal-legend" },
    h("span", { class: "key st-crop" }, t("cal.key.crop")),
    h("span", { class: "key st-cover" }, t("cal.key.cover")),
    h("span", { class: "key st-bare" }, t("cal.key.bare")),
    h("span", { class: "key-note" },
      t("cal.note", { start: site.period?.start, end: site.period?.end, sc: scenarioOn ? t("cal.note.sc") : "" }) +
      (/IMERG/.test(site.precip_source || "") ? t("cal.note.imerg") : t("cal.note.power"))));

  const el = h("div", { class: "cal" }, grid, legend);
  return {
    el,
    highlight(months) {
      const set = new Set(months || []);
      el.classList.toggle("has-hl", set.size > 0);
      el.querySelectorAll("[data-m]").forEach((c) => c.classList.toggle("hl", set.has(Number(c.dataset.m))));
      el.querySelectorAll(".cal-span").forEach((c) => c.classList.toggle("hl", c.dataset.months.split(",").some((m) => set.has(Number(m)))));
    },
  };
}
