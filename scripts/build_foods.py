#!/usr/bin/env python3
"""Build a compact foods.json from USDA FoodData Central CSVs.

Sources (public domain / CC0):
  - SR Legacy CSV, April 2018
  - Foundation Foods CSV, April 2026
    (October 2026 Foundation archive was missing food/food_nutrient/food_portion tables)

Never fabricates nutrient values. Foods lacking Energy (kcal) are omitted.
Values are stored per 100 g.
"""
from __future__ import annotations

import csv
import json
import re
import zipfile
from collections import defaultdict
from datetime import date
from pathlib import Path

SR_ZIP = Path("/tmp/usda/sr_legacy.zip")
FF_ZIP = Path("/tmp/usda/foundation_apr.zip")
SR_DIR = Path("/tmp/usda/sr/FoodData_Central_sr_legacy_food_csv_2018-04")
FF_DIR = Path("/tmp/usda/ff/FoodData_Central_foundation_food_csv_2026-04-30")
OUT = Path("/workspace/macro_app/data/foods.json")

# USDA nutrient ids
NID_KCAL = "1008"
NID_KCAL_ATWATER_G = "2047"
NID_KCAL_ATWATER_S = "2048"
NID_PROTEIN = "1003"
NID_FAT = "1004"
NID_CARB = "1005"

GENERIC_PORTION_RE = re.compile(
    r"^(?:1 )?(?:oz|ounce|g|gram|grams|gr)\b", re.I
)


def r1(n: float) -> float:
    return round(float(n) + 0.0, 1)


def r0(n: float) -> float:
    v = float(n)
    return float(int(v)) if abs(v - round(v)) < 1e-9 else r1(v)


def fmt_amt(raw: str) -> str:
    try:
        v = float(raw)
    except (TypeError, ValueError):
        return str(raw or "1").strip()
    if abs(v - round(v)) < 1e-9:
        return str(int(round(v)))
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return s


def load_units(path: Path) -> dict[str, str]:
    with path.open(encoding="utf-8", newline="") as f:
        return {row["id"]: row["name"] for row in csv.DictReader(f)}


def load_foods(path: Path, data_type: str | None = None) -> dict[str, dict]:
    out = {}
    with path.open(encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            if data_type and row.get("data_type") != data_type:
                continue
            out[row["fdc_id"]] = row
    return out


def load_nutrients(path: Path, keep_ids: set[str]) -> dict[str, dict[str, float]]:
    nuts: dict[str, dict[str, float]] = defaultdict(dict)
    with path.open(encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            fid = row["fdc_id"]
            if fid not in keep_ids:
                continue
            nid = row["nutrient_id"]
            if nid not in (NID_KCAL, NID_KCAL_ATWATER_G, NID_KCAL_ATWATER_S, NID_PROTEIN, NID_FAT, NID_CARB):
                continue
            try:
                amt = float(row["amount"])
            except (TypeError, ValueError):
                continue
            nuts[fid][nid] = amt
    return nuts


def portion_label(amount, unit_name, portion_description, modifier) -> str:
    desc = (portion_description or "").strip()
    mod = (modifier or "").strip()
    unit = (unit_name or "").strip()
    amt = fmt_amt(amount) if amount not in (None, "") else "1"
    if desc:
        # Some descriptions already include the amount
        low = desc.lower()
        if low.startswith(amt + " ") or low[0:1].isdigit():
            label = desc
        else:
            label = f"{amt} {desc}"
        if mod and mod.lower() not in label.lower():
            label = f"{label}, {mod}"
        return " ".join(label.split())
    if unit and unit.lower() not in ("undetermined", "undetermined unit"):
        label = f"{amt} {unit}"
        if mod and mod.lower() not in label.lower():
            label = f"{label}, {mod}"
        return " ".join(label.split())
    if mod:
        return " ".join(f"{amt} {mod}".split())
    return f"{amt} serving"


def is_generic_portion(label: str, grams: float) -> bool:
    if GENERIC_PORTION_RE.search(label.strip()):
        return True
    # 1 oz ≈ 28.35 g
    if abs(grams - 28.35) < 0.05 and "oz" in label.lower():
        return True
    return False


def load_portions(path: Path, units: dict[str, str], keep_ids: set[str]) -> dict[str, list[list]]:
    buckets: dict[str, list[list]] = defaultdict(list)
    seen: dict[str, set] = defaultdict(set)
    with path.open(encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            fid = row["fdc_id"]
            if fid not in keep_ids:
                continue
            try:
                grams = float(row["gram_weight"])
            except (TypeError, ValueError):
                continue
            if grams <= 0:
                continue
            unit = units.get(row.get("measure_unit_id", ""), "")
            label = portion_label(row.get("amount"), unit, row.get("portion_description"), row.get("modifier"))
            if not label:
                continue
            key = (re.sub(r"\s+", " ", label.lower()), round(grams, 1))
            if key in seen[fid]:
                continue
            seen[fid].add(key)
            buckets[fid].append([label, r1(grams)])

    # Prefer distinctive household measures; keep generics only if needed
    out: dict[str, list[list]] = {}
    for fid, items in buckets.items():
        distinctive = [p for p in items if not is_generic_portion(p[0], p[1])]
        chosen = distinctive or items
        # Stable, shorter first, cap at 6
        chosen.sort(key=lambda p: (len(p[0]), p[1]))
        # Dedupe near-identical gram weights (within 0.5 g) keeping shorter label
        deduped = []
        used_g = []
        for lab, g in chosen:
            if any(abs(g - ug) < 0.5 for ug in used_g):
                continue
            deduped.append([lab, g])
            used_g.append(g)
            if len(deduped) >= 6:
                break
        out[fid] = deduped
    return out


def kcal_of(n: dict[str, float]) -> float | None:
    for nid in (NID_KCAL, NID_KCAL_ATWATER_S, NID_KCAL_ATWATER_G):
        if nid in n:
            return n[nid]
    return None


def normalize_name(name: str) -> str:
    s = name.lower()
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return " ".join(s.split())


def build_records(prefix: str, foods: dict, nutrients: dict, portions: dict) -> list:
    records = []
    skipped = 0
    for fid, food in foods.items():
        n = nutrients.get(fid, {})
        kcal = kcal_of(n)
        if kcal is None:
            skipped += 1
            continue
        # Require the macro keys to be present so we never invent values.
        if NID_PROTEIN not in n or NID_FAT not in n or NID_CARB not in n:
            skipped += 1
            continue
        name = (food.get("description") or "").strip()
        if not name:
            skipped += 1
            continue
        rec = [
            f"{prefix}{fid}",
            name,
            r1(kcal),
            r1(n[NID_PROTEIN]),
            r1(n[NID_CARB]),
            r1(n[NID_FAT]),
            portions.get(fid, []),
        ]
        records.append(rec)
    return records, skipped


def main() -> None:
    if not SR_DIR.exists():
        zipfile.ZipFile(SR_ZIP).extractall("/tmp/usda/sr")
    if not FF_DIR.exists():
        zipfile.ZipFile(FF_ZIP).extractall("/tmp/usda/ff")

    sr_foods = load_foods(SR_DIR / "food.csv")
    sr_units = load_units(SR_DIR / "measure_unit.csv")
    sr_nuts = load_nutrients(SR_DIR / "food_nutrient.csv", set(sr_foods))
    sr_portions = load_portions(SR_DIR / "food_portion.csv", sr_units, set(sr_foods))
    sr_records, sr_skip = build_records("s", sr_foods, sr_nuts, sr_portions)

    ff_foods = load_foods(FF_DIR / "food.csv", data_type="foundation_food")
    ff_units = load_units(FF_DIR / "measure_unit.csv")
    ff_nuts = load_nutrients(FF_DIR / "food_nutrient.csv", set(ff_foods))
    ff_portions = load_portions(FF_DIR / "food_portion.csv", ff_units, set(ff_foods))
    ff_records, ff_skip = build_records("f", ff_foods, ff_nuts, ff_portions)

    seen = {normalize_name(r[1]) for r in sr_records}
    ff_unique = []
    ff_dup = 0
    for rec in ff_records:
        key = normalize_name(rec[1])
        if key in seen:
            ff_dup += 1
            continue
        seen.add(key)
        ff_unique.append(rec)

    # Sort: shorter everyday names first? Alphabetical is better for debugging; search doesn't care.
    foods = sr_records + ff_unique
    foods.sort(key=lambda r: r[1].lower())

    payload = {
        "meta": {
            "source": "USDA FoodData Central",
            "license": "Public domain (CC0 1.0)",
            "citation": "U.S. Department of Agriculture, Agricultural Research Service. FoodData Central. fdc.nal.usda.gov",
            "datasets": [
                {
                    "name": "SR Legacy",
                    "release": "April 2018",
                    "file": "FoodData_Central_sr_legacy_food_csv_2018-04.zip",
                    "included": len(sr_records),
                    "skipped_missing_nutrients": sr_skip,
                },
                {
                    "name": "Foundation Foods",
                    "release": "April 2026",
                    "file": "FoodData_Central_foundation_food_csv_2026-04-30.zip",
                    "included": len(ff_unique),
                    "skipped_missing_nutrients": ff_skip,
                    "skipped_name_overlap_with_sr": ff_dup,
                    "note": "October 2026 Foundation CSV archive (FoodData_Central_foundation_food_csv_2026-10-29.zip) was incomplete (no food.csv / food_nutrient.csv / food_portion.csv), so April 2026 was used instead.",
                },
            ],
            "built": date.today().isoformat(),
            "count": len(foods),
            "basis": "Nutrient values are per 100 g. Portions list household measures with gram weights from food_portion.",
            "keys": ["id", "name", "kcal", "protein", "carbs", "fat", "portions[ [name, grams], ... ]"],
        },
        "foods": foods,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))

    size = OUT.stat().st_size
    with_p = sum(1 for r in foods if r[6])
    print(f"Wrote {OUT} ({size} bytes, {size/1024/1024:.2f} MB)")
    print(f"Foods: {len(foods)} (SR {len(sr_records)}, Foundation unique {len(ff_unique)}, FF overlap skipped {ff_dup})")
    print(f"Skipped missing nutrients: SR {sr_skip}, FF {ff_skip}")
    print(f"With at least one portion: {with_p}")


if __name__ == "__main__":
    main()
