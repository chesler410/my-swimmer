// SDIF (SD3) parser — the Hy-Tek / USA Swimming Standard Data Interchange Format.
// SDIF is a fixed-width, record-per-line text format (each record is 160 chars + CRLF,
// tagged by a 2-char type code). We read the file-description (A0), meet (B1), team (C1)
// and individual-event (D0) records and turn each D0 into the same RawEntry shape the
// PDF parser produces, so the rest of the app (cuts, roster, progress) just works.
//
// Column layout follows the published SDIF v3 D0 spec. Offsets are 1-based in the spec;
// the COL map below is 0-based [start, end) for JS slicing and kept in one place so a real
// export can be diffed against it. NOTE: built to spec — validate against a real .sd3.
import type { RawEntry } from "./parser";

// Recognized SDIF record by its 2-char type code at the start of each line.
const rec = (line: string) => line.slice(0, 2);

// D0 individual-event record field columns (0-based, [start, end)).
const D0 = {
  name: [8, 36] as const,
  age: [60, 62] as const,
  sex: [62, 63] as const,
  eventSex: [63, 64] as const,
  distance: [64, 68] as const,
  stroke: [68, 69] as const,
  eventNo: [69, 73] as const,
  eventAge: [73, 77] as const,
  seedTime: [85, 93] as const,
  seedCourse: [93, 94] as const,
  prelimTime: [94, 102] as const,
  prelimCourse: [102, 103] as const,
  finalsTime: [112, 120] as const,
  finalsCourse: [120, 121] as const,
  prelimHeat: [121, 123] as const,
  prelimLane: [123, 125] as const,
  finalsHeat: [125, 127] as const,
  finalsLane: [127, 129] as const,
};

const cut = (line: string, span: readonly [number, number]) => line.slice(span[0], span[1]).trim();

const STROKE_WORD: Record<string, string> = {
  "1": "Freestyle", "2": "Backstroke", "3": "Breaststroke", "4": "Butterfly",
  "5": "Individual Medley", "6": "Freestyle Relay", "7": "Medley Relay",
};
// Course/status code → the literal phrase eventMeta() keys on. Both numeric and the
// alpha codes Hy-Tek sometimes emits are accepted; unknown defaults to SC Yard (US club norm).
const COURSE_WORD: Record<string, string> = {
  "1": "SC Meter", "2": "SC Yard", "3": "LC Meter",
  S: "SC Meter", Y: "SC Yard", L: "LC Meter",
};

const TIME = /^\d{0,2}:?\d{1,2}\.\d{2}$/;
// A real, usable time (not NT / NS / DQ / 0.00 placeholders).
function cleanTime(t: string): string | null {
  const s = t.trim();
  if (!s || !TIME.test(s)) return null;
  if (/^0*:?0*\.0*$/.test(s)) return null;
  return s;
}

// SDIF event age code "lluu" → an age-group phrase eventMeta() recognizes.
function ageGroupPhrase(code: string): string {
  const lo = code.slice(0, 2).trim();
  const hi = code.slice(2, 4).trim();
  const loN = parseInt(lo, 10);
  const hiN = parseInt(hi, 10);
  const loZero = !lo || loN === 0;
  const hiOpen = !hi || hiN === 0 || hiN >= 99;
  if (loZero && hiOpen) return "Open";
  if (loZero && !hiOpen) return `${hiN} & Under`;
  if (!loZero && hiOpen) return `${loN} & Over`;
  return `${loN}-${hiN}`;
}

// Split raw text into SDIF records. Normally one record per line; if a file has no line
// breaks (some exports), fall back to fixed 160-char chunks.
function toRecords(text: string): string[] {
  const lines = text.split(/\r\n|\r|\n/).filter((l) => l.length > 2);
  if (lines.length > 1) return lines;
  const one = text.replace(/[\r\n]/g, "");
  if (one.length > 160 && /^[A-Z]\d/.test(one)) {
    const out: string[] = [];
    for (let i = 0; i + 2 <= one.length; i += 160) out.push(one.slice(i, i + 160));
    return out;
  }
  return lines;
}

export interface ParsedSdif {
  title: string;
  entries: RawEntry[];
}

// True if the buffer looks like SDIF text (starts with an A0 file-description record, or
// has B1/D0 records). Used to route imports away from the PDF parser.
export function looksLikeSdif(text: string): boolean {
  const head = text.slice(0, 4000);
  return /^A0/.test(head.trimStart()) || /(^|\n)\s*D0/.test(head) || /(^|\n)\s*B1/.test(head);
}

export function parseSdif(text: string): ParsedSdif {
  const records = toRecords(text);
  let title = "Meet";
  let team = "";
  const entries: RawEntry[] = [];
  let evCounter = 0;

  for (const line of records) {
    const code = rec(line);
    if (code === "B1") {
      const name = line.slice(8, 38).trim();
      if (name) title = name;
    } else if (code === "C1") {
      // Team ID: prefer the full team name (chars 15–44), fall back to the team code (9–14).
      const full = line.slice(14, 44).trim();
      const abbr = line.slice(8, 14).trim();
      team = full || abbr || team;
    } else if (code === "D0") {
      const stroke = cut(line, D0.stroke);
      const strokeWord = STROKE_WORD[stroke];
      if (!strokeWord || stroke === "6" || stroke === "7") continue; // individual events only

      const name = cut(line, D0.name);
      if (!name || !name.includes(",")) continue;
      const dist = cut(line, D0.distance).replace(/^0+/, "") || cut(line, D0.distance);
      if (!dist) continue;

      // Best available time: finals > prelim > seed. Carry its course code for the phrase.
      const finals = cleanTime(cut(line, D0.finalsTime));
      const prelim = cleanTime(cut(line, D0.prelimTime));
      const seed = cleanTime(cut(line, D0.seedTime));
      const best = finals || prelim || seed || "NT";
      const courseCode =
        finals ? cut(line, D0.finalsCourse) : prelim ? cut(line, D0.prelimCourse) : cut(line, D0.seedCourse);
      const courseWord = COURSE_WORD[courseCode] || COURSE_WORD[courseCode.toUpperCase()] || "SC Yard";

      const eventSex = cut(line, D0.eventSex) || cut(line, D0.sex);
      const gender = /f/i.test(eventSex) ? "Girls" : /m/i.test(eventSex) ? "Boys" : "";
      const phrase = ageGroupPhrase(cut(line, D0.eventAge));
      const desc = [gender, phrase, dist, courseWord, strokeWord].filter(Boolean).join(" ");

      const evRaw = cut(line, D0.eventNo);
      const evNum = parseInt(evRaw, 10);
      const finalsHeat = cut(line, D0.finalsHeat);
      const prelimHeat = cut(line, D0.prelimHeat);
      const heatNo = finals ? finalsHeat : prelimHeat || finalsHeat;
      const laneRaw = finals ? cut(line, D0.finalsLane) : cut(line, D0.prelimLane) || cut(line, D0.finalsLane);

      entries.push({
        event: Number.isFinite(evNum) ? evNum : ++evCounter,
        desc,
        heat: heatNo ? `Heat ${parseInt(heatNo, 10) || heatNo}` : null,
        lane: parseInt(laneRaw, 10) || 0,
        name,
        age: cut(line, D0.age),
        team,
        seed: best,
        session: null,
      });
    }
  }
  return { title, entries };
}
