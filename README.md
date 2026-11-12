# Prep & Progress

An offline, phone-friendly web app (installable PWA) for meal-prep macros, a dated food journal, weight tracking, and small weekly goals.

Works well on a Samsung Galaxy phone in Chrome or Samsung Internet. There is no backend — everything stays on the device (localStorage).

## Open it on your phone

This needs a small web server (not a raw `file://` link), so the food database, offline cache, and “Add to Home screen” can work.

On a computer, from this folder:

```bash
python3 -m http.server 8080
```

Then open `http://<your-computer-ip>:8080` on the phone (same Wi‑Fi). In Chrome, use the menu → **Add to Home screen** / **Install app**. After the first visit, the app works offline.

## What’s included

- **Today** — calorie and macro rings, meals you can log, jump into the journal
- **Journal** — calendar, a scrollable history with time / meal / food / portion / macros, daily totals vs targets, edit or delete entries, optional notes (hunger, mood, how you felt), re-log an entry or a whole meal, CSV export
- **Prep** — batch recipes with per-serving macros, then log servings to a day
- **Foods** — search ~8,000 USDA foods with household portions; add/import your own
- **Weight** — weigh-ins, trend chart, 7-day average, progress to goal
- **Plan** — weekly weight milestones at a gentle pace, plus habit checkoffs
- **You** (profile icon) — targets, units, light/dark theme, JSON backup import/export

Calories use the Mifflin-St Jeor equation and a cautious pace (about ½–1% of body weight, capped near 1 lb/week), with a floor of ~1,500 kcal (men) / ~1,200 kcal (women). These are estimates, not medical advice.

## Food database

Built from public-domain USDA FoodData Central data (CC0):

| Dataset | Release | Included |
| --- | --- | --- |
| SR Legacy | April 2018 (`FoodData_Central_sr_legacy_food_csv_2018-04.zip`) | 7,793 foods |
| Foundation Foods | April 2026 (`FoodData_Central_foundation_food_csv_2026-04-30.zip`) | 237 unique foods (140 name overlaps with SR skipped; 92 omitted because energy/macros were missing — values were never invented) |

**Total: 8,030 foods**, nutrient values per 100 g, plus household portions from USDA `food_portion` (7,559 foods have at least one). Compact file: `data/foods.json` (~0.98 MB).

The October 2026 Foundation CSV archive was incomplete (no `food.csv` / `food_nutrient.csv` / `food_portion.csv`), so April 2026 was used instead.

Rebuild from the CSVs (if you have them under `/tmp/usda`):

```bash
python3 scripts/build_foods.py
```

Import your own foods with `data/import-template.csv` (`name,serving_name,serving_grams,kcal,protein,carbs,fat` — values are for that serving).

## Color schemes

Choose a palette in **You → Appearance**. Each has a light and dark variant (or follow the system). Text colors meet WCAG AA contrast against backgrounds and cards.

| Palette | Accent (light) | Accent (dark) | Dark background |
| --- | --- | --- | --- |
| Terracotta (default) | `#BE5324` | `#E8926A` | `#171311` |
| Ocean | `#0C6E86` | `#2EB5C9` | `#0B171D` |
| Fresh | `#1B7A4A` | `#3DCA82` | `#0F1A14` |
| Midnight | `#5B45C6` | `#8B7CFF` | `#0D0B14` |
| Citrus | `#C45000` | `#FF9F3A` | `#1A140A` |

## iPhone / Safari

- Install: **Safari → Share → Add to Home Screen** (not Chrome on iOS).
- The app uses the 180×180 Apple touch icon, `viewport-fit=cover`, and safe-area padding for the notch and home indicator.
- Input fields stay at 16px so iOS won’t zoom on focus. Date and time use the native Safari pickers.
- Export uses the system Share sheet when possible; otherwise iOS opens the file in a new tab so you can Save or Share. `<input type="file">` imports work in Safari.
- The tab bar hides while the keyboard is open so it doesn’t jump over the form.
- Needs https or localhost for Add to Home Screen and offline use.

## Optional hosting (GitHub Pages)

This app was **not** deployed or pushed to a repository (on purpose). To host it later:

1. Create a GitHub repo and copy these files to the root (or a `docs/` folder).
2. GitHub → Settings → Pages → Deploy from the `main` branch (root or `/docs`).
3. After a minute, open `https://<user>.github.io/<repo>/` on your phone and Add to Home screen.

Any static host (Netlify, Cloudflare Pages, Render static) also works. It must be served over HTTPS for the install and offline features.

## Tests

```bash
node tests/test_calc.js
node tests/test_foods.js
python3 tests/run_e2e.py
```

Phone-size screenshots (390×844) are in `screens/`.

## Limits

- Data stays on this device unless you export a backup or journal CSV. There is no account or cloud sync.
- USDA names can be long or formal (e.g. “Cereals, oats…”). Branded grocery items are not in this build (that dataset is huge); add those as custom foods or via CSV.
- Offline use requires one successful load over http(s). `file://` will not register the service worker.
