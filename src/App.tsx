import { useState } from "react";
import {
  Kid,
  Meet,
  Entry,
  loadKids,
  saveKids,
  loadMeets,
  saveMeets,
  makeKid,
  importPdf,
} from "./store.ts";
import day from "./day.json";

type Nav = "home" | "kids" | "import" | "about";

function displayName(n: string): string {
  if (n.includes(",")) {
    const [last, first] = n.split(",").map((s) => s.trim());
    return first ? `${first} ${last}` : last;
  }
  return n;
}

const STROKE_ABBR: Record<string, string> = {
  Free: "FR", Back: "BK", Breast: "BR", Fly: "FL", IM: "IM",
};
function swimAbbr(race: string): string {
  const [dist, ...rest] = race.split(" ");
  const stroke = rest.join(" ");
  return `${dist} ${STROKE_ABBR[stroke] ?? stroke}`;
}
function heatNum(h: string | null): string {
  const m = h?.match(/Heat\s+(\d+)/);
  return m ? m[1] : "—";
}
function firstName(n: string): string {
  return displayName(n).split(" ")[0];
}

function sampleMeet(): Meet {
  const d = day as any;
  return {
    id: "sample",
    title: d.meet + " (sample)",
    importedAt: Date.now(),
    parsedCount: d.events.length,
    entries: d.events.map((e: any) => ({
      event: e.event,
      race: e.race,
      desc: e.desc,
      heat: e.heat,
      lane: e.lane,
      seed: e.seed,
      kidId: "sample",
      kidName: "Sample Swimmer",
      achieved: e.achieved ?? null,
      nextCut: e.nextCut ?? null,
    })),
  };
}

function levelClass(lvl?: string | null) {
  return "lvl lvl-" + (lvl ? lvl.toLowerCase() : "none");
}

function EntryCard({ e, color, showKid }: { e: Entry; color: string; showKid: boolean }) {
  const close = e.nextCut && e.nextCut.needed <= 1.0;
  return (
    <div className={"card event" + (close ? " close" : "")}>
      <div className="ev-top">
        {showKid && (
          <span className="kid-tag" style={{ background: color }}>
            {firstName(e.kidName)}
          </span>
        )}
        <span className="ev-num">#{e.event}</span>
        <span className="ev-race">{e.race}</span>
        {e.achieved && <span className={levelClass(e.achieved)}>{e.achieved}</span>}
      </div>
      <div className="ev-meta">
        <span>{e.heat ?? "Heat TBD"}</span>
        <span className="lane">Lane {e.lane}</span>
        <span>
          Best <strong>{e.seed}</strong>
        </span>
      </div>
      {e.nextCut ? (
        <div className="cut">
          <span>
            Next cut → <strong>{e.nextCut.level}</strong> {e.nextCut.time}
          </span>
          <span className={"need" + (close ? " need-close" : "")}>
            drop {e.nextCut.needed.toFixed(2)}s{close ? " — so close! 🔥" : ""}
          </span>
        </div>
      ) : (
        <div className="cut muted">No standard for this event</div>
      )}
    </div>
  );
}

function ArmTable({ entries, kids }: { entries: Entry[]; kids: Kid[] }) {
  const multi = new Set(entries.map((e) => e.kidId)).size > 1;
  return (
    <div className="card">
      <table className="arm">
        <thead>
          <tr>
            {multi && <th>Who</th>}
            <th>Ev</th>
            <th>Swim</th>
            <th>Ht</th>
            <th>Ln</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={i}>
              {multi && (
                <td
                  style={{ color: kids.find((k) => k.id === e.kidId)?.color ?? "#888", fontWeight: 600 }}
                >
                  {firstName(e.kidName)}
                </td>
              )}
              <td className="mono">{e.event}</td>
              <td>{swimAbbr(e.race)}</td>
              <td className="mono">{heatNum(e.heat)}</td>
              <td className="mono">{e.lane}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted arm-note">
        Ev = event #, Ht = heat, Ln = lane. FR free · BK back · BR breast · FL fly · IM.
      </p>
    </div>
  );
}

function Fueling() {
  return (
    <section className="card fuel">
      <h2>💧 Fueling &amp; hydration</h2>
      <ul>
        <li>Sip water steadily all session — don't wait until thirsty.</li>
        <li>Light carb snack ~60–90 min before the first race (banana, toast, granola bar).</li>
        <li>Between races more than ~45 min apart: small snack + a few sips.</li>
        <li>Avoid heavy or new foods within ~45 min of a race.</li>
        <li>Warm/ready ~20–30 min before each event is called.</li>
      </ul>
    </section>
  );
}

function Disclaimer() {
  const [hidden, setHidden] = useState(
    () => localStorage.getItem("dismiss-disclaimer") === "1"
  );
  if (hidden) return null;
  return (
    <div className="disclaimer">
      <span>
        ⚠️ Events are auto-read from the meet's PDF. PDF reading isn't perfect —{" "}
        <strong>always double-check against the official heat sheet.</strong>
      </span>
      <button
        onClick={() => {
          localStorage.setItem("dismiss-disclaimer", "1");
          setHidden(true);
        }}
      >
        Got it
      </button>
    </div>
  );
}

const DEMO = location.search.includes("demo");
const DEMO_KID: Kid = { id: "sample", name: "Sample Swimmer", color: "#0b3d91" };

export function App() {
  const [nav, setNav] = useState<Nav>("home");
  const [kids, setKids] = useState<Kid[]>(() => {
    const stored = loadKids();
    return stored.length === 0 && DEMO ? [DEMO_KID] : stored;
  });
  const [meets, setMeets] = useState<Meet[]>(() => {
    const stored = loadMeets();
    return stored.length === 0 && DEMO ? [sampleMeet()] : stored;
  });
  const [view, setView] = useState<"cards" | "table">(() => {
    const h = location.hash.replace("#", "");
    if (h === "table" || h === "cards") return h;
    return (localStorage.getItem("view") as "cards" | "table") || "cards";
  });
  const [active, setActive] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  function persistKids(k: Kid[]) {
    setKids(k);
    saveKids(k);
  }
  function persistMeets(m: Meet[]) {
    setMeets(m);
    saveMeets(m);
  }
  function pickView(v: "cards" | "table") {
    setView(v);
    localStorage.setItem("view", v);
  }
  function toggleKid(id: string) {
    const next = new Set(active);
    next.has(id) ? next.delete(id) : next.add(id);
    setActive(next);
  }
  const isShown = (e: Entry) => active.size === 0 || active.has(e.kidId);

  async function onFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setBusy(true);
    setMsg("");
    const added: Meet[] = [];
    let err = "";
    for (const f of Array.from(files)) {
      try {
        added.push(await importPdf(f, kids));
      } catch {
        err = `Couldn't read ${f.name}. Is it a Hy-Tek heat sheet PDF?`;
      }
    }
    if (added.length) {
      persistMeets([...added, ...meets]);
      const matched = added.reduce((n, m) => n + m.entries.length, 0);
      setMsg(`Imported ${added.length} file(s) — ${matched} event(s) matched your swimmers.`);
      setNav("home");
    } else if (err) {
      setMsg(err);
    }
    setBusy(false);
  }

  return (
    <div className="app">
      <header className="apphead">
        <div className="brand">🏊 my-swimmer</div>
        <nav className="tabs">
          {(["home", "import", "kids", "about"] as Nav[]).map((t) => (
            <button key={t} className={nav === t ? "on" : ""} onClick={() => setNav(t)}>
              {t === "import" ? "Add meet" : t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </nav>
      </header>

      {nav === "home" && (
        <Home
          kids={kids}
          meets={meets}
          view={view}
          pickView={pickView}
          active={active}
          toggleKid={toggleKid}
          isShown={isShown}
          loadSample={() => persistMeets([sampleMeet(), ...meets])}
          goImport={() => setNav("import")}
          goKids={() => setNav("kids")}
          removeMeet={(id) => persistMeets(meets.filter((m) => m.id !== id))}
        />
      )}

      {nav === "import" && (
        <ImportView kids={kids} busy={busy} msg={msg} onFiles={onFiles} goKids={() => setNav("kids")} />
      )}

      {nav === "kids" && (
        <KidsView kids={kids} persistKids={persistKids} />
      )}

      {nav === "about" && <About />}
    </div>
  );
}

function Home(props: {
  kids: Kid[];
  meets: Meet[];
  view: "cards" | "table";
  pickView: (v: "cards" | "table") => void;
  active: Set<string>;
  toggleKid: (id: string) => void;
  isShown: (e: Entry) => boolean;
  loadSample: () => void;
  goImport: () => void;
  goKids: () => void;
  removeMeet: (id: string) => void;
}) {
  const { kids, meets, view, pickView, active, toggleKid, isShown } = props;
  const allEntries = meets.flatMap((m) => m.entries).filter(isShown);
  const closest = [...allEntries]
    .filter((e) => e.nextCut)
    .sort((a, b) => a.nextCut!.needed - b.nextCut!.needed)
    .slice(0, 3);

  if (kids.length === 0) {
    return (
      <Empty
        title="Add your swimmer(s)"
        body="Set up each of your kids once. We'll find their events in any meet you import — all on one page."
        cta="Add a swimmer"
        onCta={props.goKids}
      />
    );
  }
  if (meets.length === 0) {
    return (
      <Empty
        title="Add a meet"
        body="Import the meet's heat-sheet PDF(s) and we'll pull every one of your kids' events, with the next cut to beat."
        cta="Add a meet"
        onCta={props.goImport}
        secondary="Load a sample meet"
        onSecondary={props.loadSample}
      />
    );
  }

  return (
    <>
      <Disclaimer />

      {kids.length > 1 && (
        <div className="chips">
          {kids.map((k) => (
            <button
              key={k.id}
              className={"chip" + (active.size === 0 || active.has(k.id) ? " on" : "")}
              style={
                active.size === 0 || active.has(k.id)
                  ? { background: k.color, borderColor: k.color, color: "#fff" }
                  : {}
              }
              onClick={() => toggleKid(k.id)}
            >
              {firstName(k.name)}
            </button>
          ))}
        </div>
      )}

      {closest.length > 0 && (
        <section className="card highlight">
          <h2>🎯 Closest to a new cut</h2>
          {closest.map((e, i) => (
            <div className="hl-row" key={i}>
              <span>
                {kids.length > 1 ? `${firstName(e.kidName)} · ` : ""}
                {e.race}
              </span>
              <span className="hl-need">
                {e.nextCut!.level} in {e.nextCut!.needed.toFixed(2)}s
              </span>
            </div>
          ))}
        </section>
      )}

      <Fueling />

      <div className="events-head">
        <h2 className="section-title">Meets ({meets.length})</h2>
        <div className="seg">
          <button className={view === "cards" ? "on" : ""} onClick={() => pickView("cards")}>
            Cards
          </button>
          <button className={view === "table" ? "on" : ""} onClick={() => pickView("table")}>
            Arm table
          </button>
        </div>
      </div>

      {meets.map((m) => {
        const shown = m.entries.filter(isShown);
        return (
          <div className="meet-block" key={m.id}>
            <div className="meet-head">
              <h3>{m.title}</h3>
              <button className="remove" onClick={() => props.removeMeet(m.id)} aria-label="Remove meet">
                ✕
              </button>
            </div>
            {shown.length === 0 ? (
              <p className="muted meet-empty">
                No matched events{m.parsedCount ? ` (read ${m.parsedCount} entries; names didn't match — check spelling on the Kids tab)` : ""}.
              </p>
            ) : view === "cards" ? (
              shown.map((e, i) => (
                <EntryCard key={i} e={e} color={kids.find((k) => k.id === e.kidId)?.color ?? "#888"} showKid={kids.length > 1} />
              ))
            ) : (
              <ArmTable entries={shown} kids={kids} />
            )}
          </div>
        );
      })}
    </>
  );
}

function Empty(props: {
  title: string;
  body: string;
  cta: string;
  onCta: () => void;
  secondary?: string;
  onSecondary?: () => void;
}) {
  return (
    <div className="card empty">
      <h2>{props.title}</h2>
      <p>{props.body}</p>
      <button className="primary" onClick={props.onCta}>
        {props.cta}
      </button>
      {props.secondary && (
        <button className="link" onClick={props.onSecondary}>
          {props.secondary}
        </button>
      )}
    </div>
  );
}

function ImportView(props: {
  kids: Kid[];
  busy: boolean;
  msg: string;
  onFiles: (f: FileList | null) => void;
  goKids: () => void;
}) {
  if (props.kids.length === 0) {
    return (
      <Empty
        title="Add a swimmer first"
        body="We match events to your kids by name, so add at least one swimmer before importing a meet."
        cta="Add a swimmer"
        onCta={props.goKids}
      />
    );
  }
  return (
    <div className="card empty">
      <h2>Add a meet</h2>
      <p>
        Choose the meet's heat-sheet PDF(s). Many meets post one PDF per session — pick them all;
        each becomes a section. Everything is read on your phone; nothing is uploaded.
      </p>
      <label className="primary filelabel">
        {props.busy ? "Reading…" : "Choose PDF(s)"}
        <input
          type="file"
          accept="application/pdf"
          multiple
          disabled={props.busy}
          onChange={(e) => props.onFiles(e.target.files)}
          hidden
        />
      </label>
      {props.msg && <p className="muted importmsg">{props.msg}</p>}
    </div>
  );
}

function KidsView(props: { kids: Kid[]; persistKids: (k: Kid[]) => void }) {
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  function add() {
    if (!name.trim()) return;
    props.persistKids([...props.kids, makeKid(name, team, props.kids.length)]);
    setName("");
    setTeam("");
  }
  return (
    <div>
      <div className="card">
        <h2>Your swimmers</h2>
        {props.kids.length === 0 && <p className="muted">No swimmers yet — add one below.</p>}
        {props.kids.map((k) => (
          <div className="kid-row" key={k.id}>
            <span className="kid-dot" style={{ background: k.color }} />
            <span className="kid-name">
              {displayName(k.name)} {k.team && <span className="muted">· {k.team}</span>}
            </span>
            <button
              className="remove"
              onClick={() => props.persistKids(props.kids.filter((x) => x.id !== k.id))}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="card">
        <h2>Add a swimmer</h2>
        <p className="muted">Use the name as it appears in heat sheets (first + last is fine).</p>
        <input className="field" placeholder="Swimmer name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="field" placeholder="Team (optional)" value={team} onChange={(e) => setTeam(e.target.value)} />
        <button className="primary" onClick={add}>
          Add swimmer
        </button>
      </div>
    </div>
  );
}

function About() {
  return (
    <div className="card about">
      <h2>About my-swimmer</h2>
      <p>
        A free, ad-free meet-day companion for swim families. Import a meet's published heat sheet,
        see all your kids' events on one page, the next motivational cut to beat, and fueling tips.
      </p>
      <h3>Your privacy</h3>
      <p>
        Everything runs on your device. Your kids' names and meet data are stored only in this
        browser and are never uploaded to a server. Clearing your browser data removes them.
      </p>
      <h3>Please double-check</h3>
      <p>
        Events are auto-read from PDF heat sheets, which isn't perfect. Always verify event, heat,
        and lane against the official posted heat sheet before a race. This app is informational and
        not responsible for missed events.
      </p>
      <h3>Not affiliated</h3>
      <p className="muted">
        Not affiliated with or endorsed by USA Swimming, Meet Mobile, or any meet host. It simply
        reads heat sheets you provide. Time standards are USA Swimming 2024–2028 motivational
        standards.
      </p>
      <p className="muted">Made by a swim parent. Feedback welcome.</p>
    </div>
  );
}
