# my-swimmer — roadmap & future plans

**Vision:** make meet day calm for every swim family — and grow from a personal, on-device
tool into a *shared* tool for the whole swim community (families, teams, and coaches),
without losing the things that make it good today: free, fast, private, ad-free.

---

## Where it is today (shipped)

A local-first PWA (React/TS, in-browser pdf.js parsing, data on-device):
- Multi-swimmer **family hub**; **Teams** browser + **Watch list**
- Per-event **motivational cut** (+ per-length breakdown) and **Southeastern championship cut**
- **Goal & splits** (even/realistic) + on-deck split & finish-time logging; **relays**
- **Arm-table** view (PB/Cut/Champ columns); by-date sections; cards/table
- **Timed fueling** + between-races electrolyte guidance + **.ics reminders**; warm-up/stretch/meals
- **8 languages**, light/dark theme, **team logo**, responsive desktop, refresh banner
- Bundled standards (USA Swimming 2024–2028 motivational, all ages/genders/courses; SE champ)

## Near-term (no backend needed)

- **Results-PDF import** — meets post *results* sheets in the same Hy-Tek format; reuse the parser
  to pull **actual swum times** automatically → real PBs, cuts achieved, season progress.
  *(Highest-value next; closest thing to "real-time" that's actually obtainable.)*
- **Re-enable offline** — bring back a proper service worker (precaching) now that the
  blank-page/cache issues are stable, keeping the refresh banner.
- **Finish translations** — full coverage for FR/RU and the longer About/prep/fuel text; invite
  native-speaker corrections via the feedback form.
- **More standards** — SE winter/SCY champ doc; other LSCs' championship cuts; sectionals/futures/
  junior-national cuts; source from official LSC pages. Sources backed up in `scripts/sources/`.
- **Polish** — add-a-swimmer re-matches existing meets; share/print the arm chart; "up next" countdown.

## The "shared tool" leap (needs accounts + a backend)

This is the step from *personal* to *community*. It introduces a server, so it's a deliberate
crossing — weighed against privacy and cost.

- **Accounts + cloud sync** — set up swimmers once, see them on both parents' phones.
- **Shared team pages & branding** — a team's logo/colors and roster maintained centrally
  (today's logo is per-device on purpose); coaches/managers publish a meet's lineups.
- **Coach / team-admin view** — whole-team rosters, relay planning, heat-sheet distribution.
- **Sharing** — send a swimmer's day or an arm chart to family; group/team links.
- **Notifications** — "you're up in ~N events," fuel reminders as push (needs the SW + opt-in).

### Guardrails for that step
- **COPPA / minors' privacy** is the gating concern: storing children's data on a server triggers
  real obligations (consent, privacy policy, retention). Local-first sidesteps most of it; cloud
  must be designed for it from day one.
- Keep a **free tier**; never sell data; ad-free.

## Data & "real-time" reality

- **Meet Mobile (Active Network)** live results have **no public API** (proprietary/paywalled) —
  we can't legally/reliably link to them. The realistic substitutes: **results-PDF import**
  (near-real-time, within hours) and **on-deck manual entry** (live).
- **USA Swimming Data Hub** (historical times/rankings) is **Sisense-locked** — no clean API.
  We use the heat sheet's seed time as the best-time proxy; results PDFs improve on that.
- **Heat/psych/results PDFs** (Hy-Tek) remain the reliable, ToS-safe backbone.

## Native app

Already a PWA. To reach the app stores: wrap with **Capacitor** (same codebase → iOS/Android
shells), enabling store listings, reliable offline, and true push. Mostly packaging + assets +
a privacy policy; the core carries over directly.

## Sustainability (stay free for families)

- **Free + optional tip jar** to start.
- **Club/team sponsorship** (B2B) is the cleaner revenue path than charging parents.
- **Freemium** later (cloud sync / premium standards) — only once the free tier is loved.

## Get involved

Feedback drives this — in-app **💬 Send feedback** (Google Form) → triaged into GitHub issues.
Native-speaker translation fixes and standards PDFs for other LSCs are especially welcome.
