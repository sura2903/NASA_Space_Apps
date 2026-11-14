// B3 Site charts (Chart.js from CDN). Every value comes from the site JSON.
import { MONTHS } from "../scoring.js";
import { cssVar, fmt } from "./dom.js";

const charts = {};
const ok = () => typeof window.Chart !== "undefined";

function base(title) {
  const ink = cssVar("--ink-2"), grid = cssVar("--grid");
  return {
    responsive: true, maintainAspectRatio: false, animation: { duration: 250 },
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { labels: { color: ink, boxWidth: 12, boxHeight: 12, useBorderRadius: true, borderRadius: 2 } },
      tooltip: { backgroundColor: cssVar("--tip-bg"), titleColor: cssVar("--tip-ink"), bodyColor: cssVar("--tip-ink"), padding: 10 },
      title: { display: false, text: title },
    },
    scales: {
      x: { ticks: { color: ink }, grid: { display: false }, border: { color: grid } },
      y: { ticks: { color: ink }, grid: { color: grid }, border: { display: false }, beginAtZero: true },
    },
  };
}

function draw(key, canvas, config) {
  charts[key]?.destroy();
  if (!ok() || !canvas) return;
  charts[key] = new window.Chart(canvas, config);
}

/** Monthly average rain (bars) vs evapotranspiration (line), same mm axis. */
export function drawMonthlyChart(canvas, site, highlightMonths = []) {
  const rain = site.monthly.map((m) => m.precip_mm);
  const et = site.monthly.map((m) => m.et0_mm ?? (m.precip_mm - m.water_balance_mm));
  const blue = cssVar("--rain"), blueSoft = cssVar("--rain-soft"), orange = cssVar("--et");
  const hl = new Set(highlightMonths);
  const opts = base("Monthly rain vs evapotranspiration");
  opts.scales.y.title = { display: true, text: "mm per month", color: cssVar("--ink-2") };
  opts.plugins.tooltip.callbacks = { label: (c) => `${c.dataset.label}: ${fmt(c.parsed.y)} mm` };
  draw("monthly", canvas, {
    type: "bar",
    data: {
      labels: MONTHS,
      datasets: [
        { type: "bar", label: "Rain (average)", data: rain, borderRadius: 4, borderSkipped: "bottom",
          backgroundColor: MONTHS.map((_, i) => (hl.size && !hl.has(i + 1) ? blueSoft : blue)), order: 2 },
        { type: "line", label: "Evapotranspiration (crop thirst)", data: et, borderColor: orange, backgroundColor: orange,
          borderWidth: 2, pointRadius: 3, pointHoverRadius: 5, tension: 0.3, order: 1 },
      ],
    },
    options: opts,
  });
}

/** Northeast monsoon (Oct–Dec) total per year, with the period average and IMD "deficient" years marked. */
export function monsoonSeries(site) {
  const years = (site.by_year || []).map((y) => ({ year: y.year, v: y.months.slice(9, 12).reduce((s, m) => s + (m.precip_mm ?? 0), 0) }));
  const avg = years.length ? years.reduce((s, y) => s + y.v, 0) / years.length : 0;
  // IMD categories: "deficient" is 20-59% below normal, "large deficient" 60% or more below.
  return { years, avg, deficient: years.filter((y) => y.v < avg * 0.8) };
}

export function drawMonsoonChart(canvas, site) {
  const { years, avg } = monsoonSeries(site);
  const blue = cssVar("--rain"), warn = cssVar("--et"), ink = cssVar("--ink-2");
  const opts = base("Northeast monsoon by year");
  opts.interaction = { mode: "nearest", intersect: false, axis: "x" };
  opts.scales.y.title = { display: true, text: "mm, Oct–Dec", color: ink };
  opts.scales.x.ticks.maxRotation = 0;
  opts.scales.x.ticks.autoSkip = true;
  opts.plugins.legend.labels.filter = (item) => item.text !== "_";
  opts.plugins.tooltip.callbacks = {
    label: (c) => (c.datasetIndex === 0
      ? `Oct–Dec rain: ${fmt(c.parsed.y)} mm (${fmt((100 * c.parsed.y) / avg)}% of average)`
      : `Average: ${fmt(avg)} mm`),
  };
  draw("monsoon", canvas, {
    type: "bar",
    data: {
      labels: years.map((y) => y.year),
      datasets: [
        { label: "Oct–Dec rain (orange = 20%+ below average, IMD 'deficient')", data: years.map((y) => y.v), borderRadius: 3, borderSkipped: "bottom",
          backgroundColor: years.map((y) => (y.v < avg * 0.8 ? warn : blue)), order: 2 },
        { type: "line", label: `Average ${fmt(avg)} mm`, data: years.map(() => avg), borderColor: ink, borderDash: [5, 4],
          borderWidth: 1.5, pointRadius: 0, pointHoverRadius: 0, order: 1 },
      ],
    },
    options: opts,
  });
}

/** Satellite greenness (MODIS NDVI) monthly median; expert view only. */
export function drawNdviChart(canvas, site) {
  const nd = site.ndvi;
  if (!nd?.monthly_median) { charts.ndvi?.destroy(); return false; }
  const green = cssVar("--crop");
  const opts = base("NDVI");
  opts.scales.y.beginAtZero = false;
  opts.scales.y.title = { display: true, text: "NDVI (0 bare → 1 dense)", color: cssVar("--ink-2") };
  opts.plugins.legend.display = false;
  opts.plugins.tooltip.callbacks = { label: (c) => `NDVI ${fmt(c.parsed.y, 2)}` };
  draw("ndvi", canvas, {
    type: "line",
    data: { labels: MONTHS, datasets: [{ label: "NDVI", data: nd.monthly_median, borderColor: green, backgroundColor: green, borderWidth: 2, pointRadius: 3, tension: 0.3 }] },
    options: opts,
  });
  return true;
}

export function resizeCharts() { Object.values(charts).forEach((c) => c?.resize()); }
