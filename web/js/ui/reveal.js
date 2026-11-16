// Scroll reveal for the Farmers and Policy makers pages, in the home page's style (home.js): each box rises in as a
// whole as it comes on screen, then its contents, cards, tiles and rows follow one after another. When a box goes
// back below the screen (the visitor scrolled up) it resets, so it plays again on the way down. Turned off for
// reduced motion and for printing (app.css).
const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
// items inside a box that come in one after another (each gets --i, its place among its siblings)
const STAGGER = ".mc-tile, .card, .ideas-card, .ideas-sum > *, .xtable tbody tr, .top3 > *, .mc-quick-chips li, "
  + ".mc-pattam, .mc-chip, .mc-month, .choice, .mc-seg-btn";

let io = null;
// "in" starts the entrance; "settled" (once it is over) makes taps answer at once instead of waiting for the stagger
function show(x, now = false) {
  setOrder(x);
  x.classList.add("in");
  clearTimeout(x._rvT);
  if (now) x.classList.add("settled"); else x._rvT = setTimeout(() => x.classList.add("settled"), 1600);
}
const shown = new Set();     // keys (data-rv) of parts on screen, so a part redrawn in place stays shown
function setOrder(el) {
  el.querySelectorAll(STAGGER).forEach((x) => x.style.setProperty("--i", Math.min([...x.parentNode.children].indexOf(x), 12)));
}
function onEntries(entries) {
  for (const e of entries) {
    const x = e.target, key = x.dataset.rv;
    const on = e.isIntersecting && (e.intersectionRatio >= 0.15 || e.intersectionRect.height >= 120);
    if (on && !x.classList.contains("in")) { show(x); if (key) shown.add(key); }
    else if (!e.isIntersecting && e.boundingClientRect.top > 0) { x.classList.remove("in", "settled"); clearTimeout(x._rvT); if (key) shown.delete(key); }   // back below the screen: replay later
  }
}
function watch(els) {
  for (const x of els) {
    if (x.classList.contains("rv")) continue;
    x.classList.add("rv");
    if (REDUCED || !("IntersectionObserver" in window)) { x.classList.add("in"); continue; }
    if (x.dataset.rv && shown.has(x.dataset.rv)) show(x, true);   // redrawn while on screen: no replay
    io ??= new IntersectionObserver(onEntries, { threshold: [0, 0.05, 0.1, 0.15, 0.2, 0.3] });
    io.observe(x);
  }
}

/** Mark every element matching selector as a reveal box and start watching it. */
export function revealOnScroll(selector) { watch(document.querySelectorAll(selector)); }

/** For parts a panel redraws (ui/mycrops.js): stop watching the old ones under root, watch the new ones.
 *  Give each part a data-rv key so a redraw keeps it shown instead of playing it again. */
export function revealParts(root, selector) {
  if (io) root.querySelectorAll(".rv").forEach((x) => { if (!x.isConnected) io.unobserve(x); });
  watch(root.querySelectorAll(selector));
}
/** Before a panel redraws: stop watching its parts (they are about to be replaced). */
export function forgetParts(root) { if (io) root.querySelectorAll(".rv").forEach((x) => io.unobserve(x)); }

/** Count a number up from 0 to the value already written in it ("91%"), like the home page's big numbers. */
export function countUp(n) {
  if (REDUCED || typeof requestAnimationFrame !== "function") return;
  const m = /^(\D*)(\d+)(\D*)$/.exec(n.textContent.trim());
  if (!m) return;
  const [, pre, to, suf] = m, t0 = performance.now(), dur = 700;
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur);
    n.textContent = `${pre}${Math.round(Number(to) * (1 - (1 - k) ** 3))}${suf}`;
    if (k < 1) requestAnimationFrame(step);
  };
  n.textContent = `${pre}0${suf}`;
  requestAnimationFrame(step);
}
