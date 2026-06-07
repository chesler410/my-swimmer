# my-swimmer 🏊

A free, ad-free **meet-day companion** for swim families. Add your swimmers once, import a
meet's heat sheet, and see all your kids' events on one page — sectioned by date.

### ▶️ Live app: https://chesler410.github.io/my-swimmer/  ·  Demo: [?demo](https://chesler410.github.io/my-swimmer/?demo)

It's *not* another stats database (myswimio / SwimCloud already do history). It's built for
the cold pool deck at 6am: "what's my kid swimming, when, what do they need to beat, and
when do they eat."

## What it does

- **All your swimmers on one page**, grouped by **session/date** (Friday Afternoon, …)
- **Per event:** heat, lane, seed (best), and the **next motivational cut to beat** (+delta)
- **🏆 Southeastern championship cut** per event — qualified ✓ or how much to drop
- **Arm-table view** — compact `Ev · Swim · Ht · Ln` to copy onto a swimmer's arm, by date
- **Live swimmer search** — search the meet's actual roster (with team) so you pick the right one
- **Hydration & fueling** tips around the schedule
- **Dark mode**, installable PWA, works offline

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

Live and in use. Recent: family hub (multi-swimmer), in-browser PDF import, live roster
search, by-date sections, SE championship cuts, dark mode. Next ideas in
[`docs/roadmap.md`](docs/roadmap.md): paste-link helper deploy, relays, fueling by session
start times, SE cuts for 15-16/17-18.
