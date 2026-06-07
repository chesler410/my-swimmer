// E2E: SD3 upload through the real import UI + the Progress view (best time + improvement).
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "..", "dist");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml" };

// --- build a small spec-accurate SD3 for Amy: 100 SCY Free finals 1:08.45 ---
function field(buf, start, len, val, right = false) {
  let s = String(val); if (s.length > len) s = s.slice(0, len);
  s = right ? s.padStart(len, " ") : s.padEnd(len, " ");
  for (let i = 0; i < len; i++) buf[start - 1 + i] = s[i];
}
const blank = () => Array(160).fill(" ");
const join = (a) => a.join("");
function d0(o) {
  const b = blank(); field(b, 1, 2, "D0"); field(b, 9, 28, o.name); field(b, 61, 2, o.age, true);
  field(b, 63, 1, o.sex); field(b, 64, 1, o.eventSex); field(b, 65, 4, o.dist, true); field(b, 69, 1, o.stroke);
  field(b, 70, 4, o.eventNo, true); field(b, 74, 4, o.eventAge); field(b, 86, 8, o.seed ?? "", true); field(b, 94, 1, o.seedC ?? "");
  field(b, 113, 8, o.finals ?? "", true); field(b, 121, 1, o.finalsC ?? ""); field(b, 126, 2, o.fHeat ?? "", true); field(b, 128, 2, o.fLane ?? "", true);
  return join(b);
}
const b1 = (n) => { const b = blank(); field(b, 1, 2, "B1"); field(b, 9, 30, n); return join(b); };
const c1 = () => { const b = blank(); field(b, 1, 2, "C1"); field(b, 9, 6, "PC PASA"); field(b, 15, 30, "Palo Alto Stanford"); return join(b); };
const sd3 = ["A0", b1("State Champs"), c1(),
  d0({ name: "Doe, Amy", age: "10", sex: "F", eventSex: "F", dist: "100", stroke: "1", eventNo: "1", eventAge: "0010", seed: "1:10.00", seedC: "Y", finals: "1:08.45", finalsC: "Y", fHeat: "3", fLane: "4" }),
].join("\r\n") + "\r\n";
const sd3Path = path.join(os.tmpdir(), "test_statechamps.sd3");
fs.writeFileSync(sd3Path, sd3);

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
const browser = await puppeteer.launch({ executablePath: EDGE, headless: "new", args: ["--no-sandbox"] });
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => log.push("PAGEERROR: " + e.message));

  // Pre-seed Amy (mine) + an earlier meet where she swam 100 Free slower (1:12.00).
  await page.goto(base);
  await page.evaluate(() => {
    localStorage.setItem("swimmers", JSON.stringify([
      { id: "s1", name: "Doe, Amy", team: "PASA", age: 10, gender: "Girls", color: "#0b3d91" },
    ]));
    localStorage.setItem("meets", JSON.stringify([{
      id: "m0", title: "Fall Meet", importedAt: Date.now() - 1e6, source: "upload",
      entries: [{ event: 1, race: "100 Free", desc: "Girls 10 & Under 100 SC Yard Freestyle", heat: "Heat 1 of 1 Finals", lane: 4, name: "Doe, Amy", age: "10", team: "PASA", seed: "1:12.00", session: null }],
    }]));
  });
  await page.reload({ waitUntil: "networkidle0" });

  const clickTab = async (re) => {
    for (const h of await page.$$(".tabs button")) {
      const txt = await page.evaluate((el) => el.textContent.trim(), h);
      if (re.test(txt)) { await h.click(); await new Promise((r) => setTimeout(r, 300)); return true; }
    }
    return false;
  };

  // --- Upload the SD3 through the real import UI ---
  await clickTab(/add meet|import/i);
  await page.waitForSelector('input[type=file]', { timeout: 3000 });
  const input = await page.$('input[type=file]');
  await input.uploadFile(sd3Path);
  await new Promise((r) => setTimeout(r, 800));
  const meets = await page.evaluate(() => JSON.parse(localStorage.getItem("meets") || "[]"));
  const sdMeet = meets.find((m) => m.title === "State Champs");
  ok(!!sdMeet, `SD3 imported as a meet (${meets.map((m) => m.title).join(", ")})`);
  ok(sdMeet && sdMeet.entries[0].seed === "1:08.45", `SD3 entry carries finals time (${sdMeet?.entries[0]?.seed})`);
  ok(sdMeet && sdMeet.entries[0].race === "100 Free", `SD3 entry race derived (${sdMeet?.entries[0]?.race})`);

  // --- Progress view: best time + improvement drop ---
  ok(await clickTab(/progress|progrès|progreso|fortschritt/i), "Progress tab present and clickable");
  await new Promise((r) => setTimeout(r, 300));
  const body = await page.evaluate(() => document.body.innerText);
  ok(/1:08\.45/.test(body), "Progress shows best time 1:08.45 (faster of the two meets)");
  ok(/▼3\.55/.test(body), `Progress shows improvement drop ▼3.55 (1:12.00→1:08.45) — body had: ${(body.match(/▼[\d.]+/) || ["none"])[0]}`);
  ok(/Amy/.test(body), "Progress lists the swimmer");
} finally {
  console.log("\n" + log.join("\n"));
  await browser.close();
  server.close();
  fs.unlinkSync(sd3Path);
}
