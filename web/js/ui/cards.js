// B5 Strategy cards: tag, rotation, score, replay, calendar, why / evidence / benefits / risks / gaps.
import { MONTHS, PRIORITIES, WATER_SOURCES } from "../scoring.js";
import { h, fmt } from "./dom.js";
import { decorate, term } from "./glossary.js";
import { fieldCalendar } from "./calendar.js";

const SUB_LABELS = { ...PRIORITIES, pest: "Pest & disease break" };
const shortName = (c) => c.name.replace(/\s*\(.*?\)\s*/g, " ").replace(/\s+/g, " ").trim();
const li = (text) => h("li", { html: decorate(text) });

/** Slots of each rotation year, ordered from April so a green manure comes before its crop. */
export function orderedSlots(year) {
  return [...year].sort((a, b) => ((a.sow + 8) % 12) - ((b.sow + 8) % 12));
}

export function rotationSteps(rotation, cropById) {
  return h("div", { class: "rot-steps" }, rotation.map((year, yi) => h("div", { class: "rot-line" },
    rotation.length > 1 ? h("span", { class: "rot-year-tag" }, `Year ${yi + 1}`) : null,
    orderedSlots(year).map((s, i) => {
      const c = cropById[s.crop];
      return [
        i ? h("span", { class: "arrow", "aria-hidden": "true" }, "→") : null,
        h("span", { class: "rstep" + (c?.type === "green_manure" ? " gm" : "") },
          h("span", { class: "mon" }, MONTHS[s.sow - 1]),
          h("span", { class: "en" }, c ? shortName(c) : s.crop),
          c?.tamil_name ? h("span", { class: "ta", lang: "ta" }, c.tamil_name) : null),
      ];
    }))));
}

export function strategyCard(st, { site, cropById, isBest, rank }) {
  const cal = fieldCalendar(st, site, cropById);
  const rp = st.replay;
  const src = WATER_SOURCES[st.water_source]?.label ?? st.water_source;

  // replay strip: one square per year (counts only; the engine reports which years failed worst)
  const squares = h("div", { class: "replay-squares", "aria-hidden": "true" },
    Array.from({ length: rp.total_years }, (_, i) => h("span", { class: i < rp.good_years ? "ok" : "bad" })));

  let pinned = null;
  const chips = st.evidence.map((ev) => {
    const hasMonths = ev.months?.length > 0;
    const chip = h("button", {
      type: "button", class: "chip" + (hasMonths ? "" : " no-months"),
      "aria-label": hasMonths ? `${ev.text}. Highlights ${ev.months.map((m) => MONTHS[m - 1]).join(", ")} on the calendar` : ev.text,
      onmouseenter: () => hasMonths && cal.highlight(ev.months),
      onmouseleave: () => cal.highlight(pinned?.months ?? []),
      onfocus: () => hasMonths && cal.highlight(ev.months),
      onblur: () => cal.highlight(pinned?.months ?? []),
      onclick: (e) => {
        if (!hasMonths) return;
        pinned = pinned === ev ? null : ev;
        e.currentTarget.parentElement.querySelectorAll(".chip").forEach((c) => c.classList.remove("pinned"));
        if (pinned) e.currentTarget.classList.add("pinned");
        cal.highlight(pinned?.months ?? []);
      },
    });
    chip.innerHTML = (hasMonths ? '<span class="chip-cal" aria-hidden="true">▦</span>' : "") + decorate(ev.text);
    return chip;
  });

  const section = (title, items, cls = "") => items.length
    ? h("section", { class: "card-sec " + cls }, h("h4", {}, title), h("ul", {}, items.map(li)))
    : null;

  const subs = Object.entries(st.subscores).map(([k, v]) => h("div", { class: "sub" },
    h("span", { class: "sub-k" }, SUB_LABELS[k] ?? k),
    h("span", { class: "sub-bar" }, h("span", { style: { width: `${Math.round(v * 100)}%` } })),
    h("span", { class: "sub-v" }, fmt(v * 100))));

  return h("article", {
    class: "card" + (st.is_current ? " current" : "") + (isBest ? " best" : ""),
    "aria-label": `${st.tag}: ${st.label}`, dataset: { rank: String(rank) },
  },
    h("header", { class: "card-head" },
      h("div", { class: "tags" },
        h("span", { class: "tag" }, st.tag),
        isBest ? h("span", { class: "badge" }, "★ Best fit for your priorities") : null,
        !st.feasible ? h("span", { class: "badge warn" }, "Has a timing problem") : null),
      rotationSteps(st.rotation, cropById)),

    h("div", { class: "card-stats" },
      h("div", { class: "score" },
        h("span", { class: "score-n" }, fmt(st.total)),
        h("span", { class: "score-l" }, "out of 100", h("br"), "fit with your priorities"),
        h("span", { class: "meter", role: "meter", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": st.total, "aria-label": "Fit score" },
          h("span", { style: { width: `${st.total}%` } }))),
      h("div", { class: "replay" },
        h("div", { class: "replay-l" }, term("replay", "Came through"), ` ${rp.good_years} of ${rp.total_years} years`),
        squares,
        rp.worst.length ? h("div", { class: "replay-worst" }, "Hardest years: ", rp.worst.map((w) => w.year).join(" · ")) : null)),

    h("p", { class: "water-line", html: decorate(
      `Water: needs ~${fmt(st.water_use.need_mm)} mm a year` +
      (st.water_use.irrigation_mm > 0 ? `; ~${fmt(st.water_use.irrigation_mm)} mm of it from the ${src.toLowerCase()}` : "; rain and soil water only")) }),

    cal.el,

    section("Why this option", st.why, "why"),
    h("section", { class: "card-sec evidence" },
      h("h4", {}, "Evidence from NASA data ", h("span", { class: "hint" }, "point at a ▦ fact to see its months")),
      h("div", { class: "chips" }, chips)),
    section("Benefits", st.benefits, "good"),
    section("Risks to check locally", st.risks, "risk"),
    st.gaps.length ? h("details", { class: "card-sec gaps" },
      h("summary", {}, `What the data can't tell us (${st.gaps.length})`),
      h("ul", {}, st.gaps.map(li))) : null,

    h("section", { class: "card-sec expert-only" },
      h("h4", {}, "Sub-scores (0–100)"),
      h("div", { class: "subs" }, subs),
      st.issues.length ? h("ul", { class: "rot-issues" }, st.issues.map((t) => h("li", {}, "⚠ " + t))) : null,
      h("p", { class: "note" }, `Engine label: ${st.label}. Water source: ${src}.`)),
  );
}
