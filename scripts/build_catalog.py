#!/usr/bin/env python3
"""Build compact restaurant + grocery catalogs from public USDA data.

Sources (public domain / CC0 — values are never invented):
  - FoodData Central Branded Foods, October 2026 CSV
    FoodData_Central_branded_food_csv_2026-10-29.zip
    Curated US grocery products with complete energy + macros.
  - FoodData Central Survey Foods / FNDDS 2021-2023 JSON
    FoodData_Central_survey_food_json_2024-10-31.zip
    Fast-food and restaurant items (generic and a few chain-named).

Existing SR Legacy / Foundation chain items stay in data/foods.json
and are classified in the app (not duplicated here).
"""
from __future__ import annotations

import csv
import io
import json
import re
import zipfile
from collections import defaultdict
from datetime import date
from pathlib import Path

BRANDED_ZIP = Path("/tmp/usda/branded_csv.zip")
BRANDED_PREFIX = "FoodData_Central_branded_food_csv_2026-10-29/"
SURVEY_ZIP = Path("/tmp/usda/survey_json.zip")
FOODS_JSON = Path("/workspace/macro_app/data/foods.json")
OUT_GROCERY = Path("/workspace/macro_app/data/grocery.json")
OUT_RESTAURANTS = Path("/workspace/macro_app/data/restaurants.json")

NID_KCAL = "1008"
NID_KCAL_ATWATER_G = "2047"
NID_KCAL_ATWATER_S = "2048"
NID_PROTEIN = "1003"
NID_FAT = "1004"
NID_CARB = "1005"

# National / widely sold US grocery brands (brand_name or brand_owner).
HERO_BRAND_RE = re.compile(
    r"\b("
    r"chobani|yoplait|dannon|danone|activia|oikos|fage|siggi|siggis|"
    r"light ?\+ ?fit|fairlife|horizon organics?|organic valley|"
    r"silk|almond breeze|oatly|califia|ripple foods|so delicious|"
    r"premier protein|ensure|boost|muscle milk|orgain|owyn|"
    r"gatorade|powerade|vitaminwater|vitamin water|la croix|lacroix|"
    r"bubly|aha sparkling|perrier|s\.?pellegrino|san pellegrino|"
    r"red bull|monster energy|celsius|alani[\s-]?nu|"
    r"coca-?cola|\bcoke\b|pepsi|sprite|fanta|dr\.? ?pepper|diet pepsi|"
    r"mountain dew|canada dry|schweppes|dasani|aquafina|evian|fiji water|"
    r"smartwater|poland spring|deer park|core hydration|"
    r"lay'?s|lays|doritos|cheetos|fritos|tostitos|ruffles|sun chips|"
    r"sunchips|pringles|cheez-?it|goldfish|ritz|wheat thins|triscuit|"
    r"club crackers|town house|oreo|chips ahoy|nilla|belvita|"
    r"nature valley|fiber one|larabar|kind |kind bars?|\bclif\b|clif bar|"
    r"rxbar|rx bar|quaker|nature'?s path|kashi|cheerios|lucky charms|"
    r"cinnamon toast crunch|wheaties|\bchex\b|special k|frosted flakes|"
    r"froot loops|rice krispies|corn flakes|raisin bran|mini-?wheats|"
    r"honey bunches|grape-?nuts|kashi go|"
    r"thomas'|thomas english|arnold bread|sara lee|nature'?s own|"
    r"dave'?s killer|oroweat|pepperidge farm|wonder bread|"
    r"mission tortilla|guerrero|old el paso|"
    r"barilla|de cecco|ronzoni|banza|raos?|prego|ragu|ragú|bertolli|"
    r"classico|hunts|hunt'?s|heinz|campbell'?s|progresso|amy'?s|"
    r"stouffer'?s|lean cuisine|healthy choice|smart ones|"
    r"marie callender|hungry-?man|banquet|evol |"
    r"tyson|perdue|hormel|oscar mayer|hillshire|hebrew national|"
    r"jimmy dean|johnsonville|applegate|boar'?s head|"
    r"land o lakes|land o'?lakes|cabot|tillamook|sargento|kraft|"
    r"velveeta|philadelphia|laughing cow|babybel|the laughing cow|"
    r"daisy sour|breakstone|"
    r"smucker'?s|jif|skippy|peter pan|nutella|justin'?s|"
    r"kellogg|kellanova|general mills|post consumer|nestle|nestlé|"
    r"mars chocolate|hershey|mondelez|mondelēz|nabisco|ferrero|lindt|"
    r"ghirardelli|"
    r"ben & jerry|haagen-?dazs|häagen-?dazs|breyers|talenti|"
    r"magnum|klondike|good humor|edy'?s|dreyer'?s|halo top|yasso|"
    r"tropicana|minute maid|simply orange|florida'?s natural|"
    r"ocean spray|v8 |bolthouse|naked juice|"
    r"crystal light|kool-?aid|"
    r"planters|wonderful|blue diamond|emerald nuts|"
    r"sabra|wholly guacamole|"
    r"rotel|ro\*tel|bush'?s|goya|"
    r"mccormick|hidden valley|ken'?s|newman'?s own|wish-?bone|"
    r"frank'?s redhot|tabasco|cholula|sriracha|"
    r"rice-?a-?roni|knorr|near east|mahatma|ben'?s original|uncle ben|"
    r"success rice|minute rice|idahoan|ore-?ida|birds eye|green giant|"
    r"del monte|dole|fresh express|taylor farms|"
    r"tombstone|digiorno|di giorno|red baron|totino|"
    r"butterball|jennie-?o|kikkoman|la choy|"
    r"sun-?maid|quest bar|quest nutrition|atkins|pure protein|"
    r"core power|fairlife core|"
    r"capri sun|yazoo|nesquik|carnation|"
    r"eggland|egglands best|"
    r"maple leaf|louis rich|"
    r"annies|annie'?s|cascadian farm|"
    r"tostitos|smartfood|chester'?s|"
    r"gatorade|bodyarmor|body armor|vitaminwater"
    r")\b",
    re.I,
)

STORE_BRAND_RE = re.compile(
    r"\b("
    r"great value|good & gather|good and gather|favorite day|"
    r"simply nature|market pantry|freshness guaranteed|marketside|"
    r"bettergoods|kirkland signature|\bkirkland\b|member'?s mark|"
    r"365 whole foods|365 everyday|wellsley farms|"
    r"simple truth|private selection|\bkroger\b|food club|"
    r"signature select|o organics|open nature|lucerne|"
    r"happy belly|amazon kitchen|solimo|"
    r"best choice|that'?s smart|clover valley|"
    r"wegmans|publix"
    r")\b",
    re.I,
)

# Fix accidental typo in STORE_BRAND_RE - I'll overwrite properly in Python after... 
# Actually I'll define STORE_BRAND_RE again below if typo. Let me just not include mezzetta wait.

SKIP_NAME_RE = re.compile(
    r"^(not a branded item|unprepared|n/a|none|unknown)\b",
    re.I,
)

CHAIN_IN_NAME = re.compile(
    r"(mcdonald'?s|burger king|wendy'?s|taco bell|chick-fil-a|"
    r"chipotle mexican|subway |kfc,|popeyes|pizza hut|domino'?s|"
    r"dunkin|starbucks|arby'?s|dairy queen|sonic drive|"
    r"panda express|five guys|whataburger|jack in the box|"
    r"panera|olive garden|applebee|raising cane|zaxby|"
    r"white castle|little caesar|papa john|buffalo wild|"
    r"wingstop|in-n-out|culver'?s)",
    re.I,
)

FNDDS_KEEP = re.compile(
    r"fast food|from restaurant|from a restaurant|"
    r"mcdonald'?s|burger king|wendy'?s|taco bell|chick-fil-a|"
    r"chipotle \(|"  # avoid chipotle dip
    r"\(subway|subway,|kfc,|\(kfc|popeyes|pizza hut|domino'?s|"
    r"dunkin|starbucks|arby'?s|dairy queen|sonic|"
    r"panda express|five guys|whataburger|jack in the box|"
    r"panera bread|olive garden|applebee|raising cane|"
    r"white castle|little caesar|papa john|buffalo wild|"
    r"wingstop|in-n-out|culver",
    re.I,
)

# "Chipotle dip" is a grocery dip, not the restaurant.
FNDDS_EXCLUDE = re.compile(r"^chipotle dip\b", re.I)

US_COUNTRIES = {"united states", "us", "usa"}

SERVING_UNITS_G = {
    "g", "gr", "gm", "grm", "gram", "grams", "gramme", "grammes",
}
SERVING_UNITS_ML = {
    "ml", "mlt", "milliliter", "millilitre", "milliliters", "millilitres",
}
SERVING_UNITS_OZ = {"oz", "onz", "ounce", "ounces"}

GENERIC_PORTION_RE = re.compile(
    r"^(?:1 )?(?:oz|ounce|g|gram|grams|gr|ml)\b", re.I
)


def r1(n: float) -> float:
    return round(float(n) + 0.0, 1)


def r0(n: float) -> float:
    v = float(n)
    return float(int(round(v))) if abs(v - round(v)) < 1e-9 else r1(v)


def norm_space(s: str) -> str:
    return " ".join((s or "").split())


def norm_key(*parts: str) -> str:
    s = " ".join(norm_space(p) for p in parts if p)
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return " ".join(s.split())


def energy_of(nuts: dict[str, float]) -> float | None:
    for nid in (NID_KCAL, NID_KCAL_ATWATER_S, NID_KCAL_ATWATER_G):
        if nid in nuts:
            return nuts[nid]
    return None


def serving_grams(size_raw, unit_raw) -> float | None:
    try:
        size = float(size_raw)
    except (TypeError, ValueError):
        return None
    if size <= 0 or size > 5000:
        return None
    unit = (unit_raw or "").strip().lower()
    if unit in SERVING_UNITS_G or unit in SERVING_UNITS_ML:
        return size
    if unit in SERVING_UNITS_OZ:
        return size * 28.3495
    return None


def portion_from_branded(row: dict) -> list:
    grams = serving_grams(row.get("serving_size"), row.get("serving_size_unit"))
    if not grams:
        return []
    label = norm_space(row.get("household_serving_fulltext") or "")
    if not label:
        unit = (row.get("serving_size_unit") or "g").strip()
        size = row.get("serving_size") or ""
        try:
            n = float(size)
            size = str(int(n)) if abs(n - round(n)) < 1e-9 else f"{n:.2f}".rstrip("0").rstrip(".")
        except (TypeError, ValueError):
            size = str(size)
        label = f"{size} {unit}".strip()
    grams = r1(grams)
    if grams <= 0:
        return []
    return [[label, grams]]


def brand_label(row: dict) -> str:
    for key in ("brand_name", "brand_owner"):
        v = norm_space(row.get(key) or "")
        if v and not re.search(r"^not a branded item$", v, re.I):
            # Prefer shorter brand_name
            if key == "brand_name":
                return v
            return v
    return ""


def is_hero(row: dict) -> bool:
    blob = " ".join(
        [
            row.get("brand_name") or "",
            row.get("subbrand_name") or "",
            row.get("brand_owner") or "",
        ]
    )
    return bool(HERO_BRAND_RE.search(blob))


def is_store(row: dict) -> bool:
    blob = " ".join(
        [
            row.get("brand_name") or "",
            row.get("subbrand_name") or "",
            row.get("brand_owner") or "",
        ]
    )
    return bool(STORE_BRAND_RE.search(blob))


def parse_date(s: str) -> str:
    return (s or "")[:10]


def load_existing_names() -> set[str]:
    data = json.loads(FOODS_JSON.read_text())
    return {norm_key(row[1]) for row in data["foods"]}


def iter_csv(z: zipfile.ZipFile, name: str):
    with z.open(name) as raw:
        f = io.TextIOWrapper(raw, encoding="utf-8", errors="replace", newline="")
        yield from csv.DictReader(f)


def select_branded_candidates() -> dict[str, dict]:
    """Pick a compact US grocery set. Values are metadata only (no nutrients yet)."""
    hero: dict[str, list[dict]] = defaultdict(list)
    store: dict[str, list[dict]] = defaultdict(list)
    other_count = 0
    unit_counts = defaultdict(int)
    considered = 0
    print("Scanning branded_food.csv for US grocery candidates…")
    with zipfile.ZipFile(BRANDED_ZIP) as z:
        for row in iter_csv(z, BRANDED_PREFIX + "branded_food.csv"):
            country = (row.get("market_country") or "").strip().lower()
            if country not in US_COUNTRIES:
                continue
            if (row.get("discontinued_date") or "").strip():
                continue
            grams = serving_grams(row.get("serving_size"), row.get("serving_size_unit"))
            if not grams:
                continue
            unit_counts[(row.get("serving_size_unit") or "").strip().lower()] += 1
            considered += 1
            rec = {
                "fdc_id": row["fdc_id"],
                "brand_owner": norm_space(row.get("brand_owner") or ""),
                "brand_name": norm_space(row.get("brand_name") or ""),
                "subbrand_name": norm_space(row.get("subbrand_name") or ""),
                "gtin": (row.get("gtin_upc") or "").strip(),
                "serving_size": row.get("serving_size"),
                "serving_size_unit": row.get("serving_size_unit"),
                "household": norm_space(row.get("household_serving_fulltext") or ""),
                "category": norm_space(row.get("branded_food_category") or ""),
                "modified": parse_date(row.get("modified_date") or row.get("available_date") or ""),
                "hero": False,
                "store": False,
            }
            if is_hero(row):
                rec["hero"] = True
                key = norm_key(rec["brand_name"] or rec["brand_owner"]) or "hero"
                hero[key].append(rec)
            elif is_store(row):
                rec["store"] = True
                key = norm_key(rec["brand_name"] or rec["brand_owner"]) or "store"
                store[key].append(rec)

    def pick(groups: dict[str, list[dict]], cap: int) -> list[dict]:
        out = []
        for key, items in groups.items():
            # latest first; prefer household serving text
            items.sort(
                key=lambda r: (
                    1 if r["household"] else 0,
                    r["modified"],
                    1 if r["gtin"] else 0,
                ),
                reverse=True,
            )
            seen = set()
            kept = []
            for r in items:
                # Dedup by GTIN or rough brand-less later; here by gtin + household
                dk = r["gtin"] or (r["household"] + r["modified"] + r["fdc_id"])
                if r["gtin"]:
                    if r["gtin"] in seen:
                        continue
                    seen.add(r["gtin"])
                kept.append(r)
                if len(kept) >= cap:
                    break
            out.extend(kept)
        return out

    # Generous caps then we trim after nutrients if needed
    picked = pick(hero, 80) + pick(store, 40)
    # If a GTIN appears twice, keep newer
    by_gtin = {}
    nodup = []
    for r in picked:
        if r["gtin"]:
            prev = by_gtin.get(r["gtin"])
            if prev is not None:
                if r["modified"] > prev["modified"]:
                    nodup.remove(prev)
                    nodup.append(r)
                    by_gtin[r["gtin"]] = r
                continue
            by_gtin[r["gtin"]] = r
        nodup.append(r)

    print(
        f"  considered with serving {considered:,}; hero groups {len(hero)}; "
        f"store groups {len(store)}; candidates {len(nodup):,}"
    )
    print("  serving units:", dict(sorted(unit_counts.items(), key=lambda kv: -kv[1])[:12]))
    return {r["fdc_id"]: r for r in nodup}


def load_food_names(ids: set[str]) -> dict[str, str]:
    print(f"Reading food.csv names for {len(ids):,} ids…")
    names = {}
    with zipfile.ZipFile(BRANDED_ZIP) as z:
        for row in iter_csv(z, BRANDED_PREFIX + "food.csv"):
            fid = row.get("fdc_id")
            if fid in ids:
                names[fid] = norm_space(row.get("description") or "")
                if len(names) == len(ids):
                    break
    print(f"  found names {len(names):,}")
    return names


def load_nutrients(ids: set[str]) -> dict[str, dict[str, float]]:
    print(f"Scanning food_nutrient.csv for {len(ids):,} ids (this is the slow pass)…")
    keep = {NID_KCAL, NID_KCAL_ATWATER_G, NID_KCAL_ATWATER_S, NID_PROTEIN, NID_FAT, NID_CARB}
    nuts: dict[str, dict[str, float]] = defaultdict(dict)
    n = 0
    with zipfile.ZipFile(BRANDED_ZIP) as z:
        for row in iter_csv(z, BRANDED_PREFIX + "food_nutrient.csv"):
            n += 1
            fid = row.get("fdc_id")
            if fid not in ids:
                continue
            nid = row.get("nutrient_id")
            if nid not in keep:
                continue
            try:
                amt = float(row["amount"])
            except (TypeError, ValueError):
                continue
            nuts[fid][nid] = amt
            if n % 2_000_000 == 0:
                print(f"    …scanned {n:,} nutrient rows, matched foods {len(nuts):,}")
    print(f"  scanned {n:,} rows; foods with some macros {len(nuts):,}")
    return nuts


def trim_grocery(foods: list, target: int, per_brand: int) -> list:
    """Keep the catalog small enough for phones."""
    groups = defaultdict(list)
    for row in foods:
        brand = (row[7] or "").strip() or "(unknown)"
        groups[brand].append(row)
    picked = []
    for brand, items in groups.items():
        items.sort(key=lambda r: (1 if r[6] else 0, -len(r[1] or "")), reverse=True)
        seen = set()
        kept = []
        for row in items:
            short = " ".join(norm_key(row[1]).split()[:6])
            if short in seen:
                continue
            seen.add(short)
            kept.append(row)
            if len(kept) >= per_brand:
                break
        picked.extend(kept)
    if len(picked) > target:
        by = defaultdict(list)
        for row in picked:
            by[(row[7] or "").strip() or "(unknown)"].append(row)
        selected = []
        leftovers = []
        for items in by.values():
            selected.append(items[0])
            leftovers.extend(items[1:])
        leftovers.sort(key=lambda r: (1 if r[6] else 0, -len(r[1] or "")), reverse=True)
        selected.extend(leftovers[: max(0, target - len(selected))])
        picked = selected
    picked.sort(key=lambda r: ((r[7] or "").lower(), (r[1] or "").lower()))
    return picked


def build_grocery() -> dict:
    cands = select_branded_candidates()
    ids = set(cands)
    names = load_food_names(ids)
    nuts = load_nutrients(ids)
    foods = []
    skipped_missing = 0
    skipped_name = 0
    seen_name = set()
    for fid, meta in cands.items():
        name = names.get(fid) or ""
        if not name or SKIP_NAME_RE.search(name):
            skipped_name += 1
            continue
        n = nuts.get(fid) or {}
        kcal = energy_of(n)
        if kcal is None or NID_PROTEIN not in n or NID_CARB not in n or NID_FAT not in n:
            skipped_missing += 1
            continue
        # Skip obviously broken values
        if kcal < 0 or kcal > 900:
            skipped_missing += 1
            continue
        if any(n[k] < 0 or n[k] > 100 for k in (NID_PROTEIN, NID_CARB, NID_FAT)):
            skipped_missing += 1
            continue
        brand = meta["brand_name"] or meta["brand_owner"]
        if brand.lower() == "not a branded item":
            brand = ""
        key = norm_key(brand, name)
        if key in seen_name:
            continue
        seen_name.add(key)
        portions = portion_from_branded(meta)
        row = [
            "b" + fid,
            name,
            r0(kcal),
            r1(n[NID_PROTEIN]),
            r1(n[NID_CARB]),
            r1(n[NID_FAT]),
            portions,
            brand,
            "grocery",
            "usda-branded",
        ]
        if meta["gtin"]:
            row.append(meta["gtin"])
        foods.append(row)

    foods.sort(key=lambda r: (r[7].lower(), r[1].lower()))
    foods = trim_grocery(foods, 10000, 22)
    meta = {
        "source": "USDA FoodData Central Branded Foods",
        "license": "Public domain (CC0 1.0)",
        "citation": "U.S. Department of Agriculture, Agricultural Research Service. FoodData Central, Branded Foods, October 2026. fdc.nal.usda.gov",
        "release": "October 2026",
        "file": "FoodData_Central_branded_food_csv_2026-10-29.zip",
        "built": date.today().isoformat(),
        "count": len(foods),
        "basis": "Nutrient values are per 100 g as published by FDC. The first portion is the label serving size (ml treated as grams, a common FDC label convention).",
        "skipped_missing_nutrients": skipped_missing,
        "skipped_name": skipped_name,
        "selection": "Curated US products from widely sold national and store brands with a usable serving size and complete energy/protein/carb/fat. Not the full branded database.",
        "keys": [
            "id",
            "name",
            "kcal",
            "protein",
            "carbs",
            "fat",
            "portions[ [name, grams], ... ]",
            "brand",
            "kind",
            "source",
            "barcode?",
        ],
    }
    print(f"Grocery kept {len(foods):,}; skipped missing {skipped_missing:,}; skipped name {skipped_name:,}")
    return {"meta": meta, "foods": foods}


def fndds_portions(food: dict) -> list:
    out = []
    seen = set()
    for p in food.get("foodPortions") or []:
        try:
            grams = float(p.get("gramWeight") or 0)
        except (TypeError, ValueError):
            continue
        if grams <= 0:
            continue
        label = norm_space(p.get("portionDescription") or "")
        if not label or re.search(r"quantity not specified", label, re.I):
            continue
        if GENERIC_PORTION_RE.search(label) and grams in (100.0, 28.0, 28.3, 28.4, 28.35):
            continue
        grams = r1(grams)
        key = (label.lower(), grams)
        if key in seen:
            continue
        seen.add(key)
        out.append([label, grams])
    return out


def fndds_nutrients(food: dict) -> dict[int, float]:
    out = {}
    for row in food.get("foodNutrients") or []:
        nut = row.get("nutrient") or {}
        nid = nut.get("id")
        if nid not in (1008, 1003, 1004, 1005, 2047, 2048):
            continue
        try:
            out[int(nid)] = float(row.get("amount"))
        except (TypeError, ValueError):
            continue
    return out


def brand_from_fndds(desc: str) -> str:
    m = re.search(
        r"(McDonald'?s|Burger King|Wendy'?s|Taco Bell|Chick-fil-A|Chipotle|"
        r"Subway|KFC|Popeyes|Pizza Hut|Domino'?s|Dunkin'?|Starbucks|"
        r"Arby'?s|Dairy Queen|Sonic|Panda Express|Five Guys|Whataburger|"
        r"Jack in the Box|Panera|Olive Garden|Applebee'?s|Raising Cane'?s|"
        r"White Castle|Little Caesars?|Papa John'?s|Buffalo Wild Wings|"
        r"Wingstop|In-N-Out|Culver'?s)",
        desc,
        re.I,
    )
    return m.group(1) if m else ""


def build_restaurants(existing_names: set[str]) -> dict:
    print("Building FNDDS restaurant / fast-food catalog…")
    with zipfile.ZipFile(SURVEY_ZIP) as z:
        with z.open("surveyDownload.json") as f:
            survey = json.load(f)
    foods_out = []
    skipped_missing = 0
    skipped_overlap = 0
    skipped_exclude = 0
    for food in survey["SurveyFoods"]:
        desc = norm_space(food.get("description") or "")
        if not desc:
            continue
        if FNDDS_EXCLUDE.search(desc):
            skipped_exclude += 1
            continue
        if not FNDDS_KEEP.search(desc):
            continue
        if norm_key(desc) in existing_names:
            skipped_overlap += 1
            continue
        n = fndds_nutrients(food)
        kcal = n.get(1008, n.get(2048, n.get(2047)))
        if kcal is None or 1003 not in n or 1005 not in n or 1004 not in n:
            skipped_missing += 1
            continue
        fdc = food.get("fdcId") or food.get("fdc_id") or food.get("foodCode")
        brand = brand_from_fndds(desc)
        foods_out.append(
            [
                "v" + str(fdc),
                desc,
                r0(kcal),
                r1(n[1003]),
                r1(n[1005]),
                r1(n[1004]),
                fndds_portions(food),
                brand,
                "restaurant",
                "usda-fndds",
            ]
        )
    foods_out.sort(key=lambda r: (r[7].lower(), r[1].lower()))
    meta = {
        "source": "USDA FoodData Central Survey Foods (FNDDS 2021-2023)",
        "license": "Public domain (CC0 1.0)",
        "citation": "U.S. Department of Agriculture, Agricultural Research Service. FoodData Central, Survey Foods (FNDDS) 2021-2023. fdc.nal.usda.gov",
        "release": "October 2024",
        "file": "FoodData_Central_survey_food_json_2024-10-31.zip",
        "built": date.today().isoformat(),
        "count": len(foods_out),
        "basis": "Nutrient values are per 100 g. Portions are FNDDS household measures with gram weights. Items already present in the SR Legacy / Foundation file were not duplicated.",
        "skipped_missing_nutrients": skipped_missing,
        "skipped_name_overlap": skipped_overlap,
        "skipped_exclude": skipped_exclude,
        "keys": [
            "id",
            "name",
            "kcal",
            "protein",
            "carbs",
            "fat",
            "portions[ [name, grams], ... ]",
            "brand",
            "kind",
            "source",
        ],
    }
    print(
        f"FNDDS restaurant kept {len(foods_out):,}; overlap {skipped_overlap}; "
        f"missing {skipped_missing}; excluded {skipped_exclude}"
    )
    return {"meta": meta, "foods": foods_out}


def main() -> None:
    existing = load_existing_names()
    restaurants = build_restaurants(existing)
    grocery = build_grocery()
    OUT_RESTAURANTS.write_text(json.dumps(restaurants, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    OUT_GROCERY.write_text(json.dumps(grocery, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("Wrote", OUT_RESTAURANTS, "size", OUT_RESTAURANTS.stat().st_size)
    print("Wrote", OUT_GROCERY, "size", OUT_GROCERY.stat().st_size)


if __name__ == "__main__":
    main()
