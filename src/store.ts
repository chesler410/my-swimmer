// Local-first storage (no backend, no accounts): kids + imported meets live in
// localStorage on the device. Import = parse a heat-sheet PDF, match the family's
// swimmers by name, attach the next-cut result. COPPA-friendly: nothing leaves the phone.
import { parseHeatSheet } from "./parser";
import { computeCut, eventMeta } from "./cuts";

export interface Kid {
  id: string;
  name: string;
  team?: string;
  color: string;
}

export interface Entry {
  event: number;
  race: string;
  desc: string;
  heat: string | null;
  lane: number;
  seed: string;
  kidId: string;
  kidName: string;
  achieved?: string | null;
  nextCut?: { level: string; time: string; needed: number } | null;
}

export interface Meet {
  id: string;
  title: string;
  importedAt: number;
  entries: Entry[];
  parsedCount: number;
}

const KIDS = "kids";
const MEETS = "meets";
const COLORS = ["#0b3d91", "#1f9d57", "#b3501f", "#7d4bd0", "#c2185b", "#0a8a8a"];

const uid = () => Math.random().toString(36).slice(2, 9);

export function loadKids(): Kid[] {
  try {
    return JSON.parse(localStorage.getItem(KIDS) || "[]");
  } catch {
    return [];
  }
}
export function saveKids(k: Kid[]) {
  localStorage.setItem(KIDS, JSON.stringify(k));
}
export function loadMeets(): Meet[] {
  try {
    return JSON.parse(localStorage.getItem(MEETS) || "[]");
  } catch {
    return [];
  }
}
export function saveMeets(m: Meet[]) {
  localStorage.setItem(MEETS, JSON.stringify(m));
}

export function makeKid(name: string, team: string, index: number): Kid {
  return {
    id: uid(),
    name: name.trim(),
    team: team.trim() || undefined,
    color: COLORS[index % COLORS.length],
  };
}

const tokens = (s: string) =>
  s.toLowerCase().replace(/[.,]/g, " ").split(/\s+/).filter(Boolean);

function matches(kid: Kid, entryName: string): boolean {
  const k = tokens(kid.name);
  const e = new Set(tokens(entryName));
  return k.length > 0 && k.every((t) => e.has(t));
}

export async function importPdf(file: File, kids: Kid[]): Promise<Meet> {
  const buf = await file.arrayBuffer();
  const { title, entries } = await parseHeatSheet(buf);
  const tagged: Entry[] = [];
  for (const kid of kids) {
    for (const r of entries) {
      if (!matches(kid, r.name)) continue;
      const meta = eventMeta(r.desc);
      const cut = computeCut(r.desc, r.seed);
      tagged.push({
        event: r.event,
        race: meta.race,
        desc: r.desc,
        heat: r.heat,
        lane: r.lane,
        seed: r.seed,
        kidId: kid.id,
        kidName: kid.name,
        achieved: cut?.achieved ?? null,
        nextCut: cut?.nextCut ?? null,
      });
    }
  }
  tagged.sort((a, b) => a.event - b.event);
  return {
    id: uid(),
    title: title || file.name.replace(/\.pdf$/i, ""),
    importedAt: Date.now(),
    entries: tagged,
    parsedCount: entries.length,
  };
}
