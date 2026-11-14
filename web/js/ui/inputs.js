// B2 + B6 inputs: current rotation editor, water source, priority sliders, climate shift.
import { MONTHS, WATER_SOURCES, PRIORITIES, cropLabel } from "../scoring.js";
import { h, clear, fmt, signed } from "./dom.js";
import { term } from "./glossary.js";

const TYPE_GROUPS = [
  ["cash", "Crops"],
  ["forage", "Fodder / pulses"],
  ["green_manure", "Green manure (ploughed in)"],
];

const clone = (x) => JSON.parse(JSON.stringify(x));

/* ---------------- rotation editor ---------------- */
export function renderRotationEditor(el, { rotation, crops, issues = [], onChange, onReset }) {
  clear(el);
  const byId = Object.fromEntries(crops.map((c) => [c.id, c]));
  const rot = clone(rotation);
  const emit = () => onChange(clone(rot));

  rot.forEach((year, yi) => {
    const rows = year.map((slot, si) => {
      const crop = byId[slot.crop];
      const cropSel = h("select", {
        class: "crop-select", "aria-label": `Year ${yi + 1}, crop ${si + 1}`,
        onchange: (e) => {
          const c = byId[e.target.value];
          slot.crop = c.id;
          if (!c.sow_months.includes(slot.sow)) slot.sow = c.sow_months[0];
          emit();
        },
      }, TYPE_GROUPS.map(([type, label]) => h("optgroup", { label },
        crops.filter((c) => c.type === type).map((c) => h("option", { value: c.id, selected: c.id === slot.crop }, cropLabel(c))))));

      const months = crop ? [...crop.sow_months].sort((a, b) => a - b) : [slot.sow];
      if (!months.includes(slot.sow)) months.push(slot.sow);
      const sowSel = h("select", {
        class: "sow-select", "aria-label": `Year ${yi + 1}, crop ${si + 1} sowing month`,
        onchange: (e) => { slot.sow = Number(e.target.value); emit(); },
      }, months.map((m) => h("option", { value: m, selected: m === slot.sow },
        `Sown in ${MONTHS[m - 1]}` + (crop && !crop.sow_months.includes(m) ? " (unusual)" : ""))));

      const remove = h("button", {
        type: "button", class: "icon-btn", title: "Remove this crop", "aria-label": "Remove this crop",
        disabled: rot.flat().length <= 1,
        onclick: () => { year.splice(si, 1); if (!year.length) rot.splice(yi, 1); emit(); },
      }, "×");
      return h("div", { class: "slot" }, cropSel, sowSel, remove);
    });

    const add = h("button", {
      type: "button", class: "btn-ghost small",
      onclick: () => {
        // suggest the first crop + sowing month whose season fits the months still free this year
        const len = (c) => Math.max(1, Math.round(c.duration_days / 30.4));
        const taken = new Set(year.flatMap((s) => (byId[s.crop] ? Array.from({ length: len(byId[s.crop]) }, (_, k) => (s.sow - 1 + k) % 12) : [])));
        const fits = (c, m) => Array.from({ length: len(c) }, (_, k) => (m - 1 + k) % 12).every((x) => !taken.has(x));
        let pick = null;
        for (const c of crops.filter((c) => c.type !== "green_manure").sort((a, b) => a.duration_days - b.duration_days)) {
          const m = c.sow_months.find((m) => fits(c, m));
          if (m) { pick = { crop: c.id, sow: m }; break; }
        }
        if (!pick) pick = { crop: crops[0].id, sow: crops[0].sow_months[0] };
        year.push(pick);
        emit();
      },
    }, "+ Add a crop to this year");

    el.append(h("fieldset", { class: "rot-year" },
      h("legend", {}, rot.length > 1 ? `Year ${yi + 1}` : "Each year"),
      rows, add));
  });

  const footer = h("div", { class: "rot-actions" });
  if (rot.length < 2) {
    footer.append(h("button", {
      type: "button", class: "btn-ghost small",
      onclick: () => { rot.push([{ ...rot[0][0] }]); emit(); },
    }, "+ Second year is different"));
  } else {
    footer.append(h("button", { type: "button", class: "btn-ghost small", onclick: () => { rot.splice(1); emit(); } }, "Same every year"));
  }
  footer.append(h("button", { type: "button", class: "btn-ghost small", onclick: onReset }, "Reset to typical for this place"));
  el.append(footer);

  if (issues.length) {
    el.append(h("ul", { class: "rot-issues", role: "status" }, issues.map((t) => h("li", {}, "⚠ " + t))));
  }
}

/* ---------------- water source ---------------- */
export function renderWaterSource(el, { value, onChange }) {
  clear(el);
  for (const [id, ws] of Object.entries(WATER_SOURCES)) {
    el.append(h("label", { class: "choice" + (id === value ? " on" : "") },
      h("input", { type: "radio", name: "water", value: id, checked: id === value, onchange: () => onChange(id) }),
      h("span", {}, ws.label)));
  }
}

/* ---------------- priorities ---------------- */
const LEVEL_WORDS = ["Not important", "A little", "Somewhat", "Important", "Very important", "Top priority"];
const PRIORITY_TERMS = { nitrogen: "nitrogen_fix" };

export function renderPriorities(el, { weights, onChange }) {
  clear(el);
  for (const [k, label] of Object.entries(PRIORITIES)) {
    const out = h("output", { class: "lvl" }, LEVEL_WORDS[weights[k]] ?? weights[k]);
    const input = h("input", {
      type: "range", min: 0, max: 5, step: 1, value: weights[k] ?? 0, id: `w-${k}`,
      "aria-valuetext": LEVEL_WORDS[weights[k]],
      oninput: (e) => {
        const v = Number(e.target.value);
        out.textContent = LEVEL_WORDS[v];
        e.target.setAttribute("aria-valuetext", LEVEL_WORDS[v]);
        onChange(k, v);
      },
    });
    el.append(h("div", { class: "prio" },
      h("label", { for: `w-${k}` }, PRIORITY_TERMS[k] ? term(PRIORITY_TERMS[k], label) : label),
      input, out));
  }
}

/* ---------------- climate shift (B6) ---------------- */
export function renderClimate(el, { scenario, trend, period, rainSource = "NASA POWER", onChange }) {
  clear(el);
  const dtOut = h("output", { class: "lvl" });
  const dpOut = h("output", { class: "lvl" });
  const sync = () => {
    dtOut.textContent = `${signed(scenario.dT_c, 1)} °C`;
    dpOut.textContent = `${signed(scenario.dPrecip_pct)}% rain`;
    dt.value = scenario.dT_c; dp.value = scenario.dPrecip_pct;
  };
  const dt = h("input", {
    type: "range", min: -1, max: 3, step: 0.1, id: "sc-dt",
    oninput: (e) => { scenario.dT_c = Number(e.target.value); sync(); onChange({ ...scenario }); },
  });
  const dp = h("input", {
    type: "range", min: -30, max: 30, step: 1, id: "sc-dp",
    oninput: (e) => { scenario.dPrecip_pct = Number(e.target.value); sync(); onChange({ ...scenario }); },
  });
  const set = (s) => { scenario.dT_c = s.dT_c; scenario.dPrecip_pct = s.dPrecip_pct; sync(); onChange({ ...scenario }, true); };

  el.append(
    h("div", { class: "prio" }, h("label", { for: "sc-dt" }, "Hotter days"), dt, dtOut),
    h("div", { class: "prio" }, h("label", { for: "sc-dp" }, "More or less rain"), dp, dpOut),
    h("div", { class: "rot-actions" },
      h("button", { type: "button", class: "btn-ghost small", onclick: () => set(trend) },
        `Continue the observed trend 10 years (${signed(trend.dT_c, 1)} °C, ${signed(trend.dPrecip_pct)}% rain)`),
      h("button", { type: "button", class: "btn-ghost small", onclick: () => set({ dT_c: 0, dPrecip_pct: 0 }) }, "Today's climate")),
    h("p", { class: "note" },
      `The trend button extends this site's own ${period.start}–${period.end} trend (temperature: NASA POWER; rain: ${rainSource}). `
      + "These are rough what-if adjustments to explore, not a forecast."),
  );
  sync();
}

