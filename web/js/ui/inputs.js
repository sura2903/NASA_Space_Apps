// B2 + B6 inputs: current rotation editor, water source, priority sliders, climate shift.
import { WATER_SOURCES, PRIORITIES, EXTRA_PRIORITIES } from "../scoring.js";
import { h, clear, signed } from "./dom.js";
import { term } from "./glossary.js";
import { t, cropName, monthName, prioLabel, waterLabel } from "../i18n.js";

const TYPE_GROUPS = ["cash", "forage", "green_manure"];
const clone = (x) => JSON.parse(JSON.stringify(x));

/* ---------------- rotation editor ---------------- */
export function renderRotationEditor(el, { rotation, crops, onChange, onReset }) {
  clear(el);
  const byId = Object.fromEntries(crops.map((c) => [c.id, c]));
  const rot = clone(rotation);
  const emit = () => onChange(clone(rot));

  rot.forEach((year, yi) => {
    const rows = year.map((slot, si) => {
      const crop = byId[slot.crop];
      const cropSel = h("select", {
        class: "crop-select", "aria-label": t("rot.crop.aria", { y: yi + 1, n: si + 1 }),
        onchange: (e) => {
          const c = byId[e.target.value];
          slot.crop = c.id;
          if (!c.sow_months.includes(slot.sow)) slot.sow = c.sow_months[0];
          emit();
        },
      }, TYPE_GROUPS.map((type) => h("optgroup", { label: t(`grp.${type}`) },
        crops.filter((c) => c.type === type).map((c) => h("option", { value: c.id, selected: c.id === slot.crop }, cropName(c))))));

      const months = crop ? [...crop.sow_months].sort((a, b) => a - b) : [slot.sow];
      if (!months.includes(slot.sow)) months.push(slot.sow);
      const sowSel = h("select", {
        class: "sow-select", "aria-label": t("rot.sow.aria", { y: yi + 1, n: si + 1 }),
        onchange: (e) => { slot.sow = Number(e.target.value); emit(); },
      }, months.map((m) => h("option", { value: m, selected: m === slot.sow },
        t("rot.sown", { m: monthName(m) }) + (crop && !crop.sow_months.includes(m) ? t("rot.unusual") : ""))));

      const remove = h("button", {
        type: "button", class: "icon-btn", title: t("rot.remove"), "aria-label": t("rot.remove"),
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
    }, t("rot.add"));

    el.append(h("fieldset", { class: "rot-year" },
      h("legend", {}, rot.length > 1 ? t("rot.year", { n: yi + 1 }) : t("rot.each")),
      rows, add));
  });

  const footer = h("div", { class: "rot-actions" });
  if (rot.length < 2) {
    footer.append(h("button", { type: "button", class: "btn-ghost small", onclick: () => { rot.push([{ ...rot[0][0] }]); emit(); } }, t("rot.second")));
  } else {
    footer.append(h("button", { type: "button", class: "btn-ghost small", onclick: () => { rot.splice(1); emit(); } }, t("rot.same")));
  }
  footer.append(h("button", { type: "button", class: "btn-ghost small", onclick: onReset }, t("rot.reset")));
  el.append(footer);
}

/* ---------------- water source ---------------- */
// Farmers can tick every source they use ("Rain only" stands alone). The engine scores a full-year plan with one
// source, so the plans use the first ticked source in this order.
export const WATER_ORDER = ["canal", "borewell", "tank", "rainfed"];
export const mainWater = (set) => WATER_ORDER.find((k) => set.has(k)) ?? "rainfed";
export function toggleWater(set, id, on) {
  if (id === "rainfed") return new Set(["rainfed"]);
  const next = new Set(set);
  next.delete("rainfed");
  on ? next.add(id) : next.delete(id);
  if (!next.size) next.add("rainfed");
  return next;
}
export function renderWaterSource(el, { value, onChange }) {
  clear(el);
  for (const [id, ws] of Object.entries(WATER_SOURCES)) {
    el.append(h("label", { class: "choice" + (value.has(id) ? " on" : "") },
      h("input", { type: "checkbox", name: "water", value: id, checked: value.has(id), onchange: (e) => onChange(toggleWater(value, id, e.target.checked)) }),
      h("span", {}, waterLabel(id, ws.label))));
  }
  if (value.size > 1) {
    const m = mainWater(value);
    el.append(h("p", { class: "note" }, t("water.main", { src: waterLabel(m, WATER_SOURCES[m].label).toLowerCase() })));
  }
}

/* ---------------- priorities ---------------- */
const PRIORITY_TERMS = { nitrogen: "nitrogen_fix" };

export function renderPriorities(el, { weights, onChange }) {
  clear(el);
  const words = t("levels");
  // EXTRA_PRIORITIES (e.g. "Can store and sell later", a market preference) start at 0 = not counted
  for (const [k, enLabel] of Object.entries({ ...PRIORITIES, ...EXTRA_PRIORITIES })) {
    const label = prioLabel(k, enLabel);
    const out = h("output", { class: "lvl" }, words[weights[k] ?? 0] ?? weights[k]);
    const input = h("input", {
      type: "range", min: 0, max: 5, step: 1, value: weights[k] ?? 0, id: `w-${k}`,
      "aria-valuetext": words[weights[k] ?? 0],
      oninput: (e) => {
        const v = Number(e.target.value);
        out.textContent = words[v];
        e.target.setAttribute("aria-valuetext", words[v]);
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
  const dt = h("input", {
    type: "range", min: -1, max: 3, step: 0.1, id: "sc-dt",
    oninput: (e) => { scenario.dT_c = Number(e.target.value); sync(); onChange({ ...scenario }); },
  });
  const dp = h("input", {
    type: "range", min: -30, max: 30, step: 1, id: "sc-dp",
    oninput: (e) => { scenario.dPrecip_pct = Number(e.target.value); sync(); onChange({ ...scenario }); },
  });
  function sync() {
    dtOut.textContent = `${signed(scenario.dT_c, 1)} °C`;
    dpOut.textContent = t("clim.rain", { x: signed(scenario.dPrecip_pct) });
    dt.value = scenario.dT_c; dp.value = scenario.dPrecip_pct;
  }
  const set = (s) => { scenario.dT_c = s.dT_c; scenario.dPrecip_pct = s.dPrecip_pct; sync(); onChange({ ...scenario }, true); };

  el.append(
    h("div", { class: "prio" }, h("label", { for: "sc-dt" }, t("clim.dt")), dt, dtOut),
    h("div", { class: "prio" }, h("label", { for: "sc-dp" }, t("clim.dp")), dp, dpOut),
    h("div", { class: "rot-actions" },
      h("button", { type: "button", class: "btn-ghost small", onclick: () => set(trend) },
        t("clim.trend", { dT: signed(trend.dT_c, 1), dP: signed(trend.dPrecip_pct) })),
      h("button", { type: "button", class: "btn-ghost small", onclick: () => set({ dT_c: 0, dPrecip_pct: 0 }) }, t("clim.today"))),
    h("p", { class: "note" }, t("clim.note", { start: period.start, end: period.end, rain: rainSource })),
  );
  sync();
}
