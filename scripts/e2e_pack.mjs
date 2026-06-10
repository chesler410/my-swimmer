// E2E: meet pack (.myswimmer.json) — export a meet's parsed entries + result overlay as a
// file, then re-import it on a cleared device and verify entries, times (re-keyed onto the
// new meet id), start, and sourceUrl all survive.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json" };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]).replace(/^\/my-swimmer/, "");
  if (p === "/" || p === "") p = "/index.html";
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
const base = `http://localhost:${server.address().port}/my-swimmer/`;
const tmp = path.join(__dirname, ".tmp-pack.myswimmer.json");

const browser = await puppeteer.launch({ executablePath: EDGE, headless: "new", args: ["--no-sandbox"] });
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => log.push("PAGEERROR: " + e.message));

  // Capture the download instead of letting the browser save it.
  await page.evaluateOnNewDocument(() => {
    const orig = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (b) => { window.__packBlob = b; return orig(b); };
    HTMLAnchorElement.prototype.click = function () { window.__packName = this.download; };
  });

  // Seed: a parent with one swimmer, an UPLOADED meet (no share link possible), a logged
  // time for it, and an unrelated result that must NOT leak into the pack.
  await page.goto(base);
  await page.evaluate(() => {
    localStorage.setItem("role", "parent");
    localStorage.setItem("swimmers", JSON.stringify([{ id: "s1", name: "Bornstein, Cassia", team: "X", age: 10, gender: "Girls", color: "#0b3d91" }]));
    localStorage.setItem("meets", JSON.stringify([{
      id: "m1", title: "Long Course Meet", importedAt: Date.now(), source: "upload",
      sourceUrl: "http://example.com/heats.pdf", start: "2026-06-05",
      entries: [{ event: 1, race: "800 Free", desc: "Girls 10 & Under 800 LC Meter Freestyle", heat: "Heat 1 of 1 Finals", lane: 4, name: "Bornstein, Cassia", age: "10", team: "X", seed: "15:15.00", session: "Friday Morning" }],
    }]));
    localStorage.setItem("results", JSON.stringify({ "m1|1|Bornstein, Cassia": "13:56.62", "otherMeet|3|Roe, Ben": "59.99" }));
  });
  await page.goto(base, { waitUntil: "networkidle0" });

  // --- Export ---
  const btn = await page.$(".meet-pack");
  ok(!!btn, "Export (meet pack) button shown for an uploaded meet");
  await btn.click();
  let dl = null;
  for (let i = 0; i < 20 && !dl; i++) {
    await new Promise((r) => setTimeout(r, 200));
    dl = await page.evaluate(async () => (window.__packBlob ? { name: window.__packName, text: await window.__packBlob.text() } : null));
  }
  ok(!!dl, "Pack download produced");
  ok(dl?.name === "long-course-meet.myswimmer.json", `filename slugified (${dl?.name})`);
  const pack = JSON.parse(dl.text);
  ok(pack.app === "my-swimmer" && pack.kind === "meet-pack" && pack.v === 1, `pack signature exact (${pack.app}/${pack.kind}/v${pack.v})`);
  ok(pack.meet.title === "Long Course Meet" && pack.meet.start === "2026-06-05" && pack.meet.sourceUrl === "http://example.com/heats.pdf", "pack meet keeps title/start/sourceUrl");
  ok(!("id" in pack.meet) && !("importedAt" in pack.meet), "pack meet carries no device-local id/importedAt");
  ok(pack.meet.entries.length === 1 && pack.meet.entries[0].seed === "15:15.00", "entries included as stored");
  ok(pack.results["1|Bornstein, Cassia"] === "13:56.62", `result key has meet-id stripped (${JSON.stringify(pack.results)})`);
  ok(!Object.keys(pack.results).some((k) => /Roe/.test(k)), "other meets' results not leaked into the pack");

  // --- Re-import on a cleared device ---
  fs.writeFileSync(tmp, dl.text);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("role", "parent");
    localStorage.setItem("swimmers", JSON.stringify([{ id: "s1", name: "Bornstein, Cassia", team: "X", age: 10, gender: "Girls", color: "#0b3d91" }]));
  });
  await page.goto(`${base}?tab=import`, { waitUntil: "networkidle0" });
  const input = await page.$('input[type=file][accept^="application/pdf"]');
  ok(!!input, "Upload input accepts files on Add meet");
  ok(await page.evaluate((el) => el.accept.includes(".json"), input), "file input accept includes .json");
  await input.uploadFile(tmp);

  let meets = [];
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 300));
    meets = await page.evaluate(() => JSON.parse(localStorage.getItem("meets") || "[]"));
    if (meets.length) break;
  }
  ok(meets.length === 1, `pack imported as a meet (${meets.length})`);
  const m = meets[0] || {};
  ok(m.id && m.id !== "m1", `new device-local id assigned (${m.id})`);
  ok(m.title === "Long Course Meet" && m.start === "2026-06-05" && m.sourceUrl === "http://example.com/heats.pdf", "title/start/sourceUrl survive the round trip");
  ok(m.entries?.length === 1 && m.entries[0].name === "Bornstein, Cassia" && m.entries[0].seed === "15:15.00" && m.entries[0].session === "Friday Morning", "entries survive the round trip");
  const res = await page.evaluate(() => JSON.parse(localStorage.getItem("results") || "{}"));
  ok(res[`${m.id}|1|Bornstein, Cassia`] === "13:56.62", `bundled time re-keyed onto the new meet id (${JSON.stringify(res)})`);
} finally {
  console.log("\n" + log.join("\n"));
  if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  await browser.close();
  server.close();
}
