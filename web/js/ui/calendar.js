// B4 Field Calendar: a 12-month ribbon per rotation year (crop / green manure / bare)
// drawn under climate stress bands from the site's monthly averages.
import { MONTHS, cropLabel } from "../scoring.js";
import { h, fmt } from "./dom.js";

const shortName = (c) => c.name.replace(/\s*\(.*?\)\s*/g, " ").replace(/\s+/g, " ").trim();

const BANDS = [
  { key: "rain", label: "Rain", value: (m) => m.precip_mm, tip: (m) => `${fmt(m.precip_mm)} mm rain (average)` },
  { key: "dry", label: "Dry", value: (m) => Math.max(0, -m.water_balance_mm), tip: (m) => m.water_balance_mm < 0 ? `water balance ${fmt(m.water_balance_mm)} mm (rain falls short of evapotranspiration)` : `water balance +${fmt(m.water_balance_mm)} mm (rain exceeds evapotranspiration)` },
  { key: "heat", label: "Heat", value: (m) => m.heat_days, tip: (m, site) => `${fmt(m.heat_days, 1)} days above ${site.heat_threshold_c ?? 38} °C (average)` },
  { key: "heavy", label: "Downpour", value: (m) => m.heavy_rain_days ?? 0, tip: (m) => `${fmt(m.heavy_rain_days ?? 0, 1)} heavy-rain days (average)` },
];

/** Build the calendar block for one strategy. Returns { el, highlight(months[]) }. */
export function fieldCalendar(strategy, site, cropById) {
  const grid = h("div", { class: "cal-grid", role: "table", "aria-label": "Field calendar: what is in the field each month" });

  // month header
  const at = (row, col, span = 1) => ({ gridRow: row, gridColumn: span > 1 ? `${col} / span ${span}` : col });
  grid.append(h("div", { class: "cal-lab", role: "rowheader", style: at(1, 1) }, ""));
  MONTHS.forEach((m, i) => grid.append(h("div", { class: "cal-mon", "data-m": i + 1, role: "columnheader", style: at(1, i + 2) }, m[0], h("span", { class: "sr" }, m.slice(1)))));

  // stress bands (observed 2001–2024 averages)
  BANDS.forEach((b, bi) => {
    const vals = site.monthly.map(b.value);
    const max = Math.max(...vals);
    grid.append(h("div", { class: "cal-lab band-lab", role: "rowheader", style: at(2 + bi, 1) }, b.label));
    site.monthly.forEach((m, i) => {
      const v = max > 0 ? vals[i] / max : 0;
      grid.append(h("div", {
        class: `cal-band band-${b.key}`, "data-m": i + 1, role: "cell",
        style: { "--v": v.toFixed(2), ...at(2 + bi, i + 2) }, title: `${MONTHS[i]}: ${b.tip(m, site)}`,
      }));
    });
  });

  // ribbon rows
  strategy.calendar.forEach((row, yi) => {
    grid.append(h("div", { class: "cal-lab", role: "rowheader", style: at(2 + BANDS.length + yi, 1) }, strategy.calendar.length > 1 ? `Year ${yi + 1}` : "Field"));
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
      const name = crop ? shortName(crop) : "Bare";
      const tip = `${MONTHS[s.start]}${s.len > 1 ? "–" + MONTHS[s.start + s.len - 1] : ""}: ` +
        (crop ? cropLabel(crop) + (s.cell.state === "cover" ? " (green manure, ploughed in)" : "") : "bare soil");
      grid.append(h("div", {
        class: `cal-span st-${s.cell.state}`, role: "cell",
        style: at(2 + BANDS.length + yi, s.start + 2, s.len),
        "data-months": months.join(","), title: tip,
      }, h("span", {}, name)));
    }
  });

  const legend = h("div", { class: "cal-legend" },
    h("span", { class: "key st-crop" }, "Crop"),
    h("span", { class: "key st-cover" }, "Green manure"),
    h("span", { class: "key st-bare" }, "Bare soil"),
    h("span", { class: "key-note" }, "Bands: darker = more, from NASA POWER " + `${site.period?.start}–${site.period?.end}` + " averages"));

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
