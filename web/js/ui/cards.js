// B5 Strategy cards: tag, rotation, score, replay, calendar, why / evidence / benefits / risks / gaps.
import { PRIORITIES, EXTRA_PRIORITIES, WATER_SOURCES } from "../scoring.js";
import { h, fmt } from "./dom.js";
import { decorate, term } from "./glossary.js";
import { fieldCalendar } from "./calendar.js";
import { t, cropName, monthShort, prioLabel, waterLabel, tagLabel, translateEngine } from "../i18n.js";

const subLabel = (k) => (k === "pest" ? t("sub.pest") : prioLabel(k, PRIORITIES[k] ?? EXTRA_PRIORITIES[k] ?? k));
const li = (text) => h("li", { html: decorate(translateEngine(text, PRIORITIES)) });

/** Slots of each rotation year, ordered from April so a green manure comes before its crop. */
export function orderedSlots(year) {
  return [...year].sort((a, b) => ((a.sow + 8) % 12) - ((b.sow + 8) % 12));
}

export function rotationSteps(rotation, cropById) {
  return h("div", { class: "rot-steps" }, rotation.map((year, yi) => h("div", { class: "rot-line" },
    rotation.length > 1 ? h("span", { class: "rot-year-tag" }, t("card.year", { n: yi + 1 })) : null,
    orderedSlots(year).map((s, i) => {
      const c = cropById[s.crop];
      return [
        i ? h("span", { class: "arrow", "aria-hidden": "true" }, "→") : null,
        h("span", { class: "rstep" + (c?.type === "green_manure" ? " gm" : "") },
          h("span", { class: "mon" }, monthShort(s.sow)),
          h("span", { class: "en" }, c ? cropName(c) : s.crop)),
      ];
    }))));
}

/** One square per replayed year, in year order when the engine provides replay.years. */
function replaySquares(rp) {
  const years = rp.years?.length ? rp.years : null;
  const cells = years
    ? years.map((y) => h("span", {
      class: y.ok ? "ok" : "bad",
      title: y.ok ? t("replay.ok", { year: y.year }) : t("replay.bad", { year: y.year, reason: y.reason ?? "" }),
    }))
    : Array.from({ length: rp.total_years }, (_, i) => h("span", { class: i < rp.good_years ? "ok" : "bad" }));
  const strip = h("div", { class: "replay-squares" + (years ? " ordered" : "") }, cells);
  if (years) {
    strip.setAttribute("role", "img");
    strip.setAttribute("aria-label", years.map((y) => `${y.year} ${y.ok ? "✓" : "✗"}`).join(", "));
  } else strip.setAttribute("aria-hidden", "true");
  return h("div", {}, strip,
    years ? h("div", { class: "replay-axis", "aria-hidden": "true" }, h("span", {}, years[0].year), h("span", {}, years[years.length - 1].year)) : null);
}

// "By 2041-2060" lines for a plan card: the range of good years across the 5 climate models, per emissions path.
function futureLines(fr, rp) {
  const head = h("h4", {}, t("card.fut.h"));
  if (!fr) return [head, h("p", { class: "note" }, t("card.fut.none"))];
  const line = (r, key) => {
    if (!r?.good_years) return null;
    const { min, max } = r.good_years;
    return h("p", {}, t(key, { range: min === max ? String(min) : `${min}–${max}`, total: r.today.total_years, now: rp.good_years }));
  };
  return [head, line(fr.ssp245, "card.fut.245"), line(fr.ssp585, "card.fut.585"), h("p", { class: "note" }, t("card.fut.note"))];
}

export function strategyCard(st, { site, cropById, isBest, rank, monthly, scenarioOn, future = null }) {
  const cal = fieldCalendar(st, site, cropById, { monthly, scenarioOn });
  const rp = st.replay;
  const src = waterLabel(st.water_source, WATER_SOURCES[st.water_source]?.label ?? st.water_source);

  let pinned = null;
  const chips = st.evidence.map((ev) => {
    const hasMonths = ev.months?.length > 0;
    const chip = h("button", {
      type: "button", class: "chip" + (hasMonths ? "" : " no-months"),
      "aria-label": hasMonths ? t("card.chip.aria", { text: ev.text, months: ev.months.map(monthShort).join(", ") }) : ev.text,
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
    h("span", { class: "sub-k" }, subLabel(k)),
    h("span", { class: "sub-bar" }, h("span", { style: { width: `${Math.round(v * 100)}%` } })),
    h("span", { class: "sub-v" }, fmt(v * 100))));

  return h("article", {
    class: "card" + (st.is_current ? " current" : "") + (isBest ? " best" : ""),
    "aria-label": `${tagLabel(st.tag)}: ${st.label}`, dataset: { rank: String(rank) },
  },
    h("header", { class: "card-head" },
      h("div", { class: "tags" },
        h("span", { class: "tag" }, tagLabel(st.tag)),
        isBest ? h("span", { class: "badge" }, t("card.best")) : null,
        !st.feasible ? h("span", { class: "badge warn" }, t("card.timing")) : null),
      rotationSteps(st.rotation, cropById)),

    h("div", { class: "card-stats" },
      h("div", { class: "score" },
        h("span", { class: "score-n" }, fmt(st.total)),
        h("span", { class: "score-l" }, t("card.outof"), h("br"), t("card.fit")),
        h("span", { class: "meter", role: "meter", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": st.total, "aria-label": t("card.fit.aria") },
          h("span", { style: { width: `${st.total}%` } }))),
      h("div", { class: "replay" },
        h("div", { class: "replay-l" }, t("card.came.after")
          ? [t("card.of", { good: rp.good_years, total: rp.total_years }), " ", term("replay", t("card.came"))]
          : [term("replay", t("card.came")), t("card.of", { good: rp.good_years, total: rp.total_years })]),
        replaySquares(rp),
        rp.worst.length ? h("div", { class: "replay-worst" }, t("card.hardest"), rp.worst.map((w) => w.year).join(" · ")) : null)),

    h("p", { class: "water-line", html: decorate(
      t("card.water", { need: fmt(st.water_use.need_mm) }) +
      (st.water_use.irrigation_mm > 0 ? t("card.water.irr", { irr: fmt(st.water_use.irrigation_mm), src: src.toLowerCase() }) : t("card.water.rain"))) }),

    section(t("card.why"), st.why, "why"),

    // everything else is one tap away, so three cards side by side (or stacked on a phone) stay readable
    h("details", {
      class: "card-more",
      // 2041-2060 range (issue #30), worked out the first time this fold opens; future() returns
      // { ssp245, ssp585 } from scoring.futureRange, or null when the place has no projection
      ontoggle: (e) => {
        const d = e.currentTarget;
        if (!d.open || d.dataset.future || !future) return;
        d.dataset.future = "1";
        d.querySelector(".card-future")?.replaceChildren(...futureLines(future(), rp));
      },
    },
      h("summary", {}, t("card.more")),
      future ? h("section", { class: "card-sec card-future" }) : null,
    cal.el,
    h("section", { class: "card-sec evidence" },
      h("h4", {}, t("card.evidence"), h("span", { class: "hint" }, t("card.hint"))),
      h("div", { class: "chips" }, chips)),
    section(t("card.benefits"), st.benefits, "good"),
    section(t("card.risks"), st.risks, "risk"),
    st.gaps.length ? h("details", { class: "card-sec gaps" },
      h("summary", {}, t("card.gaps", { n: st.gaps.length })),
      h("ul", {}, st.gaps.map(li))) : null,

    h("section", { class: "card-sec expert-only" },
      h("h4", {}, t("card.subs")),
      h("div", { class: "subs" }, subs),
      st.issues.length ? h("ul", { class: "rot-issues" }, st.issues.map((x) => h("li", {}, "⚠ " + x))) : null,
      h("p", { class: "note" }, t("card.engine", { label: st.label, src }))),
    ),
  );
}
