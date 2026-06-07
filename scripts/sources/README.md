# Standards source PDFs (backups)

These are the **public time-standard PDFs** the bundled data is parsed from. No swimmer
PII — safe to commit. The app ships the *parsed* JSON (`src/standards.json`,
`src/se_champs.json`), so it never fetches these at runtime; these are kept so the data is
reproducible and new seasons can be added.

Re-generate after changing a PDF:
- `python scripts/build_standards.py`   → src/standards.json
- `python scripts/build_se_champs.py`   → src/se_champs.json

| File | What | Source (pulled 2026-06-07) |
|---|---|---|
| `usas_lcm_standards.pdf` | USA Swimming 2024–2028 motivational, LCM, all ages/genders | gomotionapp.com/catcc/.../2028-usa-motivational-lcm |
| `usas_scy_standards.pdf` | USA Swimming 2024–2028 motivational, SCY, all ages/genders | gomotionapp.com/ncwave/.../scy---2028-motivational-standards-age-group |
| `se_lc_champs.pdf` | Southeastern 2026 Summer LC Championship qualifying times (LCM+SCY columns) | gomotionapp.com/semtac/.../2026-ses-summer-lc-championship-time-standards-final |

TODO: source from the official Southeastern LSC site for authority; add the winter/SCY
champ doc (this LC doc omits 100/200 breast for all ages — see app's "no SE champ" note).
