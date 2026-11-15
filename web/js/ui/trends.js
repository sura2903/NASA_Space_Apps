// B11 "How has my climate changed?" panel. Every number comes from web/data/trends/<id>.json
// (contract §2b). Indicators marked confidence "uncertain" (NASA POWER and GPM IMERG disagree)
// are greyed out and never listed as a finding.
import { h, clear, cssVar, fmt } from "./dom.js";
import { t, getLang } from "../i18n.js";

const charts = [];
const GROUPS = ["heat", "rain", "extremes", "water"];
const isFinding = (ind) => ind.confidence === "clear" || ind.confidence === "likely";

/** Decimals that suit the size of the numbers (0–1 wetness index, small day counts, mm). */
function dec(ind) {
  const m = Math.max(Math.abs(ind.then?.mean ?? 0), Math.abs(ind.now?.mean ?? 0));
  if (ind.unit === "°C") return 1;
  return m < 2 ? 2 : m < 20 ? 1 : 0;
}
const num = (v, d) => fmt(v, d);
const signedNum = (v, d) => (v > 0 ? "+" : v < 0 ? "−" : "") + fmt(Math.abs(v), d);
const pText = (p) => (p < 0.001 ? "< 0.001" : `= ${fmt(p, p < 0.01 ? 3 : 2)}`);

const tOr = (key, fallback) => { const s = t(key); return s === key ? fallback : s; };
export const trendLabel = (id, ind) => tOr(`tr.lbl.${id}`, ind.label);
const unit = (ind) => tOr(`tr.unit.${ind.unit}`, ind.unit);

/** worse | better | neutral, only for real findings. */
function tone(ind) {
  if (!isFinding(ind) || ind.direction === "no clear change" || ind.higher_is_worse == null) return "neutral";
  const up = ind.direction === "rising";
  return up === ind.higher_is_worse ? "worse" : "better";
}

const dirKey = (ind) => (ind.direction === "rising" ? "rising" : ind.direction === "falling" ? "falling" : "none");

function thenNow(ind) {
  const d = dec(ind);
  return t("tr.thennow", {
    a: `${ind.then.years[0]}–${ind.then.years[1]}`, x: num(ind.then.mean, d),
    b: `${ind.now.years[0]}–${ind.now.years[1]}`, y: num(ind.now.mean, d), unit: unit(ind),
  });
}

function sparkline(canvas, ind, colour) {
  if (typeof window.Chart === "undefined" || !canvas) return;
  const years = ind.series.map((p) => p.year);
  const vals = ind.series.map((p) => p.value);
  const mean = (span, m) => years.map((y) => (y >= span[0] && y <= span[1] ? m : null));
  const ink3 = cssVar("--ink-3"), grid = cssVar("--grid");
  const d = dec(ind);
  charts.push(new window.Chart(canvas, {
    type: "line",
    data: {
      labels: years,
      datasets: [
        { label: ind.label, data: vals, borderColor: ink3, borderWidth: 1.25, pointRadius: 0, pointHoverRadius: 3, tension: 0.2 },
        { label: t("tr.avg.then"), data: mean(ind.then.years, ind.then.mean), borderColor: ink3, borderWidth: 2.5, borderDash: [4, 3], pointRadius: 0 },
        { label: t("tr.avg.now"), data: mean(ind.now.years, ind.now.mean), borderColor: colour, borderWidth: 3, pointRadius: 0 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: cssVar("--tip-bg"), titleColor: cssVar("--tip-ink"), bodyColor: cssVar("--tip-ink"), displayColors: false,
          filter: (c) => c.datasetIndex === 0,
          callbacks: { label: (c) => `${num(c.parsed.y, d)} ${unit(ind)}` },
        },
      },
      scales: {
        x: { display: true, ticks: { color: ink3, maxRotation: 0, autoSkip: false, font: { size: 10 },
          callback: (v, i) => (i === 0 || i === years.length - 1 ? years[i] : "") }, grid: { display: false }, border: { color: grid } },
        y: { display: false, grace: "8%" },
      },
    },
  }));
}

function indicatorCard(id, ind) {
  const tn = tone(ind);
  const colour = cssVar(tn === "worse" ? "--warn" : tn === "better" ? "--accent" : "--ink-2");
  const uncertain = ind.confidence === "uncertain";
  const d = dec(ind);
  const canvas = h("canvas", { role: "img", "aria-label": `${trendLabel(id, ind)}, ${ind.series[0].year}–${ind.series.at(-1).year}` });
  const ci = ind.sen_ci95 || [];
  const expert = [
    t("tr.expert", { s: signedNum(ind.sen_per_decade, d), unit: unit(ind), lo: signedNum(ci[0] ?? 0, d), hi: signedNum(ci[1] ?? 0, d), p: pText(ind.mk_p) }),
    ind.change_point && ind.change_point.p < 0.05 ? t("tr.cp", { y: ind.change_point.year }) : "",
  ].join("");
  const im = ind.imerg_check;
  const card = h("article", { class: `trend-card tone-${tn}${uncertain ? " uncertain" : ""}` },
    h("div", { class: "trend-head" },
      h("h4", {}, trendLabel(id, ind)),
      h("span", { class: `trend-chip tone-${tn}` },
        uncertain ? t("tr.chip.uncertain") : t(`tr.dir.${dirKey(ind)}`))),
    h("p", { class: "trend-nums" }, thenNow(ind)),
    h("div", { class: "spark" }, canvas),
    h("p", { class: "note trend-conf" }, t(`tr.conf.${ind.confidence}`)),
    uncertain && im ? h("p", { class: "note" }, t("tr.imerg", {
      a: im.years[0], b: im.years[1], s: signedNum(im.imerg_sen_per_decade, d), p: signedNum(im.power_same_period_sen_per_decade, d), unit: unit(ind),
    })) : null,
    h("p", { class: "note expert-only" }, expert),
  );
  return { card, draw: () => sparkline(canvas, ind, colour) };
}

/**
 * Fill the climate-change panel. `data` is the trends JSON for the site, or null (panel hidden).
 * Returns true when something was drawn.
 */
export function renderTrends(panel, data) {
  charts.splice(0).forEach((c) => c.destroy());
  panel.hidden = !data;
  if (!data) return false;
  const inds = Object.entries(data.indicators || {});
  const findings = inds.filter(([, i]) => isFinding(i) && i.direction !== "no clear change");
  const draws = [];

  const caveats = (data.caveats || []).length
    ? h("div", { class: "trend-caveats" },
        h("p", { class: "trend-caveats-title" }, t("tr.caveats") + (getLang() === "en" ? "" : ` ${t("tr.in.english")}`)),
        h("ul", {}, ...data.caveats.map((c) => h("li", {}, c))))
    : null;

  const groups = GROUPS.map((g) => {
    const list = inds.filter(([, i]) => i.group === g);
    if (!list.length) return null;
    const cards = list.map(([id, i]) => { const c = indicatorCard(id, i); draws.push(c.draw); return c.card; });
    return h("section", { class: "trend-group" }, h("h3", {}, t(`tr.group.${g}`)), h("div", { class: "trend-grid" }, ...cards));
  }).filter(Boolean);

  clear(panel.querySelector("#trend-body")).append(
    h("p", { class: "note" }, t("tr.intro", { a: data.period[0], b: data.period[1], n: data.period[1] - data.period[0] + 1 })),
    h("div", { class: "trend-findings" },
      h("h3", {}, t("tr.findings")),
      findings.length
        ? h("ul", { class: "highlights" }, ...findings.map(([id, i]) => h("li", { class: `tone-${tone(i)}` },
            h("strong", {}, `${trendLabel(id, i)}: ${t(`tr.dir.${dirKey(i)}`).toLowerCase()}. `), thenNow(i),
            i.confidence === "likely" ? ` (${t("tr.conf.likely.short")})` : "")))
        : h("p", { class: "note" }, t("tr.nofindings"))),
    caveats,
    h("details", { class: "trend-all" },
      h("summary", {}, t("tr.all", { n: inds.length, u: inds.filter(([, i]) => i.confidence === "uncertain").length })),
      ...groups),
    h("p", { class: "note expert-only" }, `${t("tr.method")}: ${data.method}`),
  );
  draws.forEach((f) => f());
  return true;
}

export function resizeTrendCharts() { charts.forEach((c) => c.resize()); }
