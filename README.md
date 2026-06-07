# my-swimmer 🏊

A free, ad-free **meet-day companion** for swim families. Add your swimmers once, import a
meet's heat sheet, and see all your kids' events on one page — sectioned by date.

### ▶️ Live app: https://chesler410.github.io/my-swimmer/  ·  Demo: [?demo](https://chesler410.github.io/my-swimmer/?demo)

It's *not* another stats database (myswimio / SwimCloud already do history). It's built for
the cold pool deck at 6am: "what's my kid swimming, when, what do they need to beat, and
when do they eat."

## What it does

- **The whole family on one page** — add multiple swimmers, grouped by **session/date**
- **Per event:** heat, lane, seed (best), the **next motivational cut** (+delta, ≈ per length),
  and the **🏆 Southeastern championship cut** (qualified ✓ or how much to drop)
- **Live roster search** + **Teams** browser — pick swimmers by name or by team; **Watch list**
  for following teammates/rivals alongside your own kids
- **Relays** included (swimmer shown as a leg, with the team time)
- **Goal & splits** — target splits to hit a goal or a specific cut (even or realistic pacing),
  plus log actual splits and finish times on deck
- **Arm-table view** — compact `Ev · Ht · Ln · Swim` (+ optional PB / Cut / Champ columns) to
  copy onto a swimmer's arm, sectioned by date
- **Timed fueling & hydration** — enter the first-race time for a clock-time plan, between-races
  electrolyte guidance, and **calendar reminders (.ics)**; plus warm-up / stretching / meals
- **8 languages** (EN/ES/ZH/PT/DE/VI/FR/RU), **light/dark theme**, **team logo**, responsive
  desktop layout, installable

## How to use

1. **Add meet** → upload the heat-sheet PDF(s), or paste a direct PDF link.
2. **Swimmers** → search the meet roster and tap your kids (or add by name).
3. **Home** → everyone's events, by date, with cuts and fueling. Toggle **Cards / Arm table**.

## Design & privacy

- **Local-first PWA** — no accounts, no backend. Your swimmers' names and meet data live only
  in your browser and are never uploaded. COPPA-friendly by design.
- **In-browser parsing** — heat sheets (Hy-Tek Meet Manager) are parsed on your device with
  pdf.js. Course (LCM/SCY) and age group are read from each event.
- **Time standards** are bundled (USA Swimming 2024–2028 motivational, all ages/genders/courses;
  Southeastern championship cuts). Refreshed per season; not a live feed.
- **No live "rankings" API exists** — USA Swimming's data is locked (Sisense), so the heat
  sheet's seed time is used as the best-time proxy. See [`docs/data-sources.md`](docs/data-sources.md).
- Not affiliated with USA Swimming, Meet Mobile, or any meet host.

**Real meet PDFs contain minors' info and are git-ignored — never commit them.**

## Project layout

- `src/` — the PWA (React + TypeScript + Vite). `parser.ts` (pdf.js heat-sheet parser),
  `cuts.ts` (standards + cuts), `store.ts` (local storage), `App.tsx` (UI).
- `scripts/` — Python builders for the bundled data: `build_standards.py`,
  `build_se_champs.py` (run when standards change), plus the original PyMuPDF parser.
- `proxy/` — optional Cloudflare Worker so "paste a link" can fetch host-blocked PDFs.
- `docs/` — decisions, data-source research, parsing notes, roadmap.

## Develop

```bash
npm install
npm run dev      # local dev
npm run build    # production build (CI sets APP_BASE=/my-swimmer/ for GitHub Pages)
```

Deploys to GitHub Pages on push to `main` via `.github/workflows/deploy.yml`.

## Status

Live and in active use by swim families, iterating on their feedback. Offline support is
temporarily off (the service worker is self-destroying while we stabilize rapid releases);
an in-app **"new version — refresh"** banner covers updates meanwhile.

**Where it's headed** — turning this into a shared tool for the whole swim community
(accounts + cloud sync, shared team pages, results-PDF import for real times, a native app):
see [`docs/roadmap.md`](docs/roadmap.md).
