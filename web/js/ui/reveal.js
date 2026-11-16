// Scroll reveal for the Farmers and Policy makers pages, in the home page's style (home.js): each part rises in as
// it comes on screen, its cards and tiles follow one after another, and when the part goes back below the screen
// (the visitor scrolled up) it resets, so it plays again on the way down. Turned off for reduced motion.
const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
// items inside a part that come in one after another (each gets --i, its place among its siblings)
const STAGGER = ".mc-tile, .card, .ideas-card, .ideas-sum > *, .xtable tbody tr, .vuln-table tbody tr, .top3 > *, .mc-quick-chips li";

let io = null;
function setOrder(el) {
  el.querySelectorAll(STAGGER).forEach((x) => x.style.setProperty("--i", Math.min([...x.parentNode.children].indexOf(x), 12)));
}
function onEntries(entries) {
  for (const e of entries) {
    const shown = e.isIntersecting && (e.intersectionRatio >= 0.15 || e.intersectionRect.height >= 120);
    if (shown && !e.target.classList.contains("in")) { setOrder(e.target); e.target.classList.add("in"); }
    else if (!e.isIntersecting && e.boundingClientRect.top > 0) e.target.classList.remove("in");   // back below the screen: replay later
  }
}

/** Mark every element matching selector as a reveal part and start watching it. Safe to call again after a redraw. */
export function revealOnScroll(selector) {
  const els = [...document.querySelectorAll(selector)].filter((x) => !x.classList.contains("rv"));
  els.forEach((x) => x.classList.add("rv"));
  if (REDUCED || !("IntersectionObserver" in window)) { els.forEach((x) => x.classList.add("in")); return; }
  io ??= new IntersectionObserver(onEntries, { threshold: [0, 0.05, 0.1, 0.15, 0.2, 0.3] });
  els.forEach((x) => io.observe(x));
}

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
