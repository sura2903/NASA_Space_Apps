// I16 "Sow now or wait" + I17 dry-spell risk (main page, farmers).
// Every number comes from the site / trends JSON or from the engine's scoreRotation replay.
//
// Data used when present (requested from Lane A in docs/PROGRESS.md, not in the contract yet):
//   site.dry_spells = { threshold_mm: 2.5, window_days: 30, by_sow_month: { "10": { years, ge10, ge15 } } }
//     (or by_year[].months[].max_dry_spell_days, longest run of dry days inside that month)
//   site.ne_onset = { years: [{ year, doy }], method }   northeast-monsoon onset day per year
//   site.smap_recent = { date, root_zone, surface, anomaly }   latest SMAP reading for the place
// Without them: replay per sowing month, the usual soil wetness for the month, and the NE-monsoon
// dry-spell series from trends/<id>.json (one season, not per month).
import { h, clear, fmt } from "./dom.js";
import { t, monthName, cropName } from "../i18n.js";
import { scoreRotation } from "../scoring.js";

const DRY_DAYS = 10;                       // "a 10+ day dry spell" (the farmer question)
const NE_MONTHS = [10, 11, 12];
const ahead = (from, to) => (to - from + 12) % 12;   // months from `from` forward to `to`

function replayAt(site, crops, cropId, sow, prefs) {
  const st = scoreRotation(site, crops, [[{ crop: cropId, sow }]], prefs, { skipText: true });
  return { sow, good: st.replay.good_years, total: st.replay.total_years, share: st.replay.total_years ? st.replay.good_years / st.replay.total_years : 0 };
}

/** Share of years with a dry spell of `days`+ in the sowing month or the month after. null if no data. */
function monthDryRisk(site, sow, days = DRY_DAYS) {
  // preferred: Lane A's "10+ days < 2.5 mm within 30 days after sowing" counts per sowing month
  const pre = site.dry_spells?.by_sow_month?.[sow];
  if (pre?.years) return { hit: pre[`ge${days}`] ?? pre.ge10, n: pre.years };
  const yrs = (site.by_year || []).filter((y) => y.months?.[sow - 1]?.max_dry_spell_days != null);
  if (!yrs.length) return null;
  const nxt = sow % 12;   // index of the following month
  const hit = yrs.filter((y) => Math.max(y.months[sow - 1].max_dry_spell_days ?? 0, y.months[nxt]?.max_dry_spell_days ?? 0) >= days).length;
  return { hit, n: yrs.length };
}

/** NE-monsoon season fallback from trends.indicators.ne_dry_spell, same years as the replay. */
function neDrySpells(site, trends) {
  const ser = trends?.indicators?.ne_dry_spell?.series;
  if (!ser?.length) return null;
  const y0 = site.by_year?.[0]?.year ?? ser[0].year;
  const s = ser.filter((p) => p.year >= y0 && p.value != null);
  if (!s.length) return null;
  const at = (d) => s.filter((p) => p.value >= d).length;
  return { n: s.length, from: s[0].year, to: s.at(-1).year, d10: at(10), d15: at(15), d20: at(20), longest: Math.max(...s.map((p) => p.value)) };
}

/** The rotation slot whose sowing month is closest to this month (either side): what the farmer sows next or just sowed. */
export function defaultSowing(rotation, now = new Date().getMonth() + 1) {
  const slots = rotation.flat();
  if (!slots.length) return null;
  const dist = (m) => Math.min(ahead(now, m), ahead(m, now));
  return [...slots].sort((a, b) => dist(a.sow) - dist(b.sow))[0];
}

export function renderSowing(el, { site, trends, crops, cropById, prefs, rotation, choice, onChange }) {
  clear(el);
  const now = new Date().getMonth() + 1;
  const pick = choice ?? (() => { const d = defaultSowing(rotation, now); return d ? { crop: d.crop, month: d.sow } : null; })();
  if (!pick || !cropById[pick.crop]) return;
  const crop = cropById[pick.crop];
  const planned = pick.month;

  // controls: crop (rotation crops first) + planned month
  const inRot = [...new Set(rotation.flat().map((s) => s.crop))];
  const order = [...inRot, ...crops.filter((c) => c.type !== "green_manure" && !inRot.includes(c.id)).map((c) => c.id)];
  const cropSel = h("select", { id: "sow-crop", onchange: (e) => onChange({ crop: e.target.value, month: planned }) },
    ...order.map((id) => h("option", { value: id, selected: id === crop.id }, cropName(cropById[id]))));
  const monthSel = h("select", { id: "sow-month", onchange: (e) => onChange({ crop: crop.id, month: +e.target.value }) },
    ...Array.from({ length: 12 }, (_, i) => h("option", { value: i + 1, selected: i + 1 === planned },
      monthName(i + 1) + (i + 1 === now ? ` (${t("sow.thismonth")})` : ""))));

  // replay at every allowed sowing month
  const rows = crop.sow_months.map((m) => replayAt(site, crops, crop.id, m, prefs)).sort((a, b) => ahead(now, a.sow) - ahead(now, b.sow));
  const best = rows.reduce((a, b) => (b.good > a.good ? b : a), rows[0]);
  const plannedRow = rows.find((r) => r.sow === planned) ?? null;

  let verdict, tone;
  if (!plannedRow) {
    const next = rows.slice().sort((a, b) => ahead(planned, a.sow) - ahead(planned, b.sow))[0];
    tone = "warn";
    verdict = t(next.sow === best.sow ? "sow.v.notusual.best" : "sow.v.notusual", { crop: cropName(crop), m: monthName(planned), next: monthName(next.sow), a: next.good, n: next.total, best: monthName(best.sow), b: best.good });
  } else if (plannedRow.good >= best.good - Math.max(1, Math.round(0.1 * best.total)) || plannedRow.share >= 0.9) {
    tone = plannedRow.share >= 0.6 ? "go" : "warn";
    verdict = t(tone === "go" ? "sow.v.now" : "sow.v.now.low", { m: monthName(planned), a: plannedRow.good, n: plannedRow.total });
  } else if (ahead(planned, best.sow) >= 1 && ahead(planned, best.sow) <= 3) {
    tone = "wait";
    verdict = t("sow.v.wait", { best: monthName(best.sow), b: best.good, m: monthName(planned), a: plannedRow.good, n: plannedRow.total });
  } else {
    tone = "warn";
    verdict = t("sow.v.late", { m: monthName(planned), a: plannedRow.good, n: plannedRow.total, best: monthName(best.sow), b: best.good });
  }

  // dry-spell risk per sowing month (needs max_dry_spell_days) or the NE-season fallback
  const perMonth = rows.map((r) => ({ ...r, dry: monthDryRisk(site, r.sow) }));
  const hasMonthly = perMonth.some((r) => r.dry);
  const ne = hasMonthly ? null : neDrySpells(site, trends);

  // shorter crop of the same family that can go in now or next month (the "nudge")
  const share = plannedRow ? plannedRow.share : 0;
  const neRisky = ne && NE_MONTHS.includes(planned) && ne.d20 / ne.n >= 0.25;
  const plannedDry = perMonth.find((r) => r.sow === planned)?.dry;
  const dryRisky = plannedDry ? plannedDry.hit / plannedDry.n >= 1 / 3 : neRisky;
  let nudge = null;
  if (share < 0.75 || dryRisky) {
    const alts = crops.filter((c) => c.pest_family === crop.pest_family && c.id !== crop.id && c.duration_days < crop.duration_days)
      .flatMap((c) => c.sow_months.filter((m) => ahead(planned, m) <= 1).map((m) => ({ c, r: replayAt(site, crops, c.id, m, prefs) })))
      .filter((x) => x.r.good > (plannedRow?.good ?? -1))
      .sort((a, b) => b.r.good - a.r.good);
    if (alts[0]) nudge = t("sow.nudge", { alt: cropName(alts[0].c), m: monthName(alts[0].r.sow), a: alts[0].r.good, n: alts[0].r.total, d: alts[0].c.duration_days, d0: crop.duration_days });
    else if (share < 0.6) {
      // no shorter variety helps: the hardiest other crop that can be sown now or next month
      const other = crops.filter((c) => c.type !== "green_manure" && c.id !== crop.id)
        .flatMap((c) => c.sow_months.filter((m) => ahead(planned, m) <= 1).map((m) => ({ c, r: replayAt(site, crops, c.id, m, prefs) })))
        .sort((a, b) => b.r.good - a.r.good || a.c.water_need_mm - b.c.water_need_mm)[0];
      if (other && other.r.good > (plannedRow?.good ?? 0)) nudge = t("sow.nudge.other", { alt: cropName(other.c), m: monthName(other.r.sow), a: other.r.good, n: other.r.total, mm: fmt(other.c.water_need_mm) });
    }
  }

  const wet = site.monthly?.[planned - 1]?.root_soil_wetness;
  const smap = site.smap_recent;
  const onset = site.ne_onset?.years?.length ? site.ne_onset : null;

  el.append(...[
    h("div", { class: "sow-controls" },
      h("label", {}, h("span", {}, t("sow.crop")), cropSel),
      h("label", {}, h("span", {}, t("sow.month")), monthSel)),
    h("p", { class: `sow-verdict ${tone}` }, h("strong", {}, t(`sow.tone.${tone}`)), " ", verdict),
    nudge ? h("p", { class: "sow-nudge" }, nudge) : null,
    h("div", { class: "table-wrap" }, h("table", { class: "compare sow-table" },
      h("thead", {}, h("tr", {},
        h("th", { scope: "col" }, t("sow.col.month")),
        h("th", { scope: "col" }, t("sow.col.came")),
        hasMonthly ? h("th", { scope: "col" }, t("sow.col.dry", { d: DRY_DAYS })) : null)),
      h("tbody", {}, ...perMonth.map((r) => h("tr", { class: (r.sow === planned ? "sel " : "") + (r === best || r.good === best.good ? "best" : "") },
        h("th", { scope: "row" }, monthName(r.sow) + (r.sow === planned ? ` · ${t("sow.yours")}` : "")),
        h("td", {}, h("span", { class: "sow-bar", style: { "--v": r.share } }), ` ${r.good}/${r.total}`),
        hasMonthly ? h("td", {}, r.dry ? `${r.dry.hit}/${r.dry.n}` : "–") : null))))),
    ne ? h("div", { class: "sow-dry" },
      h("h4", {}, t("sow.ne.title")),
      h("p", {}, t("sow.ne.text", { from: ne.from, to: ne.to, n: ne.n, d10: ne.d10, d15: ne.d15, d20: ne.d20, longest: fmt(ne.longest) })),
      h("p", { class: "note" }, t("sow.ne.note"))) : null,
    h("p", { class: "note" }, wet != null ? t("sow.wet", { m: monthName(planned), w: fmt(wet, 2) }) : "",
      smap ? " " + t("sow.smap", { date: smap.date, w: fmt(smap.root_zone, 2) }) : ""),
    onset ? h("p", { class: "note" }, t("sow.onset", onsetStats(onset))) : null,
    !smap || !onset ? h("p", { class: "note sow-pending" }, t("sow.pending")) : null,
  ].filter(Boolean));
}

function onsetStats(onset) {
  const d = onset.years.map((y) => y.doy).sort((a, b) => a - b);
  const date = (doy) => { const x = new Date(Date.UTC(2001, 0, doy)); return `${x.getUTCDate()} ${monthName(x.getUTCMonth() + 1)}`; };
  return { median: date(d[Math.floor(d.length / 2)]), late: date(d.at(-1)), early: date(d[0]), n: d.length };
}
