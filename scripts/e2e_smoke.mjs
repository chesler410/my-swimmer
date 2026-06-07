// Quick E2E smoke for the latest batch: Watching tab, per-event notes, logo brand color.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "..", "dist");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml" };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/" || p === "/my-swimmer/" || p === "/my-swimmer") p = "/index.html";
  p = p.replace(/^\/my-swimmer/, "");
  const file = path.join(DIST, p);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(200, { "Content-Type": "text/html" });
    return res.end(fs.readFileSync(path.join(DIST, "index.html")));
  }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  res.end(fs.readFileSync(file));
});

const log = [];
const ok = (c, m) => { log.push(`${c ? "PASS" : "FAIL"}: ${m}`); if (!c) process.exitCode = 1; };

await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const base = `http://localhost:${port}/my-swimmer/`;

const browser = await puppeteer.launch({ executablePath: EDGE, headless: "new", args: ["--no-sandbox"] });
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => log.push("PAGEERROR: " + e.message));

  // Seed localStorage with one meet (a single entry) + two swimmers (mine + watch).
  await page.goto(base);
  await page.evaluate(() => {
    const meet = {
      id: "m1", title: "Test Meet", importedAt: Date.now(), source: "upload",
      entries: [
        { event: 1, race: "100 Free", desc: "Girls 10 & Under 100 Yard Freestyle", heat: "Heat 1 of 1 Finals", lane: 4, name: "Doe, Amy", age: "10", team: "ABC", seed: "1:10.00", session: null },
        { event: 2, race: "50 Free", desc: "Boys 11-12 50 Yard Freestyle", heat: "Heat 1 of 1 Finals", lane: 3, name: "Roe, Ben", age: "12", team: "XYZ", seed: "30.00", session: null },
      ],
    };
    localStorage.setItem("meets", JSON.stringify([meet]));
    localStorage.setItem("swimmers", JSON.stringify([
      { id: "s1", name: "Doe, Amy", team: "ABC", age: 10, gender: "Girls", color: "#0b3d91" },
      { id: "s2", name: "Roe, Ben", team: "XYZ", age: 12, gender: "Boys", color: "#1f9d57", watch: true },
    ]));
  });
  await page.reload({ waitUntil: "networkidle0" });

  // --- Watching tab separates watch swimmers from mine ---
  const tabs = await page.$$eval(".tabs button", (bs) => bs.map((b) => b.textContent.trim()));
  ok(tabs.some((t) => /watch/i.test(t)), `Watching tab present (tabs: ${tabs.join("|")})`);

  // My swimmers view: should list Amy, not Ben
  const clickTab = async (re) => {
    const handles = await page.$$(".tabs button");
    for (const h of handles) {
      const txt = (await page.evaluate((el) => el.textContent.trim(), h));
      if (re.test(txt)) { await h.click(); await new Promise((r) => setTimeout(r, 300)); return true; }
    }
    return false;
  };
  await clickTab(/my swim|swimmer/i);
  let body = await page.evaluate(() => document.body.innerText);
  ok(/Amy/.test(body) && !/\bBen\b/.test(body), "My-swimmers view shows Amy only");

  await clickTab(/watch/i);
  body = await page.evaluate(() => document.body.innerText);
  ok(/Ben/.test(body) && !/\bAmy\b/.test(body), "Watching view shows Ben only");

  // --- Per-event note saves + displays ---
  await clickTab(/home|today|day/i);
  await new Promise((r) => setTimeout(r, 300));
  // open a note editor
  const addBtn = await page.$$("button");
  let noteOpened = false;
  for (const b of addBtn) {
    const t = await page.evaluate((el) => el.textContent, b);
    if (/note/i.test(t) && /add|note/i.test(t)) { await b.click(); noteOpened = true; break; }
  }
  ok(noteOpened, "Found an add-note control on an event card");
  if (noteOpened) {
    await page.waitForSelector("textarea.note-input", { timeout: 2000 });
    await page.type("textarea.note-input", "Great underwaters!");
    await page.evaluate(() => document.querySelector("textarea.note-input").blur());
    await new Promise((r) => setTimeout(r, 300));
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("notes") || "{}"));
    ok(Object.values(saved).includes("Great underwaters!"), `Note persisted to localStorage (${JSON.stringify(saved)})`);
    const shown = await page.evaluate(() => document.body.innerText);
    ok(/Great underwaters!/.test(shown), "Note text displayed on the card");
  }

  // --- Logo brand color sets header background ---
  await page.evaluate(() => { localStorage.setItem("brandColor", "#e8123a"); });
  await page.reload({ waitUntil: "networkidle0" });
  const brandVar = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--brand").trim());
  ok(brandVar === "#e8123a", `--brand CSS var applied (${brandVar})`);
  const headBg = await page.evaluate(() => {
    const el = document.querySelector(".apphead");
    return el ? getComputedStyle(el).backgroundImage : "";
  });
  ok(/232|e8123a|rgb\(\s*232/i.test(headBg), `Header gradient uses brand color (${headBg.slice(0, 80)})`);
} finally {
  console.log("\n" + log.join("\n"));
  await browser.close();
  server.close();
}
