#!/usr/bin/env python3
"""Parse USA Swimming motivational-standard PDFs into one bundled JSON.

Both the LCM and SCY age-group PDFs lay out, per visual row:
    6 girls times (B,BB,A,AA,AAA,AAAA)  <event name>  6 boys times (AAAA..B)
with "<age> Girls ... <age> Boys" rows delimiting each age band (top to bottom).
We group words into rows by y-position (tolerance for the ~2px event-name offset),
track the current age from label rows, and read 12 numerics per event row.

Output: src/standards.json -> { course: { gender: { age: { "50 FR": {B:..} }}}}
Usage: python scripts/build_standards.py
"""
import json
import re
import fitz

PDFS = {"LCM": "scripts/sources/usas_lcm_standards.pdf", "SCY": "scripts/sources/usas_scy_standards.pdf"}
LEVELS = ["B", "BB", "A", "AA", "AAA", "AAAA"]
STROKE = {"Free": "FR", "Back": "BK", "Breast": "BR", "Fly": "FL", "IM": "IM",
          "FR": "FR", "BK": "BK", "BR": "BR", "FL": "FL"}
AGE_RE = re.compile(r"(10\s*&\s*under|11-12|13-14|15-16|17-18)\s+Girls", re.I)
EVENT_RE = re.compile(r"\b(\d+)\s+(Free|Back|Breast|Fly|IM|FR|BK|BR|FL)\b")
NUM_RE = re.compile(r"[\d:]+\.\d{2}")


def norm_age(s):
    return "10U" if "under" in s.lower() else s


def rows_of(page, tol=4):
    words = sorted(page.get_text("words"), key=lambda w: (w[1], w[0]))
    rows, cur, cy = [], [], None
    for w in words:
        if cy is None or abs(w[1] - cy) <= tol:
            cur.append(w)
            cy = w[1] if cy is None else cy
        else:
            rows.append(cur)
            cur, cy = [w], w[1]
    if cur:
        rows.append(cur)
    return [" ".join(w[4] for w in sorted(r, key=lambda w: w[0])) for r in rows]


def parse_pdf(path, course, out):
    age = None
    for page in fitz.open(path):
        for text in rows_of(page):
            am = AGE_RE.search(text)
            if am:
                age = norm_age(am.group(1))
                continue
            em = EVENT_RE.search(text)
            nums = NUM_RE.findall(text)
            if not em or age is None or len(nums) != 12:
                continue
            key = f"{em.group(1)} {STROKE.get(em.group(2), em.group(2))}"
            girls = dict(zip(LEVELS, nums[:6]))                 # B..AAAA
            boys = dict(zip(LEVELS, list(reversed(nums[6:]))))  # nums[6:] is AAAA..B
            out.setdefault(course, {}).setdefault("Girls", {}).setdefault(age, {})[key] = girls
            out.setdefault(course, {}).setdefault("Boys", {}).setdefault(age, {})[key] = boys


def main():
    out = {}
    for course, path in PDFS.items():
        parse_pdf(path, course, out)
    json.dump(out, open("src/standards.json", "w", encoding="utf-8"), indent=1)
    for course in out:
        for gender in out[course]:
            ages = out[course][gender]
            n = sum(len(v) for v in ages.values())
            print(f"{course} {gender}: ages={list(ages)} ({n} event-standards)")
    print("\ncheck LCM Girls 10U 50 FR:", out["LCM"]["Girls"]["10U"].get("50 FR"))
    print("check SCY Boys 11-12 100 BK:", out["SCY"]["Boys"]["11-12"].get("100 BK"))


if __name__ == "__main__":
    main()
