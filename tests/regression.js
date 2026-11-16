// Regression checks for the SowSmart web app, run in a real browser (Playwright, Chromium).
//
//   npm install --no-save playwright && npx playwright install chromium   (once)
//   node tests/regression.js
//
// It serves web/ itself on a free local port. Map tiles and web fonts are skipped. If the CDNs (unpkg, jsdelivr)
// are blocked where you run it, set VENDOR to a folder holding leaflet-1.9.4/ and chart.js-4.4.1/ (the files from
// the npm packages' dist/ folders) and they are served from there.
//
// Each check below guards a bug we fixed before, so a shared component (map hover card, crop tiles, water boxes,
// scroll reveal) cannot quietly bring it back. Exit code 1 if any check fails.
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const WEB = path.join(__dirname, "..", "web");
const VENDOR = process.env.VENDOR;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".md": "text/markdown" };

function serve() {
  const srv = http.createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const f = path.join(WEB, u.endsWith("/") ? u + "index.html" : u);
    if (!f.startsWith(WEB)) { res.writeHead(403); return res.end(); }
    fs.readFile(f, (err, buf) => {
      if (err) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" });
      res.end(buf);
    });
  });
  return new Promise((ok) => srv.listen(0, "127.0.0.1", () => ok(srv)));
}

const results = [];
async function check(name, fn) {
  try { await fn(); results.push([true, name]); console.log(`  ok    ${name}`); }
  catch (e) { results.push([false, name, e.message]); console.log(`  FAIL  ${name}\n        ${e.message.split("\n")[0]}`); }
}
function expect(cond, msg) { if (!cond) throw new Error(msg); }

(async () => {
  const srv = await serve();
  const BASE = `http://127.0.0.1:${srv.address().port}/`;
  const browser = await chromium.launch();

  async function open(url, { motion = false, width = 1280, height = 900 } = {}) {
    const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: motion ? "no-preference" : "reduce" });
    // a fresh visit with English chosen, so the home-page redirect and a saved language do not get in the way
    await ctx.addInitScript(() => { try { if (!sessionStorage.getItem("rt")) { localStorage.clear(); localStorage.setItem("fs-lang", "en"); sessionStorage.setItem("rt", "1"); } } catch {} });
    const p = await ctx.newPage();
    p.errors = [];
    p.on("pageerror", (e) => p.errors.push(e.message));
    if (VENDOR) {
      await p.route("https://unpkg.com/leaflet@1.9.4/**", (r) => r.fulfill({ path: path.join(VENDOR, "leaflet-1.9.4", r.request().url().split("leaflet@1.9.4/")[1]) }));
      await p.route("https://cdn.jsdelivr.net/npm/chart.js@4.4.1/**", (r) => r.fulfill({ path: path.join(VENDOR, "chart.js-4.4.1", r.request().url().split("chart.js@4.4.1/")[1]) }));
    }
    await p.route(/tile\.openstreetmap|basemaps\.cartocdn|fonts\.(googleapis|gstatic)/, (r) => r.abort());
    await p.goto(BASE + url);
    return p;
  }
  const farm = async (opts) => { const p = await open("index.html?lang=en#site=tirunelveli", opts); await p.waitForSelector("#mycrops .mc-pattam", { timeout: 60000 }); return p; };
  const mapCard = (p, sel) => p.evaluate((s) => {
    const c = document.querySelector(`${s} .map-hover`), m = document.querySelector(s).getBoundingClientRect();
    if (!c || c.hidden) return null;
    const r = c.getBoundingClientRect();
    return { top: r.top - m.top, right: m.right - r.right, text: c.textContent };
  }, sel);

  console.log("Pages");
  for (const url of ["home.html", "index.html?lang=en#site=tirunelveli", "index.html?view=detail#site=thanjavur", "policy.html", "explore.html", "references.html"]) {
    await check(`${url} loads with no script errors and no Tamil script in the English view`, async () => {
      const p = await open(url);
      await p.waitForLoadState("networkidle").catch(() => {});
      await p.waitForTimeout(1500);
      expect(!p.errors.length, `script errors: ${p.errors.join(" | ")}`);
      // the language's own name ("English and தமிழ்") is allowed, any other Tamil text is not
      const tamil = await p.evaluate(() => {
        const re = /[஀-௿]/, out = [];
        const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let n; (n = w.nextNode());) if (re.test(n.data.replace(/தமிழ்/g, "")) && !n.parentElement.closest(".lang-wrap")) out.push(n.data.trim().slice(0, 40));
        return out;
      });
      expect(!tamil.length, `Tamil text in English view: ${tamil.slice(0, 3).join(" / ")}`);
      await p.context().close();
    });
  }

  console.log("Farmers: sowing time first, crop sections, answer only after choosing");
  await check("'When do you sow?' comes before the water and crops, and nothing is pre-chosen", async () => {
    const p = await farm();
    const order = await p.evaluate(() => {
      const a = document.querySelector("#mycrops .mc-when-h"), b = document.querySelector("#mycrops .mc-crops-field");
      return a && b ? a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING : 0;
    });
    expect(order, "when-step is not before the crops");
    expect(await p.locator("#mycrops .mc-pattam[aria-pressed=true]").count() === 0, "a sowing time is shown as chosen before the farmer chose one");
    expect(await p.locator("#mycrops .mc-crops input:checked").count() === 0, "crops are pre-ticked on a fresh visit");
    await p.context().close();
  });
  await check("'Your crops for sowing…' stays hidden until a sowing time and a crop are chosen", async () => {
    const p = await farm();
    const head = () => p.locator("#mc-answer-title").textContent();
    expect(!/Your crops for/.test(await head()) && (await p.locator("#mycrops .mc-tiles").count()) === 0, "answer shown on load");
    await p.locator("#mycrops .mc-crops .mc-chip").first().click();
    expect(!/Your crops for/.test(await head()), "answer shown before a sowing time was chosen");
    await p.locator("#mycrops .mc-pattam", { hasText: "Nov" }).first().click();
    await p.waitForTimeout(300);
    expect(/Your crops for sowing in Nov/.test(await head()), `heading after choosing: ${await head()}`);
    const tiles = await p.locator("#mycrops .mc-tiles:not(.mc-sug) > .mc-tile").count();
    expect(tiles >= 1, "no tile after choosing");
    await p.context().close();
  });
  await check("crop sections: All = Best here + Other; Best here are good choices; tiles show a % and a plain verdict", async () => {
    const p = await farm();
    await p.locator("#mycrops .mc-pattam", { hasText: "Sep" }).first().click();
    const n = async (k) => { await p.locator(`.mc-seg-btn[data-sec=${k}]`).click(); return p.locator("#mycrops .mc-crops .mc-chip").allTextContents(); };
    const all = await n("all"), best = await n("best"), other = await n("other");
    expect(best.length > 0, "no crop under Best here");
    expect(all.length === best.length + other.length, `All ${all.length} != Best ${best.length} + Other ${other.length}`);
    await p.locator(".mc-seg-btn[data-sec=best]").click();
    for (let i = 0; i < Math.min(3, best.length); i++) await p.locator("#mycrops .mc-crops .mc-chip").nth(i).click();
    await p.waitForTimeout(300);
    const verdicts = await p.locator("#mycrops .mc-tiles:not(.mc-sug) .mc-verdict").allTextContents();
    expect(verdicts.length === Math.min(3, best.length) && verdicts.every((v) => v === "Good choice"), `Best here crops got: ${verdicts.join(", ")}`);
    const nums = await p.locator("#mycrops .mc-tiles:not(.mc-sug) .mc-tile-num").allTextContents();
    expect(nums.every((x) => /^\d{1,2}%$/.test(x)), `tile numbers: ${nums.join(", ")}`);
    const txt = await p.locator("#mycrops").innerText();
    expect(!/\{\w+\}/.test(txt), "a {placeholder} was left in the text");
    expect(!/Think again/i.test(txt), "harsh wording is back");
    await p.context().close();
  });
  await check("crops ticked on an earlier visit need a tap on 'Show how my crops did'", async () => {
    const p = await farm();
    await p.locator("#mycrops .mc-crops .mc-chip").nth(1).click();
    await p.reload(); await p.waitForSelector("#mycrops .mc-pattam");
    await p.locator("#mycrops .mc-pattam").first().click();
    expect(await p.locator("#mycrops .mc-tiles").count() === 0, "answer shown without the farmer confirming restored crops");
    await p.locator("#mycrops .mc-show").click();
    expect(await p.locator("#mycrops .mc-tiles:not(.mc-sug) > .mc-tile").count() === 1, "Show did not reveal the restored crop");
    await p.context().close();
  });
  await check("Tamil view: the new parts are translated, with no {placeholders}", async () => {
    const p = await farm();
    await p.locator("#mycrops .mc-pattam").first().click();
    await p.click("#lang"); await p.waitForTimeout(500);
    const seg = (await p.locator(".mc-seg").innerText());
    expect(/[஀-௿]/.test(seg) && !/All crops|Best here/.test(seg), `sections not in Tamil: ${seg}`);
    expect(!/\{\w+\}/.test(await p.locator("#mycrops").innerText()), "a {placeholder} was left in the Tamil text");
    await p.context().close();
  });

  console.log("Water: every source can be ticked together (checkboxes, not one choice)");
  await check("water boxes are checkboxes on the Farmers panel and in the full-year plans", async () => {
    const p = await open("index.html?view=detail#site=thanjavur");
    await p.waitForSelector("#mycrops .mc-water input");
    expect(await p.locator("#mycrops .mc-water input[type=checkbox]").count() === 4, "Farmers water inputs are not 4 checkboxes");
    expect(await p.locator("#water input[type=checkbox]").count() >= 4, "plans water inputs are not checkboxes");
    await p.locator("#mycrops .mc-water label", { hasText: "Borewell" }).click();
    await p.waitForTimeout(400);
    const on = await p.locator("#mycrops .mc-water input:checked").count();
    expect(on >= 2, `only ${on} water source ticked after adding a second one`);
    await p.context().close();
  });

  console.log("Maps: hover cards and place markers");
  await check("Farmers map: all places drawn alike, no stuck labels, hover near a dot shows its card, click picks it", async () => {
    const p = await farm();
    await p.click("#map-fold summary"); await p.waitForTimeout(800);
    await p.$eval("#map", (x) => x.scrollIntoView({ block: "center" })); await p.waitForTimeout(600);
    const sizes = await p.$$eval("#map path.site-marker", (ps) => ps.map((x) => Math.round(x.getBoundingClientRect().width)));
    expect(sizes.length > 100, `only ${sizes.length} places on the map`);
    const counts = sizes.reduce((m, s) => ((m[s] = (m[s] || 0) + 1), m), {});
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    expect(sizes.length - sorted[0][1] <= 1, `markers in ${sorted.length} sizes (${JSON.stringify(counts)}): only the chosen place may differ`);
    expect(await p.locator("#map .leaflet-tooltip").count() === 0, "permanent Leaflet labels are back");
    const dots = await p.$$eval("#map path.site-marker", (ps) => ps.map((x) => { const r = x.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }));
    const d = dots[Math.floor(dots.length / 3)];
    await p.mouse.move(d.x + 8, d.y + 6, { steps: 3 }); await p.waitForTimeout(100);
    expect(await mapCard(p, "#map"), "no hover card near a dot");
    const before = await p.locator("#site-select").inputValue();
    await p.mouse.click(d.x + 8, d.y + 6); await p.waitForTimeout(800);
    expect(await p.locator("#site-select").inputValue() !== before, "clicking next to a dot did not pick it");
    let shown = 0;
    for (let i = 0; i < 30; i++) { const q = dots[(i * 7) % dots.length]; await p.mouse.move(q.x + 2, q.y + 2); if (await mapCard(p, "#map")) shown++; }
    expect(shown >= 27, `hover card kept up on only ${shown} of 30 fast moves (lag)`);
    await p.context().close();
  });
  for (const [url, sel] of [["policy.html", "#pmap"], ["explore.html", "#xmap"]]) {
    await check(`${url}: hover card sits in the map's top-right corner, never over the square under the mouse`, async () => {
      const p = await open(url);
      await p.waitForSelector(`${sel} path.leaflet-interactive`, { timeout: 60000 }); await p.waitForTimeout(500);
      const box = await p.locator(sel).boundingBox();
      for (const [fx, fy] of [[0.3, 0.4], [0.6, 0.7], [0.5, 0.3]]) {
        await p.mouse.move(box.x + fx * box.width, box.y + fy * box.height, { steps: 3 }); await p.waitForTimeout(120);
        const c = await mapCard(p, sel);
        if (!c) continue;   // outside Tamil Nadu at this spot
        expect(c.top < 24 && c.right < 24, `card at top ${Math.round(c.top)} right ${Math.round(c.right)}`);
      }
      await p.context().close();
    });
  }

  console.log("Scroll animations: play on the way down, reset when scrolled back up");
  for (const [url, sel] of [["home.html", ".hm-sec:nth-of-type(3)"], ["policy.html", "#ideas-panel"], ["index.html?lang=en#site=tirunelveli", "#more-plans"]]) {
    await check(`${url}: ${sel} rises in when reached and resets after scrolling back up`, async () => {
      const p = await open(url, { motion: true, height: 700 });
      await p.waitForTimeout(1500);
      const isIn = () => p.$eval(sel, (x) => x.classList.contains("in"));
      expect(!(await isIn()), "already revealed before scrolling");
      await p.$eval(sel, (x) => x.scrollIntoView({ block: "center" })); await p.waitForTimeout(700);
      expect(await isIn(), "not revealed after scrolling to it");
      const op = await p.$eval(sel, (x) => getComputedStyle(x.firstElementChild).opacity);
      expect(Number(op) > 0.5, `still faded after scrolling to it (opacity ${op})`);
      await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(600);
      expect(!(await isIn()), "did not reset after scrolling back to the top");
      await p.$eval(sel, (x) => x.scrollIntoView({ block: "center" })); await p.waitForTimeout(700);
      expect(await isIn(), "did not replay on the second scroll down");
      expect(!p.errors.length, p.errors.join(" | "));
      await p.context().close();
    });
  }

  console.log("Guided tour");
  await check("Farmers tour finds the sowing-time step and the water-and-crops step", async () => {
    const p = await farm();
    await p.click("#tour-btn");
    const titles = [];
    for (let i = 0; i < 6; i++) { titles.push((await p.locator(".tour-card").innerText()).split("\n").find((l) => /^\d\.|Your answer/.test(l)) || ""); await p.keyboard.press("ArrowRight"); await p.waitForTimeout(250); }
    const t = titles.join(" | ");
    expect(/2\. When do you sow\?/.test(t) && /3\. Your water and crops/.test(t), `tour steps: ${t}`);
    await p.context().close();
  });

  await browser.close();
  srv.close();
  const bad = results.filter((r) => !r[0]);
  console.log(`\n${results.length - bad.length} of ${results.length} checks passed.`);
  process.exit(bad.length ? 1 : 0);
})();
