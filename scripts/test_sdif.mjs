// Unit test for the SDIF (SD3) parser. Generates spec-accurate fixed-width records,
// parses them, and asserts the extracted entries. (Validates parsing logic + field
// mapping; a real Hy-Tek export is still needed to certify the column offsets.)
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const out = path.join(root, "scripts", ".sdif_bundle.mjs");

// Bundle sdif.ts (type-only import of parser is erased, so no pdfjs runtime dep).
execSync(`npx esbuild "${path.join(root, "src", "sdif.ts")}" --bundle --format=esm --outfile="${out}" --platform=node`, { stdio: "inherit" });
const { parseSdif, looksLikeSdif } = await import("file://" + out.replace(/\\/g, "/"));

// Place a field at its 1-based spec column into a 160-char record buffer.
function field(buf, start, len, val, right = false) {
  let s = String(val);
  if (s.length > len) s = s.slice(0, len);
  s = right ? s.padStart(len, " ") : s.padEnd(len, " ");
  for (let i = 0; i < len; i++) buf[start - 1 + i] = s[i];
}
function blank() { return Array(160).fill(" "); }
function rec(arr) { return arr.join(""); }

// Build a D0 individual-event record per the SDIF v3 column layout.
function d0({ name, age, sex, eventSex, dist, stroke, eventNo, eventAge, seed, seedC, prelim, prelimC, finals, finalsC, fHeat, fLane }) {
  const b = blank();
  field(b, 1, 2, "D0");
  field(b, 9, 28, name);
  field(b, 61, 2, age, true);
  field(b, 63, 1, sex);
  field(b, 64, 1, eventSex);
  field(b, 65, 4, dist, true);
  field(b, 69, 1, stroke);
  field(b, 70, 4, eventNo, true);
  field(b, 74, 4, eventAge);
  field(b, 86, 8, seed ?? "", true);
  field(b, 94, 1, seedC ?? "");
  field(b, 95, 8, prelim ?? "", true);
  field(b, 103, 1, prelimC ?? "");
  field(b, 113, 8, finals ?? "", true);
  field(b, 121, 1, finalsC ?? "");
  field(b, 126, 2, fHeat ?? "", true);
  field(b, 128, 2, fLane ?? "", true);
  return rec(b);
}
function b1(name) { const b = blank(); field(b, 1, 2, "B1"); field(b, 9, 30, name); return rec(b); }
function c1(code, full) { const b = blank(); field(b, 1, 2, "C1"); field(b, 9, 6, code); field(b, 15, 30, full); return rec(b); }
function a0() { const b = blank(); field(b, 1, 2, "A0"); return rec(b); }

const lines = [
  a0(),
  b1("Spring Age Group Invitational"),
  c1("PC PASA", "Palo Alto Stanford Aquatics"),
  // Amy: 100 SCY Free, finals time present (best should be the finals time)
  d0({ name: "Doe, Amy", age: "10", sex: "F", eventSex: "F", dist: "100", stroke: "1", eventNo: "1", eventAge: "0010", seed: "1:12.00", seedC: "Y", finals: "1:08.45", finalsC: "Y", fHeat: "3", fLane: "4" }),
  // Amy: 50 SCY Back, only a seed time
  d0({ name: "Doe, Amy", age: "10", sex: "F", eventSex: "F", dist: "50", stroke: "2", eventNo: "5", eventAge: "0010", seed: "41.30", seedC: "Y", fHeat: "2", fLane: "5" }),
  // Ben: 200 LCM IM, prelim + finals (best = finals)
  d0({ name: "Roe, Ben", age: "12", sex: "M", eventSex: "M", dist: "200", stroke: "5", eventNo: "12", eventAge: "1112", prelim: "2:45.10", prelimC: "L", finals: "2:42.88", finalsC: "L", fHeat: "1", fLane: "3" }),
  // Relay record should be skipped
  d0({ name: "Relay Team A", age: "10", sex: "F", eventSex: "F", dist: "200", stroke: "6", eventNo: "20", eventAge: "0010", seed: "2:10.00", seedC: "Y" }),
];
const sd3 = lines.join("\r\n") + "\r\n";

let fail = 0;
const ok = (c, m) => { console.log(`${c ? "PASS" : "FAIL"}: ${m}`); if (!c) fail++; };

ok(looksLikeSdif(sd3), "looksLikeSdif detects the file");
const r = parseSdif(sd3);
ok(r.title === "Spring Age Group Invitational", `meet title parsed (${r.title})`);
ok(r.entries.length === 3, `3 individual entries (relay skipped) — got ${r.entries.length}`);

const amyFree = r.entries.find((e) => e.name === "Doe, Amy" && /Freestyle/.test(e.desc));
ok(!!amyFree, "Amy 100 Free entry present");
ok(amyFree?.seed === "1:08.45", `best time = finals over seed (${amyFree?.seed})`);
ok(/Girls 10 & Under 100 SC Yard Freestyle/.test(amyFree?.desc || ""), `desc shaped for eventMeta (${amyFree?.desc})`);
ok(amyFree?.age === "10", `age parsed (${amyFree?.age})`);
ok(amyFree?.lane === 4, `finals lane parsed (${amyFree?.lane})`);
ok(amyFree?.heat === "Heat 3", `finals heat parsed (${amyFree?.heat})`);
ok(amyFree?.team === "Palo Alto Stanford Aquatics", `team from C1 (${amyFree?.team})`);

const amyBack = r.entries.find((e) => /Backstroke/.test(e.desc));
ok(amyBack?.seed === "41.30", `seed-only time used when no finals (${amyBack?.seed})`);

const benIM = r.entries.find((e) => e.name === "Roe, Ben");
ok(benIM?.seed === "2:42.88", `Ben IM best = finals (${benIM?.seed})`);
ok(/Boys 11-12 200 LC Meter Individual Medley/.test(benIM?.desc || ""), `Ben desc LCM IM (${benIM?.desc})`);

fs.unlinkSync(out);
process.exit(fail ? 1 : 0);
